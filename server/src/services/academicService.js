const prisma = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { createAuditLog } = require('../utils/auditLogger');

// ---------------- COURSES ----------------
async function getAllCourses() {
  return prisma.course.findMany({
    include: {
      _count: { select: { subjects: true, students: true } },
    },
    orderBy: { course_name: 'asc' },
  });
}

async function createCourse(data, adminId, req) {
  const course = await prisma.course.create({ data });
  await createAuditLog({
    userId: adminId,
    action: 'COURSE_CREATED',
    affectedResource: 'COURSE',
    resourceId: course.course_id,
    metadata: { course_name: course.course_name },
    req,
  });
  return course;
}

async function updateCourse(courseId, data, adminId, req) {
  const course = await prisma.course.update({
    where: { course_id: courseId },
    data,
  });
  await createAuditLog({
    userId: adminId,
    action: 'COURSE_UPDATED',
    affectedResource: 'COURSE',
    resourceId: courseId,
    metadata: data,
    req,
  });
  return course;
}

// ---------------- SUBJECTS ----------------
async function getAllSubjects(filters = {}) {
  const where = {};
  if (filters.course_id) where.course_id = Number(filters.course_id);
  if (filters.semester) where.semester = Number(filters.semester);

  return prisma.subject.findMany({
    where,
    include: {
      course: true,
      faculty_links: {
        include: { faculty: { include: { user: true } } },
      },
      _count: { select: { exams: true, questions: true } },
    },
    orderBy: [{ semester: 'asc' }, { subject_code: 'asc' }],
  });
}

async function createSubject(data, adminId, req) {
  const existing = await prisma.subject.findUnique({
    where: { subject_code: data.subject_code },
  });
  if (existing) {
    throw new ApiError(409, `Subject code ${data.subject_code} already exists.`);
  }

  const subject = await prisma.subject.create({ data });
  await createAuditLog({
    userId: adminId,
    action: 'SUBJECT_CREATED',
    affectedResource: 'SUBJECT',
    resourceId: subject.subject_id,
    metadata: { subject_code: subject.subject_code, subject_name: subject.subject_name },
    req,
  });
  return subject;
}

async function updateSubject(subjectId, data, adminId, req) {
  if (data.subject_code) {
    const existing = await prisma.subject.findFirst({
      where: { subject_code: data.subject_code, NOT: { subject_id: subjectId } },
    });
    if (existing) {
      throw new ApiError(409, `Subject code ${data.subject_code} already belongs to another subject.`);
    }
  }

  const subject = await prisma.subject.update({
    where: { subject_id: subjectId },
    data,
  });
  await createAuditLog({
    userId: adminId,
    action: 'SUBJECT_UPDATED',
    affectedResource: 'SUBJECT',
    resourceId: subjectId,
    metadata: data,
    req,
  });
  return subject;
}

// ---------------- FACULTY SUBJECT ASSIGNMENTS ----------------
async function assignFacultyToSubject({ faculty_id, subject_id, is_primary_coordinator }, adminId, req) {
  // If setting as primary, remove existing primary for this subject
  if (is_primary_coordinator) {
    await prisma.facultySubject.updateMany({
      where: { subject_id, is_primary_coordinator: true },
      data: { is_primary_coordinator: false },
    });
  }

  const assignment = await prisma.facultySubject.upsert({
    where: {
      faculty_id_subject_id: { faculty_id, subject_id },
    },
    update: { is_primary_coordinator },
    create: { faculty_id, subject_id, is_primary_coordinator },
    include: { faculty: { include: { user: true } }, subject: true },
  });

  await createAuditLog({
    userId: adminId,
    action: 'FACULTY_ASSIGNED_SUBJECT',
    affectedResource: 'FACULTY_SUBJECT',
    resourceId: assignment.id,
    metadata: { faculty_id, subject_id, is_primary_coordinator },
    req,
  });

  return assignment;
}

async function removeFacultyFromSubject(faculty_id, subject_id, adminId, req) {
  await prisma.facultySubject.delete({
    where: { faculty_id_subject_id: { faculty_id, subject_id } },
  });

  await createAuditLog({
    userId: adminId,
    action: 'FACULTY_UNASSIGNED_SUBJECT',
    affectedResource: 'FACULTY_SUBJECT',
    metadata: { faculty_id, subject_id },
    req,
  });

  return true;
}

