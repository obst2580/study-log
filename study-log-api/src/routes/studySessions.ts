import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/index.js';
import { mapStudySession } from '../database/mappers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { MS_PER_DAY } from '../utils/constants.js';

const router = Router();

// GET /api/study-sessions - Get all sessions (optionally filtered by topic and date range)
router.get('/', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { topicId, startDate, endDate } = req.query;

  let sql = 'SELECT * FROM study_sessions WHERE 1=1';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (topicId) { sql += ` AND topic_id = $${paramIndex++}`; params.push(topicId); }
  if (startDate) { sql += ` AND started_at >= $${paramIndex++}`; params.push(startDate); }
  if (endDate) { sql += ` AND started_at <= $${paramIndex++}`; params.push(endDate); }

  sql += ' ORDER BY started_at DESC';
  if (!topicId && !startDate && !endDate) {
    sql += ' LIMIT 100';
  }

  const { rows } = await pool.query(sql, params);
  res.json(rows.map(mapStudySession));
}));

// GET /api/study-sessions/daily-counts - Get daily study counts
router.get('/daily-counts', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    res.status(400).json({ error: 'startDate and endDate are required' });
    return;
  }

  const { rows } = await pool.query(`
    SELECT DATE(started_at) AS date, COUNT(*) AS count
    FROM study_sessions
    WHERE DATE(started_at) BETWEEN $1 AND $2
    GROUP BY DATE(started_at)
    ORDER BY date ASC
  `, [startDate, endDate]);

  res.json(rows.map((row) => ({
    date: row.date as string,
    count: Number(row.count),
  })));
}));

// POST /api/study-sessions - Create study session
router.post('/', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { topicId, startedAt, endedAt, duration, timerType } = req.body;

  if (!topicId || !startedAt || !endedAt || duration === undefined) {
    res.status(400).json({ error: 'topicId, startedAt, endedAt, and duration are required' });
    return;
  }

  const id = uuidv4();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'INSERT INTO study_sessions (id, topic_id, started_at, ended_at, duration, timer_type) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, topicId, startedAt, endedAt, duration, timerType ?? 'stopwatch']
    );

    await client.query(
      'UPDATE topics SET study_time_total = study_time_total + $1, updated_at = NOW() WHERE id = $2',
      [duration, topicId]
    );

    const today = new Date().toISOString().split('T')[0];
    const statsResult = await client.query('SELECT * FROM user_stats WHERE user_id = $1', [req.userId]);
    const stats = statsResult.rows[0];
    const lastDate = stats.last_study_date as string | null;

    if (lastDate !== today) {
      const yesterday = new Date(Date.now() - MS_PER_DAY).toISOString().split('T')[0];
      let newStreak = 1;

      if (lastDate === yesterday) {
        newStreak = (stats.current_streak as number) + 1;
      }

      const longestStreak = Math.max(stats.longest_streak as number, newStreak);

      await client.query(
        'UPDATE user_stats SET current_streak = $1, longest_streak = $2, last_study_date = $3 WHERE user_id = $4',
        [newStreak, longestStreak, today, req.userId]
      );
    }

    await client.query('UPDATE user_stats SET total_xp = total_xp + 10 WHERE user_id = $1', [req.userId]);
    await client.query('INSERT INTO xp_log (amount, reason, user_id) VALUES (10, $1, $2)', ['study_session', req.userId]);

    const sessionResult = await client.query('SELECT * FROM study_sessions WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.status(201).json(mapStudySession(sessionResult.rows[0]));
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

export default router;
