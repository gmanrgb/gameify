import type { Goal, GoalWithRecurrence, Cadence } from '../schemas/goal.schema.js';
import type { Task } from '../schemas/task.schema.js';
import type { Checkin } from '../schemas/checkin.schema.js';
import type { Profile, Theme } from '../schemas/profile.schema.js';
import type { Badge, BadgeKey } from '../schemas/badge.schema.js';
import type { Recurrence } from '../schemas/recurrence.schema.js';

// Re-export schema types
export type { Goal, GoalWithRecurrence, Cadence, Task, Checkin, Profile, Theme, Badge, BadgeKey, Recurrence };

// API Response types
export interface TodayGoalData {
  goal: GoalWithRecurrence;
  tasks: Task[];
  periodProgress: {
    current: number;
    target: number;
    completed: boolean;
  };
  checkins: Checkin[];
}

export interface TodayResponse {
  date: string;
  profile: Profile;
  goals: TodayGoalData[];
  isPerfectDay: boolean;
  recentBadges: Badge[];
}

export interface CheckinResponse {
  checkin: Checkin;
  xpEarned: number;
  profile: Profile;
  streakUpdate?: {
    newStreak: number;
    isNewBest: boolean;
  };
  badgesUnlocked: Badge[];
  isPerfectDay: boolean;
  perfectDayBonus?: number;
}

export interface WeeklyReviewDay {
  date: string;
  xpEarned: number;
  checkinsCount: number;
  isPerfectDay: boolean;
}

export interface WeeklyReviewResponse {
  startDate: string;
  endDate: string;
  days: WeeklyReviewDay[];
  totals: {
    xp: number;
    checkins: number;
    perfectDays: number;
  };
  streakHighlights: {
    goalId: string;
    goalTitle: string;
    currentStreak: number;
  }[];
}

export interface MonthlyReviewResponse {
  month: string;
  days: WeeklyReviewDay[];
  totals: {
    xp: number;
    checkins: number;
    perfectDays: number;
  };
  streakHighlights: {
    goalId: string;
    goalTitle: string;
    currentStreak: number;
  }[];
}

export interface BackupData {
  version: number;
  exportedAt: string;
  data: {
    profile: Profile;
    goals: Goal[];
    recurrence: Recurrence[];
    tasks: Task[];
    checkins: Checkin[];
    badges: Badge[];
    perfectDaysLog: string[];
  };
}

export interface UseFreezeResponse {
  success: boolean;
  newFreezeTokens: number;
  streakPreserved: number;
}

// Streak update result
export interface StreakResult {
  action: 'none' | 'increment' | 'reset' | 'freeze_eligible';
  newStreak: number;
  newBestStreak?: number;
  missedPeriod?: string;
}
