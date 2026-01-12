// Local Storage Database - No backend required!
import { v4 as uuidv4 } from 'uuid';
import type {
  Profile,
  GoalWithRecurrence,
  Task,
  Checkin,
  Badge,
  CreateGoalInput,
  CreateTaskInput,
} from '@questlog/shared';
import {
  calculateLevel,
  getPeriodKey,
  getPreviousPeriodKey,
  getCurrentTimestamp,
  formatDateString,
} from '@questlog/shared';

const STORAGE_KEYS = {
  PROFILE: 'questlog_profile',
  GOALS: 'questlog_goals',
  TASKS: 'questlog_tasks',
  CHECKINS: 'questlog_checkins',
  BADGES: 'questlog_badges',
  PERFECT_DAYS: 'questlog_perfect_days',
};

// Initialize default data
function getDefaultProfile(): Profile {
  return {
    id: 1,
    xpTotal: 0,
    level: 1,
    perfectDays: 0,
    theme: 'aurora',
    accent: '#7C3AED',
  };
}

function getDefaultBadges(): Badge[] {
  return [
    { id: 'b1', key: 'streak_7', title: 'Week Warrior', description: 'Reach a 7-day streak', icon: '🔥', unlockedAt: null },
    { id: 'b2', key: 'streak_30', title: 'Monthly Master', description: 'Reach a 30-day streak', icon: '⚡', unlockedAt: null },
    { id: 'b3', key: 'streak_100', title: 'Century Club', description: 'Reach a 100-day streak', icon: '💎', unlockedAt: null },
    { id: 'b4', key: 'xp_1000', title: 'XP Collector', description: 'Earn 1,000 XP', icon: '⭐', unlockedAt: null },
    { id: 'b5', key: 'xp_10000', title: 'XP Hoarder', description: 'Earn 10,000 XP', icon: '🌟', unlockedAt: null },
    { id: 'b6', key: 'perfect_day_10', title: 'Perfect Ten', description: 'Achieve 10 perfect days', icon: '✨', unlockedAt: null },
    { id: 'b7', key: 'perfect_day_50', title: 'Consistency King', description: 'Achieve 50 perfect days', icon: '👑', unlockedAt: null },
    { id: 'b8', key: 'level_10', title: 'Double Digits', description: 'Reach level 10', icon: '🎯', unlockedAt: null },
    { id: 'b9', key: 'goals_5', title: 'Goal Getter', description: 'Create 5 goals', icon: '📋', unlockedAt: null },
    { id: 'b10', key: 'first_checkin', title: 'First Step', description: 'Complete your first check-in', icon: '🚀', unlockedAt: null },
  ];
}

// Storage helpers
function load<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function save<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Profile
export function getProfile(): Profile {
  return load(STORAGE_KEYS.PROFILE, getDefaultProfile());
}

export function updateProfile(updates: Partial<Profile>): Profile {
  const profile = getProfile();
  const updated = { ...profile, ...updates };
  save(STORAGE_KEYS.PROFILE, updated);
  return updated;
}

function addXp(amount: number): { profile: Profile; badgesUnlocked: Badge[] } {
  const profile = getProfile();
  const newXpTotal = profile.xpTotal + amount;
  const newLevel = calculateLevel(newXpTotal);
  const leveledUp = newLevel > profile.level;

  const updated = updateProfile({
    xpTotal: newXpTotal,
    level: newLevel,
  });

  const badgesUnlocked: Badge[] = [];

  // Check XP badges
  if (newXpTotal >= 1000) badgesUnlocked.push(...unlockBadge('xp_1000'));
  if (newXpTotal >= 10000) badgesUnlocked.push(...unlockBadge('xp_10000'));
  if (leveledUp && newLevel >= 10) badgesUnlocked.push(...unlockBadge('level_10'));

  return { profile: updated, badgesUnlocked };
}

// Goals
export function getGoals(archived = false): GoalWithRecurrence[] {
  const goals = load<GoalWithRecurrence[]>(STORAGE_KEYS.GOALS, []);
  const tasks = load<Task[]>(STORAGE_KEYS.TASKS, []);

  return goals
    .filter(g => g.archived === archived)
    .map(g => ({
      ...g,
      taskCount: tasks.filter(t => t.goalId === g.id && t.active).length,
    }));
}

