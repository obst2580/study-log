import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/index.js';
import { mapReviewEntry, mapTopicWithJoins, mapTopic } from '../database/mappers.js';

type DbRow = Record<string, unknown>;

const COLUMN_PROGRESSION: Record<string, { next: string; days: number } | null> = {
  today: { next: 'three_days', days: 3 },
  three_days: { next: 'one_week', days: 7 },
  one_week: { next: 'one_month', days: 30 },
  one_month: { next: 'done', days: 0 },
  done: null,
};

const router = Router();

// GET /api/reviews/upcoming - Get upcoming reviews
router.get('/upcoming', (_req, res) => {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT t.*, s.name AS subject_name, s.color AS subject_color
    FROM topics t
    JOIN subjects s ON s.id = t.subject_id
    WHERE t.next_review_at IS NOT NULL
      AND t.column_name != 'done'
    ORDER BY t.next_review_at ASC
    LIMIT 50
  `).all() as DbRow[];
  res.json(rows.map(mapTopicWithJoins));
});

// GET /api/reviews/due-today - Get topics due for review today
router.get('/due-today', (_req, res) => {
  const db = getDatabase();
  const now = new Date().toISOString();

  const rows = db.prepare(`
    SELECT t.*, s.name AS subject_name, s.color AS subject_color
    FROM topics t
    JOIN subjects s ON s.id = t.subject_id
    WHERE t.column_name = 'today'
       OR (t.next_review_at IS NOT NULL AND t.next_review_at <= ? AND t.column_name != 'done')
    ORDER BY t.next_review_at ASC
    LIMIT 50
  `).all(now) as DbRow[];
  res.json(rows.map(mapTopicWithJoins));
});

// POST /api/reviews - Create review entry
router.post('/', (req, res) => {
  const db = getDatabase();
  const { topicId, fromColumn, toColumn } = req.body;

  if (!topicId || !fromColumn) {
    res.status(400).json({ error: 'topicId and fromColumn are required' });
    return;
  }

  const progression = COLUMN_PROGRESSION[fromColumn];

  if (!progression) {
    res.status(400).json({ success: false, message: 'Card is already in done column.' });
    return;
  }

  const id = uuidv4();
  const targetColumn = toColumn ?? progression.next;

  const createReviewTransaction = db.transaction(() => {
    db.prepare(
      'INSERT INTO review_entries (id, topic_id, from_column, to_column) VALUES (?, ?, ?, ?)'
    ).run(id, topicId, fromColumn, targetColumn);

    let nextReviewAt: string | null = null;
    if (targetColumn !== 'done' && progression.days > 0) {
      const reviewDate = new Date(Date.now() + progression.days * 86400000);
      nextReviewAt = reviewDate.toISOString();
    }

    db.prepare(
      "UPDATE topics SET column_name = ?, next_review_at = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(targetColumn, nextReviewAt, topicId);

    // Award XP: +10 for review, +30 if reaching done
    const xpAmount = targetColumn === 'done' ? 30 : 10;

    db.prepare('UPDATE user_stats SET total_xp = total_xp + ? WHERE id = 1').run(xpAmount);
    db.prepare('INSERT INTO xp_log (amount, reason) VALUES (?, ?)').run(
      xpAmount, targetColumn === 'done' ? 'topic_mastered' : 'review_completed'
    );

    const reviewRow = db.prepare('SELECT * FROM review_entries WHERE id = ?').get(id) as DbRow;
    const topicRow = db.prepare('SELECT * FROM topics WHERE id = ?').get(topicId) as DbRow;

    return {
      success: true,
      review: mapReviewEntry(reviewRow),
      topic: mapTopic(topicRow),
      xpAwarded: xpAmount,
    };
  });

  res.status(201).json(createReviewTransaction());
});

export default router;
