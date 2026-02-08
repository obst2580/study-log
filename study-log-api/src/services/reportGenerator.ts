import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/index.js';

interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  totalTopics: number;
  completedTopics: number;
  ratio: number;
}

interface MonthlyReportData {
  totalStudyTime: number;
  reviewCount: number;
  avgUnderstanding: number;
  subjectProgress: SubjectProgress[];
  weeklyGoalRates: number[];
  growthVsPrevMonth: {
    studyTimeDelta: number;
    reviewCountDelta: number;
    understandingDelta: number;
  };
}

function getPrevMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  const prevDate = new Date(year, mon - 2, 1);
  const y = prevDate.getFullYear();
  const m = String(prevDate.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

async function getMonthStats(userId: string, month: string) {
  const pool = getPool();
  const startDate = `${month}-01`;
  const [year, mon] = month.split('-').map(Number);
  const endDate = new Date(year, mon, 1).toISOString().split('T')[0];

  const [studyResult, reviewResult, understandingResult] = await Promise.all([
    pool.query(
      'SELECT COALESCE(SUM(duration), 0) AS total FROM study_sessions WHERE user_id = $1 AND started_at >= $2 AND started_at < $3',
      [userId, startDate, endDate]
    ),
    pool.query(
      'SELECT COUNT(*) AS cnt FROM review_entries WHERE user_id = $1 AND reviewed_at >= $2 AND reviewed_at < $3',
      [userId, startDate, endDate]
    ),
    pool.query(
      'SELECT COALESCE(AVG(understanding_score), 0) AS avg_score FROM review_entries WHERE user_id = $1 AND reviewed_at >= $2 AND reviewed_at < $3 AND understanding_score IS NOT NULL',
      [userId, startDate, endDate]
    ),
  ]);

  return {
    totalStudyTime: Number(studyResult.rows[0].total),
    reviewCount: Number(reviewResult.rows[0].cnt),
    avgUnderstanding: Number(understandingResult.rows[0].avg_score),
  };
}

export async function generateMonthlyReport(userId: string, month: string): Promise<MonthlyReportData> {
  const pool = getPool();
  const startDate = `${month}-01`;
  const [year, mon] = month.split('-').map(Number);
  const endDate = new Date(year, mon, 1).toISOString().split('T')[0];

  const currentStats = await getMonthStats(userId, month);
  const prevMonth = getPrevMonth(month);
  const prevStats = await getMonthStats(userId, prevMonth);

  const { rows: masteryRows } = await pool.query(`
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
  `, [userId]);

  const { rows: goalRows } = await pool.query(
    'SELECT COALESCE(achievement_rate, 0) AS rate FROM weekly_goals WHERE user_id = $1 AND week_start >= $2 AND week_start < $3 ORDER BY week_start',
    [userId, startDate, endDate]
  );

  const reportData: MonthlyReportData = {
    totalStudyTime: currentStats.totalStudyTime,
    reviewCount: currentStats.reviewCount,
    avgUnderstanding: currentStats.avgUnderstanding,
    subjectProgress: masteryRows.map((row) => ({
      subjectId: row.subject_id as string,
      subjectName: row.subject_name as string,
      totalTopics: Number(row.total_topics),
      completedTopics: Number(row.completed_topics),
      ratio: Number(row.ratio),
    })),
    weeklyGoalRates: goalRows.map((r) => Number(r.rate)),
    growthVsPrevMonth: {
      studyTimeDelta: currentStats.totalStudyTime - prevStats.totalStudyTime,
      reviewCountDelta: currentStats.reviewCount - prevStats.reviewCount,
      understandingDelta: Number((currentStats.avgUnderstanding - prevStats.avgUnderstanding).toFixed(2)),
    },
  };

  const id = uuidv4();
  await pool.query(`
    INSERT INTO monthly_reports (id, user_id, month, report_data)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, month)
    DO UPDATE SET report_data = $4, generated_at = NOW()
    RETURNING *
  `, [id, userId, month, JSON.stringify(reportData)]);

  return reportData;
}
