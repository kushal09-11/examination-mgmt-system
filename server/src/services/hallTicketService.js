const prisma = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { createAuditLog } = require('../utils/auditLogger');
const { generateHallTicketPDF } = require('../utils/pdfGenerator');

async function getMinimumAttendanceThreshold() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'min_attendance_threshold' },
  });
  return setting ? parseFloat(setting.value) : 75.0;
}

/**
 * Verify student eligibility for a schedule
 */
async function checkEligibility(studentId, scheduleId) {
  const [student, schedule, threshold] = await Promise.all([
    prisma.student.findUnique({
      where: { student_id: studentId },
      include: { user: true, course: true },
    }),
    prisma.examSchedule.findUnique({
      where: { schedule_id: scheduleId },
      include: { exam: { include: { subject: true } } },
    }),
    getMinimumAttendanceThreshold(),
  ]);

  if (!student) throw new ApiError(404, 'Student not found.');
  if (!schedule) throw new ApiError(404, 'Examination schedule not found.');

  const attendancePct = Number(student.attendance_pct);
  const isEligible = attendancePct >= threshold && student.is_active;

  return {
    isEligible,
    attendancePct,
    threshold,
    reason: isEligible
      ? 'Eligible for hall ticket issuance.'
      : `Attendance (${attendancePct.toFixed(2)}%) is below the required threshold of ${threshold.toFixed(2)}%.`,
    student,
    schedule,
  };
}

/**
 * Generate or issue hall tickets for an entire schedule batch
 */
async function generateBatchHallTickets(scheduleId, adminId, req) {
  const schedule = await prisma.examSchedule.findUnique({
    where: { schedule_id: scheduleId },
    include: {
      exam: { include: { subject: true } },
    },
  });

  if (!schedule) throw new ApiError(404, 'Schedule not found.');

  const threshold = await getMinimumAttendanceThreshold();

  // Find all active students in this batch and course
  const students = await prisma.student.findMany({
    where: {
      course_id: schedule.exam.subject.course_id,
      ...(schedule.batch_year ? { batch_year: schedule.batch_year } : {}),
    },
    include: { user: true },
  });

  const results = [];

  for (const s of students) {
    const attendancePct = Number(s.attendance_pct);
    const isEligible = attendancePct >= threshold && s.is_active;
    const ticketNo = `HT-${new Date().getFullYear()}-${schedule.exam.subject.subject_code}-${s.student_id}`;

    const record = await prisma.hallTicket.upsert({
      where: {
        student_id_schedule_id: {
          student_id: s.student_id,
          schedule_id: scheduleId,
        },
      },
      update: {
        eligibility_status: isEligible ? 'Eligible' : 'Ineligible',
        rejection_reason: isEligible ? null : `Attendance (${attendancePct.toFixed(1)}%) is below required ${threshold.toFixed(1)}% threshold.`,
        is_approved: isEligible,
      },
      create: {
        student_id: s.student_id,
        schedule_id: scheduleId,
        ticket_number: isEligible ? ticketNo : `${ticketNo}-INELIGIBLE`,
        eligibility_status: isEligible ? 'Eligible' : 'Ineligible',
        rejection_reason: isEligible ? null : `Attendance (${attendancePct.toFixed(1)}%) is below required ${threshold.toFixed(1)}% threshold.`,
        is_approved: isEligible,
      },
      include: { student: { include: { user: true } } },
    });

    // Notify student
    await prisma.notification.create({
      data: {
        user_id: s.user.user_id,
        message: isEligible
          ? `Your Hall Ticket for ${schedule.exam.subject.subject_code} has been officially issued. You can now download it.`
          : `Hall Ticket Request Denied for ${schedule.exam.subject.subject_code}: Attendance (${attendancePct.toFixed(1)}%) is below ${threshold.toFixed(1)}%.`,
        type: isEligible ? 'HALLTICKET' : 'ELIGIBILITY',
        delivery_status: 'Sent',
      },
    });

    results.push(record);
  }

  await createAuditLog({
    userId: adminId,
    action: 'BATCH_HALL_TICKETS_PROCESSED',
    affectedResource: 'HALL_TICKET',
    resourceId: scheduleId,
    metadata: { total_students: students.length, threshold },
    req,
  });

  return results;
}

async function getHallTickets(filters = {}, user = null) {
  const where = {};
  if (user && user.role === 'Student') {
    if (!user.student) throw new ApiError(403, 'Student profile not associated.');
    where.student_id = user.student.student_id;
  } else if (filters.student_id) {
    where.student_id = Number(filters.student_id);
  }

  if (filters.schedule_id) where.schedule_id = Number(filters.schedule_id);
  if (filters.eligibility_status) where.eligibility_status = filters.eligibility_status;

  return prisma.hallTicket.findMany({
    where,
    include: {
      student: { include: { user: true, course: true } },
      schedule: { include: { exam: { include: { subject: true } } } },
    },
    orderBy: { issued_at: 'desc' },
  });
}

async function streamHallTicketPDF(hallticketId, user, res) {
  const ticket = await prisma.hallTicket.findUnique({
    where: { hallticket_id: hallticketId },
    include: {
      student: { include: { user: true, course: true } },
      schedule: { include: { exam: { include: { subject: true } } } },
    },
  });

  if (!ticket) throw new ApiError(404, 'Hall ticket not found.');

  // Role authorization: Students can download only their own tickets
  if (user.role === 'Student' && user.student?.student_id !== ticket.student_id) {
    throw new ApiError(403, 'You are not authorized to download another student\'s hall ticket.');
  }

  if (ticket.eligibility_status !== 'Eligible' || !ticket.is_approved) {
    throw new ApiError(403, `Cannot download hall ticket: ${ticket.rejection_reason || 'Student is ineligible.'}`);
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=HallTicket_${ticket.ticket_number}.pdf`);

  generateHallTicketPDF({
    student: ticket.student,
    schedule: ticket.schedule,
    ticketNumber: ticket.ticket_number,
    issuedAt: ticket.issued_at,
  }, res);
}

module.exports = {
  checkEligibility,
  generateBatchHallTickets,
  getHallTickets,
  streamHallTicketPDF,
};
