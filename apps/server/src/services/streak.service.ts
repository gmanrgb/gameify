import type Database from 'better-sqlite3';
import { getPeriodKey, getPreviousPeriodKey, type Cadence, type StreakResult } from '@questlog/shared';

interface GoalRow {
  id: string;
  cadence: string;
  current_streak: number;
  best_streak: number;
  last_period_key: string | null;
  freeze_tokens: number;
}

export function updateStreakOnCheckin(
  db: Database.Database,
  goalId: string,
  dateStr: string
): StreakResult {
  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(goalId) as GoalRow | undefined;
  if (!goal) {
    throw new Error(`Goal not found: ${goalId}`);
  }

  const currentPeriodKey = getPeriodKey(goal.cadence as Cadence, dateStr);
  const previousPeriodKey = getPreviousPeriodKey(goal.cadence as Cadence, currentPeriodKey);

  // Already completed this period - no change
  if (goal.last_period_key === currentPeriodKey) {
    return { action: 'none', newStreak: goal.current_streak };
  }

  let newStreak: number;
  let newBestStreak = goal.best_streak;
  let action: StreakResult['action'];

  if (goal.last_period_key === previousPeriodKey) {
    // Consecutive period - increment streak
    newStreak = goal.current_streak + 1;
    newBestStreak = Math.max(goal.best_streak, newStreak);
    action = 'increment';
  } else if (goal.last_period_key === null) {
    // First ever check-in
    newStreak = 1;
    newBestStreak = 1;
    action = 'increment';
  } else {
    // Streak broken - reset
    newStreak = 1;
    action = 'reset';
  }

  // Update goal in database
  db.prepare(`
    UPDATE goals 
    SET current_streak = ?, best_streak = ?, last_period_key = ?
    WHERE id = ?
  `).run(newStreak, newBestStreak, currentPeriodKey, goalId);

  // Award freeze token for every 7-streak milestone
  if (newStreak > 0 && newStreak % 7 === 0) {
    db.prepare('UPDATE goals SET freeze_tokens = freeze_tokens + 1 WHERE id = ?').run(goalId);
  }

  return {
    action,
    newStreak,
    newBestStreak,
  };
}

export function checkFreezeEligibility(
  db: Database.Database,
  goalId: string,
  dateStr: string
): { eligible: boolean; missedPeriod?: string } {
  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(goalId) as GoalRow | undefined;
  if (!goal || goal.freeze_tokens <= 0) {
    return { eligible: false };
  }

  const currentPeriodKey = getPeriodKey(goal.cadence as Cadence, dateStr);
  const previousPeriodKey = getPreviousPeriodKey(goal.cadence as Cadence, currentPeriodKey);
  const twoPeriodsBefore = getPreviousPeriodKey(goal.cadence as Cadence, previousPeriodKey);

  // Freeze is only valid if exactly one period was missed
  if (goal.last_period_key === twoPeriodsBefore) {
    return { eligible: true, missedPeriod: previousPeriodKey };
  }

  return { eligible: false };
}

export function useFreeze(
  db: Database.Database,
  goalId: string,
  dateStr: string
): { success: boolean; newFreezeTokens: number; streakPreserved: number } {
  const { eligible, missedPeriod } = checkFreezeEligibility(db, goalId, dateStr);
  
  if (!eligible || !missedPeriod) {
    const goal = db.prepare('SELECT freeze_tokens FROM goals WHERE id = ?').get(goalId) as { freeze_tokens: number } | undefined;
    return { success: false, newFreezeTokens: goal?.freeze_tokens || 0, streakPreserved: 0 };
  }

  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(goalId) as GoalRow;
  
  // Use the freeze token
  db.prepare(`
    UPDATE goals 
    SET freeze_tokens = freeze_tokens - 1, last_period_key = ?
    WHERE id = ?
  `).run(missedPeriod, goalId);

  const updatedGoal = db.prepare('SELECT freeze_tokens, current_streak FROM goals WHERE id = ?').get(goalId) as { freeze_tokens: number; current_streak: number };

  return {
    success: true,
    newFreezeTokens: updatedGoal.freeze_tokens,
    streakPreserved: updatedGoal.current_streak,
  };
}

export function awardFreezeTokenOnLevelUp(db: Database.Database): void {
  // Award 1 freeze token to all active goals on level up
  db.prepare('UPDATE goals SET freeze_tokens = freeze_tokens + 1 WHERE archived = 0').run();
}
