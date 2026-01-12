import { z } from 'zod';

export const BadgeKeySchema = z.enum([
  'streak_7',
  'streak_30',
  'streak_100',
  'xp_1000',
  'xp_10000',
  'perfect_day_10',
  'perfect_day_50',
  'level_10',
  'goals_5',
  'first_checkin',
]);

export type BadgeKey = z.infer<typeof BadgeKeySchema>;

export const BadgeSchema = z.object({
  id: z.string(),
  key: BadgeKeySchema,
  title: z.string(),
  description: z.string(),
  icon: z.string(),
  unlockedAt: z.string().datetime().nullable(),
});

export type Badge = z.infer<typeof BadgeSchema>;

export const BADGE_DEFINITIONS: Omit<Badge, 'unlockedAt'>[] = [
  { id: 'b1', key: 'streak_7', title: 'Week Warrior', description: 'Reach a 7-day streak', icon: '🔥' },
  { id: 'b2', key: 'streak_30', title: 'Monthly Master', description: 'Reach a 30-day streak', icon: '⚡' },
  { id: 'b3', key: 'streak_100', title: 'Century Club', description: 'Reach a 100-day streak', icon: '💎' },
  { id: 'b4', key: 'xp_1000', title: 'XP Collector', description: 'Earn 1,000 XP', icon: '⭐' },
  { id: 'b5', key: 'xp_10000', title: 'XP Hoarder', description: 'Earn 10,000 XP', icon: '🌟' },
  { id: 'b6', key: 'perfect_day_10', title: 'Perfect Ten', description: 'Achieve 10 perfect days', icon: '✨' },
  { id: 'b7', key: 'perfect_day_50', title: 'Consistency King', description: 'Achieve 50 perfect days', icon: '👑' },
  { id: 'b8', key: 'level_10', title: 'Double Digits', description: 'Reach level 10', icon: '🎯' },
  { id: 'b9', key: 'goals_5', title: 'Goal Getter', description: 'Create 5 goals', icon: '📋' },
  { id: 'b10', key: 'first_checkin', title: 'First Step', description: 'Complete your first check-in', icon: '🚀' },
];