export function createGoal(input: CreateGoalInput): { goal: GoalWithRecurrence; badgesUnlocked: Badge[] } {
  const goals = load<GoalWithRecurrence[]>(STORAGE_KEYS.GOALS, []);
  
  const newGoal: GoalWithRecurrence = {
    id: uuidv4(),
    title: input.title,
    cadence: input.cadence,
    color: input.color,
    xpPerCheck: input.xpPerCheck || 10,
    archived: false,
    currentStreak: 0,
    bestStreak: 0,
    lastPeriodKey: null,
    freezeTokens: 0,
    createdAt: getCurrentTimestamp(),
    recurrence: input.recurrence || null,
    taskCount: 0,
  };

  goals.push(newGoal);
  save(STORAGE_KEYS.GOALS, goals);

  const badgesUnlocked: Badge[] = [];
  const activeGoals = goals.filter(g => !g.archived).length;
  if (activeGoals >= 5) badgesUnlocked.push(...unlockBadge('goals_5'));

  return { goal: newGoal, badgesUnlocked };
}

export function updateGoal(id: string, updates: Partial<GoalWithRecurrence>): GoalWithRecurrence | null {
  const goals = load<GoalWithRecurrence[]>(STORAGE_KEYS.GOALS, []);
  const index = goals.findIndex(g => g.id === id);
  if (index === -1) return null;

  goals[index] = { ...goals[index], ...updates };
  save(STORAGE_KEYS.GOALS, goals);
  return goals[index];
}

export function archiveGoal(id: string): boolean {
  return !!updateGoal(id, { archived: true });
}

export function unarchiveGoal(id: string): boolean {
  return !!updateGoal(id, { archived: false });
}

// Tasks
export function getTasks(goalId: string): Task[] {
  const tasks = load<Task[]>(STORAGE_KEYS.TASKS, []);
  return tasks.filter(t => t.goalId === goalId && t.active).sort((a, b) => a.orderIndex - b.orderIndex);
}

export function createTask(goalId: string, input: CreateTaskInput): Task {
  const tasks = load<Task[]>(STORAGE_KEYS.TASKS, []);
  const goalTasks = tasks.filter(t => t.goalId === goalId);

  const newTask: Task = {
    id: uuidv4(),
    goalId,
    title: input.title,
    notes: input.notes || null,
    active: true,
    orderIndex: goalTasks.length,
    createdAt: getCurrentTimestamp(),
  };

  tasks.push(newTask);
  save(STORAGE_KEYS.TASKS, tasks);
  return newTask;
}

export function updateTask(taskId: string, updates: Partial<Task>): Task | null {
  const tasks = load<Task[]>(STORAGE_KEYS.TASKS, []);
  const index = tasks.findIndex(t => t.id === taskId);
  if (index === -1) return null;

  tasks[index] = { ...tasks[index], ...updates };
  save(STORAGE_KEYS.TASKS, tasks);
  return tasks[index];
}

export function deleteTask(taskId: string): boolean {
  return !!updateTask(taskId, { active: false });
}

// Checkins
export function getCheckins(goalId: string, date: string): Checkin[] {
  const checkins = load<Checkin[]>(STORAGE_KEYS.CHECKINS, []);
  return checkins.filter(c => c.goalId === goalId && c.date === date);
}

export function getAllCheckinsForDate(date: string): Checkin[] {
  const checkins = load<Checkin[]>(STORAGE_KEYS.CHECKINS, []);
  return checkins.filter(c => c.date === date);
}

