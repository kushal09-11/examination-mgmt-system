const { z } = require('zod');

const courseSchema = z.object({
  course_name: z.string().min(2, 'Course name must be at least 2 characters').max(100),
  duration_years: z.number().int().min(1).max(6),
});

const subjectSchema = z.object({
  subject_code: z.string().min(2, 'Subject code is required').max(20),
  subject_name: z.string().min(2, 'Subject name is required').max(100),
  course_id: z.number().int().positive(),
  semester: z.number().int().min(1).max(12),
  credits: z.number().int().min(1).max(10),
});

const studentUpdateSchema = z.object({
  enrollment_no: z.string().regex(/^\d{4}-[A-Z0-9]+-\d{3}$/, 'Enrollment number must match YYYY-COURSE-XXX format').optional(),
  course_id: z.number().int().positive().optional(),
  batch_year: z.number().int().min(2000).max(2100).optional(),
  attendance_pct: z.number().min(0).max(100).optional(),
  is_active: z.boolean().optional(),
  full_name: z.string().min(2).optional(),
  contact_number: z.string().optional(),
});

const facultyUpdateSchema = z.object({
  department: z.string().min(2).max(100).optional(),
  designation: z.string().min(2).max(50).optional(),
  full_name: z.string().min(2).optional(),
  contact_number: z.string().optional(),
});

const facultyAssignmentSchema = z.object({
  faculty_id: z.number().int().positive(),
  subject_id: z.number().int().positive(),
  is_primary_coordinator: z.boolean().default(false),
});

module.exports = {
  courseSchema,
  subjectSchema,
  studentUpdateSchema,
  facultyUpdateSchema,
  facultyAssignmentSchema,
};
