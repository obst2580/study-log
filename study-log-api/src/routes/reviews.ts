import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/index.js';
import { mapReviewEntry, mapTopicWithJoins, mapTopic } from '../database/mappers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { SCORE_TO_INTERVAL_DAYS, MASTERY_THRESHOLD, MS_PER_DAY } from '../utils/constants.js';

const router = Router();

// GET /api/reviews/upcoming - Get upcoming reviews
router.get('/upcoming', asyncHandler(async (_req, res) => {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT t.*, s.name AS subject_name, s.color AS subject_color
    FROM topics t
    JOIN subjects s ON s.id = t.subject_id
    WHERE t.next_review_at IS NOT NULL
      AND t.column_name = 'reviewing'
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
       OR (t.next_review_at IS NOT NULL AND t.next_review_at <= $1 AND t.column_name = 'reviewing')
    ORDER BY t.next_review_at ASC
    LIMIT 50
  `, [now]);
  res.json(rows.map(mapTopicWithJoins));
}));

// GET /api/reviews/completed-today - Get reviews completed today
router.get('/completed-today', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT t.*, s.name AS subject_name, s.color AS subject_color,
      re.understanding_score, re.self_note, re.reviewed_at
    FROM review_entries re
    JOIN topics t ON t.id = re.topic_id
    JOIN subjects s ON s.id = t.subject_id
    WHERE re.user_id = $1
      AND DATE(re.reviewed_at) = CURRENT_DATE
    ORDER BY re.reviewed_at DESC
  `, [req.userId]);
  res.json(rows.map(row => ({
    ...mapTopicWithJoins(row),
    understandingScore: row.understanding_score as number,
    selfNote: row.self_note as string | null,
    reviewedAt: row.reviewed_at as string,
  })));
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
  const { topicId, fromColumn, understandingScore, selfNote } = req.body;

  if (!topicId || !fromColumn) {
    res.status(400).json({ error: 'topicId and fromColumn are required' });
    return;
  }

  const intervalDays = SCORE_TO_INTERVAL_DAYS[understandingScore] || 1;
  const nextReviewAt = new Date(Date.now() + intervalDays * MS_PER_DAY).toISOString();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const topicQuery = await client.query('SELECT * FROM topics WHERE id = $1', [topicId]);
    if (topicQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Topic not found' });
      return;
    }
    const topic = topicQuery.rows[0];

    const newMasteryCount = understandingScore === 5 ? ((topic.mastery_count as number) + 1) : 0;
    const targetColumn = newMasteryCount >= MASTERY_THRESHOLD ? 'mastered' : 'reviewing';
    const finalNextReview = targetColumn === 'mastered' ? null : nextReviewAt;

    const id = uuidv4();
    await client.query(
      'INSERT INTO review_entries (id, topic_id, from_column, to_column, understanding_score, self_note, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, topicId, fromColumn, targetColumn, understandingScore ?? null, selfNote ?? null, req.userId]
    );

    await client.query(
      'UPDATE topics SET column_name = $1, next_review_at = $2, mastery_count = $3, updated_at = NOW() WHERE id = $4',
      [targetColumn, finalNextReview, newMasteryCount, topicId]
    );

    const xpAmount = targetColumn === 'mastered' ? 30 : 10;

    await client.query('UPDATE user_stats SET total_xp = total_xp + $1 WHERE user_id = $2', [xpAmount, req.userId]);
    await client.query('INSERT INTO xp_log (amount, reason, user_id) VALUES ($1, $2, $3)', [
      xpAmount, targetColumn === 'mastered' ? 'topic_mastered' : 'review_completed', req.userId,
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