export function createCheckin(data: { date: string; goalId: string; taskId?: string }): {
  checkin: Checkin;
  xpEarned: number;
  profile: Profile;
  streakUpdate?: { newStreak: number; isNewBest: boolean };
  badgesUnlocked: Badge[];
  isPerfectDay: boolean;
  perfectDayBonus?: number;
} {
  const checkins = load<Checkin[]>(STORAGE_KEYS.CHECKINS, []);
  const goals = load<GoalWithRecurrence[]>(STORAGE_KEYS.GOALS, []);

  // Check for existing checkin
  const existing = checkins.find(
    c => c.goalId === data.goalId && c.date === data.date && c.taskId === (data.taskId || null)
  );
  if (existing) {
    return {
      checkin: existing,
      xpEarned: 0,
      profile: getProfile(),
      badgesUnlocked: [],
      isPerfectDay: checkPerfectDay(data.date),
    };
  }

  const goal = goals.find(g => g.id === data.goalId);
  if (!goal) throw new Error('Goal not found');

  const xpEarned = goal.xpPerCheck;
  const newCheckin: Checkin = {
    id: uuidv4(),
    goalId: data.goalId,
    taskId: data.taskId || null,
    date: data.date,
    xpEarned,
    createdAt: getCurrentTimestamp(),
  };

  checkins.push(newCheckin);
  save(STORAGE_KEYS.CHECKINS, checkins);

  // Add XP
  const { profile, badgesUnlocked } = addXp(xpEarned);

  // Check first checkin badge
  if (checkins.length === 1) {
    badgesUnlocked.push(...unlockBadge('first_checkin'));
  }

  // Update streak
  const periodKey = getPeriodKey(goal.cadence, data.date);
  let streakUpdate: { newStreak: number; isNewBest: boolean } | undefined;

  if (goal.lastPeriodKey !== periodKey) {
    const previousPeriodKey = getPreviousPeriodKey(goal.cadence, periodKey);
    let newStreak = 1;

    if (goal.lastPeriodKey === previousPeriodKey) {
      newStreak = goal.currentStreak + 1;
    }

    const isNewBest = newStreak > goal.bestStreak;
    updateGoal(goal.id, {
      currentStreak: newStreak,
      bestStreak: isNewBest ? newStreak : goal.bestStreak,
      lastPeriodKey: periodKey,
    });

    streakUpdate = { newStreak, isNewBest };

    // Check streak badges
    if (newStreak >= 7) badgesUnlocked.push(...unlockBadge('streak_7'));
    if (newStreak >= 30) badgesUnlocked.push(...unlockBadge('streak_30'));
    if (newStreak >= 100) badgesUnlocked.push(...unlockBadge('streak_100'));

    // Award freeze token every 7 days
    if (newStreak > 0 && newStreak % 7 === 0) {
      updateGoal(goal.id, { freezeTokens: (goal.freezeTokens || 0) + 1 });
    }
  }

  // Check perfect day
  const isPerfectDay = checkPerfectDay(data.date);
  let perfectDayBonus: number | undefined;

  if (isPerfectDay) {
    const perfectDays = load<string[]>(STORAGE_KEYS.PERFECT_DAYS, []);
    if (!perfectDays.includes(data.date)) {
      perfectDays.push(data.date);
      save(STORAGE_KEYS.PERFECT_DAYS, perfectDays);

      perfectDayBonus = 25;
      addXp(25);
      updateProfile({ perfectDays: (getProfile().perfectDays || 0) + 1 });

      const totalPerfectDays = perfectDays.length;
      if (totalPerfectDays >= 10) badgesUnlocked.push(...unlockBadge('perfect_day_10'));
      if (totalPerfectDays >= 50) badgesUnlocked.push(...unlockBadge('perfect_day_50'));
    }
  }

  return {
    checkin: newCheckin,
    xpEarned,
    profile: getProfile(),
    streakUpdate,
    badgesUnlocked: badgesUnlocked.filter(b => b !== null),
    isPerfectDay,
    perfectDayBonus,
  };
}

export function undoCheckin(data: { date: string; goalId: string; taskId?: string }): boolean {
  const checkins = load<Checkin[]>(STORAGE_KEYS.CHECKINS, []);
  const index = checkins.findIndex(
    c => c.goalId === data.goalId && c.date === data.date && c.taskId === (data.taskId || null)
  );

  if (index === -1) return false;

  const checkin = checkins[index];
  checkins.splice(index, 1);
  save(STORAGE_KEYS.CHECKINS, checkins);

  // Remove XP
  const profile = getProfile();
  updateProfile({
    xpTotal: Math.max(0, profile.xpTotal - checkin.xpEarned),
    level: calculateLevel(Math.max(0, profile.xpTotal - checkin.xpEarned)),
  });

  return true;
}

