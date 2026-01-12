import { z } from 'zod';

// API Response wrappers
export const ApiSuccessSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(['VALIDATION_ERROR', 'NOT_FOUND', 'CONFLICT', 'INTERNAL_ERROR']),
    message: z.string(),
    details: z.record(z.string()).optional(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export function createApiSuccess<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

export function createApiError(
  code: ApiError['error']['code'],
  message: string,
  details?: Record<string, string>
): ApiError {
  return {
    success: false,
    error: { code, message, details },
  };
}

// Query parameter schemas
export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const GoalsQuerySchema = z.object({
  archived: z.coerce.boolean().default(false),
});

export const DateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const WeeklyReviewQuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const MonthlyReviewQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export const UseFreezeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
