import type Database from 'better-sqlite3';
import { getDayOfWeekBit, getCurrentTimestamp, PERFECT_DAY_BONUS } from '@questlog/shared';

interface GoalRow {
  id: string;
}

export function checkPerfectDay(db: Database.Database, dateStr: string): boolean {
  const dayOfWeek = getDayOfWeekBit(dateStr);
  const dayBit = 1 << dayOfWeek;

  // Get all eligible daily goals for this date
  const eligibleGoals = db.prepare(`
    SELECT g.id FROM goals g
    LEFT JOIN recurrence r ON g.id = r.goal_id
    WHERE g.cadence = 'daily'
      AND g.archived = 0
      AND date(g.created_at) <= date(?)
      AND (r.weekdays_mask IS NULL OR (r.weekdays_mask & ?) != 0)
  `).all(dateStr, dayBit) as GoalRow[];

  if (eligibleGoals.length === 0) {
    return false; // No goals = not perfect
  }

  // Get goals that have at least one check-in today
  const completedGoals = db.prepare(`
    SELECT DISTINCT goal_id FROM checkins WHERE date = ?
  `).all(dateStr) as { goal_id: string }[];

  const completedSet = new Set(completedGoals.map(r => r.goal_id));
  
  return eligibleGoals.every(g => completedSet.has(g.id));
}

export function isPerfectDayAlreadyLogged(db: Database.Database, dateStr: string): boolean {
  const existing = db.prepare('SELECT date FROM perfect_days_log WHERE date = ?').get(dateStr);
  return !!existing;
}

export function logPerfectDay(db: Database.Database, dateStr: string): boolean {
  // Check if already logged
  if (isPerfectDayAlreadyLogged(db, dateStr)) {
    return false;
  }

  // Log the perfect day
  db.prepare('INSERT INTO perfect_days_log (date, achieved_at) VALUES (?, ?)').run(dateStr, getCurrentTimestamp());
  
  return true;
}

export function handlePerfectDayCheck(
  db: Database.Database,
  dateStr: string
): { isPerfectDay: boolean; bonusAwarded: number } {
  const isPerfectDay = checkPerfectDay(db, dateStr);
  
  if (!isPerfectDay) {
    return { isPerfectDay: false, bonusAwarded: 0 };
  }

  // Log and award bonus if first time
  const isNewPerfectDay = logPerfectDay(db, dateStr);
  
  if (isNewPerfectDay) {
    // Increment perfect days count in profile
    db.prepare('UPDATE profile SET perfect_days = perfect_days + 1 WHERE id = 1').run();
    return { isPerfectDay: true, bonusAwarded: PERFECT_DAY_BONUS };
  }

  return { isPerfectDay: true, bonusAwarded: 0 };
}

export function getPerfectDaysInRange(db: Database.Database, startDate: string, endDate: string): string[] {
  const rows = db.prepare(`
    SELECT date FROM perfect_days_log 
    WHERE date >= ? AND date <= ?
    ORDER BY date
  `).all(startDate, endDate) as { date: string }[];
  
  return rows.map(r => r.date);
}
