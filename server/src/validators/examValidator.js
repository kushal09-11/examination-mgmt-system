const { z } = require('zod');

const examSchema = z.object({
  subject_id: z.number().int().positive(),
  exam_type: z.enum(['Internal', 'External', 'Online']),
  total_marks: z.number().int().positive('Total marks must be positive'),
  duration_minutes: z.number().int().min(10, 'Duration must be at least 10 minutes'),
});

const examScheduleSchema = z.object({
  exam_id: z.number().int().positive(),
  exam_date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid exam date format' }),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:mm 24-hour format'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:mm 24-hour format'),
  venue: z.string().min(2, 'Venue is required').max(100),
  batch_year: z.number().int().min(2000).max(2100).optional().nullable(),
  assigned_faculty_id: z.number().int().positive().optional().nullable(),
  is_published: z.boolean().optional(),
});

module.exports = {
  examSchema,
  examScheduleSchema,
};
