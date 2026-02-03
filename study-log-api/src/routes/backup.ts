import { Router } from 'express';
import { getDatabase } from '../database/index.js';

const router = Router();

// GET /api/backup/export - Export all data as JSON
router.get('/export', (_req, res) => {
  const db = getDatabase();

  const subjects = db.prepare('SELECT * FROM subjects').all();
  const units = db.prepare('SELECT * FROM units').all();
  const topics = db.prepare('SELECT * FROM topics').all();
  const checklist = db.prepare('SELECT * FROM checklist_items').all();
  const links = db.prepare('SELECT * FROM links').all();
  const sessions = db.prepare('SELECT * FROM study_sessions').all();
  const reviews = db.prepare('SELECT * FROM review_entries').all();
  const exams = db.prepare('SELECT * FROM exams').all();
  const stats = db.prepare('SELECT * FROM user_stats WHERE id = 1').get();
  const settings = db.prepare('SELECT * FROM app_settings WHERE id = 1').get();

  res.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { subjects, units, topics, checklist, links, sessions, reviews, exams, stats, settings },
  });
});

// POST /api/backup/import - Import data from JSON
router.post('/import', (req, res) => {
  const db = getDatabase();
  const backup = req.body;

  if (!backup.version || !backup.data) {
    res.status(400).json({ error: 'Invalid backup format' });
    return;
  }

  const importTransaction = db.transaction(() => {
    const { data } = backup;

    // Clear existing data in reverse dependency order
    db.prepare('DELETE FROM review_entries').run();
    db.prepare('DELETE FROM study_sessions').run();
    db.prepare('DELETE FROM checklist_items').run();
    db.prepare('DELETE FROM links').run();
    db.prepare('DELETE FROM topics').run();
    db.prepare('DELETE FROM units').run();
    db.prepare('DELETE FROM exams').run();
    db.prepare('DELETE FROM subjects').run();

    for (const s of data.subjects ?? []) {
      db.prepare(
        'INSERT INTO subjects (id, name, color, icon, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(s.id, s.name, s.color, s.icon, s.sort_order, s.created_at, s.updated_at);
    }
    for (const u of data.units ?? []) {
      db.prepare(
        'INSERT INTO units (id, subject_id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(u.id, u.subject_id, u.name, u.sort_order, u.created_at, u.updated_at);
    }
    for (const t of data.topics ?? []) {
      db.prepare(
        'INSERT INTO topics (id, subject_id, unit_id, title, notes, difficulty, importance, tags, column_name, study_time_total, next_review_at, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        t.id, t.subject_id, t.unit_id, t.title, t.notes, t.difficulty, t.importance,
        t.tags, t.column_name, t.study_time_total, t.next_review_at, t.sort_order,
        t.created_at, t.updated_at
      );
    }
    for (const c of data.checklist ?? []) {
      db.prepare(
        'INSERT INTO checklist_items (id, topic_id, text, checked, sort_order) VALUES (?, ?, ?, ?, ?)'
      ).run(c.id, c.topic_id, c.text, c.checked, c.sort_order);
    }
    for (const l of data.links ?? []) {
      db.prepare(
        'INSERT INTO links (id, topic_id, url, label, sort_order) VALUES (?, ?, ?, ?, ?)'
      ).run(l.id, l.topic_id, l.url, l.label, l.sort_order);
    }
    for (const ss of data.sessions ?? []) {
      db.prepare(
        'INSERT INTO study_sessions (id, topic_id, started_at, ended_at, duration, timer_type) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(ss.id, ss.topic_id, ss.started_at, ss.ended_at, ss.duration, ss.timer_type);
    }
    for (const r of data.reviews ?? []) {
      db.prepare(
        'INSERT INTO review_entries (id, topic_id, reviewed_at, from_column, to_column) VALUES (?, ?, ?, ?, ?)'
      ).run(r.id, r.topic_id, r.reviewed_at, r.from_column, r.to_column);
    }
    for (const e of data.exams ?? []) {
      db.prepare(
        'INSERT INTO exams (id, name, date, subject_ids, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(e.id, e.name, e.date, e.subject_ids, e.created_at, e.updated_at);
    }

    if (data.stats) {
      const s = data.stats;
      db.prepare(
        'UPDATE user_stats SET total_xp = ?, current_streak = ?, longest_streak = ?, last_study_date = ? WHERE id = 1'
      ).run(s.total_xp, s.current_streak, s.longest_streak, s.last_study_date);
    }

    if (data.settings) {
      const st = data.settings;
      db.prepare(
        'UPDATE app_settings SET theme = ?, pomodoro_focus = ?, pomodoro_short_break = ?, pomodoro_long_break = ?, pomodoro_cycles = ?, daily_goal = ?, llm_provider = ?, llm_model = ?, sidebar_collapsed = ? WHERE id = 1'
      ).run(
        st.theme, st.pomodoro_focus, st.pomodoro_short_break, st.pomodoro_long_break,
        st.pomodoro_cycles, st.daily_goal, st.llm_provider, st.llm_model, st.sidebar_collapsed
      );
    }
  });

  importTransaction();
  res.json({ success: true });
});

export default router;
