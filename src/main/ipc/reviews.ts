import { ipcMain } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database';
import { mapReviewEntry, mapTopicWithJoins, mapTopic } from '../database/mappers';

type DbRow = Record<string, unknown>;

const COLUMN_PROGRESSION: Record<string, { next: string; days: number } | null> = {
  today: { next: 'three_days', days: 3 },
  three_days: { next: 'one_week', days: 7 },
  one_week: { next: 'one_month', days: 30 },
  one_month: { next: 'done', days: 0 },
  done: null,
};

export function registerReviewHandlers(): void {
  const db = () => getDatabase();

  ipcMain.handle('reviews:create', (_event, data: {
    topicId: string; fromColumn: string; toColumn?: string;
  }) => {
    const id = uuidv4();
    const progression = COLUMN_PROGRESSION[data.fromColumn];

    if (!progression) {
      return { success: false, message: 'Card is already in done column.' };
    }

    const targetColumn = data.toColumn ?? progression.next;

    const createReviewTransaction = db().transaction(() => {
      db().prepare(
        'INSERT INTO review_entries (id, topic_id, from_column, to_column) VALUES (?, ?, ?, ?)'
      ).run(id, data.topicId, data.fromColumn, targetColumn);

      let nextReviewAt: string | null = null;
      if (targetColumn !== 'done' && progression.days > 0) {
        const reviewDate = new Date(Date.now() + progression.days * 86400000);
        nextReviewAt = reviewDate.toISOString();
      }

      db().prepare(
        "UPDATE topics SET column_name = ?, next_review_at = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(targetColumn, nextReviewAt, data.topicId);

      // Award XP: +10 for review, +30 if reaching done
      const xpAmount = targetColumn === 'done' ? 30 : 10;

      db().prepare('UPDATE user_stats SET total_xp = total_xp + ? WHERE id = 1').run(xpAmount);
      db().prepare('INSERT INTO xp_log (amount, reason) VALUES (?, ?)').run(
        xpAmount, targetColumn === 'done' ? 'topic_mastered' : 'review_completed'
      );

      const reviewRow = db().prepare('SELECT * FROM review_entries WHERE id = ?').get(id) as DbRow;
      const topicRow = db().prepare('SELECT * FROM topics WHERE id = ?').get(data.topicId) as DbRow;

      return {
        success: true,
        review: mapReviewEntry(reviewRow),
        topic: mapTopic(topicRow),
        xpAwarded: xpAmount,
      };
    });

    return createReviewTransaction();
  });

  ipcMain.handle('reviews:getByTopic', (_event, topicId: string) => {
    const rows = db().prepare(
      'SELECT * FROM review_entries WHERE topic_id = ? ORDER BY reviewed_at DESC'
    ).all(topicId) as DbRow[];
    return rows.map(mapReviewEntry);
  });

  ipcMain.handle('reviews:getRecent', (_event, limit?: number) => {
    const rows = db().prepare(
      'SELECT * FROM review_entries ORDER BY reviewed_at DESC LIMIT ?'
    ).all(limit ?? 50) as DbRow[];
    return rows.map(mapReviewEntry);
  });

  ipcMain.handle('reviews:getUpcoming', () => {
    const rows = db().prepare(`
      SELECT t.*, s.name AS subject_name, s.color AS subject_color
      FROM topics t
      JOIN subjects s ON s.id = t.subject_id
      WHERE t.next_review_at IS NOT NULL
        AND t.column_name != 'done'
      ORDER BY t.next_review_at ASC
      LIMIT 50
    `).all() as DbRow[];
    return rows.map(mapTopicWithJoins);
  });
}
