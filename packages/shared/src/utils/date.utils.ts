import type { Cadence } from '../schemas/goal.schema.js';

/**
 * Get ISO week number (1-52/53) for a given date
 * Week 1 contains the first Thursday of the year
 */
export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return weekNum;
}

/**
 * Get ISO week year (may differ from calendar year for late December/early January)
 */
export function getISOWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

/**
 * Get the period key for a date based on cadence
 * - Daily: YYYY-MM-DD
 * - Weekly: YYYY-Www (ISO week)
 * - Monthly: YYYY-MM
 */
export function getPeriodKey(cadence: Cadence, dateStr: string): string {
  const date = new Date(dateStr);
  
  switch (cadence) {
    case 'daily':
      return dateStr;
    case 'weekly': {
      const weekYear = getISOWeekYear(date);
      const week = getISOWeek(date);
      return `${weekYear}-W${week.toString().padStart(2, '0')}`;
    }
    case 'monthly':
      return dateStr.slice(0, 7); // YYYY-MM
    default:
      throw new Error(`Unknown cadence: ${cadence}`);
  }
}

/**
 * Get the previous period key for streak calculation
 */
export function getPreviousPeriodKey(cadence: Cadence, currentPeriodKey: string): string {
  switch (cadence) {
    case 'daily': {
      const date = new Date(currentPeriodKey);
      date.setDate(date.getDate() - 1);
      return formatDateString(date);
    }
    case 'weekly': {
      // Parse YYYY-Www format
      const [year, week] = currentPeriodKey.split('-W').map(Number);
      if (week === 1) {
        // Get last week of previous year
        const lastDayPrevYear = new Date(year - 1, 11, 31);
        const lastWeek = getISOWeek(lastDayPrevYear);
        return `${year - 1}-W${lastWeek.toString().padStart(2, '0')}`;
      }
      return `${year}-W${(week - 1).toString().padStart(2, '0')}`;
    }
    case 'monthly': {
      const [year, month] = currentPeriodKey.split('-').map(Number);
      if (month === 1) {
        return `${year - 1}-12`;
      }
      return `${year}-${(month - 1).toString().padStart(2, '0')}`;
    }
    default:
      throw new Error(`Unknown cadence: ${cadence}`);
  }
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayString(): string {
  return formatDateString(new Date());
}

/**
 * Get day of week bit for weekdays mask (ISO 8601: 0=Monday, 6=Sunday)
 */
export function getDayOfWeekBit(dateStr: string): number {
  const date = new Date(dateStr);
  const jsDay = date.getDay(); // 0=Sunday, 6=Saturday
  // Convert to ISO: Monday=0, Sunday=6
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Check if a date falls within a period
 */
export function isDateInPeriod(dateStr: string, periodKey: string, cadence: Cadence): boolean {
  return getPeriodKey(cadence, dateStr) === periodKey;
}

/**
 * Get all dates in a week starting from a given date
 */
export function getWeekDates(startDateStr: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDateStr);
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(formatDateString(date));
  }
  
  return dates;
}

/**
 * Get all dates in a month
 */
export function getMonthDates(monthKey: string): string[] {
  const [year, month] = monthKey.split('-').map(Number);
  const dates: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(`${monthKey}-${day.toString().padStart(2, '0')}`);
  }
  
  return dates;
}

/**
 * Parse ISO 8601 datetime string to Date
 */
export function parseDateTime(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Get current ISO 8601 timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Calculate the number of periods between two period keys
 */
export function getPeriodDistance(
  cadence: Cadence,
  fromKey: string | null,
  toKey: string
): number | null {
  if (!fromKey) return null;
  
  let distance = 0;
  let current = toKey;
  
  // Safety limit to prevent infinite loops
  const maxIterations = 1000;
  
  while (current !== fromKey && distance < maxIterations) {
    current = getPreviousPeriodKey(cadence, current);
    distance++;
  }
  
  return distance < maxIterations ? distance : null;
}
