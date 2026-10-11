const prisma = require('../config/db');
const { calculateGPA } = require('../utils/gpaCalculator');
const { exportToExcel } = require('../utils/excelExporter');

// ---------------- DASHBOARDS ----------------
async function getAdminDashboard() {
  const [
    totalUsers,
    totalStudents,
    totalFaculty,
    totalCourses,
    totalSubjects,
    upcomingExamsCount,
    pendingPapersCount,
    issuedTicketsCount,
    pendingResultsCount,
    recentAudits,
    gradeStats,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.student.count(),
    prisma.faculty.count(),
    prisma.course.count(),
    prisma.subject.count(),
    prisma.examSchedule.count({ where: { exam_date: { gte: new Date() } } }),
    prisma.questionPaper.count({ where: { status: 'UnderReview' } }),
    prisma.hallTicket.count({ where: { eligibility_status: 'Eligible', is_approved: true } }),
    prisma.result.count({ where: { moderation_status: 'Pending' } }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: { user: { select: { full_name: true, email: true, role: true } } },
    }),
    prisma.result.groupBy({
      by: ['grade'],
      _count: { grade: true },
    }),
  ]);

  return {
    metrics: {
      totalUsers,
      totalStudents,
      totalFaculty,
      totalCourses,
      totalSubjects,
      upcomingExams: upcomingExamsCount,
      pendingPaperApprovals: pendingPapersCount,
      hallTicketsIssued: issuedTicketsCount,
      resultsAwaitingPublication: pendingResultsCount,
    },
    gradeDistribution: gradeStats.map((g) => ({ grade: g.grade, count: g._count.grade })),
    recentAudits,
  };
}

async function getFacultyDashboard(user) {
  const facultyId = user.faculty?.faculty_id;

  const [assignments, upcomingSchedules, questionsCount, pendingMarksExams] = await Promise.all([
    prisma.facultySubject.findMany({
      where: { faculty_id: facultyId },
      include: {
        subject: {
          include: {
            course: true,
            _count: { select: { questions: true, exams: true } },
          },
        },
      },
    }),
    prisma.examSchedule.findMany({
      where: {
        assigned_faculty_id: facultyId,
        exam_date: { gte: new Date() },
      },
      include: {
        exam: { include: { subject: true } },
      },
      orderBy: { exam_date: 'asc' },
    }),
    prisma.question.count({ where: { creator_id: facultyId } }),
    prisma.result.count({
      where: { evaluator_id: facultyId, moderation_status: 'Pending' },
    }),
  ]);

  return {
    assignedSubjects: assignments.map((a) => ({
      subject_id: a.subject.subject_id,
      code: a.subject.subject_code,
      name: a.subject.subject_name,
      course: a.subject.course.course_name,
      isPrimary: a.is_primary_coordinator,
      questionsCount: a.subject._count.questions,
      examsCount: a.subject._count.exams,
    })),
    upcomingInvigilations: upcomingSchedules,
    metrics: {
      totalAssignedSubjects: assignments.length,
      questionsAuthored: questionsCount,
      pendingEvaluations: pendingMarksExams,
    },
  };
}

async function getStudentDashboard(user) {
  const student = user.student;
  if (!student) return {};

  const [upcomingSchedules, tickets, results, unreadCount, activeAttempts] = await Promise.all([
    prisma.examSchedule.findMany({
      where: {
        is_published: true,
        batch_year: student.batch_year,
        exam: { subject: { course_id: student.course_id } },
        exam_date: { gte: new Date() },
      },
      include: {
        exam: { include: { subject: true } },
      },
      orderBy: { exam_date: 'asc' },
    }),
    prisma.hallTicket.findMany({
      where: { student_id: student.student_id },
      include: { schedule: { include: { exam: { include: { subject: true } } } } },
    }),
    prisma.result.findMany({
      where: { student_id: student.student_id, is_published: true },
      include: { exam: { include: { subject: true } } },
    }),
    prisma.notification.count({
      where: { user_id: user.user_id, is_read: false },
    }),
    prisma.examAttempt.findMany({
      where: {
        student_id: student.student_id,
        status: 'InProgress',
      },
      include: { schedule: { include: { exam: { include: { subject: true } } } } },
    }),
  ]);

  const subjectResults = results.map((r) => ({
    credits: r.exam.subject.credits,
    gradePoint: Number(r.grade_points),
  }));

  const gpa = calculateGPA(subjectResults);

  return {
    student: {
      enrollment_no: student.enrollment_no,
      attendance_pct: Number(student.attendance_pct),
      batch_year: student.batch_year,
      gpa,
    },
    upcomingExams: upcomingSchedules,
    hallTickets: tickets,
    activeExams: activeAttempts,
    publishedResults: results,
    unreadNotifications: unreadCount,
  };
}