function checkPerfectDay(date: string): boolean {
  const goals = getGoals(false).filter(g => g.cadence === 'daily');
  if (goals.length === 0) return false;

  const checkins = getAllCheckinsForDate(date);
  const checkedGoalIds = new Set(checkins.map(c => c.goalId));

  return goals.every(g => checkedGoalIds.has(g.id));
}

// Badges
export function getBadges(): Badge[] {
  return load(STORAGE_KEYS.BADGES, getDefaultBadges());
}

export function getRecentBadges(): Badge[] {
  const badges = getBadges();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return badges.filter(b => b.unlockedAt && b.unlockedAt >= oneDayAgo);
}

function unlockBadge(key: string): Badge[] {
  const badges = getBadges();
  const badge = badges.find(b => b.key === key);
  if (!badge || badge.unlockedAt) return [];

  badge.unlockedAt = getCurrentTimestamp();
  save(STORAGE_KEYS.BADGES, badges);
  return [badge];
}

// Today data
export function getTodayData(date: string) {
  const profile = getProfile();
  const goals = getGoals(false);
  const recentBadges = getRecentBadges();

  const goalsWithProgress = goals.map(goal => {
    const tasks = getTasks(goal.id);
    const checkins = getCheckins(goal.id, date);

    let target = 1;
    if (goal.cadence === 'weekly' && goal.recurrence?.weeklyTarget) {
      target = goal.recurrence.weeklyTarget;
    } else if (goal.cadence === 'monthly' && goal.recurrence?.monthlyTarget) {
      target = goal.recurrence.monthlyTarget;
    }

    const current = tasks.length > 0
      ? checkins.length
      : checkins.length > 0 ? 1 : 0;

    return {
      goal,
      tasks,
      checkins,
      periodProgress: {
        current,
        target: tasks.length > 0 ? tasks.length : target,
        completed: current >= (tasks.length > 0 ? tasks.length : target),
      },
    };
  });

  return {
    date,
    profile,
    goals: goalsWithProgress,
    isPerfectDay: checkPerfectDay(date),
    recentBadges,
  };
}

// Review
export function getWeeklyReview(startDate: string) {
  const days = [];
  let totalXp = 0;
  let totalCheckins = 0;
  let totalPerfectDays = 0;

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = formatDateString(date);

    const checkins = getAllCheckinsForDate(dateStr);
    const xpEarned = checkins.reduce((sum, c) => sum + c.xpEarned, 0);
    const isPerfectDay = checkPerfectDay(dateStr);

    days.push({
      date: dateStr,
      xpEarned,
      checkinsCount: checkins.length,
      isPerfectDay,
    });

    totalXp += xpEarned;
    totalCheckins += checkins.length;
    if (isPerfectDay) totalPerfectDays++;
  }

  const goals = getGoals(false);
  const streakHighlights = goals
    .filter(g => g.currentStreak > 0)
    .sort((a, b) => b.currentStreak - a.currentStreak)
    .slice(0, 5)
    .map(g => ({
      goalId: g.id,
      goalTitle: g.title,
      currentStreak: g.currentStreak,
    }));

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  return {
    startDate,
    endDate: formatDateString(endDate),
    days,
    totals: { xp: totalXp, checkins: totalCheckins, perfectDays: totalPerfectDays },
    streakHighlights,
  };
}

// Backup
export function exportBackup() {
  return {
    version: 1,
    exportedAt: getCurrentTimestamp(),
    data: {
      profile: getProfile(),
      goals: load<GoalWithRecurrence[]>(STORAGE_KEYS.GOALS, []),
      tasks: load<Task[]>(STORAGE_KEYS.TASKS, []),
      checkins: load<Checkin[]>(STORAGE_KEYS.CHECKINS, []),
      badges: getBadges(),
      perfectDays: load<string[]>(STORAGE_KEYS.PERFECT_DAYS, []),
    },
  };
}

export function importBackup(data: ReturnType<typeof exportBackup>['data']) {
  save(STORAGE_KEYS.PROFILE, data.profile);
  save(STORAGE_KEYS.GOALS, data.goals);
  save(STORAGE_KEYS.TASKS, data.tasks);
  save(STORAGE_KEYS.CHECKINS, data.checkins);
  save(STORAGE_KEYS.BADGES, data.badges);
  save(STORAGE_KEYS.PERFECT_DAYS, data.perfectDays);
}

export function resetAllData() {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}
