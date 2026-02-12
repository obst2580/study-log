import { create } from 'zustand';
import { apiService } from '../api/apiService';
import type { Topic, KanbanColumn, DailyProgress } from '../../shared/types';

interface SelfEvalState {
  open: boolean;
  topicId: string | null;
  topicTitle: string;
  fromColumn: KanbanColumn;
  masteryCount: number;
}

export interface RewardData {
  xp: number;
  gems: { type: string; amount: number }[];
  mastered: boolean;
  topicTitle: string;
}

interface KanbanState {
  topics: Topic[];
  completedToday: Topic[];
  dailyProgress: DailyProgress | null;
  loading: boolean;
  error: string | null;
  lastSubjectFilter: string | null;

  lastReward: RewardData | null;
  clearReward: () => void;

  selfEval: SelfEvalState;
  openSelfEval: (topicId: string, topicTitle: string, fromColumn: KanbanColumn) => void;
  closeSelfEval: () => void;
  submitSelfEval: (data: { understandingScore: number; selfNote: string }) => Promise<void>;

  loadTopics: (subjectId?: string | null) => Promise<void>;
  loadCompletedToday: () => Promise<void>;
  loadDailyProgress: () => Promise<void>;
  moveTopic: (topicId: string, toColumn: KanbanColumn, sortOrder: number) => Promise<void>;
  completeTopic: (topicId: string, fromColumn: KanbanColumn) => void;
  createTopic: (data: Partial<Topic>) => Promise<Topic | null>;
  updateTopic: (id: string, data: Partial<Topic>) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;

  getTopicsByColumn: (column: KanbanColumn) => Topic[];
}

const INITIAL_SELF_EVAL: SelfEvalState = {
  open: false,
  topicId: null,
  topicTitle: '',
  fromColumn: 'today',
  masteryCount: 0,
};

export const useKanbanStore = create<KanbanState>((set, get) => ({
  topics: [],
  completedToday: [],
  dailyProgress: null,
  loading: false,
  error: null,
  lastSubjectFilter: null,

  lastReward: null,
  clearReward: () => set({ lastReward: null }),

  selfEval: { ...INITIAL_SELF_EVAL },

  openSelfEval: (topicId, topicTitle, fromColumn) => {
    const topic = get().topics.find((t) => t.id === topicId);
    const masteryCount = topic?.masteryCount ?? 0;
    set({ selfEval: { open: true, topicId, topicTitle, fromColumn, masteryCount } });
  },

  closeSelfEval: () => {
    set({ selfEval: { ...INITIAL_SELF_EVAL } });
  },

  submitSelfEval: async ({ understandingScore, selfNote }) => {
    const { selfEval, lastSubjectFilter } = get();
    if (!selfEval.topicId) return;

    try {
      const result = await apiService.createReview({
        topicId: selfEval.topicId,
        fromColumn: selfEval.fromColumn,
        understandingScore,
        selfNote,
      });

      // Show reward toast
      if (result.xpAwarded || (result.gemsAwarded && result.gemsAwarded.length > 0)) {
        set({
          lastReward: {
            xp: result.xpAwarded ?? 0,
            gems: result.gemsAwarded ?? [],
            mastered: result.mastered ?? false,
            topicTitle: selfEval.topicTitle,
          },
        });
      }

      await get().loadTopics(lastSubjectFilter);
      await get().loadCompletedToday();
      await get().loadDailyProgress();
    } catch (err) {
      console.error('Failed to submit self evaluation:', err);
    } finally {
      set({ selfEval: { ...INITIAL_SELF_EVAL } });
    }
  },

  loadTopics: async (subjectId) => {
    set({ loading: true, error: null, lastSubjectFilter: subjectId ?? null });
    try {
      const filters = subjectId ? { subjectId } : undefined;
      const topics = await apiService.getTopics(filters);
      set({ topics: topics as Topic[], loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  moveTopic: async (topicId, toColumn, sortOrder) => {
    // Optimistic update
    const prevTopics = get().topics;
    const optimisticTopics = prevTopics.map((t) =>
      t.id === topicId ? { ...t, column: toColumn, sortOrder } : t
    );
    set({ topics: optimisticTopics });

    try {
      await apiService.moveTopic(topicId, toColumn, sortOrder);
    } catch (err) {
      console.error('Failed to move topic:', err);
      // Revert on error
      set({ topics: prevTopics });
    }
  },

  completeTopic: async (topicId, fromColumn) => {
    const topic = get().topics.find((t) => t.id === topicId);
    const topicTitle = topic?.title ?? '';
    get().openSelfEval(topicId, topicTitle, fromColumn);
  },

  createTopic: async (data) => {
    try {
      const topic = await apiService.createTopic(data as Parameters<typeof apiService.createTopic>[0]);
      set((s) => ({ topics: [...s.topics, topic as Topic] }));
      return topic as Topic;
    } catch (err) {
      console.error('Failed to create topic:', err);
      return null;
    }
  },

  updateTopic: async (id, data) => {
    try {
      const updated = await apiService.updateTopic(id, data);
      set((s) => ({
        topics: s.topics.map((t) => (t.id === id ? { ...t, ...(updated as Topic) } : t)),
      }));
    } catch (err) {
      console.error('Failed to update topic:', err);
    }
  },

  deleteTopic: async (id) => {
    try {
      await apiService.deleteTopic(id);
      set((s) => ({ topics: s.topics.filter((t) => t.id !== id) }));
    } catch (err) {
      console.error('Failed to delete topic:', err);
    }
  },

  loadCompletedToday: async () => {
    try {
      const completed = await apiService.getCompletedToday();
      set({ completedToday: completed as Topic[] });
    } catch (err) {
      console.error('Failed to load completed today:', err);
    }
  },

  loadDailyProgress: async () => {
    try {
      const progress = await apiService.getDailyProgress();
      set({ dailyProgress: progress });
    } catch (err) {
      console.error('Failed to load daily progress:', err);
    }
  },

  getTopicsByColumn: (column) => {
    return get().topics.filter((t) => t.column === column).sort((a, b) => a.sortOrder - b.sortOrder);
  },
}));
