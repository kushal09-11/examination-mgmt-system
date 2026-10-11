const prisma = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { createAuditLog } = require('../utils/auditLogger');
const { determineGrade, calculateGPA, calculateCGPA } = require('../utils/gpaCalculator');
const { generateResultCardPDF } = require('../utils/pdfGenerator');

// ---------------- ATTENDANCE ----------------
async function markAttendance({ schedule_id, records }, user, req) {
  const schedule = await prisma.examSchedule.findUnique({
    where: { schedule_id },
    include: { exam: { include: { subject: true } } },
  });
  if (!schedule) throw new ApiError(404, 'Schedule not found.');

  const createdRecords = [];

  await prisma.$transaction(async (tx) => {
    for (const r of records) {
      const att = await tx.attendance.upsert({
        where: {
          student_id_schedule_id: { student_id: r.student_id, schedule_id },
        },
        update: {
          status: r.status,
          marked_by_id: user.user_id,
          marked_at: new Date(),
        },
        create: {
          student_id: r.student_id,
          schedule_id,
          status: r.status,
          marked_by_id: user.user_id,
        },
      });
      createdRecords.push(att);

      // Exam-session attendance is distinct from cumulative academic attendance per SRS §12
    }
  });

  await createAuditLog({
    userId: user.user_id,
    action: 'ATTENDANCE_RECORDED',
    affectedResource: 'ATTENDANCE',
    resourceId: schedule_id,
    metadata: { count: records.length },
    req,
  });

  return createdRecords;
}

async function getAttendanceBySchedule(scheduleId) {
  return prisma.attendance.findMany({
    where: { schedule_id: Number(scheduleId) },
    include: {
      student: { include: { user: true } },
    },
    orderBy: { student_id: 'asc' },
  });
}

// ---------------- MARKS ENTRY & EVALUATION ----------------
async function enterMarks(data, user, req) {
  const { exam_id, marks_list } = data;

  const exam = await prisma.exam.findUnique({
    where: { exam_id },
    include: { subject: true },
  });
  if (!exam) throw new ApiError(404, 'Exam not found.');

  const gradingPolicies = await prisma.gradingPolicy.findMany({ where: { is_active: true } });
  const results = [];

  await prisma.$transaction(async (tx) => {
    for (const item of marks_list) {
      if (item.marks_obtained > exam.total_marks) {
        throw new ApiError(400, `Marks obtained (${item.marks_obtained}) cannot exceed maximum marks (${exam.total_marks}).`);
      }

      const pct = (item.marks_obtained / exam.total_marks) * 100;
      const { grade, gradePoint } = determineGrade(pct, gradingPolicies);

      const res = await tx.result.upsert({
        where: {
          student_id_exam_id: { student_id: item.student_id, exam_id },
        },
        update: {
          marks_obtained: item.marks_obtained,
          max_marks: exam.total_marks,
          grade,
          grade_points: gradePoint,
          evaluator_id: user.faculty?.faculty_id || user.user_id,
          moderation_status: 'Pending',
          remarks: item.remarks || null,
        },
        create: {
          student_id: item.student_id,
          exam_id,
          marks_obtained: item.marks_obtained,
          max_marks: exam.total_marks,
          grade,
          grade_points: gradePoint,
          evaluator_id: user.faculty?.faculty_id || user.user_id,
          moderation_status: 'Pending',
          remarks: item.remarks || null,
        },
      });

      results.push(res);
    }
  });

  await createAuditLog({
    userId: user.user_id,
    action: 'MARKS_ENTERED',
    affectedResource: 'RESULT',
    resourceId: exam_id,
    metadata: { student_count: marks_list.length },
    req,
  });

  return results;
}

// ---------------- MODERATION & RESULT PUBLICATION ----------------
async function moderateResult({ result_id, moderation_status, remarks, adjusted_marks }, user, req) {
  const existing = await prisma.result.findUnique({
    where: { result_id },
    include: { exam: true },
  });
  if (!existing) throw new ApiError(404, 'Result record not found.');

  let finalMarks = existing.marks_obtained;
  let finalGrade = existing.grade;
  let finalGradePoint = existing.grade_points;

  if (adjusted_marks !== undefined) {
    if (adjusted_marks > Number(existing.max_marks)) {
      throw new ApiError(400, `Adjusted marks cannot exceed max marks of ${existing.max_marks}.`);
    }
    finalMarks = adjusted_marks;
    const gradingPolicies = await prisma.gradingPolicy.findMany({ where: { is_active: true } });
    const pct = (adjusted_marks / Number(existing.max_marks)) * 100;
    const gInfo = determineGrade(pct, gradingPolicies);
    finalGrade = gInfo.grade;
    finalGradePoint = gInfo.gradePoint;
  }

  const updated = await prisma.result.update({
    where: { result_id },
    data: {
      marks_obtained: finalMarks,
      grade: finalGrade,
      grade_points: finalGradePoint,
      moderation_status,
      remarks: remarks || existing.remarks,
    },
    include: {
      student: { include: { user: true } },
      exam: { include: { subject: true } },
    },
  });

  await createAuditLog({
    userId: user.user_id,
    action: `RESULT_MODERATION_${moderation_status.toUpperCase()}`,
    affectedResource: 'RESULT',
    resourceId: result_id,
    metadata: { adjusted_marks, status: moderation_status, remarks },
    req,
  });

  return updated;
}

