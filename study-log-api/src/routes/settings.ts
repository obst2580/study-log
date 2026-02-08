import { Router } from 'express';
import { getPool } from '../database/index.js';
import { mapAppSettings } from '../database/mappers.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// GET /api/settings - Get app settings
router.get('/', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM app_settings WHERE user_id = $1', [req.userId]);
  if (rows.length === 0) {
    await pool.query('INSERT INTO app_settings (user_id) VALUES ($1)', [req.userId]);
    const { rows: newRows } = await pool.query('SELECT * FROM app_settings WHERE user_id = $1', [req.userId]);
    res.json(mapAppSettings(newRows[0]));
    return;
  }
  res.json(mapAppSettings(rows[0]));
}));

// PATCH /api/settings - Update app settings
router.patch('/', asyncHandler(async (req, res) => {
  const pool = getPool();
  const data = req.body;

  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    theme: 'theme',
    pomodoroFocus: 'pomodoro_focus',
    pomodoroShortBreak: 'pomodoro_short_break',
    pomodoroLongBreak: 'pomodoro_long_break',
    pomodoroCycles: 'pomodoro_cycles',
    dailyGoal: 'daily_goal',
    llmProvider: 'llm_provider',
    llmModel: 'llm_model',
    sidebarCollapsed: 'sidebar_collapsed',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      fields.push(`${col} = $${paramIndex++}`);
      values.push(data[key]);
    }
  }

  if (fields.length > 0) {
    values.push(req.userId);
    await pool.query(`UPDATE app_settings SET ${fields.join(', ')} WHERE user_id = $${paramIndex}`, values);
  }

  const { rows } = await pool.query('SELECT * FROM app_settings WHERE user_id = $1', [req.userId]);
  res.json(mapAppSettings(rows[0]));
}));

export default router;
