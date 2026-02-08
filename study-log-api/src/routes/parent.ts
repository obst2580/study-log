import { Router } from 'express';
import { getPool } from '../database/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// GET /api/parent/children - List student users visible to parent
router.get('/children', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT id, name, avatar, grade FROM users WHERE role = 'student' ORDER BY name"
  );
  res.json(rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    avatar: r.avatar as string,
    grade: (r.grade as string) || null,
  })));
}));

// GET /api/parent/summary/:userId - Child study summary
router.get('/summary/:userId', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { userId } = req.params;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [userResult, statsResult, studyTimeResult, reviewCountResult, goalResult, masteryResult] = await Promise.all([
    pool.query('SELECT name FROM users WHERE id = $1', [userId]),
    pool.query('SELECT * FROM user_stats WHERE user_id = $1', [userId]),
    pool.query(
      'SELECT COALESCE(SUM(duration), 0) AS total FROM study_sessions WHERE user_id = $1 AND started_at >= $2',
      [userId, weekAgo]
    ),
    pool.query(
      'SELECT COUNT(*) AS cnt FROM review_entries WHERE user_id = $1 AND reviewed_at >= $2',
      [userId, weekAgo]
    ),
    pool.query(
      "SELECT goals, achievement_rate FROM weekly_goals WHERE user_id = $1 ORDER BY week_start DESC LIMIT 1",
      [userId]
    ),
    pool.query(`
      SELECT s.id AS subject_id, s.name AS subject_name,
        COUNT(t.id) AS total_topics,
        SUM(CASE WHEN t.column_name = 'mastered' THEN 1 ELSE 0 END) AS completed_topics,
        CASE WHEN COUNT(t.id) > 0
          THEN ROUND(CAST(SUM(CASE WHEN t.column_name = 'mastered' THEN 1 ELSE 0 END) AS NUMERIC) / COUNT(t.id), 2)
          ELSE 0 END AS ratio
      FROM subjects s
      LEFT JOIN topics t ON t.subject_id = s.id
      WHERE s.user_id = $1
      GROUP BY s.id, s.name, s.sort_order
      ORDER BY s.sort_order
    `, [userId]),
  ]);

  if (userResult.rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const goalAchievementRate = goalResult.rows.length > 0
    ? (goalResult.rows[0].achievement_rate as number) ?? 0
    : 0;

  res.json({
    userId,
    profileName: userResult.rows[0].name,
    studyTimeThisWeek: Number(studyTimeResult.rows[0].total),
    reviewCount: Number(reviewCountResult.rows[0].cnt),
    currentStreak: statsResult.rows.length > 0 ? statsResult.rows[0].current_streak : 0,
    goalAchievementRate,
    subjectProgress: masteryResult.rows.map((row) => ({
      subjectId: row.subject_id as string,
      subjectName: row.subject_name as string,
      totalTopics: Number(row.total_topics),
      completedTopics: Number(row.completed_topics),
      ratio: Number(row.ratio),
    })),
  });
}));

// GET /api/parent/weekly-activity/:userId - Last 7 days activity
router.get('/weekly-activity/:userId', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { userId } = req.params;

  const { rows: studyRows } = await pool.query(`
    SELECT DATE(started_at) AS date,
      COALESCE(SUM(duration), 0) AS study_minutes
    FROM study_sessions
    WHERE user_id = $1 AND started_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(started_at)
    ORDER BY date ASC
  `, [userId]);

  const { rows: reviewRows } = await pool.query(`
    SELECT DATE(reviewed_at) AS date,
      COUNT(*) AS review_count
    FROM review_entries
    WHERE user_id = $1 AND reviewed_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(reviewed_at)
    ORDER BY date ASC
  `, [userId]);

  const studyMap = new Map(studyRows.map((r) => [r.date as string, Number(r.study_minutes)]));
  const reviewMap = new Map(reviewRows.map((r) => [r.date as string, Number(r.review_count)]));

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    days.push({
      date,
      studyMinutes: studyMap.get(date) ?? 0,
      reviewCount: reviewMap.get(date) ?? 0,
    });
  }

  res.json({ userId, days });
}));

export default router;
