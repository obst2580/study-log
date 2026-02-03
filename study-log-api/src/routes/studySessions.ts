import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/index.js';
import { mapStudySession } from '../database/mappers.js';

type DbRow = Record<string, unknown>;

const router = Router();

// GET /api/study-sessions - Get all sessions (optionally filtered by topic)
router.get('/', (req, res) => {
  const db = getDatabase();
  const { topicId } = req.query;

  if (topicId) {
    const rows = db.prepare(
      'SELECT * FROM study_sessions WHERE topic_id = ? ORDER BY started_at DESC'
    ).all(topicId) as DbRow[];
    res.json(rows.map(mapStudySession));
    return;
  }

  const rows = db.prepare(
    'SELECT * FROM study_sessions ORDER BY started_at DESC LIMIT 100'
  ).all() as DbRow[];
  res.json(rows.map(mapStudySession));
});

// GET /api/study-sessions/daily-counts - Get daily study counts
router.get('/daily-counts', (req, res) => {
  const db = getDatabase();
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    res.status(400).json({ error: 'startDate and endDate are required' });
    return;
  }

  const rows = db.prepare(`
    SELECT DATE(started_at) AS date, COUNT(*) AS count
    FROM study_sessions
    WHERE DATE(started_at) BETWEEN ? AND ?
    GROUP BY DATE(started_at)
    ORDER BY date ASC
  `).all(startDate, endDate) as DbRow[];

  res.json(rows.map((row) => ({
    date: row.date as string,
    count: row.count as number,
  })));
});

// POST /api/study-sessions - Create study session
router.post('/', (req, res) => {
  const db = getDatabase();
  const { topicId, startedAt, endedAt, duration, timerType } = req.body;

  if (!topicId || !startedAt || !endedAt || duration === undefined) {
    res.status(400).json({ error: 'topicId, startedAt, endedAt, and duration are required' });
    return;
  }

  const id = uuidv4();

  const createSessionTransaction = db.transaction(() => {
    db.prepare(
      'INSERT INTO study_sessions (id, topic_id, started_at, ended_at, duration, timer_type) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, topicId, startedAt, endedAt, duration, timerType ?? 'stopwatch');

    // Accumulate study time on the topic
    db.prepare(
      "UPDATE topics SET study_time_total = study_time_total + ?, updated_at = datetime('now') WHERE id = ?"
    ).run(duration, topicId);

    // Update streak
    const today = new Date().toISOString().split('T')[0];
    const stats = db.prepare('SELECT * FROM user_stats WHERE id = 1').get() as DbRow;
    const lastDate = stats.last_study_date as string | null;

    if (lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      let newStreak = 1;

      if (lastDate === yesterday) {
        newStreak = (stats.current_streak as number) + 1;
      }

      const longestStreak = Math.max(stats.longest_streak as number, newStreak);

      db.prepare(
        'UPDATE user_stats SET current_streak = ?, longest_streak = ?, last_study_date = ? WHERE id = 1'
      ).run(newStreak, longestStreak, today);
    }

    // Award XP for study session (+10 per session)
    db.prepare('UPDATE user_stats SET total_xp = total_xp + 10 WHERE id = 1').run();
    db.prepare('INSERT INTO xp_log (amount, reason) VALUES (10, ?)').run('study_session');

    const row = db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(id) as DbRow;
    return mapStudySession(row);
  });

  res.status(201).json(createSessionTransaction());
});

export default router;
