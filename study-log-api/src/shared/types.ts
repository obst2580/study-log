// ── Enums ──

export type Difficulty = 'high' | 'medium' | 'low';
export type Importance = 'high' | 'medium' | 'low';
export type KanbanColumn = 'today' | 'three_days' | 'one_week' | 'one_month' | 'done';
export type TimerType = 'pomodoro' | 'stopwatch';

export const KANBAN_COLUMNS: { key: KanbanColumn; label: string; days: number | null }[] = [
  { key: 'today', label: '오늘할것', days: null },
  { key: 'three_days', label: '3일후', days: 3 },
  { key: 'one_week', label: '1주후', days: 7 },
  { key: 'one_month', label: '1달후', days: 30 },
  { key: 'done', label: '완료', days: null },
];

// ── Data Models ──

export interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: string;
  subjectId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  unitId: string;
  title: string;
  notes: string;
  difficulty: Difficulty;
  importance: Importance;
  tags: string[];
  column: KanbanColumn;
  studyTimeTotal: number;
  nextReviewAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  topicId: string;
  text: string;
  checked: boolean;
  sortOrder: number;
}

export interface Link {
  id: string;
  topicId: string;
  url: string;
  label: string;
  sortOrder: number;
}

export interface StudySession {
  id: string;
  topicId: string;
  startedAt: string;
  endedAt: string;
  duration: number;
  timerType: TimerType;
}

export interface ReviewEntry {
  id: string;
  topicId: string;
  reviewedAt: string;
  fromColumn: KanbanColumn;
  toColumn: KanbanColumn;
}

export interface Exam {
  id: string;
  name: string;
  date: string;
  subjectIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ── XP / Level ──

export interface UserStats {
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
}

// ── App Settings ──

export interface AppSettings {
  theme: 'light' | 'dark';
  pomodoroFocus: number;
  pomodoroShortBreak: number;
  pomodoroLongBreak: number;
  pomodoroCycles: number;
  dailyGoal: number;
  llmProvider: 'openai' | 'anthropic' | null;
  llmModel: string;
  sidebarCollapsed: boolean;
}

// ── Composite Types ──

export interface TopicWithRelations extends Topic {
  subject?: Subject;
  unit?: Unit;
  checklist: ChecklistItem[];
  links: Link[];
  studySessions: StudySession[];
  reviewHistory: ReviewEntry[];
}

export interface DailyStudyCount {
  date: string;
  count: number;
}

export interface SubjectMastery {
  subjectId: string;
  subjectName: string;
  totalTopics: number;
  completedTopics: number;
  ratio: number;
}
