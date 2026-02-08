import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/index.js';
import { MS_PER_DAY, DEFAULT_DAILY_LIMIT } from '../utils/constants.js';

async function moveOverdueCards(): Promise<number> {
  const pool = getPool();
  const now = new Date().toISOString();

  const { rows: overdueTopics } = await pool.query(`
    SELECT id, column_name FROM topics
    WHERE next_review_at IS NOT NULL
      AND next_review_at <= $1
      AND column_name = 'reviewing'
  `, [now]);

  if (overdueTopics.length === 0) return 0;

  // Apply daily limit
  const { rows: [{ count: todayCount }] } = await pool.query(
    "SELECT COUNT(*) as count FROM topics WHERE column_name = 'today'"
  );
  const remaining = DEFAULT_DAILY_LIMIT - Number(todayCount);
  const topicsToMove = overdueTopics.slice(0, Math.max(0, remaining));
  if (topicsToMove.length === 0) return 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const topic of topicsToMove) {
      await client.query(
        "UPDATE topics SET column_name = 'today', next_review_at = NULL, updated_at = NOW() WHERE id = $1",
        [topic.id]
      );

      const reviewId = uuidv4();
      await client.query(
        "INSERT INTO review_entries (id, topic_id, reviewed_at, from_column, to_column) VALUES ($1, $2, NOW(), $3, 'today')",
        [reviewId, topic.id, topic.column_name]
      );
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  return topicsToMove.length;
}

async function checkAndResetStreak(): Promise<void> {
  const pool = getPool();
  const yesterday = new Date(Date.now() - MS_PER_DAY).toISOString().split('T')[0];

  const { rows } = await pool.query('SELECT * FROM user_stats');
  for (const stats of rows) {
    const lastDate = stats.last_study_date as string | null;
    if (lastDate && lastDate < yesterday) {
      await pool.query('UPDATE user_stats SET current_streak = 0 WHERE user_id = $1', [stats.user_id]);
      console.log(`[ReviewScheduler] Streak reset for profile ${stats.user_id} - last study date was ${lastDate}`);
    }
  }
}

export function startReviewScheduler(): void {
  cron.schedule('*/5 * * * *', () => {
    moveOverdueCards()
      .then((movedCount) => {
        if (movedCount > 0) {
          console.log(`[ReviewScheduler] Moved ${movedCount} overdue cards to 'today' column`);
        }
      })
      .catch((err) => {
        console.error('[ReviewScheduler] Error moving overdue cards:', err);
      });
  });

  cron.schedule('0 0 * * *', () => {
    checkAndResetStreak().catch((err) => {
      console.error('[ReviewScheduler] Error checking streak:', err);
    });
  });

  setTimeout(() => {
    Promise.all([
      moveOverdueCards().then((movedCount) => {
        if (movedCount > 0) {
          console.log(`[ReviewScheduler] Initial: Moved ${movedCount} overdue cards to 'today' column`);
        }
      }),
      checkAndResetStreak(),
    ]).catch((err) => {
      console.error('[ReviewScheduler] Initial check error:', err);
    });
  }, 1000);

  console.log('[ReviewScheduler] Started - checking every 5 minutes');
}
