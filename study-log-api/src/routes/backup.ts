import { Router } from 'express';
import { getPool } from '../database/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  mapSubject, mapUnit, mapTopic, mapChecklistItem, mapLink,
  mapStudySession, mapReviewEntry, mapExam, mapUserStats, mapAppSettings,
} from '../database/mappers.js';

const router = Router();

// GET /api/backup/export - Export all data as JSON (camelCase)
router.get('/export', asyncHandler(async (_req, res) => {
  const pool = getPool();

  const [
    subjects, units, topics, checklist, links,
    sessions, reviews, exams, stats, settings,
  ] = await Promise.all([
    pool.query('SELECT * FROM subjects'),
    pool.query('SELECT * FROM units'),
    pool.query('SELECT * FROM topics'),
    pool.query('SELECT * FROM checklist_items'),
    pool.query('SELECT * FROM links'),
    pool.query('SELECT * FROM study_sessions'),
    pool.query('SELECT * FROM review_entries'),
    pool.query('SELECT * FROM exams'),
    pool.query('SELECT * FROM user_stats LIMIT 1'),
    pool.query('SELECT * FROM app_settings LIMIT 1'),
  ]);

  res.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      subjects: subjects.rows.map(mapSubject),
      units: units.rows.map(mapUnit),
      topics: topics.rows.map(mapTopic),
      checklist: checklist.rows.map(mapChecklistItem),
      links: links.rows.map(mapLink),
      sessions: sessions.rows.map(mapStudySession),
      reviews: reviews.rows.map(mapReviewEntry),
      exams: exams.rows.map(mapExam),
      stats: stats.rows[0] ? mapUserStats(stats.rows[0]) : null,
      settings: settings.rows[0] ? mapAppSettings(settings.rows[0]) : null,
    },
  });
}));

// Validate that a data array (if present) contains required fields
function validateTableData(
  data: Record<string, unknown>,
  tableName: string,
  requiredFields: string[],
): string | null {
  const tableData = data[tableName];
  if (tableData === undefined || tableData === null) return null;
  if (!Array.isArray(tableData)) {
    return `"${tableName}" must be an array`;
  }
  for (let i = 0; i < tableData.length; i++) {
    const row = tableData[i];
    for (const field of requiredFields) {
      if (row[field] === undefined || row[field] === null) {
        return `"${tableName}[${i}]" is missing required field "${field}"`;
      }
    }
  }
  return null;
}

// POST /api/backup/import - Import data from JSON (camelCase input)
router.post('/import', asyncHandler(async (req, res) => {
  const backup = req.body;

  if (!backup.version || !backup.data) {
    res.status(400).json({ error: 'Invalid backup format' });
    return;
  }

  const { data } = backup;

  // Validate input data before starting transaction
  const validations: [string, string[]][] = [
    ['subjects', ['id', 'name']],
    ['units', ['id', 'subjectId', 'name']],
    ['topics', ['id', 'subjectId', 'unitId', 'title']],
    ['checklist', ['id', 'topicId', 'text']],
    ['links', ['id', 'topicId', 'url']],
    ['sessions', ['id', 'topicId', 'startedAt', 'duration']],
    ['reviews', ['id', 'topicId', 'reviewedAt']],
    ['exams', ['id', 'name', 'date']],
  ];

  for (const [tableName, requiredFields] of validations) {
    const error = validateTableData(data, tableName, requiredFields);
    if (error) {
      res.status(400).json({ error: `Validation failed: ${error}` });
      return;
    }
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear existing data in reverse dependency order
    await client.query('DELETE FROM review_entries');
    await client.query('DELETE FROM study_sessions');
    await client.query('DELETE FROM checklist_items');
    await client.query('DELETE FROM links');
    await client.query('DELETE FROM topics');
    await client.query('DELETE FROM units');
    await client.query('DELETE FROM exams');
    await client.query('DELETE FROM subjects');

    for (const s of data.subjects ?? []) {
      await client.query(
        'INSERT INTO subjects (id, name, color, icon, sort_order, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [s.id, s.name, s.color, s.icon, s.sortOrder, s.createdAt, s.updatedAt]
      );
    }
    for (const u of data.units ?? []) {
      await client.query(
        'INSERT INTO units (id, subject_id, name, sort_order, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [u.id, u.subjectId, u.name, u.sortOrder, u.createdAt, u.updatedAt]
      );
    }
    for (const t of data.topics ?? []) {
      await client.query(
        'INSERT INTO topics (id, subject_id, unit_id, title, notes, difficulty, importance, tags, column_name, study_time_total, next_review_at, sort_order, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
        [
          t.id, t.subjectId, t.unitId, t.title, t.notes, t.difficulty, t.importance,
          JSON.stringify(t.tags ?? []), t.column, t.studyTimeTotal, t.nextReviewAt, t.sortOrder,
          t.createdAt, t.updatedAt,
        ]
      );
    }
    for (const c of data.checklist ?? []) {
      await client.query(
        'INSERT INTO checklist_items (id, topic_id, text, checked, sort_order) VALUES ($1, $2, $3, $4, $5)',
        [c.id, c.topicId, c.text, c.checked, c.sortOrder]
      );
    }
    for (const l of data.links ?? []) {
      await client.query(
        'INSERT INTO links (id, topic_id, url, label, sort_order) VALUES ($1, $2, $3, $4, $5)',
        [l.id, l.topicId, l.url, l.label, l.sortOrder]
      );
    }
    for (const ss of data.sessions ?? []) {
      await client.query(
        'INSERT INTO study_sessions (id, topic_id, started_at, ended_at, duration, timer_type) VALUES ($1, $2, $3, $4, $5, $6)',
        [ss.id, ss.topicId, ss.startedAt, ss.endedAt, ss.duration, ss.timerType]
      );
    }
    for (const r of data.reviews ?? []) {
      await client.query(
        'INSERT INTO review_entries (id, topic_id, reviewed_at, from_column, to_column) VALUES ($1, $2, $3, $4, $5)',
        [r.id, r.topicId, r.reviewedAt, r.fromColumn, r.toColumn]
      );
    }
    for (const e of data.exams ?? []) {
      await client.query(
        'INSERT INTO exams (id, name, date, subject_ids, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [e.id, e.name, e.date, JSON.stringify(e.subjectIds ?? []), e.createdAt, e.updatedAt]
      );
    }

    if (data.stats) {
      const s = data.stats;
      const { rows: userRows } = await client.query('SELECT id FROM users ORDER BY created_at ASC LIMIT 1');
      if (userRows.length > 0) {
        await client.query(
          'UPDATE user_stats SET total_xp = $1, current_streak = $2, longest_streak = $3, last_study_date = $4 WHERE user_id = $5',
          [s.totalXp, s.currentStreak, s.longestStreak, s.lastStudyDate, userRows[0].id]
        );
      }
    }

    if (data.settings) {
      const st = data.settings;
      const { rows: userRows } = await client.query('SELECT id FROM users ORDER BY created_at ASC LIMIT 1');
      if (userRows.length > 0) {
        await client.query(
          'UPDATE app_settings SET theme = $1, pomodoro_focus = $2, pomodoro_short_break = $3, pomodoro_long_break = $4, pomodoro_cycles = $5, daily_goal = $6, llm_provider = $7, llm_model = $8, sidebar_collapsed = $9 WHERE user_id = $10',
          [
            st.theme, st.pomodoroFocus, st.pomodoroShortBreak, st.pomodoroLongBreak,
            st.pomodoroCycles, st.dailyGoal, st.llmProvider, st.llmModel, st.sidebarCollapsed,
            userRows[0].id,
          ]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

export default router;
