import { z } from 'zod';

export const CadenceSchema = z.enum(['daily', 'weekly', 'monthly']);
export type Cadence = z.infer<typeof CadenceSchema>;

export const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format');

export const GoalSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100),
  cadence: CadenceSchema,
  color: HexColorSchema,
  xpPerCheck: z.number().int().min(1).max(100).default(10),
  archived: z.boolean().default(false),
  currentStreak: z.number().int().min(0).default(0),
  bestStreak: z.number().int().min(0).default(0),
  lastPeriodKey: z.string().nullable().default(null),
  freezeTokens: z.number().int().min(0).default(0),
  createdAt: z.string().datetime(),
});

export type Goal = z.infer<typeof GoalSchema>;

export const CreateGoalSchema = z.object({
  title: z.string().min(1).max(100),
  cadence: CadenceSchema,
  color: HexColorSchema,
  xpPerCheck: z.number().int().min(1).max(100).optional().default(10),
  recurrence: z.object({
    weeklyTarget: z.number().int().min(1).max(7).optional(),
    monthlyTarget: z.number().int().min(1).max(31).optional(),
    weekdaysMask: z.number().int().min(0).max(127).optional(),
    dueTimeMinutes: z.number().int().min(0).max(1439).optional(),
  }).optional(),
});

export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;

export const UpdateGoalSchema = CreateGoalSchema.partial();
export type UpdateGoalInput = z.infer<typeof UpdateGoalSchema>;

export const GoalWithRecurrenceSchema = GoalSchema.extend({
  recurrence: z.object({
    weeklyTarget: z.number().nullable(),
    monthlyTarget: z.number().nullable(),
    weekdaysMask: z.number().nullable(),
    dueTimeMinutes: z.number().nullable(),
  }).nullable(),
  taskCount: z.number().int().min(0),
});

export type GoalWithRecurrence = z.infer<typeof GoalWithRecurrenceSchema>;
