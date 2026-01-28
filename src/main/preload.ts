import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // ── Subjects ──
  getSubjects: () => ipcRenderer.invoke('subjects:getAll'),
  createSubject: (data: Record<string, unknown>) => ipcRenderer.invoke('subjects:create', data),
  updateSubject: (id: string, data: Record<string, unknown>) => ipcRenderer.invoke('subjects:update', id, data),
  deleteSubject: (id: string) => ipcRenderer.invoke('subjects:delete', id),

  // ── Units ──
  getUnits: (subjectId: string) => ipcRenderer.invoke('units:getBySubject', subjectId),
  createUnit: (data: Record<string, unknown>) => ipcRenderer.invoke('units:create', data),
  updateUnit: (id: string, data: Record<string, unknown>) => ipcRenderer.invoke('units:update', id, data),
  deleteUnit: (id: string) => ipcRenderer.invoke('units:delete', id),

  // ── Topics ──
  getTopics: (filters?: Record<string, unknown>) => ipcRenderer.invoke('topics:getAll', filters),
  getTopicById: (id: string) => ipcRenderer.invoke('topics:getById', id),
  getTopicsBySubject: (subjectId: string) => ipcRenderer.invoke('topics:getBySubject', subjectId),
  getTopicsByColumn: (column: string) => ipcRenderer.invoke('topics:getByColumn', column),
  createTopic: (data: Record<string, unknown>) => ipcRenderer.invoke('topics:create', data),
  updateTopic: (id: string, data: Record<string, unknown>) => ipcRenderer.invoke('topics:update', id, data),
  deleteTopic: (id: string) => ipcRenderer.invoke('topics:delete', id),
  moveTopic: (id: string, column: string, sortOrder: number) => ipcRenderer.invoke('topics:move', id, column, sortOrder),
  moveTopicToNextColumn: (id: string) => ipcRenderer.invoke('topics:moveToNextColumn', id),

  // ── Checklist ──
  getChecklist: (topicId: string) => ipcRenderer.invoke('topics:getChecklist', topicId),
  upsertChecklistItem: (data: Record<string, unknown>) => ipcRenderer.invoke('topics:upsertChecklistItem', data),
  deleteChecklistItem: (id: string) => ipcRenderer.invoke('topics:deleteChecklistItem', id),

  // ── Links ──
  getLinksByTopic: (topicId: string) => ipcRenderer.invoke('links:getByTopic', topicId),
  upsertLink: (data: Record<string, unknown>) => ipcRenderer.invoke('links:upsert', data),
  deleteLink: (id: string) => ipcRenderer.invoke('links:delete', id),

  // ── Study Sessions ──
  createStudySession: (data: Record<string, unknown>) => ipcRenderer.invoke('studySessions:create', data),
  getStudySessions: (topicId?: string) => ipcRenderer.invoke('studySessions:getAll', topicId),
  getStudySessionsByTopic: (topicId: string) => ipcRenderer.invoke('studySessions:getByTopic', topicId),
  getStudySessionsByDateRange: (startDate: string, endDate: string) => ipcRenderer.invoke('studySessions:getByDateRange', startDate, endDate),
  getDailyStudyCounts: (startDate: string, endDate: string) => ipcRenderer.invoke('studySessions:dailyCounts', startDate, endDate),

  // ── Reviews ──
  createReview: (data: Record<string, unknown>) => ipcRenderer.invoke('reviews:create', data),
  getReviewsByTopic: (topicId: string) => ipcRenderer.invoke('reviews:getByTopic', topicId),
  getRecentReviews: (limit?: number) => ipcRenderer.invoke('reviews:getRecent', limit),
  getUpcomingReviews: () => ipcRenderer.invoke('reviews:getUpcoming'),

  // ── Exams ──
  getExams: () => ipcRenderer.invoke('exams:getAll'),
  createExam: (data: Record<string, unknown>) => ipcRenderer.invoke('exams:create', data),
  updateExam: (id: string, data: Record<string, unknown>) => ipcRenderer.invoke('exams:update', id, data),
  deleteExam: (id: string) => ipcRenderer.invoke('exams:delete', id),

  // ── Stats ──
  getUserStats: () => ipcRenderer.invoke('stats:get'),
  addXp: (amount: number, reason: string) => ipcRenderer.invoke('stats:addXp', amount, reason),
  updateStreak: () => ipcRenderer.invoke('stats:updateStreak'),
  getSubjectMastery: () => ipcRenderer.invoke('stats:subjectMastery'),

  // ── Search ──
  search: (query: string, filters?: Record<string, unknown>) => ipcRenderer.invoke('search:query', query, filters),

  // ── Settings ──
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (data: Record<string, unknown>) => ipcRenderer.invoke('settings:update', data),

  // ── Backup ──
  exportData: () => ipcRenderer.invoke('backup:export'),
  importData: (data: string) => ipcRenderer.invoke('backup:import', data),

  // ── Events from main process ──
  onNavigate: (callback: (route: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, route: string) => callback(route);
    ipcRenderer.on('navigate', handler);
    return () => ipcRenderer.removeListener('navigate', handler);
  },
  onReviewsDue: (callback: (count: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, count: number) => callback(count);
    ipcRenderer.on('reviews-due', handler);
    return () => ipcRenderer.removeListener('reviews-due', handler);
  },
  onNotification: (callback: (data: { title: string; body: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { title: string; body: string }) => callback(data);
    ipcRenderer.on('notification', handler);
    return () => ipcRenderer.removeListener('notification', handler);
  },
};

export type ElectronAPI = typeof api;

contextBridge.exposeInMainWorld('electronAPI', api);
