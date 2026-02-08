import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/index.js';
import { mapWeeklyReflection } from '../database/mappers.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// GET /api/reflections/current - This week's reflection
router.get('/current', asyncHandler(async (req, res) => {
  const pool = getPool();
  const weekStart = getCurrentWeekStart();
  const { rows } = await pool.query(
    'SELECT * FROM weekly_reflections WHERE user_id = $1 AND week_start = $2',
    [req.userId, weekStart]
  );
  res.json(rows.length > 0 ? mapWeeklyReflection(rows[0]) : null);
}));

// GET /api/reflections/history - Past reflections
router.get('/history', asyncHandler(async (req, res) => {
  const pool = getPool();
  const limit = Math.min(parseInt(req.query.limit as string) || 8, 52);
  const { rows } = await pool.query(
    'SELECT * FROM weekly_reflections WHERE user_id = $1 ORDER BY week_start DESC LIMIT $2',
    [req.userId, limit]
  );
  res.json(rows.map(mapWeeklyReflection));
}));

// POST /api/reflections - Create or update (UPSERT)
router.post('/', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { weekStart, whatWentWell, whatToImprove, nextWeekFocus, mood } = req.body;
  const targetWeek = weekStart ?? getCurrentWeekStart();
  const id = uuidv4();

  // Calculate stats for this week
  const weekAgo = new Date(new Date(targetWeek).getTime()).toISOString();
  const weekEnd = new Date(new Date(targetWeek).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [studyResult, reviewResult, goalResult] = await Promise.all([
    pool.query(
      'SELECT COALESCE(SUM(duration), 0) AS total FROM study_sessions WHERE user_id = $1 AND started_at >= $2 AND started_at < $3',
      [req.userId, weekAgo, weekEnd]
    ),
    pool.query(
      'SELECT COUNT(*) AS cnt FROM review_entries WHERE user_id = $1 AND reviewed_at >= $2 AND reviewed_at < $3',
      [req.userId, weekAgo, weekEnd]
    ),
    pool.query(
      'SELECT achievement_rate FROM weekly_goals WHERE user_id = $1 AND week_start = $2',
      [req.userId, targetWeek]
    ),
  ]);

  const studyTimeTotal = Number(studyResult.rows[0].total);
  const reviewCount = Number(reviewResult.rows[0].cnt);
  const goalRate = goalResult.rows.length > 0 ? (goalResult.rows[0].achievement_rate as number) ?? 0 : 0;

  const { rows } = await pool.query(`
    INSERT INTO weekly_reflections (id, user_id, week_start, what_went_well, what_to_improve, next_week_focus, mood, study_time_total, review_count, goal_rate)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (user_id, week_start)
    DO UPDATE SET what_went_well = $4, what_to_improve = $5, next_week_focus = $6, mood = $7,
      study_time_total = $8, review_count = $9, goal_rate = $10, updated_at = NOW()
    RETURNING *
  `, [id, req.userId, targetWeek, whatWentWell ?? null, whatToImprove ?? null, nextWeekFocus ?? null, mood ?? null, studyTimeTotal, reviewCount, goalRate]);

  res.status(201).json(mapWeeklyReflection(rows[0]));
}));

export default router;
