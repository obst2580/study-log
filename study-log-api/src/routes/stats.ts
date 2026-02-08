import { Router } from 'express';
import { getPool } from '../database/index.js';
import { mapUserStats } from '../database/mappers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { MS_PER_DAY } from '../utils/constants.js';

const router = Router();

// GET /api/stats - Get user stats (XP, streak)
router.get('/', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM user_stats WHERE user_id = $1', [req.userId]);
  if (rows.length === 0) {
    await pool.query(
      'INSERT INTO user_stats (user_id, total_xp, current_streak, longest_streak) VALUES ($1, 0, 0, 0)',
      [req.userId]
    );
    const { rows: newRows } = await pool.query('SELECT * FROM user_stats WHERE user_id = $1', [req.userId]);
    res.json(mapUserStats(newRows[0]));
    return;
  }
  res.json(mapUserStats(rows[0]));
}));

// GET /api/stats/mastery - Get subject mastery ratios
router.get('/mastery', asyncHandler(async (_req, res) => {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT
      s.id AS subject_id,
      s.name AS subject_name,
      COUNT(t.id) AS total_topics,
      SUM(CASE WHEN t.column_name = 'done' THEN 1 ELSE 0 END) AS completed_topics,
      CASE WHEN COUNT(t.id) > 0
        THEN ROUND(CAST(SUM(CASE WHEN t.column_name = 'done' THEN 1 ELSE 0 END) AS NUMERIC) / COUNT(t.id), 2)
        ELSE 0
      END AS ratio
    FROM subjects s
    LEFT JOIN topics t ON t.subject_id = s.id
    GROUP BY s.id, s.name, s.sort_order
    ORDER BY s.sort_order
  `);

  res.json(rows.map((row) => ({
    subjectId: row.subject_id as string,
    subjectName: row.subject_name as string,
    totalTopics: Number(row.total_topics),
    completedTopics: Number(row.completed_topics),
    ratio: Number(row.ratio),
  })));
}));

// POST /api/stats/xp - Add XP
router.post('/xp', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { amount, reason } = req.body;

  if (amount === undefined || !reason) {
    res.status(400).json({ error: 'amount and reason are required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE user_stats SET total_xp = total_xp + $1 WHERE user_id = $2', [amount, req.userId]);
    await client.query('INSERT INTO xp_log (amount, reason, user_id) VALUES ($1, $2, $3)', [amount, reason, req.userId]);
    const { rows } = await client.query('SELECT * FROM user_stats WHERE user_id = $1', [req.userId]);
    await client.query('COMMIT');
    res.json(mapUserStats(rows[0]));
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

// POST /api/stats/streak - Update streak
router.post('/streak', asyncHandler(async (req, res) => {
  const pool = getPool();
  const today = new Date().toISOString().split('T')[0];
  const { rows: statsRows } = await pool.query('SELECT * FROM user_stats WHERE user_id = $1', [req.userId]);
  const stats = statsRows[0];
  const lastDate = stats.last_study_date as string | null;

  if (lastDate === today) {
    res.json(mapUserStats(stats));
    return;
  }

  const yesterday = new Date(Date.now() - MS_PER_DAY).toISOString().split('T')[0];
  let newStreak = 1;
  if (lastDate === yesterday) {
    newStreak = (stats.current_streak as number) + 1;
  }

  const longestStreak = Math.max(stats.longest_streak as number, newStreak);
  await pool.query(
    'UPDATE user_stats SET current_streak = $1, longest_streak = $2, last_study_date = $3 WHERE user_id = $4',
    [newStreak, longestStreak, today, req.userId]
  );

  const { rows } = await pool.query('SELECT * FROM user_stats WHERE user_id = $1', [req.userId]);
  res.json(mapUserStats(rows[0]));
}));

export default router;
