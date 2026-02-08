import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/index.js';
import { mapReviewEntry, mapTopicWithJoins, mapTopic } from '../database/mappers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { COLUMN_PROGRESSION, MS_PER_DAY } from '../utils/constants.js';

const router = Router();

// GET /api/reviews/upcoming - Get upcoming reviews
router.get('/upcoming', asyncHandler(async (_req, res) => {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT t.*, s.name AS subject_name, s.color AS subject_color
    FROM topics t
    JOIN subjects s ON s.id = t.subject_id
    WHERE t.next_review_at IS NOT NULL
      AND t.column_name != 'done'
    ORDER BY t.next_review_at ASC
    LIMIT 50
  `);
  res.json(rows.map(mapTopicWithJoins));
}));

// GET /api/reviews/due-today - Get topics due for review today
router.get('/due-today', asyncHandler(async (_req, res) => {
  const pool = getPool();
  const now = new Date().toISOString();

  const { rows } = await pool.query(`
    SELECT t.*, s.name AS subject_name, s.color AS subject_color
    FROM topics t
    JOIN subjects s ON s.id = t.subject_id
    WHERE t.column_name = 'today'
       OR (t.next_review_at IS NOT NULL AND t.next_review_at <= $1 AND t.column_name != 'done')
    ORDER BY t.next_review_at ASC
    LIMIT 50
  `, [now]);
  res.json(rows.map(mapTopicWithJoins));
}));

// GET /api/reviews/by-topic/:topicId - Get review entries for a topic
router.get('/by-topic/:topicId', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { topicId } = req.params;
  const { rows } = await pool.query(
    'SELECT * FROM review_entries WHERE topic_id = $1 ORDER BY reviewed_at DESC',
    [topicId]
  );
  res.json(rows.map(mapReviewEntry));
}));

// GET /api/reviews/recent - Get recent review entries
router.get('/recent', asyncHandler(async (req, res) => {
  const pool = getPool();
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const { rows } = await pool.query(
    'SELECT * FROM review_entries ORDER BY reviewed_at DESC LIMIT $1',
    [limit]
  );
  res.json(rows.map(mapReviewEntry));
}));

// POST /api/reviews - Create review entry
router.post('/', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { topicId, fromColumn, toColumn, understandingScore, selfNote } = req.body;

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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'INSERT INTO review_entries (id, topic_id, from_column, to_column, understanding_score, self_note) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, topicId, fromColumn, targetColumn, understandingScore ?? null, selfNote ?? null]
    );

    let nextReviewAt: string | null = null;
    if (targetColumn !== 'done' && progression.days > 0) {
      const reviewDate = new Date(Date.now() + progression.days * MS_PER_DAY);
      nextReviewAt = reviewDate.toISOString();
    }

    await client.query(
      'UPDATE topics SET column_name = $1, next_review_at = $2, updated_at = NOW() WHERE id = $3',
      [targetColumn, nextReviewAt, topicId]
    );

    const xpAmount = targetColumn === 'done' ? 30 : 10;

    await client.query('UPDATE user_stats SET total_xp = total_xp + $1 WHERE user_id = $2', [xpAmount, req.userId]);
    await client.query('INSERT INTO xp_log (amount, reason, user_id) VALUES ($1, $2, $3)', [
      xpAmount, targetColumn === 'done' ? 'topic_mastered' : 'review_completed', req.userId,
    ]);

    const reviewResult = await client.query('SELECT * FROM review_entries WHERE id = $1', [id]);
    const topicResult = await client.query('SELECT * FROM topics WHERE id = $1', [topicId]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      review: mapReviewEntry(reviewResult.rows[0]),
      topic: mapTopic(topicResult.rows[0]),
      xpAwarded: xpAmount,
    });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

export default router;
