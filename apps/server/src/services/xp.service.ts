import type Database from 'better-sqlite3';
import { calculateLevel, PERFECT_DAY_BONUS } from '@questlog/shared';
import type { Profile } from '@questlog/shared';

export function getProfile(db: Database.Database): Profile {
  const row = db.prepare('SELECT * FROM profile WHERE id = 1').get() as {
    xp_total: number;
    level: number;
    perfect_days: number;
    theme: string;
    accent: string;
  };

  return {
    xpTotal: row.xp_total,
    level: row.level,
    perfectDays: row.perfect_days,
    theme: row.theme as Profile['theme'],
    accent: row.accent,
  };
}

export function addXp(db: Database.Database, amount: number): { newXp: number; newLevel: number; didLevelUp: boolean } {
  const profile = getProfile(db);
  const oldLevel = profile.level;
  const newXp = profile.xpTotal + amount;
  const newLevel = calculateLevel(newXp);
  const didLevelUp = newLevel > oldLevel;

  db.prepare(`
    UPDATE profile 
    SET xp_total = ?, level = ?
    WHERE id = 1
  `).run(newXp, newLevel);

  return { newXp, newLevel, didLevelUp };
}

export function subtractXp(db: Database.Database, amount: number): { newXp: number; newLevel: number } {
  const profile = getProfile(db);
  const newXp = Math.max(0, profile.xpTotal - amount);
  const newLevel = calculateLevel(newXp);

  db.prepare(`
    UPDATE profile 
    SET xp_total = ?, level = ?
    WHERE id = 1
  `).run(newXp, newLevel);

  return { newXp, newLevel };
}

export function incrementPerfectDays(db: Database.Database): number {
  const result = db.prepare(`
    UPDATE profile 
    SET perfect_days = perfect_days + 1
    WHERE id = 1
    RETURNING perfect_days
  `).get() as { perfect_days: number };

  return result.perfect_days;
}

export function updateProfileSettings(
  db: Database.Database,
  updates: { theme?: string; accent?: string }
): Profile {
  if (updates.theme) {
    db.prepare('UPDATE profile SET theme = ? WHERE id = 1').run(updates.theme);
  }
  if (updates.accent) {
    db.prepare('UPDATE profile SET accent = ? WHERE id = 1').run(updates.accent);
  }
  return getProfile(db);
}
