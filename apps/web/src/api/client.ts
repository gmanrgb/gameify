import type {
  Profile,
  GoalWithRecurrence,
  Task,
  Checkin,
  Badge,
  TodayResponse,
  CheckinResponse,
  WeeklyReviewResponse,
  MonthlyReviewResponse,
  CreateGoalInput,
  UpdateGoalInput,
  CreateTaskInput,
  UpdateTaskInput,
  UseFreezeResponse,
} from '@questlog/shared';

const API_BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: HeadersInit = {
    ...options.headers,
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json = await response.json() as ApiResponse<T>;

  if (!response.ok || !json.success) {
    throw new Error(json.error?.message || 'Request failed');
  }

  return json.data as T;
}

export const api = {
  // Health
  health: () => request<{ status: string; database: string; timestamp: string }>('/health'),

  // Profile
  getProfile: () => request<Profile>('/profile'),
  updateProfile: (data: { theme?: string; accent?: string }) =>
    request<Profile>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Goals
  getGoals: (archived = false) =>
    request<{ goals: GoalWithRecurrence[] }>(`/goals?archived=${archived}`),
  
  createGoal: (data: CreateGoalInput) =>
    request<{ goal: GoalWithRecurrence; badgesUnlocked: Badge[] }>('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateGoal: (id: string, data: UpdateGoalInput) =>
    request<{ goal: GoalWithRecurrence }>(`/goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  archiveGoal: (id: string) =>
    request<{ archived: boolean }>(`/goals/${id}/archive`, { method: 'POST' }),
  
  unarchiveGoal: (id: string) =>
    request<{ archived: boolean }>(`/goals/${id}/unarchive`, { method: 'POST' }),
  
  useFreeze: (goalId: string, date: string) =>
    request<UseFreezeResponse>(`/goals/${goalId}/use-freeze`, {
      method: 'POST',
      body: JSON.stringify({ date }),
    }),

  // Tasks
  getTasks: (goalId: string) =>
    request<{ tasks: Task[] }>(`/goals/${goalId}/tasks`),
  
  createTask: (goalId: string, data: CreateTaskInput) =>
    request<{ task: Task }>(`/goals/${goalId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateTask: (taskId: string, data: UpdateTaskInput) =>
    request<{ task: Task }>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  deleteTask: (taskId: string) =>
    request<{ deleted: boolean }>(`/tasks/${taskId}`, { method: 'DELETE' }),
  
  reorderTasks: (goalId: string, taskIds: string[]) =>
    request<{ tasks: Task[] }>(`/goals/${goalId}/tasks/reorder`, {
      method: 'POST',
      body: JSON.stringify({ taskIds }),
    }),

  // Today & Checkins
  getToday: (date: string) =>
    request<TodayResponse>(`/today?date=${date}`),
  
  createCheckin: (data: { date: string; goalId: string; taskId?: string }) =>
    request<CheckinResponse>('/checkins', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  undoCheckin: (data: { date: string; goalId: string; taskId?: string }) =>
    request<{ undone: boolean; profile: Profile; isPerfectDay: boolean }>('/checkins/undo', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Review
  getWeeklyReview: (startDate: string) =>
    request<WeeklyReviewResponse>(`/review/weekly?start=${startDate}`),
  
  getMonthlyReview: (month: string) =>
    request<MonthlyReviewResponse>(`/review/monthly?month=${month}`),

  // Backup
  exportBackup: () => {
    window.open(`${API_BASE}/backup/export`, '_blank');
  },
  
  importBackup: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}/backup/import`, {
      method: 'POST',
      body: formData,
    });
    
    const json = await response.json();
    if (!json.success) {
      throw new Error(json.error?.message || 'Import failed');
    }
    return json.data;
  },
  
  resetData: () =>
    request<{ reset: boolean }>('/backup/reset', { method: 'POST' }),
};
