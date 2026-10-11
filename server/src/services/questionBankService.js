const prisma = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { createAuditLog } = require('../utils/auditLogger');

// ---------------- QUESTION BANK ----------------
async function getQuestions(filters = {}, user = null) {
  const where = {};
  if (filters.subject_id) where.subject_id = Number(filters.subject_id);
  if (filters.difficulty) where.difficulty = filters.difficulty;
  if (filters.question_type) where.question_type = filters.question_type;
  if (filters.unit) where.unit = Number(filters.unit);

  // If Faculty, restrict to assigned subjects unless Admin
  if (user && user.role === 'Faculty' && user.faculty) {
    const assigned = await prisma.facultySubject.findMany({
      where: { faculty_id: user.faculty.faculty_id },
      select: { subject_id: true },
    });
    const allowedSubjectIds = assigned.map((a) => a.subject_id);
    where.subject_id = { in: allowedSubjectIds };
  }

  return prisma.question.findMany({
    where,
    include: {
      subject: true,
      _count: { select: { paper_items: true } },
    },
    orderBy: { question_id: 'desc' },
  });
}

async function createQuestion(data, user, req) {
  // If user is Faculty, verify they are assigned to this subject
  if (user.role === 'Faculty' && user.faculty) {
    const assignment = await prisma.facultySubject.findUnique({
      where: {
        faculty_id_subject_id: {
          faculty_id: user.faculty.faculty_id,
          subject_id: data.subject_id,
        },
      },
    });
    if (!assignment) {
      throw new ApiError(403, 'You are not assigned as faculty for this subject.');
    }
  }

  const question = await prisma.question.create({
    data: {
      ...data,
      creator_id: user.faculty?.faculty_id || null,
    },
    include: { subject: true },
  });

  await createAuditLog({
    userId: user.user_id,
    action: 'QUESTION_CREATED',
    affectedResource: 'QUESTION',
    resourceId: question.question_id,
    metadata: { subject_id: data.subject_id, type: data.question_type, difficulty: data.difficulty, marks: data.marks },
    req,
  });

  return question;
}

async function updateQuestion(questionId, data, user, req) {
  const question = await prisma.question.findUnique({ where: { question_id: questionId } });
  if (!question) throw new ApiError(404, 'Question not found.');

  if (user.role === 'Faculty' && user.faculty) {
    const assignment = await prisma.facultySubject.findUnique({
      where: {
        faculty_id_subject_id: {
          faculty_id: user.faculty.faculty_id,
          subject_id: question.subject_id,
        },
      },
    });
    if (!assignment) {
      throw new ApiError(403, 'You are not authorized to edit questions for this subject.');
    }
  }

  const updated = await prisma.question.update({
    where: { question_id: questionId },
    data,
  });

  await createAuditLog({
    userId: user.user_id,
    action: 'QUESTION_UPDATED',
    affectedResource: 'QUESTION',
    resourceId: questionId,
    metadata: data,
    req,
  });

  return updated;
}

