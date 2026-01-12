import { z } from 'zod';

export const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const CheckinSchema = z.object({
  id: z.string().uuid(),
  goalId: z.string().uuid(),
  taskId: z.string().uuid().nullable(),
  date: DateStringSchema,
  xpEarned: z.number().int().min(0),
  createdAt: z.string().datetime(),
});

export type Checkin = z.infer<typeof CheckinSchema>;

export const CreateCheckinSchema = z.object({
  date: DateStringSchema,
  goalId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
});

export type CreateCheckinInput = z.infer<typeof CreateCheckinSchema>;

export const UndoCheckinSchema = z.object({
  date: DateStringSchema,
  goalId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
});

export type UndoCheckinInput = z.infer<typeof UndoCheckinSchema>;
