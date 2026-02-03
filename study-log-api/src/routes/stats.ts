import { Router } from 'express';
import { getDatabase } from '../database/index.js';
import { mapUserStats } from '../database/mappers.js';

type DbRow = Record<string, unknown>;

const router = Router();

// GET /api/stats - Get user stats (XP, streak)
router.get('/', (_req, res) => {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM user_stats WHERE id = 1').get() as DbRow;
  res.json(mapUserStats(row));
});

// GET /api/stats/mastery - Get subject mastery ratios
router.get('/mastery', (_req, res) => {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT
      s.id AS subject_id,
      s.name AS subject_name,
      COUNT(t.id) AS total_topics,
      SUM(CASE WHEN t.column_name = 'done' THEN 1 ELSE 0 END) AS completed_topics,
      CASE WHEN COUNT(t.id) > 0
        THEN ROUND(CAST(SUM(CASE WHEN t.column_name = 'done' THEN 1 ELSE 0 END) AS REAL) / COUNT(t.id), 2)
        ELSE 0
      END AS ratio
    FROM subjects s
    LEFT JOIN topics t ON t.subject_id = s.id
    GROUP BY s.id
    ORDER BY s.sort_order
  `).all() as DbRow[];

  res.json(rows.map((row) => ({
    subjectId: row.subject_id as string,
    subjectName: row.subject_name as string,
    totalTopics: row.total_topics as number,
    completedTopics: row.completed_topics as number,
    ratio: row.ratio as number,
  })));
});

// POST /api/stats/xp - Add XP
router.post('/xp', (req, res) => {
  const db = getDatabase();
  const { amount, reason } = req.body;

  if (amount === undefined || !reason) {
    res.status(400).json({ error: 'amount and reason are required' });
    return;
  }

  const addXpTransaction = db.transaction(() => {
    db.prepare('UPDATE user_stats SET total_xp = total_xp + ? WHERE id = 1').run(amount);
    db.prepare('INSERT INTO xp_log (amount, reason) VALUES (?, ?)').run(amount, reason);
    const row = db.prepare('SELECT * FROM user_stats WHERE id = 1').get() as DbRow;
    return mapUserStats(row);
  });

  res.json(addXpTransaction());
});

// POST /api/stats/streak - Update streak
router.post('/streak', (_req, res) => {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  const stats = db.prepare('SELECT * FROM user_stats WHERE id = 1').get() as DbRow;
  const lastDate = stats.last_study_date as string | null;

  if (lastDate === today) {
    res.json(mapUserStats(stats));
    return;
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  let newStreak = 1;
  if (lastDate === yesterday) {
    newStreak = (stats.current_streak as number) + 1;
  }

  const longestStreak = Math.max(stats.longest_streak as number, newStreak);
  db.prepare(
    'UPDATE user_stats SET current_streak = ?, longest_streak = ?, last_study_date = ? WHERE id = 1'
  ).run(newStreak, longestStreak, today);

  const updatedRow = db.prepare('SELECT * FROM user_stats WHERE id = 1').get() as DbRow;
  res.json(mapUserStats(updatedRow));
});

export default router;
