import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/index.js';
import { mapWeeklyGoal } from '../database/mappers.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// GET /api/goals/current - Get current week goals
router.get('/current', asyncHandler(async (req, res) => {
  const pool = getPool();
  const weekStart = getCurrentWeekStart();
  const { rows } = await pool.query(
    'SELECT * FROM weekly_goals WHERE user_id = $1 AND week_start = $2',
    [req.userId, weekStart]
  );
  res.json(rows.length > 0 ? mapWeeklyGoal(rows[0]) : null);
}));

// GET /api/goals - Get goals for a specific week
router.get('/', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { weekStart } = req.query;

  if (weekStart) {
    const { rows } = await pool.query(
      'SELECT * FROM weekly_goals WHERE user_id = $1 AND week_start = $2',
      [req.userId, weekStart]
    );
    res.json(rows.length > 0 ? mapWeeklyGoal(rows[0]) : null);
  } else {
    const { rows } = await pool.query(
      'SELECT * FROM weekly_goals WHERE user_id = $1 ORDER BY week_start DESC',
      [req.userId]
    );
    res.json(rows.map(mapWeeklyGoal));
  }
}));

// GET /api/goals/history - Recent N weeks of goals
router.get('/history', asyncHandler(async (req, res) => {
  const pool = getPool();
  const limit = Math.min(parseInt(req.query.limit as string) || 8, 52);
  const { rows } = await pool.query(
    'SELECT * FROM weekly_goals WHERE user_id = $1 ORDER BY week_start DESC LIMIT $2',
    [req.userId, limit]
  );
  res.json(rows.map(mapWeeklyGoal));
}));

// POST /api/goals - Create or update weekly goals (upsert)
router.post('/', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { weekStart, goals, reflection, achievementRate } = req.body;
  const targetWeek = weekStart ?? getCurrentWeekStart();
  const id = uuidv4();

  const { rows } = await pool.query(`
    INSERT INTO weekly_goals (id, user_id, week_start, goals, reflection, achievement_rate)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id, week_start)
    DO UPDATE SET goals = $4, reflection = $5, achievement_rate = $6, updated_at = NOW()
    RETURNING *
  `, [id, req.userId, targetWeek, JSON.stringify(goals ?? []), reflection ?? null, achievementRate ?? null]);

  res.status(201).json(mapWeeklyGoal(rows[0]));
}));

// PATCH /api/goals/:id - Update a goal entry
router.patch('/:id', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const data = req.body;

  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.goals !== undefined) {
    fields.push(`goals = $${paramIndex++}`);
    values.push(JSON.stringify(data.goals));
  }
  if (data.reflection !== undefined) {
    fields.push(`reflection = $${paramIndex++}`);
    values.push(data.reflection);
  }
  if (data.achievementRate !== undefined) {
    fields.push(`achievement_rate = $${paramIndex++}`);
    values.push(data.achievementRate);
  }

  if (fields.length === 0) {
    const { rows } = await pool.query('SELECT * FROM weekly_goals WHERE id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }
    res.json(mapWeeklyGoal(rows[0]));
    return;
  }

  fields.push('updated_at = NOW()');
  values.push(id);

  await pool.query(`UPDATE weekly_goals SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
  const { rows } = await pool.query('SELECT * FROM weekly_goals WHERE id = $1', [id]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'Goal not found' });
    return;
  }
  res.json(mapWeeklyGoal(rows[0]));
}));

export default router;
