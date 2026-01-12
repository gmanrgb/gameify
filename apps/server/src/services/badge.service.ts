import type Database from 'better-sqlite3';
import { getCurrentTimestamp, type Badge, type BadgeKey } from '@questlog/shared';

interface BadgeRow {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  unlocked_at: string | null;
}

export function getAllBadges(db: Database.Database): Badge[] {
  const rows = db.prepare('SELECT * FROM badges').all() as BadgeRow[];
  return rows.map(rowToBadge);
}

export function getRecentBadges(db: Database.Database, hoursAgo: number = 24): Badge[] {
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  const rows = db.prepare(`
    SELECT * FROM badges 
    WHERE unlocked_at IS NOT NULL AND unlocked_at >= ?
    ORDER BY unlocked_at DESC
  `).all(cutoff) as BadgeRow[];
  return rows.map(rowToBadge);
}

export function unlockBadge(db: Database.Database, badgeKey: BadgeKey): Badge | null {
  const existing = db.prepare('SELECT * FROM badges WHERE key = ?').get(badgeKey) as BadgeRow | undefined;
  
  if (!existing || existing.unlocked_at) {
    return null; // Already unlocked or doesn't exist
  }

  const now = getCurrentTimestamp();
  db.prepare('UPDATE badges SET unlocked_at = ? WHERE key = ?').run(now, badgeKey);
  
  return rowToBadge({ ...existing, unlocked_at: now });
}

export function checkAndUnlockBadges(
  db: Database.Database,
  context: {
    xpTotal?: number;
    level?: number;
    perfectDays?: number;
    newStreak?: number;
    isFirstCheckin?: boolean;
    goalCount?: number;
  }
): Badge[] {
  const unlocked: Badge[] = [];

  // First check-in badge
  if (context.isFirstCheckin) {
    const badge = unlockBadge(db, 'first_checkin');
    if (badge) unlocked.push(badge);
  }

  // Streak badges
  if (context.newStreak) {
    if (context.newStreak >= 7) {
      const badge = unlockBadge(db, 'streak_7');
      if (badge) unlocked.push(badge);
    }
    if (context.newStreak >= 30) {
      const badge = unlockBadge(db, 'streak_30');
      if (badge) unlocked.push(badge);
    }
    if (context.newStreak >= 100) {
      const badge = unlockBadge(db, 'streak_100');
      if (badge) unlocked.push(badge);
    }
  }

  // XP badges
  if (context.xpTotal) {
    if (context.xpTotal >= 1000) {
      const badge = unlockBadge(db, 'xp_1000');
      if (badge) unlocked.push(badge);
    }
    if (context.xpTotal >= 10000) {
      const badge = unlockBadge(db, 'xp_10000');
      if (badge) unlocked.push(badge);
    }
  }

  // Level badge
  if (context.level && context.level >= 10) {
    const badge = unlockBadge(db, 'level_10');
    if (badge) unlocked.push(badge);
  }

  // Perfect days badges
  if (context.perfectDays) {
    if (context.perfectDays >= 10) {
      const badge = unlockBadge(db, 'perfect_day_10');
      if (badge) unlocked.push(badge);
    }
    if (context.perfectDays >= 50) {
      const badge = unlockBadge(db, 'perfect_day_50');
      if (badge) unlocked.push(badge);
    }
  }

  // Goal count badge
  if (context.goalCount && context.goalCount >= 5) {
    const badge = unlockBadge(db, 'goals_5');
    if (badge) unlocked.push(badge);
  }

  return unlocked;
}

function rowToBadge(row: BadgeRow): Badge {
  return {
    id: row.id,
    key: row.key as BadgeKey,
    title: row.title,
    description: row.description,
    icon: row.icon,
    unlockedAt: row.unlocked_at,
  };
}
