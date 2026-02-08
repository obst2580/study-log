export const COLUMN_PROGRESSION: Record<string, { next: string; days: number } | null> = {
  today: { next: 'three_days', days: 3 },
  three_days: { next: 'one_week', days: 7 },
  one_week: { next: 'one_month', days: 30 },
  one_month: { next: 'done', days: 0 },
  done: null,
};

export const MS_PER_DAY = 86400000;
