import { api } from './client';
import type {
  Subject, Unit, Topic, TopicWithRelations, ChecklistItem, Link,
  StudySession, ReviewEntry, Exam, UserStats, AppSettings,
  SubjectMastery, DailyStudyCount, User,
  WeeklyGoal, GoalItem, ChildSummary, WeeklyActivity,
  WeeklyReflection, Achievement, AchievementWithStatus,
  WeakTopic, StudyEfficiency,
  MonthlyReport, ChallengeWithParticipants, LearningPatterns,
  CurriculumTemplate, CurriculumTemplateDetail,
} from '../../shared/types';

type QueryParams = Record<string, string | number | boolean | undefined>;

function toQueryString(params: QueryParams): string {
  const filtered = Object.entries(params).filter(([, v]) => v !== undefined);
  if (filtered.length === 0) return '';
  return '?' + filtered.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

export const apiService = {
  // Auth
  login: (email: string, password: string) =>
    api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string; grade?: string; role?: string }) =>
    api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/register', data),
  getMe: () => api.get<User>('/auth/me'),

  // Curriculum
  getCurriculumTemplates: () => api.get<CurriculumTemplate[]>('/curriculum/templates'),
  getCurriculumTemplate: (grade: string) => api.get<CurriculumTemplateDetail>(`/curriculum/templates/${grade}`),
  generateCurriculum: (grade: string) => api.post<{ id: string; status: string }>('/curriculum/generate', { grade }),
  getCurriculumStatus: (id: string) => api.get<{ id: string; status: string }>(`/curriculum/generate/${id}/status`),
  applyCurriculum: (templateId: string) => api.post<{ success: boolean }>('/curriculum/apply', { templateId }),

  // Subjects
  getSubjects: () => api.get<Subject[]>('/subjects'),
  createSubject: (data: { name: string; color?: string; icon?: string }) => api.post<Subject>('/subjects', data),
  updateSubject: (id: string, data: Partial<Subject>) => api.patch<Subject>(`/subjects/${id}`, data),
  deleteSubject: (id: string) => api.delete<{ success: boolean }>(`/subjects/${id}`),

  // Units
  getUnits: (subjectId: string) => api.get<Unit[]>(`/subjects/${subjectId}/units`),
  createUnit: (data: { subjectId: string; name: string }) => {
    const { subjectId, ...rest } = data;
    return api.post<Unit>(`/subjects/${subjectId}/units`, rest);
  },
  updateUnit: (subjectId: string, id: string, data: { name?: string; sortOrder?: number }) =>
    api.patch<Unit>(`/subjects/${subjectId}/units/${id}`, data),
  deleteUnit: (subjectId: string, id: string) =>
    api.delete<{ success: boolean }>(`/subjects/${subjectId}/units/${id}`),

  // Topics
  getTopics: (filters?: { subjectId?: string; column?: string; unitId?: string }) => {
    const params = filters as QueryParams | undefined;
    return api.get<Topic[]>(`/topics${params ? toQueryString(params) : ''}`);
  },
  getTopicById: (id: string) => api.get<TopicWithRelations>(`/topics/${id}`),
  getTopicsBySubject: (subjectId: string) => api.get<Topic[]>(`/topics?subjectId=${subjectId}`),
  getTopicsByColumn: (column: string) => api.get<Topic[]>(`/topics?column=${column}`),
  createTopic: (data: Partial<Topic> & { subjectId: string; unitId: string; title: string }) =>
    api.post<Topic>('/topics', data),
  updateTopic: (id: string, data: Partial<Topic>) => api.patch<Topic>(`/topics/${id}`, data),
  deleteTopic: (id: string) => api.delete<{ success: boolean }>(`/topics/${id}`),
  moveTopic: (id: string, column: string, sortOrder: number) =>
    api.post<Topic>(`/topics/${id}/move`, { column, sortOrder }),
  moveTopicToNextColumn: (id: string) =>
    api.post<{ success: boolean; topic?: Topic; fromColumn?: string; toColumn?: string; xpAwarded?: number }>(`/topics/${id}/advance`),

  // Checklist
  getChecklist: (topicId: string) => api.get<ChecklistItem[]>(`/topics/${topicId}/checklist`),
  upsertChecklistItem: (data: { id?: string; topicId: string; text: string; checked?: boolean; sortOrder?: number }) => {
    const { topicId, ...rest } = data;
    return api.post<ChecklistItem>(`/topics/${topicId}/checklist`, rest);
  },
  deleteChecklistItem: (topicId: string, itemId: string) =>
    api.delete<{ success: boolean }>(`/topics/${topicId}/checklist/${itemId}`),

  // Links
  getLinksByTopic: (topicId: string) => api.get<Link[]>(`/topics/${topicId}/links`),
  upsertLink: (data: { id?: string; topicId: string; url: string; label?: string; sortOrder?: number }) => {
    const { topicId, ...rest } = data;
    return api.post<Link>(`/topics/${topicId}/links`, rest);
  },
  deleteLink: (topicId: string, linkId: string) =>
    api.delete<{ success: boolean }>(`/topics/${topicId}/links/${linkId}`),

  // Study Sessions
  createStudySession: (data: { topicId: string; startedAt: string; endedAt: string; duration: number; timerType: string }) =>
    api.post<StudySession>('/study-sessions', data),
  getStudySessions: (topicId?: string) =>
    api.get<StudySession[]>(`/study-sessions${topicId ? `?topicId=${topicId}` : ''}`),
  getStudySessionsByTopic: (topicId: string) => api.get<StudySession[]>(`/study-sessions?topicId=${topicId}`),
  getStudySessionsByDateRange: (startDate: string, endDate: string) =>
    api.get<StudySession[]>(`/study-sessions?startDate=${startDate}&endDate=${endDate}`),
  getDailyStudyCounts: (startDate: string, endDate: string) =>
    api.get<DailyStudyCount[]>(`/study-sessions/daily-counts?startDate=${startDate}&endDate=${endDate}`),

  // Reviews
  createReview: (data: { topicId: string; fromColumn: string; toColumn?: string; understandingScore?: number; selfNote?: string }) =>
    api.post<{ success: boolean; review?: ReviewEntry; topic?: Topic; xpAwarded?: number }>('/reviews', data),
  getReviewsByTopic: (topicId: string) => api.get<ReviewEntry[]>(`/reviews/by-topic/${topicId}`),
  getRecentReviews: (limit?: number) => api.get<ReviewEntry[]>(`/reviews/recent${limit ? `?limit=${limit}` : ''}`),
  getUpcomingReviews: () => api.get<Topic[]>('/reviews/upcoming'),
  getDueToday: () => api.get<Topic[]>('/reviews/due-today'),

  // Exams
  getExams: () => api.get<Exam[]>('/exams'),
  createExam: (data: { name: string; date: string; subjectIds?: string[] }) => api.post<Exam>('/exams', data),
  updateExam: (id: string, data: { name?: string; date?: string; subjectIds?: string[] }) =>
    api.patch<Exam>(`/exams/${id}`, data),
  deleteExam: (id: string) => api.delete<{ success: boolean }>(`/exams/${id}`),

  // Stats
  getUserStats: () => api.get<UserStats>('/stats'),
  addXp: (amount: number, reason: string) => api.post<UserStats>('/stats/xp', { amount, reason }),
  updateStreak: () => api.post<UserStats>('/stats/streak'),
  getSubjectMastery: () => api.get<SubjectMastery[]>('/stats/mastery'),

  // Search
  search: (query: string, filters?: { subjectId?: string }) => {
    const params: QueryParams = { q: query, ...(filters as QueryParams) };
    return api.get<Topic[]>(`/search${toQueryString(params)}`);
  },

  // Settings
  getSettings: () => api.get<AppSettings>('/settings'),
  updateSettings: (data: Partial<AppSettings>) => api.patch<AppSettings>('/settings', data),

  // Goals
  getCurrentGoals: () => api.get<WeeklyGoal>('/goals/current'),
  getGoalsByWeek: (weekStart: string) => api.get<WeeklyGoal>(`/goals?weekStart=${weekStart}`),
  upsertGoals: (data: { goals: GoalItem[]; weekStart?: string }) => api.post<WeeklyGoal>('/goals', data),
  updateGoal: (id: string, data: Partial<WeeklyGoal>) => api.patch<WeeklyGoal>(`/goals/${id}`, data),
  getGoalHistory: (limit?: number) => api.get<WeeklyGoal[]>(`/goals/history${limit ? `?limit=${limit}` : ''}`),

  // Parent
  getChildren: () => api.get<{ id: string; name: string; avatar: string; grade: string | null }[]>('/parent/children'),
  getChildSummary: (userId: string) => api.get<ChildSummary>(`/parent/summary/${userId}`),
  getWeeklyActivity: (userId: string) => api.get<WeeklyActivity>(`/parent/weekly-activity/${userId}`),

  // Reflections
  getCurrentReflection: () => api.get<WeeklyReflection>('/reflections/current'),
  upsertReflection: (data: Partial<WeeklyReflection>) => api.post<WeeklyReflection>('/reflections', data),
  getReflectionHistory: (limit?: number) => api.get<WeeklyReflection[]>(`/reflections/history${limit ? `?limit=${limit}` : ''}`),

  // Achievements
  getMyAchievements: () => api.get<Achievement[]>('/achievements'),
  getAllAchievements: () => api.get<AchievementWithStatus[]>('/achievements/available'),

  // Analysis
  getWeakTopics: (userId: string) => api.get<WeakTopic[]>(`/analysis/weak-topics/${userId}`),
  getStudyEfficiency: (userId: string) => api.get<StudyEfficiency>(`/analysis/study-efficiency/${userId}`),

  // Reports
  getMonthlyReport: (month: string) => api.get<MonthlyReport>(`/reports/${month}`),
  getReportList: () => api.get<{ month: string; generatedAt: string }[]>('/reports'),

  // Challenges
  getChallenges: () => api.get<ChallengeWithParticipants[]>('/challenges'),
  createChallenge: (data: { title: string; challengeType: string; targetValue: number; startDate: string; endDate: string }) =>
    api.post<ChallengeWithParticipants>('/challenges', data),
  getChallengeDetail: (id: string) => api.get<ChallengeWithParticipants>(`/challenges/${id}`),
  updateChallengeProgress: (id: string) => api.patch<ChallengeWithParticipants>(`/challenges/${id}/progress`),

  // Patterns
  getLearningPatterns: (userId: string) => api.get<LearningPatterns>(`/analysis/patterns/${userId}`),

  // Backup
  exportData: () => api.get<unknown>('/backup/export'),
  importData: (data: string) => api.post<{ success: boolean }>('/backup/import', JSON.parse(data)),
};
