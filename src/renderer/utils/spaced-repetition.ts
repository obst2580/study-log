import type { KanbanColumn } from '../../shared/types';

// ── Spaced Repetition Logic ──

/**
 * Column progression map defining the flow:
 * today -> three_days (3 days) -> one_week (7 days) -> one_month (30 days) -> done
 */
const COLUMN_FLOW: Record<KanbanColumn, { next: KanbanColumn; days: number } | null> = {
  today: { next: 'three_days', days: 3 },
  three_days: { next: 'one_week', days: 7 },
  one_week: { next: 'one_month', days: 30 },
  one_month: { next: 'done', days: 0 },
  done: null,
};

/**
 * Get the next column and review date when a card is marked as reviewed/complete.
 */
export function getNextReviewInfo(currentColumn: KanbanColumn): {
  nextColumn: KanbanColumn;
  nextReviewAt: Date | null;
} | null {
  const progression = COLUMN_FLOW[currentColumn];
  if (!progression) return null;

  const nextReviewAt = progression.days > 0
    ? new Date(Date.now() + progression.days * 24 * 60 * 60 * 1000)
    : null;

  return {
    nextColumn: progression.next,
    nextReviewAt,
  };
}

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
 * Calculate mastery percentage based on column position.
 * today=0%, three_days=25%, one_week=50%, one_month=75%, done=100%
 */
export function getMasteryPercent(column: KanbanColumn): number {
  const map: Record<KanbanColumn, number> = {
    today: 0,
    three_days: 25,
    one_week: 50,
    one_month: 75,
    done: 100,
  };
  return map[column] ?? 0;
}