// ---------------- STUDENTS ----------------
async function getStudents(query = {}) {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const where = {};
  if (query.course_id) where.course_id = Number(query.course_id);
  if (query.batch_year) where.batch_year = Number(query.batch_year);
  if (query.is_active !== undefined) where.is_active = query.is_active === 'true' || query.is_active === true;

  if (query.search) {
    where.OR = [
      { enrollment_no: { contains: query.search, mode: 'insensitive' } },
      { user: { full_name: { contains: query.search, mode: 'insensitive' } } },
      { user: { email: { contains: query.search, mode: 'insensitive' } } },
      { user: { institutional_id: { contains: query.search, mode: 'insensitive' } } },
    ];
  }

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: { select: { user_id: true, full_name: true, email: true, status: true, contact_number: true, institutional_id: true } },
        course: true,
        _count: { select: { results: true, attendance: true, hall_tickets: true } },
      },
      orderBy: { student_id: 'desc' },
    }),
  ]);

  return {
    data: students,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getStudentById(studentId) {
  const student = await prisma.student.findUnique({
    where: { student_id: studentId },
    include: {
      user: true,
      course: true,
      results: { include: { exam: { include: { subject: true } } } },
      attendance: { include: { schedule: { include: { exam: { include: { subject: true } } } } } },
      hall_tickets: { include: { schedule: { include: { exam: { include: { subject: true } } } } } },
    },
  });

  if (!student) throw new ApiError(404, 'Student record not found.');
  return student;
}

async function updateStudent(studentId, data, adminId, req) {
  const current = await prisma.student.findUnique({
    where: { student_id: studentId },
    include: { user: true },
  });
  if (!current) throw new ApiError(404, 'Student not found.');

  const updated = await prisma.$transaction(async (tx) => {
    if (data.full_name || data.contact_number) {
      await tx.user.update({
        where: { user_id: current.user_id },
        data: {
          full_name: data.full_name || undefined,
          contact_number: data.contact_number || undefined,
        },
      });
    }

    return tx.student.update({
      where: { student_id: studentId },
      data: {
        course_id: data.course_id || undefined,
        batch_year: data.batch_year || undefined,
        attendance_pct: data.attendance_pct !== undefined ? data.attendance_pct : undefined,
        is_active: data.is_active !== undefined ? data.is_active : undefined,
      },
      include: { user: true, course: true },
    });
  });

  await createAuditLog({
    userId: adminId,
    action: 'STUDENT_UPDATED',
    affectedResource: 'STUDENT',
    resourceId: studentId,
    metadata: data,
    req,
  });

  return updated;
}

async function deactivateStudent(studentId, adminId, req) {
  // Soft deactivation to preserve historical examination records as per SRS rule
  const student = await prisma.student.update({
    where: { student_id: studentId },
    data: { is_active: false },
    include: { user: true },
  });

  await prisma.user.update({
    where: { user_id: student.user_id },
    data: { status: 'inactive' },
  });

  await createAuditLog({
    userId: adminId,
    action: 'STUDENT_DEACTIVATED',
    affectedResource: 'STUDENT',
    resourceId: studentId,
    metadata: { reason: 'Soft deactivation requested' },
    req,
  });

  return student;
}

// ---------------- FACULTY ----------------
async function getAllFaculty() {
  return prisma.faculty.findMany({
    include: {
      user: { select: { user_id: true, full_name: true, email: true, status: true, contact_number: true, institutional_id: true } },
      assignments: { include: { subject: { include: { course: true } } } },
    },
    orderBy: { faculty_id: 'asc' },
  });
}

module.exports = {
  getAllCourses,
  createCourse,
  updateCourse,
  getAllSubjects,
  createSubject,
  updateSubject,
  assignFacultyToSubject,
  removeFacultyFromSubject,
  getStudents,
  getStudentById,
  updateStudent,
  deactivateStudent,
  getAllFaculty,
};