async function getExaminerDashboard() {
  const [pendingPapers, underReviewResults, totalApprovedPapers] = await Promise.all([
    prisma.questionPaper.findMany({
      where: { status: 'UnderReview' },
      include: {
        subject: { include: { course: true } },
        items: { include: { question: true } },
      },
      orderBy: { created_at: 'desc' },
    }),
    prisma.result.findMany({
      where: { moderation_status: 'Pending' },
      include: {
        student: { include: { user: true } },
        exam: { include: { subject: true } },
      },
      take: 20,
    }),
    prisma.questionPaper.count({ where: { status: 'Approved' } }),
  ]);

  return {
    pendingPapers,
    pendingResultsModeration: underReviewResults,
    metrics: {
      papersUnderReview: pendingPapers.length,
      resultsUnderReview: underReviewResults.length,
      totalApprovedPapers,
    },
  };
}

// ---------------- REPORTS & ANALYTICS ----------------
async function getPerformanceReport(filters = {}) {
  const results = await prisma.result.findMany({
    where: {
      is_published: true,
      ...(filters.exam_id ? { exam_id: Number(filters.exam_id) } : {}),
      ...(filters.course_id ? { student: { course_id: Number(filters.course_id) } } : {}),
    },
    include: {
      student: { include: { user: true, course: true } },
      exam: { include: { subject: true } },
    },
  });

  const total = results.length;
  const passed = results.filter((r) => r.grade !== 'F').length;
  const passPercentage = total > 0 ? (passed / total) * 100 : 0;

  // Grade breakdown
  const gradeDistribution = {};
  results.forEach((r) => {
    gradeDistribution[r.grade] = (gradeDistribution[r.grade] || 0) + 1;
  });

  // Rank list sorted by marks obtained descending
  const rankList = [...results]
    .sort((a, b) => Number(b.marks_obtained) - Number(a.marks_obtained))
    .map((r, index) => ({
      rank: index + 1,
      enrollment_no: r.student.enrollment_no,
      student_name: r.student.user.full_name,
      course: r.student.course.course_name,
      subject: r.exam.subject.subject_name,
      marks: Number(r.marks_obtained),
      max_marks: Number(r.max_marks),
      grade: r.grade,
      grade_points: Number(r.grade_points),
    }));

  return {
    totalEvaluated: total,
    passCount: passed,
    failCount: total - passed,
    passPercentage: Number(passPercentage.toFixed(2)),
    gradeDistribution: Object.entries(gradeDistribution).map(([grade, count]) => ({ grade, count })),
    rankList,
  };
}

async function exportPerformanceReportExcel(filters, res) {
  const report = await getPerformanceReport(filters);
  const buffer = exportToExcel(report.rankList, 'Performance_Report');

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=Academic_Performance_Report.xlsx');
  res.send(buffer);
}

// ---------------- AUDIT LOGS ----------------
async function getAuditLogs(filters = {}) {
  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const where = {};
  if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
  if (filters.user_id) where.user_id = Number(filters.user_id);
  if (filters.affected_resource) where.affected_resource = filters.affected_resource;

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: { select: { user_id: true, full_name: true, email: true, role: true } },
      },
      orderBy: { timestamp: 'desc' },
    }),
  ]);

  return {
    data: logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ---------------- SYSTEM SETTINGS & GRADING POLICIES ----------------
async function getSystemSettings() {
  const [settings, policies] = await Promise.all([
    prisma.systemSetting.findMany(),
    prisma.gradingPolicy.findMany({ orderBy: { min_percentage: 'desc' } }),
  ]);
  return { settings, policies };
}

async function updateSystemSetting(key, value, user, req) {
  const updated = await prisma.systemSetting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });

  const { createAuditLog } = require('../utils/auditLogger');
  await createAuditLog({
    userId: user.user_id,
    action: 'SYSTEM_SETTING_UPDATED',
    affectedResource: 'SYSTEM_SETTING',
    resourceId: key,
    metadata: { key, value },
    req,
  });

  return updated;
}

module.exports = {
  getAdminDashboard,
  getFacultyDashboard,
  getStudentDashboard,
  getExaminerDashboard,
  getPerformanceReport,
  exportPerformanceReportExcel,
  getAuditLogs,
  getSystemSettings,
  updateSystemSetting,
};
