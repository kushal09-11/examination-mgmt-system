const prisma = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { createAuditLog } = require('../utils/auditLogger');

async function getAvailableOnlineExams(studentUser) {
  if (!studentUser.student) throw new ApiError(403, 'Student record not found.');
  const studentId = studentUser.student.student_id;

  // Find published online exam schedules for student's course & batch
  const schedules = await prisma.examSchedule.findMany({
    where: {
      is_published: true,
      exam: { exam_type: 'Online' },
      batch_year: studentUser.student.batch_year,
      exam: { subject: { course_id: studentUser.student.course_id } },
    },
    include: {
      exam: { include: { subject: true } },
      hall_tickets: {
        where: { student_id: studentId },
      },
      attempts: {
        where: { student_id: studentId },
      },
    },
  });

  return schedules.map((sch) => {
    const hallTicket = sch.hall_tickets[0];
    const attempt = sch.attempts[0];
    const isEligible = hallTicket && hallTicket.eligibility_status === 'Eligible' && hallTicket.is_approved;

    return {
      schedule_id: sch.schedule_id,
      exam_id: sch.exam.exam_id,
      subject_code: sch.exam.subject.subject_code,
      subject_name: sch.exam.subject.subject_name,
      total_marks: sch.exam.total_marks,
      duration_minutes: sch.exam.duration_minutes,
      exam_date: sch.exam_date,
      start_time: sch.start_time,
      end_time: sch.end_time,
      venue: sch.venue,
      is_eligible: Boolean(isEligible),
      hall_ticket_number: hallTicket?.ticket_number || null,
      attempt_status: attempt?.status || 'NotStarted',
      attempt_id: attempt?.attempt_id || null,
      score: attempt?.score || null,
    };
  });
}

async function startOnlineExam(scheduleId, studentUser, req) {
  if (!studentUser.student) throw new ApiError(403, 'Student record not found.');
  const studentId = studentUser.student.student_id;

  const schedule = await prisma.examSchedule.findUnique({
    where: { schedule_id: scheduleId },
    include: {
      exam: {
        include: {
          subject: true,
          question_papers: {
            where: { status: 'Approved' },
            include: {
              items: {
                include: { question: true },
                orderBy: { order_index: 'asc' },
              },
            },
          },
        },
      },
      hall_tickets: { where: { student_id: studentId } },
    },
  });

  if (!schedule) throw new ApiError(404, 'Examination schedule not found.');
  if (!schedule.is_published) throw new ApiError(400, 'Examination schedule is not yet published.');
  if (schedule.exam.exam_type !== 'Online') throw new ApiError(400, 'This examination is not scheduled for online delivery.');

  // Verify Hall Ticket & Eligibility
  const ticket = schedule.hall_tickets[0];
  if (!ticket || ticket.eligibility_status !== 'Eligible' || !ticket.is_approved) {
    throw new ApiError(403, `Access denied: Ineligible for examination. ${ticket?.rejection_reason || 'No approved hall ticket.'}`);
  }

  // Check if attempt exists
  let attempt = await prisma.examAttempt.findUnique({
    where: {
      student_id_schedule_id: { student_id: studentId, schedule_id: scheduleId },
    },
    include: {
      responses: true,
    },
  });

  const durationMinutes = schedule.exam.duration_minutes;
  const now = new Date();

  if (!attempt) {
    const deadline = new Date(now.getTime() + durationMinutes * 60 * 1000);

    attempt = await prisma.examAttempt.create({
      data: {
        student_id: studentId,
        schedule_id: scheduleId,
        status: 'InProgress',
        start_time: now,
        deadline,
      },
      include: { responses: true },
    });

    await createAuditLog({
      userId: studentUser.user_id,
      action: 'EXAM_ATTEMPT_STARTED',
      affectedResource: 'EXAM_ATTEMPT',
      resourceId: attempt.attempt_id,
      metadata: { schedule_id: scheduleId, deadline },
      req,
    });
  } else {
    // If already submitted
    if (['Submitted', 'AutoSubmitted', 'UnderEvaluation', 'Evaluated'].includes(attempt.status)) {
      throw new ApiError(400, 'You have already submitted this examination.');
    }

    // Check if server deadline has passed
    if (now > attempt.deadline) {
      await autoSubmitExam(attempt.attempt_id);
      throw new ApiError(400, 'The examination deadline has expired. Your responses have been automatically submitted.');
    }
  }

  // Retrieve questions for this exam (WITHOUT correct answers / explanations)
  // If an approved question paper exists, use its questions; otherwise fallback to subject's published questions
  let questions = [];
  const approvedPaper = schedule.exam.question_papers[0];

  if (approvedPaper && approvedPaper.items.length > 0) {
    questions = approvedPaper.items.map((it) => {
      const q = it.question;
      return {
        question_id: q.question_id,
        question_text: q.question_text,
        question_type: q.question_type,
        marks: it.marks || q.marks,
        options: q.options,
        order_index: it.order_index,
      };
    });
  } else {
    const subjectQuestions = await prisma.question.findMany({
      where: { subject_id: schedule.exam.subject_id, is_published: true },
    });
    questions = subjectQuestions.map((q, idx) => ({
      question_id: q.question_id,
      question_text: q.question_text,
      question_type: q.question_type,
      marks: q.marks,
      options: q.options,
      order_index: idx + 1,
    }));
  }

  return {
    attempt_id: attempt.attempt_id,
    start_time: attempt.start_time,
    deadline: attempt.deadline,
    duration_minutes: durationMinutes,
    subject: schedule.exam.subject,
    total_marks: schedule.exam.total_marks,
    questions,
    saved_responses: attempt.responses.reduce((acc, r) => {
      acc[r.question_id] = r.student_answer;
      return acc;
    }, {}),
    tab_switches: attempt.tab_switches,
  };
}

