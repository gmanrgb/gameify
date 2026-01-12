// Client-side API using localStorage - No backend needed!
import * as storage from '../lib/storage';
import type {
  Profile,
  GoalWithRecurrence,
  Task,
  Badge,
  TodayResponse,
  CheckinResponse,
  WeeklyReviewResponse,
  CreateGoalInput,
  UpdateGoalInput,
  CreateTaskInput,
  UpdateTaskInput,
  UseFreezeResponse,
} from '@questlog/shared';

export const api = {
  // Health - always returns ok for client-side
  health: async () => ({ status: 'ok', database: 'localStorage', timestamp: new Date().toISOString() }),

  // Profile
  getProfile: async (): Promise<Profile> => storage.getProfile(),
  
  updateProfile: async (data: { theme?: string; accent?: string }): Promise<Profile> => 
    storage.updateProfile(data),

  // Goals
  getGoals: async (archived = false): Promise<{ goals: GoalWithRecurrence[] }> => ({
    goals: storage.getGoals(archived),
  }),
  
  createGoal: async (data: CreateGoalInput): Promise<{ goal: GoalWithRecurrence; badgesUnlocked: Badge[] }> =>
    storage.createGoal(data),
  
  updateGoal: async (id: string, data: UpdateGoalInput): Promise<{ goal: GoalWithRecurrence }> => {
    const goal = storage.updateGoal(id, data);
    if (!goal) throw new Error('Goal not found');
    return { goal };
  },
  
  archiveGoal: async (id: string): Promise<{ archived: boolean }> => ({
    archived: storage.archiveGoal(id),
  }),
  
  unarchiveGoal: async (id: string): Promise<{ archived: boolean }> => ({
    archived: !storage.unarchiveGoal(id),
  }),
  
  useFreeze: async (goalId: string, date: string): Promise<UseFreezeResponse> => {
    // Simplified freeze logic for client-side
    const goals = storage.getGoals(false);
    const goal = goals.find(g => g.id === goalId);
    if (!goal || goal.freezeTokens <= 0) {
      throw new Error('No freeze tokens available');
    }
    storage.updateGoal(goalId, { freezeTokens: goal.freezeTokens - 1 });
    return {
      success: true,
      newFreezeTokens: goal.freezeTokens - 1,
      streakPreserved: goal.currentStreak,
    };
  },

  // Tasks
  getTasks: async (goalId: string): Promise<{ tasks: Task[] }> => ({
    tasks: storage.getTasks(goalId),
  }),
  
  createTask: async (goalId: string, data: CreateTaskInput): Promise<{ task: Task }> => ({
    task: storage.createTask(goalId, data),
  }),
  
  updateTask: async (taskId: string, data: UpdateTaskInput): Promise<{ task: Task }> => {
    const task = storage.updateTask(taskId, data);
    if (!task) throw new Error('Task not found');
    return { task };
  },
  
  deleteTask: async (taskId: string): Promise<{ deleted: boolean }> => ({
    deleted: storage.deleteTask(taskId),
  }),
  
  reorderTasks: async (goalId: string, taskIds: string[]): Promise<{ tasks: Task[] }> => {
    taskIds.forEach((id, index) => {
      storage.updateTask(id, { orderIndex: index });
    });
    return { tasks: storage.getTasks(goalId) };
  },

  // Today & Checkins
  getToday: async (date: string): Promise<TodayResponse> => storage.getTodayData(date) as TodayResponse,
  
  createCheckin: async (data: { date: string; goalId: string; taskId?: string }): Promise<CheckinResponse> =>
    storage.createCheckin(data) as CheckinResponse,
  
  undoCheckin: async (data: { date: string; goalId: string; taskId?: string }): Promise<{ undone: boolean; profile: Profile; isPerfectDay: boolean }> => {
    const undone = storage.undoCheckin(data);
    return {
      undone,
      profile: storage.getProfile(),
      isPerfectDay: false,
    };
  },

  // Review
  getWeeklyReview: async (startDate: string): Promise<WeeklyReviewResponse> =>
    storage.getWeeklyReview(startDate) as WeeklyReviewResponse,
  
  getMonthlyReview: async (month: string): Promise<WeeklyReviewResponse> => {
    // Convert month (YYYY-MM) to start date
    const startDate = `${month}-01`;
    return storage.getWeeklyReview(startDate) as WeeklyReviewResponse;
  },

  // Backup
  exportBackup: () => {
    const data = storage.exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questlog-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  
  importBackup: async (file: File): Promise<{ imported: boolean }> => {
    const text = await file.text();
    const data = JSON.parse(text);
    storage.importBackup(data.data);
    return { imported: true };
  },
  
  resetData: async (): Promise<{ reset: boolean }> => {
    storage.resetAllData();
    return { reset: true };
  },
};
