// ── App Constants ──

export const APP_NAME = 'StudyLog';

export const DEFAULT_POMODORO_FOCUS = 25 * 60; // 25 minutes in seconds
export const DEFAULT_POMODORO_SHORT_BREAK = 5 * 60; // 5 minutes
export const DEFAULT_POMODORO_LONG_BREAK = 15 * 60; // 15 minutes
export const DEFAULT_POMODORO_CYCLES = 4;
export const DEFAULT_DAILY_GOAL = 5;

export const DIFFICULTY_LABELS: Record<string, string> = {
  high: '상',
  medium: '중',
  low: '하',
};

export const IMPORTANCE_LABELS: Record<string, string> = {
  high: '상',
  medium: '중',
  low: '하',
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  high: '#F43F5E',
  medium: '#D97706',
  low: '#10B981',
};

export const IMPORTANCE_COLORS: Record<string, string> = {
  high: '#F43F5E',
  medium: '#D97706',
  low: '#10B981',
};

export const COLUMN_LABELS: Record<string, string> = {
  backlog: '백로그',
  today: '오늘 학습',
  reviewing: '복습 대기',
  mastered: '마스터',
};

export const COLUMN_COLORS: Record<string, string> = {
  backlog: '#EAB308',
  today: '#3B82F6',
  reviewing: '#F43F5E',
  mastered: '#10B981',
};

export const SUBJECT_PRESET_COLORS = [
  '#7C3AED', '#2563EB', '#0D9488', '#D97706', '#DC2626',
  '#059669', '#DB2777', '#EA580C', '#4F46E5', '#65A30D',
];

export const XP_PER_CARD_REVIEW = 10;
export const XP_PER_DAILY_GOAL = 50;
export const XP_PER_7DAY_STREAK = 100;
export const XP_PER_30DAY_STREAK = 500;
export const XP_PER_CARD_MASTERED = 30;