async function saveResponse(attemptId, questionId, studentAnswer, studentUser) {
  const attempt = await prisma.examAttempt.findUnique({
    where: { attempt_id: attemptId },
  });

  if (!attempt) throw new ApiError(404, 'Attempt record not found.');
  if (attempt.student_id !== studentUser.student?.student_id) {
    throw new ApiError(403, 'Unauthorized attempt access.');
  }

  // Check deadline
  if (new Date() > attempt.deadline) {
    await autoSubmitExam(attemptId);
    throw new ApiError(400, 'Time expired. Responses can no longer be saved.');
  }

  const response = await prisma.examResponse.upsert({
    where: {
      attempt_id_question_id: { attempt_id: attemptId, question_id: questionId },
    },
    update: {
      student_answer: studentAnswer,
      saved_at: new Date(),
    },
    create: {
      attempt_id: attemptId,
      question_id: questionId,
      student_answer: studentAnswer,
    },
  });

  return response;
}

async function recordTabSwitch(attemptId, studentUser) {
  const attempt = await prisma.examAttempt.findUnique({ where: { attempt_id: attemptId } });
  if (!attempt || attempt.student_id !== studentUser.student?.student_id) return;

  await prisma.examAttempt.update({
    where: { attempt_id: attemptId },
    data: { tab_switches: { increment: 1 } },
  });

  await createAuditLog({
    userId: studentUser.user_id,
    action: 'EXAM_TAB_SWITCH_DETECTED',
    affectedResource: 'EXAM_ATTEMPT',
    resourceId: attemptId,
    metadata: { tab_switch_count: attempt.tab_switches + 1 },
  });
}

async function submitExam(attemptId, studentUser, isAuto = false, req = null) {
  const attempt = await prisma.examAttempt.findUnique({
    where: { attempt_id: attemptId },
    include: {
      responses: true,
      schedule: { include: { exam: { include: { subject: true } } } },
    },
  });

  if (!attempt) throw new ApiError(404, 'Attempt not found.');
  if (!isAuto && studentUser && attempt.student_id !== studentUser.student?.student_id) {
    throw new ApiError(403, 'Unauthorized submission attempt.');
  }

  if (['Submitted', 'AutoSubmitted', 'UnderEvaluation', 'Evaluated'].includes(attempt.status)) {
    return attempt;
  }

  // Auto-grade MCQs
  let totalScore = 0;
  let hasSubjective = false;

  const questionIds = attempt.responses.map((r) => r.question_id);
  const questions = await prisma.question.findMany({
    where: { question_id: { in: questionIds } },
  });

  const questionMap = new Map(questions.map((q) => [q.question_id, q]));

  for (const resp of attempt.responses) {
    const q = questionMap.get(resp.question_id);
    if (!q) continue;

    if (q.question_type === 'MCQ') {
      const isCorrect = resp.student_answer && resp.student_answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
      const awarded = isCorrect ? q.marks : 0;
      totalScore += awarded;

      await prisma.examResponse.update({
        where: { response_id: resp.response_id },
        data: { marks_awarded: awarded },
      });
    } else {
      hasSubjective = true;
    }
  }

  const finalStatus = isAuto ? 'AutoSubmitted' : 'Submitted';
  const evalStatus = hasSubjective ? 'UnderEvaluation' : 'Evaluated';

  const updatedAttempt = await prisma.examAttempt.update({
    where: { attempt_id: attemptId },
    data: {
      status: finalStatus,
      submission_time: new Date(),
      evaluation_status: evalStatus,
      score: hasSubjective ? null : totalScore,
    },
  });

  // If purely MCQ and fully evaluated, automatically create Result record
  if (!hasSubjective) {
    const exam = attempt.schedule.exam;
    const maxMarks = exam.total_marks;
    const pct = (totalScore / maxMarks) * 100;

    const gradingPolicies = await prisma.gradingPolicy.findMany({ where: { is_active: true } });
    const { determineGrade } = require('../utils/gpaCalculator');
    const { grade, gradePoint } = determineGrade(pct, gradingPolicies);

    await prisma.result.upsert({
      where: {
        student_id_exam_id: { student_id: attempt.student_id, exam_id: exam.exam_id },
      },
      update: {
        marks_obtained: totalScore,
        max_marks: maxMarks,
        grade,
        grade_points: gradePoint,
        moderation_status: 'Approved',
        is_published: true,
      },
      create: {
        student_id: attempt.student_id,
        exam_id: exam.exam_id,
        marks_obtained: totalScore,
        max_marks: maxMarks,
        grade,
        grade_points: gradePoint,
        moderation_status: 'Approved',
        is_published: true,
      },
    });
  }

  await createAuditLog({
    userId: studentUser?.user_id || null,
    action: isAuto ? 'EXAM_AUTO_SUBMITTED' : 'EXAM_SUBMITTED',
    affectedResource: 'EXAM_ATTEMPT',
    resourceId: attemptId,
    metadata: { score: hasSubjective ? 'Pending Subjective Evaluation' : totalScore },
    req,
  });

  return updatedAttempt;
}

async function autoSubmitExam(attemptId) {
  return submitExam(attemptId, null, true);
}

module.exports = {
  getAvailableOnlineExams,
  startOnlineExam,
  saveResponse,
  recordTabSwitch,
  submitExam,
  autoSubmitExam,
};
