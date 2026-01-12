import { create } from 'zustand';
import { api } from '../api/client';
import type { Profile, TodayResponse, GoalWithRecurrence, Badge, Theme } from '@questlog/shared';
import { formatDateString } from '@questlog/shared';

interface ToastState {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppState {
  // Profile
  profile: Profile | null;
  theme: Theme;
  
  // Today
  todayData: TodayResponse | null;
  selectedDate: string;
  isLoading: boolean;
  
  // Goals
  goals: GoalWithRecurrence[];
  archivedGoals: GoalWithRecurrence[];
  
  // UI
  toast: ToastState | null;
  
  // Actions
  loadProfile: () => Promise<void>;
  updateTheme: (theme: Theme) => Promise<void>;
  updateAccent: (accent: string) => Promise<void>;
  
  loadToday: (date?: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
  
  loadGoals: () => Promise<void>;
  loadArchivedGoals: () => Promise<void>;
  
  checkIn: (goalId: string, taskId?: string) => Promise<void>;
  undoCheckIn: (goalId: string, taskId?: string) => Promise<void>;
  
  showToast: (type: ToastState['type'], message: string) => void;
  clearToast: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  profile: null,
  theme: 'aurora',
  todayData: null,
  selectedDate: formatDateString(new Date()),
  isLoading: false,
  goals: [],
  archivedGoals: [],
  toast: null,
  
  // Profile actions
  loadProfile: async () => {
    try {
      const profile = await api.getProfile();
      set({ profile, theme: profile.theme });
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  },
  
  updateTheme: async (theme: Theme) => {
    try {
      await api.updateProfile({ theme });
      set({ theme });
    } catch (error) {
      get().showToast('error', 'Failed to update theme');
    }
  },
  
  updateAccent: async (accent: string) => {
    try {
      const profile = await api.updateProfile({ accent });
      set({ profile });
    } catch (error) {
      get().showToast('error', 'Failed to update accent color');
    }
  },
  
  // Today actions
  loadToday: async (date?: string) => {
    const targetDate = date || get().selectedDate;
    set({ isLoading: true });
    
    try {
      const todayData = await api.getToday(targetDate);
      set({ todayData, profile: todayData.profile, isLoading: false });
    } catch (error) {
      console.error('Failed to load today:', error);
      set({ isLoading: false });
      get().showToast('error', 'Failed to load data');
    }
  },
  
  setSelectedDate: (date: string) => {
    set({ selectedDate: date });
    get().loadToday(date);
  },
  
  // Goals actions
  loadGoals: async () => {
    try {
      const { goals } = await api.getGoals(false);
      set({ goals });
    } catch (error) {
      console.error('Failed to load goals:', error);
    }
  },
  
  loadArchivedGoals: async () => {
    try {
      const { goals } = await api.getGoals(true);
      set({ archivedGoals: goals });
    } catch (error) {
      console.error('Failed to load archived goals:', error);
    }
  },
  
  // Checkin actions
  checkIn: async (goalId: string, taskId?: string) => {
    const { selectedDate, loadToday } = get();
    
    try {
      const result = await api.createCheckin({ date: selectedDate, goalId, taskId });
      
      // Update profile
      set({ profile: result.profile });
      
      // Show appropriate notifications
      if (result.badgesUnlocked.length > 0) {
        result.badgesUnlocked.forEach((badge: Badge) => {
          get().showToast('success', `🏆 Badge Unlocked: ${badge.title}!`);
        });
      }
      
      if (result.perfectDayBonus) {
        get().showToast('success', `✨ Perfect Day! +${result.perfectDayBonus} XP bonus!`);
      } else if (result.xpEarned > 0) {
        get().showToast('success', `+${result.xpEarned} XP earned!`);
      }
      
      // Reload today data
      await loadToday();
    } catch (error) {
      get().showToast('error', 'Failed to check in');
    }
  },
  
  undoCheckIn: async (goalId: string, taskId?: string) => {
    const { selectedDate, loadToday } = get();
    
    try {
      const result = await api.undoCheckin({ date: selectedDate, goalId, taskId });
      set({ profile: result.profile });
      await loadToday();
      get().showToast('info', 'Check-in undone');
    } catch (error) {
      get().showToast('error', 'Failed to undo check-in');
    }
  },
  
  // Toast actions
  showToast: (type, message) => {
    set({ toast: { type, message } });
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      set((state) => {
        if (state.toast?.message === message) {
          return { toast: null };
        }
        return state;
      });
    }, 3000);
  },
  
  clearToast: () => set({ toast: null }),
}));