async function publishResults(examId, isPublished, adminUser, req) {
  const updatedCount = await prisma.result.updateMany({
    where: { exam_id: Number(examId), moderation_status: 'Approved' },
    data: { is_published: isPublished },
  });

  if (isPublished) {
    const publishedResults = await prisma.result.findMany({
      where: { exam_id: Number(examId), is_published: true },
      include: {
        student: { include: { user: true } },
        exam: { include: { subject: true } },
      },
    });

    for (const r of publishedResults) {
      await prisma.notification.create({
        data: {
          user_id: r.student.user.user_id,
          message: `Your final result for ${r.exam.subject.subject_code} has been officially published: Marks: ${r.marks_obtained}/${r.max_marks}, Grade: ${r.grade}.`,
          type: 'RESULT',
          delivery_status: 'Sent',
        },
      });
    }
  }

  await createAuditLog({
    userId: adminUser.user_id,
    action: isPublished ? 'RESULTS_PUBLISHED' : 'RESULTS_UNPUBLISHED',
    affectedResource: 'RESULT',
    resourceId: examId,
    metadata: { updated_count: updatedCount.count },
    req,
  });

  return updatedCount;
}

async function getResults(filters = {}, user = null) {
  const where = {};

  if (user && user.role === 'Student') {
    if (!user.student) throw new ApiError(403, 'Student record not found.');
    where.student_id = user.student.student_id;
    where.is_published = true; // Students see only published results
  } else {
    if (filters.student_id) where.student_id = Number(filters.student_id);
    if (filters.exam_id) where.exam_id = Number(filters.exam_id);
    if (filters.moderation_status) where.moderation_status = filters.moderation_status;
    if (filters.is_published !== undefined) where.is_published = filters.is_published === 'true' || filters.is_published === true;
  }

  return prisma.result.findMany({
    where,
    include: {
      student: { include: { user: true, course: true } },
      exam: { include: { subject: true } },
    },
    orderBy: { result_id: 'desc' },
  });
}

async function getStudentAcademicSummary(studentId) {
  const student = await prisma.student.findUnique({
    where: { student_id: Number(studentId) },
    include: { user: true, course: true },
  });
  if (!student) throw new ApiError(404, 'Student not found.');

  const results = await prisma.result.findMany({
    where: { student_id: Number(studentId), is_published: true },
    include: { exam: { include: { subject: true } } },
  });

  const subjectResults = results.map((r) => ({
    subject_code: r.exam.subject.subject_code,
    subject_name: r.exam.subject.subject_name,
    credits: r.exam.subject.credits,
    gradePoint: Number(r.grade_points),
    grade: r.grade,
    marks_obtained: Number(r.marks_obtained),
    max_marks: Number(r.max_marks),
  }));

  const gpa = calculateGPA(subjectResults);
  const cgpa = calculateCGPA([{ semester: 1, gpa, credits: subjectResults.reduce((acc, s) => acc + s.credits, 0) }]);

  return {
    student,
    results: subjectResults,
    gpa,
    cgpa,
  };
}

async function streamStudentResultPDF(studentId, user, res) {
  if (user.role === 'Student' && user.student?.student_id !== Number(studentId)) {
    throw new ApiError(403, 'Cannot access another student\'s grade sheet.');
  }

  const summary = await getStudentAcademicSummary(studentId);
  const rawResults = await prisma.result.findMany({
    where: { student_id: Number(studentId), is_published: true },
    include: { exam: { include: { subject: true } } },
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=GradeSheet_${summary.student.enrollment_no}.pdf`);

  generateResultCardPDF({
    student: summary.student,
    results: rawResults,
    gpa: summary.gpa,
    cgpa: summary.cgpa,
  }, res);
}

module.exports = {
  markAttendance,
  getAttendanceBySchedule,
  enterMarks,
  moderateResult,
  publishResults,
  getResults,
  getStudentAcademicSummary,
  streamStudentResultPDF,
};