// ---------------- AUTOMATED QUESTION PAPER GENERATION ----------------
async function generateQuestionPaper(params, user, req) {
  const { subject_id, title, total_marks, exam_id, difficulty_distribution, type_distribution } = params;

  // Retrieve eligible questions for subject
  const pool = await prisma.question.findMany({
    where: {
      subject_id,
      is_published: true,
    },
  });

  const totalPoolMarks = pool.reduce((acc, q) => acc + q.marks, 0);

  if (pool.length === 0 || totalPoolMarks < total_marks) {
    throw new ApiError(400, `Insufficient question pool. Available pool total marks: ${totalPoolMarks}, requested paper total marks: ${total_marks}. Please add more questions to the question bank.`);
  }

  // Shuffle pool with randomized weighted selection
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  let currentMarks = 0;
  const selectedQuestions = [];

  for (const q of shuffled) {
    if (currentMarks + q.marks <= total_marks) {
      selectedQuestions.push(q);
      currentMarks += q.marks;
    }
    if (currentMarks === total_marks) break;
  }

  // If exact target marks was not met, try greedy fallback
  if (currentMarks < total_marks) {
    for (const q of pool) {
      if (!selectedQuestions.some((sq) => sq.question_id === q.question_id)) {
        if (currentMarks + q.marks <= total_marks) {
          selectedQuestions.push(q);
          currentMarks += q.marks;
        }
      }
      if (currentMarks === total_marks) break;
    }
  }

  if (currentMarks !== total_marks) {
    throw new ApiError(400, `Could not assemble exact total marks of ${total_marks} using current question denominations (assembled ${currentMarks} marks). Please adjust criteria or add varying denominations.`);
  }

  // Persist question paper in database
  const paper = await prisma.$transaction(async (tx) => {
    const newPaper = await tx.questionPaper.create({
      data: {
        subject_id,
        exam_id: exam_id || null,
        title,
        total_marks,
        version: 1,
        created_by_id: user.faculty?.faculty_id || user.user_id,
        status: 'UnderReview', // Automatically submit for Examiner review
        criteria: { difficulty_distribution, type_distribution },
      },
    });

    for (let i = 0; i < selectedQuestions.length; i++) {
      await tx.questionPaperItem.create({
        data: {
          paper_id: newPaper.paper_id,
          question_id: selectedQuestions[i].question_id,
          order_index: i + 1,
          marks: selectedQuestions[i].marks,
        },
      });
    }

    return tx.questionPaper.findUnique({
      where: { paper_id: newPaper.paper_id },
      include: {
        items: {
          include: { question: true },
          orderBy: { order_index: 'asc' },
        },
        subject: true,
      },
    });
  });

  // Notify Examiners that a paper is awaiting review
  const examiners = await prisma.user.findMany({ where: { role: 'Examiner' } });
  for (const ex of examiners) {
    await prisma.notification.create({
      data: {
        user_id: ex.user_id,
        message: `New Question Paper "${paper.title}" for ${paper.subject.subject_code} submitted for Examiner review.`,
        type: 'QUESTION_PAPER',
        delivery_status: 'Sent',
      },
    });
  }

  await createAuditLog({
    userId: user.user_id,
    action: 'QUESTION_PAPER_GENERATED',
    affectedResource: 'QUESTION_PAPER',
    resourceId: paper.paper_id,
    metadata: { title, total_marks, questions_count: selectedQuestions.length },
    req,
  });

  return paper;
}

async function reviewQuestionPaper(paperId, { status, examiner_feedback }, user, req) {
  const paper = await prisma.questionPaper.findUnique({
    where: { paper_id: paperId },
    include: { subject: true },
  });
  if (!paper) throw new ApiError(404, 'Question paper not found.');

  const updated = await prisma.questionPaper.update({
    where: { paper_id: paperId },
    data: {
      status,
      examiner_feedback,
      approved_at: status === 'Approved' ? new Date() : null,
    },
    include: { subject: true, items: { include: { question: true } } },
  });

  await createAuditLog({
    userId: user.user_id,
    action: `QUESTION_PAPER_${status.toUpperCase()}`,
    affectedResource: 'QUESTION_PAPER',
    resourceId: paperId,
    metadata: { feedback: examiner_feedback, status },
    req,
  });

  return updated;
}

async function getQuestionPapers(filters = {}) {
  const where = {};
  if (filters.subject_id) where.subject_id = Number(filters.subject_id);
  if (filters.status) where.status = filters.status;

  return prisma.questionPaper.findMany({
    where,
    include: {
      subject: true,
      exam: true,
      items: {
        include: { question: true },
        orderBy: { order_index: 'asc' },
      },
    },
    orderBy: { paper_id: 'desc' },
  });
}

module.exports = {
  getQuestions,
  createQuestion,
  updateQuestion,
  generateQuestionPaper,
  reviewQuestionPaper,
  getQuestionPapers,
};
