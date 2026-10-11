const { z } = require('zod');

const questionSchema = z.object({
  subject_id: z.number().int().positive(),
  question_text: z.string().min(5, 'Question text must be at least 5 characters'),
  question_type: z.enum(['MCQ', 'ShortAnswer', 'Essay']),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  marks: z.number().int().positive('Marks must be positive'),
  unit: z.number().int().min(1).max(20).optional().nullable(),
  tags: z.string().max(255).optional().nullable(),
  options: z.array(z.string()).optional().nullable(),
  correct_answer: z.string().min(1, 'Correct answer is required'),
  explanation: z.string().optional().nullable(),
  is_published: z.boolean().default(true),
});

const paperGenerationSchema = z.object({
  subject_id: z.number().int().positive(),
  title: z.string().min(3).max(150),
  total_marks: z.number().int().positive(),
  exam_id: z.number().int().positive().optional().nullable(),
  difficulty_distribution: z.object({
    Easy: z.number().min(0).max(100).default(30),
    Medium: z.number().min(0).max(100).default(50),
    Hard: z.number().min(0).max(100).default(20),
  }).optional(),
  type_distribution: z.object({
    MCQ: z.number().min(0).max(100).default(40),
    ShortAnswer: z.number().min(0).max(100).default(30),
    Essay: z.number().min(0).max(100).default(30),
  }).optional(),
});

module.exports = {
  questionSchema,
  paperGenerationSchema,
};
