import { Router } from 'express';
import { getDatabase } from '../database/index.js';
import { mapAppSettings } from '../database/mappers.js';

type DbRow = Record<string, unknown>;

const router = Router();

// GET /api/settings - Get app settings
router.get('/', (_req, res) => {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM app_settings WHERE id = 1').get() as DbRow;
  res.json(mapAppSettings(row));
});

// PATCH /api/settings - Update app settings
router.patch('/', (req, res) => {
  const db = getDatabase();
  const data = req.body;

  const fields: string[] = [];
  const values: unknown[] = [];

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
      fields.push(`${col} = ?`);
      values.push(typeof data[key] === 'boolean' ? (data[key] ? 1 : 0) : data[key]);
    }
  }

  if (fields.length > 0) {
    values.push(1);
    db.prepare(`UPDATE app_settings SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  const row = db.prepare('SELECT * FROM app_settings WHERE id = 1').get() as DbRow;
  res.json(mapAppSettings(row));
});

export default router;
