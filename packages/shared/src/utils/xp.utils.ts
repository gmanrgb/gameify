/**
 * XP required to go from a level to the next level
 * Level 1 → 2: 100 XP
 * Level 2 → 3: 140 XP
 * Level 3 → 4: 180 XP
 * Formula: 100 + (level - 1) * 40
 */
export function xpToNextLevel(level: number): number {
  return 100 + (level - 1) * 40;
}

/**
 * Calculate cumulative XP threshold to reach a specific level
 * Level 1: 0 XP
 * Level 2: 100 XP
 * Level 3: 240 XP
 * Level 4: 420 XP
 */
export function xpThresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += xpToNextLevel(l);
  }
  return total;
}

/**
 * Calculate level from total XP
 */
export function calculateLevel(totalXp: number): number {
  let level = 1;
  let threshold = 0;
  
  while (totalXp >= threshold + xpToNextLevel(level)) {
    threshold += xpToNextLevel(level);
    level++;
  }
  
  return level;
}

/**
 * Get XP progress within current level
 * Returns { current, required, percentage }
 */
export function getLevelProgress(totalXp: number): {
  current: number;
  required: number;
  percentage: number;
} {
  const level = calculateLevel(totalXp);
  const levelStart = xpThresholdForLevel(level);
  const required = xpToNextLevel(level);
  const current = totalXp - levelStart;
  const percentage = Math.min(100, Math.round((current / required) * 100));
  
  return { current, required, percentage };
}

/**
 * XP earned from a perfect day
 */
export const PERFECT_DAY_BONUS = 25;

/**
 * Default XP per check-in
 */
export const DEFAULT_XP_PER_CHECK = 10;

/**
 * Calculate XP earned and check for level up
 */
export function calculateXpGain(
  currentTotalXp: number,
  xpEarned: number
): {
  newTotalXp: number;
  oldLevel: number;
  newLevel: number;
  didLevelUp: boolean;
} {
  const oldLevel = calculateLevel(currentTotalXp);
  const newTotalXp = currentTotalXp + xpEarned;
  const newLevel = calculateLevel(newTotalXp);
  
  return {
    newTotalXp,
    oldLevel,
    newLevel,
    didLevelUp: newLevel > oldLevel,
  };
}
