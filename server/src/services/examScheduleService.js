const prisma = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { createAuditLog } = require('../utils/auditLogger');

// Helper to check time interval overlap
function isTimeOverlapping(startA, endA, startB, endB) {
  // Strings in HH:mm format compare cleanly alphabetically
  return startA < endB && endA > startB;
}

// ---------------- EXAMS ----------------
async function getAllExams(filters = {}) {
  const where = {};
  if (filters.subject_id) where.subject_id = Number(filters.subject_id);
  if (filters.exam_type) where.exam_type = filters.exam_type;

  return prisma.exam.findMany({
    where,
    include: {
      subject: { include: { course: true } },
      schedules: {
        include: { assigned_faculty: { include: { user: true } } },
      },
      _count: { select: { results: true, question_papers: true } },
    },
    orderBy: { exam_id: 'desc' },
  });
}

async function createExam(data, adminId, req) {
  const exam = await prisma.exam.create({
    data,
    include: { subject: true },
  });

  await createAuditLog({
    userId: adminId,
    action: 'EXAM_CREATED',
    affectedResource: 'EXAM',
    resourceId: exam.exam_id,
    metadata: { subject_id: data.subject_id, exam_type: data.exam_type, total_marks: data.total_marks },
    req,
  });

  return exam;
}

// ---------------- SCHEDULES & CONFLICT DETECTION ----------------
async function checkScheduleConflict({ exam_date, start_time, end_time, venue, batch_year, excludeScheduleId = null }) {
  const parsedDate = new Date(exam_date);
  // Strip time component for PostgreSQL date equality
  parsedDate.setUTCHours(0, 0, 0, 0);

  const existingSchedules = await prisma.examSchedule.findMany({
    where: {
      exam_date: parsedDate,
      ...(excludeScheduleId ? { NOT: { schedule_id: excludeScheduleId } } : {}),
    },
    include: {
      exam: { include: { subject: true } },
    },
  });

  for (const item of existingSchedules) {
    if (isTimeOverlapping(start_time, end_time, item.start_time, item.end_time)) {
      // 1. Venue conflict
      if (item.venue.toLowerCase().trim() === venue.toLowerCase().trim()) {
        return {
          hasConflict: true,
          type: 'VENUE_CONFLICT',
          message: `Venue conflict: "${venue}" is already booked for ${item.exam.subject.subject_code} (${item.start_time} - ${item.end_time}) on ${parsedDate.toDateString()}.`,
        };
      }

      // 2. Student batch conflict
      if (batch_year && item.batch_year && Number(batch_year) === Number(item.batch_year)) {
        return {
          hasConflict: true,
          type: 'BATCH_CONFLICT',
          message: `Batch conflict: Batch ${batch_year} already has ${item.exam.subject.subject_code} scheduled during (${item.start_time} - ${item.end_time}) on ${parsedDate.toDateString()}.`,
        };
      }
    }
  }

  return { hasConflict: false };
}

async function createExamSchedule(data, adminId, req) {
  const parsedDate = new Date(data.exam_date);
  parsedDate.setUTCHours(0, 0, 0, 0);

  // Database transaction with conflict safeguard
  const schedule = await prisma.$transaction(async (tx) => {
    const conflict = await checkScheduleConflict({
      exam_date: data.exam_date,
      start_time: data.start_time,
      end_time: data.end_time,
      venue: data.venue,
      batch_year: data.batch_year,
    });

    if (conflict.hasConflict) {
      throw new ApiError(409, conflict.message);
    }

    return tx.examSchedule.create({
      data: {
        exam_id: data.exam_id,
        exam_date: parsedDate,
        start_time: data.start_time,
        end_time: data.end_time,
        venue: data.venue,
        batch_year: data.batch_year,
        assigned_faculty_id: data.assigned_faculty_id,
        is_published: data.is_published || false,
      },
      include: {
        exam: { include: { subject: true } },
        assigned_faculty: { include: { user: true } },
      },
    });
  });

  await createAuditLog({
    userId: adminId,
    action: 'EXAM_SCHEDULE_CREATED',
    affectedResource: 'EXAM_SCHEDULE',
    resourceId: schedule.schedule_id,
    metadata: { venue: data.venue, exam_date: data.exam_date, batch_year: data.batch_year },
    req,
  });

  return schedule;
}

