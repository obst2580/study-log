import type { KanbanColumn } from '../../shared/types';

/**
 * Check if a card's review is overdue.
 */
export function isReviewOverdue(nextReviewAt: string | null): boolean {
  if (!nextReviewAt) return false;
  return new Date(nextReviewAt).getTime() <= Date.now();
}

/**
 * Get the number of days until the next review.
 */
export function daysUntilReview(nextReviewAt: string | null): number | null {
  if (!nextReviewAt) return null;
  const diff = new Date(nextReviewAt).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

/**
 * Format the review date as a relative string.
 */
export function formatReviewDate(nextReviewAt: string | null): string {
  const days = daysUntilReview(nextReviewAt);
  if (days === null) return '';
  if (days <= 0) return '복습 필요';
  if (days === 1) return '내일';
  return `${days}일 후`;
}

/**
 * Calculate mastery percentage based on column position and mastery count.
 */
export function getMasteryPercent(column: KanbanColumn, masteryCount: number = 0): number {
  if (column === 'mastered') return 100;
  if (column === 'backlog') return 0;
  if (column === 'reviewing') return 25 + (masteryCount * 25); // 0~2 -> 25~75%
  return 10; // today (first study)
}

export const SCORE_TO_INTERVAL_DAYS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 10,
  5: 30,
};
