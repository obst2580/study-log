import { create } from 'zustand';
import type { Subject, AppSettings } from '../../shared/types';

interface AppState {
  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Subjects
  subjects: Subject[];
  selectedSubjectId: string | null;
  loadSubjects: () => Promise<void>;
  setSelectedSubject: (id: string | null) => void;

  // Reviews due
  reviewsDueCount: number;
  setReviewsDueCount: (count: number) => void;

  // Search -> detail navigation
  searchSelectedTopicId: string | null;
  setSearchSelectedTopicId: (id: string | null) => void;

  // Settings
  settings: Partial<AppSettings>;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: 'light',
  setTheme: (theme) => {
    set({ theme });
    document.documentElement.setAttribute('data-theme', theme);
    if (window.electronAPI) {
      window.electronAPI.updateSettings({ theme });
    }
  },

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  subjects: [],
  selectedSubjectId: null,
  loadSubjects: async () => {
    if (!window.electronAPI) return;
    try {
      const subjects = await window.electronAPI.getSubjects();
      set({ subjects });
    } catch (err) {
      console.error('Failed to load subjects:', err);
    }
  },
  setSelectedSubject: (id) => set({ selectedSubjectId: id }),

  reviewsDueCount: 0,
  setReviewsDueCount: (count) => set({ reviewsDueCount: count }),

  searchSelectedTopicId: null,
  setSearchSelectedTopicId: (id) => set({ searchSelectedTopicId: id }),

  settings: {},
  loadSettings: async () => {
    if (!window.electronAPI) return;
    try {
      const settings = await window.electronAPI.getSettings();
      if (settings) {
        const s = settings as Record<string, unknown>;
        const theme = (s.theme as 'light' | 'dark') ?? 'light';
        set({ settings: settings as Partial<AppSettings>, theme });
        document.documentElement.setAttribute('data-theme', theme);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  },
  updateSettings: async (newSettings) => {
    if (!window.electronAPI) return;
    try {
      const updated = await window.electronAPI.updateSettings(newSettings);
      set({ settings: updated as Partial<AppSettings> });
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  },
}));
