import { z } from 'zod';

export const TaskSchema = z.object({
  id: z.string().uuid(),
  goalId: z.string().uuid(),
  title: z.string().min(1).max(200),
  notes: z.string().max(1000).nullable().default(null),
  active: z.boolean().default(true),
  orderIndex: z.number().int().min(0).default(0),
  createdAt: z.string().datetime(),
});

export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(1000).optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(1000).nullable().optional(),
  active: z.boolean().optional(),
});

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const ReorderTasksSchema = z.object({
  taskIds: z.array(z.string().uuid()),
});

export type ReorderTasksInput = z.infer<typeof ReorderTasksSchema>;