async function updateExamSchedule(scheduleId, data, adminId, req) {
  const parsedDate = data.exam_date ? new Date(data.exam_date) : undefined;
  if (parsedDate) parsedDate.setUTCHours(0, 0, 0, 0);

  const schedule = await prisma.$transaction(async (tx) => {
    const current = await tx.examSchedule.findUnique({ where: { schedule_id: scheduleId } });
    if (!current) throw new ApiError(404, 'Schedule not found.');

    const checkData = {
      exam_date: data.exam_date || current.exam_date,
      start_time: data.start_time || current.start_time,
      end_time: data.end_time || current.end_time,
      venue: data.venue || current.venue,
      batch_year: data.batch_year !== undefined ? data.batch_year : current.batch_year,
      excludeScheduleId: scheduleId,
    };

    const conflict = await checkScheduleConflict(checkData);
    if (conflict.hasConflict) {
      throw new ApiError(409, conflict.message);
    }

    return tx.examSchedule.update({
      where: { schedule_id: scheduleId },
      data: {
        exam_date: parsedDate,
        start_time: data.start_time,
        end_time: data.end_time,
        venue: data.venue,
        batch_year: data.batch_year,
        assigned_faculty_id: data.assigned_faculty_id,
        is_published: data.is_published,
      },
      include: {
        exam: { include: { subject: true } },
        assigned_faculty: { include: { user: true } },
      },
    });
  });

  await createAuditLog({
    userId: adminId,
    action: 'EXAM_SCHEDULE_UPDATED',
    affectedResource: 'EXAM_SCHEDULE',
    resourceId: scheduleId,
    metadata: data,
    req,
  });

  return schedule;
}

async function publishExamSchedule(scheduleId, isPublished, adminId, req) {
  const schedule = await prisma.examSchedule.update({
    where: { schedule_id: scheduleId },
    data: { is_published: isPublished },
    include: {
      exam: { include: { subject: { include: { course: true } } } },
      assigned_faculty: { include: { user: true } },
    },
  });

  // Notify batch students if published
  if (isPublished && schedule.batch_year) {
    const students = await prisma.student.findMany({
      where: {
        batch_year: schedule.batch_year,
        course_id: schedule.exam.subject.course_id,
        is_active: true,
      },
      include: { user: true },
    });

    for (const s of students) {
      await prisma.notification.create({
        data: {
          user_id: s.user.user_id,
          message: `Official Schedule Published: ${schedule.exam.subject.subject_name} (${schedule.exam.exam_type}) on ${new Date(schedule.exam_date).toDateString()} at ${schedule.start_time}. Venue: ${schedule.venue}.`,
          type: 'TIMETABLE',
          delivery_status: 'Sent',
        },
      });
    }

    if (schedule.assigned_faculty) {
      await prisma.notification.create({
        data: {
          user_id: schedule.assigned_faculty.user.user_id,
          message: `You have been assigned as invigilator/coordinator for ${schedule.exam.subject.subject_code} on ${new Date(schedule.exam_date).toDateString()} (${schedule.start_time} - ${schedule.end_time}).`,
          type: 'TIMETABLE',
          delivery_status: 'Sent',
        },
      });
    }
  }

  await createAuditLog({
    userId: adminId,
    action: isPublished ? 'SCHEDULE_PUBLISHED' : 'SCHEDULE_UNPUBLISHED',
    affectedResource: 'EXAM_SCHEDULE',
    resourceId: scheduleId,
    metadata: { is_published: isPublished },
    req,
  });

  return schedule;
}

async function getAllSchedules(filters = {}, user = null) {
  const where = {};
  if (filters.course_id) where.exam = { subject: { course_id: Number(filters.course_id) } };
  if (filters.subject_id) where.exam_id = { in: (await prisma.exam.findMany({ where: { subject_id: Number(filters.subject_id) }, select: { exam_id: true } })).map(e => e.exam_id) };
  if (filters.batch_year) where.batch_year = Number(filters.batch_year);
  if (filters.venue) where.venue = { contains: filters.venue, mode: 'insensitive' };

  // Students can only see published timetables
  if (user && user.role === 'Student') {
    where.is_published = true;
  } else if (filters.is_published !== undefined) {
    where.is_published = filters.is_published === 'true' || filters.is_published === true;
  }

  return prisma.examSchedule.findMany({
    where,
    include: {
      exam: {
        include: { subject: { include: { course: true } } },
      },
      assigned_faculty: {
        include: { user: true },
      },
      _count: { select: { hall_tickets: true, attendance: true } },
    },
    orderBy: [{ exam_date: 'asc' }, { start_time: 'asc' }],
  });
}

module.exports = {
  getAllExams,
  createExam,
  checkScheduleConflict,
  createExamSchedule,
  updateExamSchedule,
  publishExamSchedule,
  getAllSchedules,
};
