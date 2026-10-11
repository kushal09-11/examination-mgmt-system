const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Valid email address is required').max(150),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerUserSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Valid email address is required').max(150),
  role: z.enum(['Admin', 'Faculty', 'Student', 'Examiner']),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  contact_number: z.string().optional(),
  institutional_id: z.string().min(3, 'Institutional ID is required').max(50),
  
  // Role specific fields
  department: z.string().optional(),
  designation: z.string().optional(),
  course_id: z.number().int().positive().optional(),
  batch_year: z.number().int().min(2000).max(2100).optional(),
  attendance_pct: z.number().min(0).max(100).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const resetPasswordRequestSchema = z.object({
  email: z.string().email('Valid email address is required'),
});

const resetPasswordConfirmSchema = z.object({
  email: z.string().email('Valid email address is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

module.exports = {
  loginSchema,
  registerUserSchema,
  changePasswordSchema,
  resetPasswordRequestSchema,
  resetPasswordConfirmSchema,
};
