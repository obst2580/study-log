import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/index.js';

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

      const reviewId = uuidv4();
      db.prepare(`
        INSERT INTO review_entries (id, topic_id, reviewed_at, from_column, to_column)
        VALUES (?, ?, datetime('now'), ?, 'today')
      `).run(reviewId, topic.id, topic.column_name);
    }
  });

  moveTransaction();
  return overdueTopics.length;
}

function checkAndResetStreak(): void {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const stats = db.prepare('SELECT * FROM user_stats WHERE id = 1').get() as Record<string, unknown>;
  const lastDate = stats.last_study_date as string | null;

  // If last study was before yesterday, reset streak
  if (lastDate && lastDate < yesterday) {
    db.prepare('UPDATE user_stats SET current_streak = 0 WHERE id = 1').run();
    console.log(`[ReviewScheduler] Streak reset - last study date was ${lastDate}`);
  }
}

export function startReviewScheduler(): void {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    try {
      const movedCount = moveOverdueCards();
      if (movedCount > 0) {
        console.log(`[ReviewScheduler] Moved ${movedCount} overdue cards to 'today' column`);
      }
    } catch (err) {
      console.error('[ReviewScheduler] Error moving overdue cards:', err);
    }
  });

  // Run daily at midnight to check streak
  cron.schedule('0 0 * * *', () => {
    try {
      checkAndResetStreak();
    } catch (err) {
      console.error('[ReviewScheduler] Error checking streak:', err);
    }
  });

  // Run immediately on startup
  setTimeout(() => {
    try {
      const movedCount = moveOverdueCards();
      if (movedCount > 0) {
        console.log(`[ReviewScheduler] Initial: Moved ${movedCount} overdue cards to 'today' column`);
      }
      checkAndResetStreak();
    } catch (err) {
      console.error('[ReviewScheduler] Initial check error:', err);
    }
  }, 1000);

  console.log('[ReviewScheduler] Started - checking every 5 minutes');
}
