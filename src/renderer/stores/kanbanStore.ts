import { create } from 'zustand';
import type { Topic, KanbanColumn } from '../../shared/types';

interface KanbanState {
  topics: Topic[];
  loading: boolean;
  error: string | null;
  lastSubjectFilter: string | null;

  loadTopics: (subjectId?: string | null) => Promise<void>;
  moveTopic: (topicId: string, toColumn: KanbanColumn, sortOrder: number) => Promise<void>;
  completeTopic: (topicId: string, fromColumn: KanbanColumn) => Promise<void>;
  createTopic: (data: Partial<Topic>) => Promise<Topic | null>;
  updateTopic: (id: string, data: Partial<Topic>) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;

  getTopicsByColumn: (column: KanbanColumn) => Topic[];
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  topics: [],
  loading: false,
  error: null,
  lastSubjectFilter: null,

  loadTopics: async (subjectId) => {
    if (!window.electronAPI) return;
    set({ loading: true, error: null, lastSubjectFilter: subjectId ?? null });
    try {
      const filters = subjectId ? { subjectId } : undefined;
      const topics = await window.electronAPI.getTopics(filters);
      set({ topics: topics as Topic[], loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  moveTopic: async (topicId, toColumn, sortOrder) => {
    if (!window.electronAPI) return;
    // Optimistic update
    const prevTopics = get().topics;
    const optimisticTopics = prevTopics.map((t) =>
      t.id === topicId ? { ...t, column: toColumn, sortOrder } : t
    );
    set({ topics: optimisticTopics });

    try {
      await window.electronAPI.moveTopic(topicId, toColumn, sortOrder);
    } catch (err) {
      console.error('Failed to move topic:', err);
      // Revert on error
      set({ topics: prevTopics });
    }
  },

  completeTopic: async (topicId, fromColumn) => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.createReview({ topicId, fromColumn });
      // Reload with the same subject filter that was last used
      const { lastSubjectFilter } = get();
      await get().loadTopics(lastSubjectFilter);
    } catch (err) {
      console.error('Failed to complete topic:', err);
    }
  },

  createTopic: async (data) => {
    if (!window.electronAPI) return null;
    try {
      const topic = await window.electronAPI.createTopic(data);
      set((s) => ({ topics: [...s.topics, topic as Topic] }));
      return topic as Topic;
    } catch (err) {
      console.error('Failed to create topic:', err);
      return null;
    }
  },

  updateTopic: async (id, data) => {
    if (!window.electronAPI) return;
    try {
      const updated = await window.electronAPI.updateTopic(id, data);
      set((s) => ({
        topics: s.topics.map((t) => (t.id === id ? { ...t, ...(updated as Topic) } : t)),
      }));
    } catch (err) {
      console.error('Failed to update topic:', err);
    }
  },

  deleteTopic: async (id) => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.deleteTopic(id);
      set((s) => ({ topics: s.topics.filter((t) => t.id !== id) }));
    } catch (err) {
      console.error('Failed to delete topic:', err);
    }
  },

  getTopicsByColumn: (column) => {
    return get().topics.filter((t) => t.column === column).sort((a, b) => a.sortOrder - b.sortOrder);
  },
}));
