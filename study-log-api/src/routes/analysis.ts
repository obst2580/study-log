import { Router } from 'express';
import { getPool } from '../database/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// GET /api/analysis/weak-topics/:profileId - Topics with low understanding scores
router.get('/weak-topics/:profileId', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { profileId } = req.params;

  const { rows } = await pool.query(`
    SELECT
      t.id AS topic_id,
      t.title AS topic_title,
      s.name AS subject_name,
      ROUND(AVG(re.understanding_score)::numeric, 1) AS avg_understanding,
      COUNT(re.id) AS review_count,
      MAX(re.reviewed_at) AS last_reviewed_at
    FROM review_entries re
    JOIN topics t ON t.id = re.topic_id
    JOIN subjects s ON s.id = t.subject_id
    WHERE re.user_id = $1
      AND re.understanding_score IS NOT NULL
    GROUP BY t.id, t.title, s.name
    HAVING AVG(re.understanding_score) < 3.5
    ORDER BY AVG(re.understanding_score) ASC
    LIMIT 20
  `, [profileId]);

  res.json(rows.map((row) => ({
    topicId: row.topic_id as string,
    topicTitle: row.topic_title as string,
    subjectName: row.subject_name as string,
    avgUnderstanding: Number(row.avg_understanding),
    reviewCount: Number(row.review_count),
    lastReviewedAt: row.last_reviewed_at as string,
  })));
}));

// GET /api/analysis/study-efficiency/:profileId - Study efficiency metrics
router.get('/study-efficiency/:profileId', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { profileId } = req.params;

  const [sessionResult, topicsResult, understandingResult] = await Promise.all([
    pool.query(`
      SELECT
        COALESCE(AVG(duration), 0) AS avg_duration,
        COALESCE(SUM(duration), 0) AS total_time
      FROM study_sessions
      WHERE user_id = $1
    `, [profileId]),
    pool.query(`
      SELECT COUNT(*) AS cnt
      FROM topics t
      JOIN subjects s ON s.id = t.subject_id
      WHERE s.user_id = $1 AND t.column_name = 'mastered'
    `, [profileId]),
    pool.query(`
      SELECT COALESCE(AVG(understanding_score), 0) AS avg_score
      FROM review_entries
      WHERE user_id = $1 AND understanding_score IS NOT NULL
    `, [profileId]),
  ]);

  res.json({
    profileId,
    avgSessionDuration: Number(sessionResult.rows[0].avg_duration),
    totalStudyTime: Number(sessionResult.rows[0].total_time),
    topicsCompleted: Number(topicsResult.rows[0].cnt),
    avgUnderstanding: Number(understandingResult.rows[0].avg_score),
  });
}));

// GET /api/analysis/patterns/:profileId - Learning patterns
router.get('/patterns/:profileId', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { profileId } = req.params;

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  const [dayOfWeekResult, timeOfDayResult] = await Promise.all([
    pool.query(`
      SELECT
        EXTRACT(DOW FROM started_at) AS day,
        COALESCE(SUM(duration), 0) AS total_minutes,
        COUNT(*) AS session_count
      FROM study_sessions
      WHERE user_id = $1
      GROUP BY EXTRACT(DOW FROM started_at)
      ORDER BY day
    `, [profileId]),
    pool.query(`
      SELECT
        EXTRACT(HOUR FROM started_at) AS hour,
        COALESCE(SUM(duration), 0) AS total_minutes,
        COUNT(*) AS session_count
      FROM study_sessions
      WHERE user_id = $1
      GROUP BY EXTRACT(HOUR FROM started_at)
      ORDER BY hour
    `, [profileId]),
  ]);

  const dayOfWeek = dayOfWeekResult.rows.map((row) => ({
    day: Number(row.day),
    dayName: dayNames[Number(row.day)],
    totalMinutes: Number(row.total_minutes),
    sessionCount: Number(row.session_count),
  }));

  const timeOfDay = timeOfDayResult.rows.map((row) => ({
    hour: Number(row.hour),
    totalMinutes: Number(row.total_minutes),
    sessionCount: Number(row.session_count),
  }));

  // Find optimal study time (hour with most total study time)
  let optimalStudyTime: string | null = null;
  if (timeOfDay.length > 0) {
    const best = timeOfDay.reduce((max, cur) => cur.totalMinutes > max.totalMinutes ? cur : max);
    optimalStudyTime = `${String(best.hour).padStart(2, '0')}:00`;
  }

  res.json({
    profileId,
    dayOfWeek,
    timeOfDay,
    optimalStudyTime,
  });
}));

export default router;
