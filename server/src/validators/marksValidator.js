const { z } = require('zod');

const attendanceRecordSchema = z.object({
  student_id: z.number().int().positive(),
  status: z.enum(['Present', 'Absent']),
});

const bulkAttendanceSchema = z.object({
  schedule_id: z.number().int().positive(),
  records: z.array(attendanceRecordSchema).min(1, 'At least one student attendance record is required'),
});

const marksEntrySchema = z.object({
  student_id: z.number().int().positive(),
  exam_id: z.number().int().positive(),
  marks_obtained: z.number().min(0, 'Marks cannot be negative'),
  remarks: z.string().optional().nullable(),
});

const bulkMarksSchema = z.object({
  exam_id: z.number().int().positive(),
  marks_list: z.array(z.object({
    student_id: z.number().int().positive(),
    marks_obtained: z.number().min(0),
    remarks: z.string().optional().nullable(),
  })).min(1),
});

const moderationSchema = z.object({
  result_id: z.number().int().positive(),
  moderation_status: z.enum(['Approved', 'Rejected']),
  remarks: z.string().optional().nullable(),
  adjusted_marks: z.number().min(0).optional(),
});

const gradingPolicySchema = z.object({
  grade: z.string().min(1).max(5),
  min_percentage: z.number().min(0).max(100),
  max_percentage: z.number().min(0).max(100),
  grade_point: z.number().min(0).max(10),
  description: z.string().optional(),
});

module.exports = {
  bulkAttendanceSchema,
  marksEntrySchema,
  bulkMarksSchema,
  moderationSchema,
  gradingPolicySchema,
};
