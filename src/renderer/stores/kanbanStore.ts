import { create } from 'zustand';
import { apiService } from '../api/apiService';
import type { Topic, KanbanColumn } from '../../shared/types';

interface SelfEvalState {
  open: boolean;
  topicId: string | null;
  topicTitle: string;
  fromColumn: KanbanColumn;
}

interface KanbanState {
  topics: Topic[];
  loading: boolean;
  error: string | null;
  lastSubjectFilter: string | null;

  selfEval: SelfEvalState;
  openSelfEval: (topicId: string, topicTitle: string, fromColumn: KanbanColumn) => void;
  closeSelfEval: () => void;
  submitSelfEval: (data: { understandingScore: number; selfNote: string; moveBack: boolean }) => Promise<void>;

  loadTopics: (subjectId?: string | null) => Promise<void>;
  moveTopic: (topicId: string, toColumn: KanbanColumn, sortOrder: number) => Promise<void>;
  completeTopic: (topicId: string, fromColumn: KanbanColumn) => Promise<void>;
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
};

export const useKanbanStore = create<KanbanState>((set, get) => ({
  topics: [],
  loading: false,
  error: null,
  lastSubjectFilter: null,

  selfEval: { ...INITIAL_SELF_EVAL },

  openSelfEval: (topicId, topicTitle, fromColumn) => {
    set({ selfEval: { open: true, topicId, topicTitle, fromColumn } });
  },

  closeSelfEval: () => {
    set({ selfEval: { ...INITIAL_SELF_EVAL } });
  },

  submitSelfEval: async ({ understandingScore, selfNote, moveBack }) => {
    const { selfEval, lastSubjectFilter } = get();
    if (!selfEval.topicId) return;

    try {
      const reviewData: { topicId: string; fromColumn: string; toColumn?: string; understandingScore?: number; selfNote?: string } = {
        topicId: selfEval.topicId,
        fromColumn: selfEval.fromColumn,
        understandingScore,
        selfNote,
      };

      if (moveBack) {
        reviewData.toColumn = 'today';
      }

      await apiService.createReview(reviewData);
      await get().loadTopics(lastSubjectFilter);
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

  getTopicsByColumn: (column) => {
    return get().topics.filter((t) => t.column === column).sort((a, b) => a.sortOrder - b.sortOrder);
  },
}));
