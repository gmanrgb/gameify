import { z } from 'zod';

export const RecurrenceSchema = z.object({
  goalId: z.string().uuid(),
  weeklyTarget: z.number().int().min(1).max(7).nullable().default(null),
  monthlyTarget: z.number().int().min(1).max(31).nullable().default(null),
  weekdaysMask: z.number().int().min(0).max(127).nullable().default(null),
  dueTimeMinutes: z.number().int().min(0).max(1439).nullable().default(null),
});

export type Recurrence = z.infer<typeof RecurrenceSchema>;

// ISO 8601 weekday bitmask (Monday = 0)
export const WEEKDAY_BITS = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 4,
  THURSDAY: 8,
  FRIDAY: 16,
  SATURDAY: 32,
  SUNDAY: 64,
} as const;

export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export function isWeekdayActive(mask: number, dayIndex: number): boolean {
  return (mask & (1 << dayIndex)) !== 0;
}

export function getActiveWeekdays(mask: number): string[] {
  return WEEKDAY_NAMES.filter((_, i) => isWeekdayActive(mask, i));
}

export function createWeekdaysMask(days: number[]): number {
  return days.reduce((mask, day) => mask | (1 << day), 0);
}
