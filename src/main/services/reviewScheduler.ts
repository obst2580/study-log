import { BrowserWindow } from 'electron';
import { getDatabase } from '../database';
import { notifyReviewsDue, notifyStreakWarning, notifyExamDday } from './notification';

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const STREAK_WARNING_HOUR = 20; // 8 PM

function moveOverdueCards(): number {
  const db = getDatabase();
  const now = new Date().toISOString();

  const overdueTopics = db.prepare(`
    SELECT id, column_name FROM topics
    WHERE next_review_at IS NOT NULL
      AND next_review_at <= ?
      AND column_name != 'today'
      AND column_name != 'done'
  `).all(now) as { id: string; column_name: string }[];

  if (overdueTopics.length === 0) return 0;

  const moveTransaction = db.transaction(() => {
    for (const topic of overdueTopics) {
      db.prepare(`
        UPDATE topics SET column_name = 'today', next_review_at = NULL, updated_at = datetime('now')
        WHERE id = ?
      `).run(topic.id);

      db.prepare(`
        INSERT INTO review_entries (id, topic_id, reviewed_at, from_column, to_column)
        VALUES (lower(hex(randomblob(16))), ?, datetime('now'), ?, 'today')
      `).run(topic.id, topic.column_name);
    }
  });

  moveTransaction();
  return overdueTopics.length;
}

function checkStreakWarning(window: BrowserWindow | null): void {
  const currentHour = new Date().getHours();
  if (currentHour < STREAK_WARNING_HOUR) return;

  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  const stats = db.prepare('SELECT * FROM user_stats WHERE id = 1').get() as Record<string, unknown>;

  if (stats.last_study_date !== today && (stats.current_streak as number) > 0) {
    notifyStreakWarning(window);
  }
}

function checkExamAlerts(window: BrowserWindow | null): void {
  const db = getDatabase();
  const today = new Date();

  const exams = db.prepare('SELECT * FROM exams WHERE date >= ?').all(
    today.toISOString().split('T')[0]
  ) as { name: string; date: string }[];

  const alertDays = [7, 3, 1];

  for (const exam of exams) {
    const examDate = new Date(exam.date);
    const daysUntil = Math.ceil((examDate.getTime() - today.getTime()) / 86400000);

    if (alertDays.includes(daysUntil)) {
      notifyExamDday(window, exam.name, daysUntil);
    }
  }
}

export function startReviewScheduler(window: BrowserWindow | null): void {
  const runChecks = () => {
    try {
      const movedCount = moveOverdueCards();
      if (movedCount > 0) {
        notifyReviewsDue(window, movedCount);
        // Signal renderer to refresh board state
        if (window && !window.isDestroyed()) {
          window.webContents.send('reviews-due', movedCount);
        }
      }
      checkStreakWarning(window);
      checkExamAlerts(window);
    } catch (err) {
      console.error('Review scheduler error:', err);
    }
  };

  // Run immediately on startup (after window loads)
  setTimeout(runChecks, 3000);

  // Then run periodically
  setInterval(runChecks, CHECK_INTERVAL);
}
