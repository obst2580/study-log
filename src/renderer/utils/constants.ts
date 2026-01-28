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
  high: '#f5222d',
  medium: '#faad14',
  low: '#52c41a',
};

export const IMPORTANCE_COLORS: Record<string, string> = {
  high: '#f5222d',
  medium: '#faad14',
  low: '#52c41a',
};

export const COLUMN_LABELS: Record<string, string> = {
  today: '오늘할것',
  three_days: '3일후',
  one_week: '1주후',
  one_month: '1달후',
  done: '완료',
};

export const COLUMN_COLORS: Record<string, string> = {
  today: '#1890ff',
  three_days: '#722ed1',
  one_week: '#13c2c2',
  one_month: '#fa8c16',
  done: '#52c41a',
};

export const SUBJECT_PRESET_COLORS = [
  '#1890ff', '#722ed1', '#13c2c2', '#fa8c16', '#f5222d',
  '#52c41a', '#eb2f96', '#faad14', '#2f54eb', '#a0d911',
];

export const XP_PER_CARD_REVIEW = 10;
export const XP_PER_DAILY_GOAL = 50;
export const XP_PER_7DAY_STREAK = 100;
export const XP_PER_30DAY_STREAK = 500;
export const XP_PER_CARD_MASTERED = 30;
