import { ipcMain } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database';
import {
  mapTopic, mapChecklistItem, mapLink, mapStudySession,
  mapReviewEntry, mapExam, mapUserStats, mapAppSettings,
  mapTopicWithJoins,
} from '../database/mappers';

type DbRow = Record<string, unknown>;

export function registerTopicHandlers(): void {
  const db = () => getDatabase();

  // ── Topics ──

  ipcMain.handle('topics:getAll', (_event, filters?: {
    subjectId?: string; column?: string; unitId?: string;
  }) => {
    let sql = 'SELECT * FROM topics WHERE 1=1';
    const params: unknown[] = [];

    if (filters?.subjectId) { sql += ' AND subject_id = ?'; params.push(filters.subjectId); }
    if (filters?.column) { sql += ' AND column_name = ?'; params.push(filters.column); }
    if (filters?.unitId) { sql += ' AND unit_id = ?'; params.push(filters.unitId); }

    sql += ' ORDER BY sort_order ASC';
    const rows = db().prepare(sql).all(...params) as DbRow[];
    return rows.map(mapTopic);
  });

  ipcMain.handle('topics:getById', (_event, id: string) => {
    const topicRow = db().prepare('SELECT * FROM topics WHERE id = ?').get(id) as DbRow | undefined;
    if (!topicRow) return null;

    const checklistRows = db().prepare(
      'SELECT * FROM checklist_items WHERE topic_id = ? ORDER BY sort_order ASC'
    ).all(id) as DbRow[];

    const linkRows = db().prepare(
      'SELECT * FROM links WHERE topic_id = ? ORDER BY sort_order ASC'
    ).all(id) as DbRow[];

    const sessionRows = db().prepare(
      'SELECT * FROM study_sessions WHERE topic_id = ? ORDER BY started_at DESC'
    ).all(id) as DbRow[];

    const reviewRows = db().prepare(
      'SELECT * FROM review_entries WHERE topic_id = ? ORDER BY reviewed_at DESC'
    ).all(id) as DbRow[];

    return {
      ...mapTopic(topicRow),
      checklist: checklistRows.map(mapChecklistItem),
      links: linkRows.map(mapLink),
      studySessions: sessionRows.map(mapStudySession),
      reviewHistory: reviewRows.map(mapReviewEntry),
    };
  });

  ipcMain.handle('topics:getBySubject', (_event, subjectId: string) => {
    const rows = db().prepare(
      'SELECT * FROM topics WHERE subject_id = ? ORDER BY sort_order ASC'
    ).all(subjectId) as DbRow[];
    return rows.map(mapTopic);
  });

  ipcMain.handle('topics:getByColumn', (_event, column: string) => {
    const rows = db().prepare(
      'SELECT * FROM topics WHERE column_name = ? ORDER BY sort_order ASC'
    ).all(column) as DbRow[];
    return rows.map(mapTopic);
  });

  ipcMain.handle('topics:create', (_event, data: {
    subjectId: string; unitId: string; title: string; notes?: string;
    difficulty?: string; importance?: string; tags?: string[];
    column?: string;
  }) => {
    const id = uuidv4();
    const columnName = data.column ?? 'today';
    const maxOrder = db().prepare(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM topics WHERE column_name = ?'
    ).get(columnName) as { next_order: number };

    db().prepare(`
      INSERT INTO topics (id, subject_id, unit_id, title, notes, difficulty, importance, tags, column_name, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.subjectId, data.unitId, data.title,
      data.notes ?? '', data.difficulty ?? 'medium', data.importance ?? 'medium',
      JSON.stringify(data.tags ?? []),
      columnName, maxOrder.next_order
    );

    const row = db().prepare('SELECT * FROM topics WHERE id = ?').get(id) as DbRow;
    return mapTopic(row);
  });

  ipcMain.handle('topics:update', (_event, id: string, data: Record<string, unknown>) => {
    const fields: string[] = [];
    const values: unknown[] = [];

    const fieldMap: Record<string, string> = {
      title: 'title', notes: 'notes', difficulty: 'difficulty',
      importance: 'importance', column: 'column_name', sortOrder: 'sort_order',
      nextReviewAt: 'next_review_at', studyTimeTotal: 'study_time_total',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) { fields.push(`${col} = ?`); values.push(data[key]); }
    }

    if (data.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(data.tags)); }

    if (fields.length === 0) {
      const row = db().prepare('SELECT * FROM topics WHERE id = ?').get(id) as DbRow;
      return row ? mapTopic(row) : null;
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    db().prepare(`UPDATE topics SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const row = db().prepare('SELECT * FROM topics WHERE id = ?').get(id) as DbRow;
    return row ? mapTopic(row) : null;
  });

  ipcMain.handle('topics:delete', (_event, id: string) => {
    db().prepare('DELETE FROM topics WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle('topics:move', (_event, id: string, column: string, sortOrder: number) => {
    db().prepare(
      "UPDATE topics SET column_name = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(column, sortOrder, id);
    const row = db().prepare('SELECT * FROM topics WHERE id = ?').get(id) as DbRow;
    return row ? mapTopic(row) : null;
  });

  ipcMain.handle('topics:moveToNextColumn', (_event, id: string) => {
    const topicRow = db().prepare('SELECT * FROM topics WHERE id = ?').get(id) as DbRow | undefined;
    if (!topicRow) return { success: false, message: 'Topic not found' };

    const currentColumn = topicRow.column_name as string;
    const progression: Record<string, { next: string; days: number } | null> = {
      today: { next: 'three_days', days: 3 },
      three_days: { next: 'one_week', days: 7 },
      one_week: { next: 'one_month', days: 30 },
      one_month: { next: 'done', days: 0 },
      done: null,
    };

    const step = progression[currentColumn];
    if (!step) {
      return { success: false, message: 'Card is already completed.' };
    }

    const targetColumn = step.next;
    let nextReviewAt: string | null = null;
    if (targetColumn !== 'done' && step.days > 0) {
      const reviewDate = new Date(Date.now() + step.days * 86400000);
      nextReviewAt = reviewDate.toISOString();
    }

    const moveTransaction = db().transaction(() => {
      db().prepare(
        "UPDATE topics SET column_name = ?, next_review_at = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(targetColumn, nextReviewAt, id);

      const reviewId = uuidv4();
      db().prepare(
        'INSERT INTO review_entries (id, topic_id, from_column, to_column) VALUES (?, ?, ?, ?)'
      ).run(reviewId, id, currentColumn, targetColumn);

      // Award XP
      const xpAmount = targetColumn === 'done' ? 30 : 10;
      db().prepare('UPDATE user_stats SET total_xp = total_xp + ? WHERE id = 1').run(xpAmount);
      db().prepare('INSERT INTO xp_log (amount, reason) VALUES (?, ?)').run(
        xpAmount, targetColumn === 'done' ? 'topic_mastered' : 'review_completed'
      );

      const updatedRow = db().prepare('SELECT * FROM topics WHERE id = ?').get(id) as DbRow;
      return {
        success: true,
        topic: mapTopic(updatedRow),
        fromColumn: currentColumn,
        toColumn: targetColumn,
        xpAwarded: xpAmount,
      };
    });

    return moveTransaction();
  });

  // ── Checklist ──

  ipcMain.handle('topics:getChecklist', (_event, topicId: string) => {
    const rows = db().prepare(
      'SELECT * FROM checklist_items WHERE topic_id = ? ORDER BY sort_order ASC'
    ).all(topicId) as DbRow[];
    return rows.map(mapChecklistItem);
  });

  ipcMain.handle('topics:upsertChecklistItem', (_event, data: {
    id?: string; topicId: string; text: string; checked?: boolean; sortOrder?: number;
  }) => {
    const id = data.id ?? uuidv4();
    db().prepare(`
      INSERT INTO checklist_items (id, topic_id, text, checked, sort_order)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET text = excluded.text, checked = excluded.checked, sort_order = excluded.sort_order
    `).run(id, data.topicId, data.text, data.checked ? 1 : 0, data.sortOrder ?? 0);
    const row = db().prepare('SELECT * FROM checklist_items WHERE id = ?').get(id) as DbRow;
    return mapChecklistItem(row);
  });

  ipcMain.handle('topics:deleteChecklistItem', (_event, id: string) => {
    db().prepare('DELETE FROM checklist_items WHERE id = ?').run(id);
    return { success: true };
  });

  // ── Links ──

  ipcMain.handle('links:getByTopic', (_event, topicId: string) => {
    const rows = db().prepare(
      'SELECT * FROM links WHERE topic_id = ? ORDER BY sort_order ASC'
    ).all(topicId) as DbRow[];
    return rows.map(mapLink);
  });

  ipcMain.handle('links:upsert', (_event, data: {
    id?: string; topicId: string; url: string; label?: string; sortOrder?: number;
  }) => {
    const id = data.id ?? uuidv4();
    db().prepare(`
      INSERT INTO links (id, topic_id, url, label, sort_order)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET url = excluded.url, label = excluded.label, sort_order = excluded.sort_order
    `).run(id, data.topicId, data.url, data.label ?? '', data.sortOrder ?? 0);
    const row = db().prepare('SELECT * FROM links WHERE id = ?').get(id) as DbRow;
    return mapLink(row);
  });

  ipcMain.handle('links:delete', (_event, id: string) => {
    db().prepare('DELETE FROM links WHERE id = ?').run(id);
    return { success: true };
  });

  // ── Search (FTS5) ──

  ipcMain.handle('search:query', (_event, query: string, filters?: { subjectId?: string }) => {
    if (!query || query.trim().length === 0) return [];

    // Sanitize query for FTS5: escape special characters and add prefix matching
    const sanitized = query.replace(/['"]/g, '').trim();
    if (sanitized.length === 0) return [];

    let sql = `
      SELECT t.* FROM topics t
      JOIN topics_fts fts ON t.rowid = fts.rowid
      WHERE topics_fts MATCH ?
    `;
    const params: unknown[] = [sanitized + '*'];

    if (filters?.subjectId) {
      sql += ' AND t.subject_id = ?';
      params.push(filters.subjectId);
    }

    sql += ' ORDER BY rank LIMIT 50';

    try {
      const rows = db().prepare(sql).all(...params) as DbRow[];
      return rows.map(mapTopic);
    } catch {
      // FTS query syntax error fallback: try LIKE search
      let fallbackSql = `SELECT * FROM topics WHERE (title LIKE ? OR notes LIKE ?)`;
      const fallbackParams: unknown[] = [`%${sanitized}%`, `%${sanitized}%`];

      if (filters?.subjectId) {
        fallbackSql += ' AND subject_id = ?';
        fallbackParams.push(filters.subjectId);
      }

      fallbackSql += ' ORDER BY updated_at DESC LIMIT 50';
      const rows = db().prepare(fallbackSql).all(...fallbackParams) as DbRow[];
      return rows.map(mapTopic);
    }
  });

  // ── Settings ──

  ipcMain.handle('settings:get', () => {
    const row = db().prepare('SELECT * FROM app_settings WHERE id = 1').get() as DbRow;
    return mapAppSettings(row);
  });

  ipcMain.handle('settings:update', (_event, data: Record<string, unknown>) => {
    const fields: string[] = [];
    const values: unknown[] = [];

    const fieldMap: Record<string, string> = {
      theme: 'theme', pomodoroFocus: 'pomodoro_focus',
      pomodoroShortBreak: 'pomodoro_short_break', pomodoroLongBreak: 'pomodoro_long_break',
      pomodoroCycles: 'pomodoro_cycles', dailyGoal: 'daily_goal',
      llmProvider: 'llm_provider', llmModel: 'llm_model',
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
      db().prepare(`UPDATE app_settings SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    const row = db().prepare('SELECT * FROM app_settings WHERE id = 1').get() as DbRow;
    return mapAppSettings(row);
  });

  // ── Stats ──

  ipcMain.handle('stats:get', () => {
    const row = db().prepare('SELECT * FROM user_stats WHERE id = 1').get() as DbRow;
    return mapUserStats(row);
  });

  ipcMain.handle('stats:addXp', (_event, amount: number, reason: string) => {
    const addXpTransaction = db().transaction(() => {
      db().prepare('UPDATE user_stats SET total_xp = total_xp + ? WHERE id = 1').run(amount);
      db().prepare('INSERT INTO xp_log (amount, reason) VALUES (?, ?)').run(amount, reason);
      const row = db().prepare('SELECT * FROM user_stats WHERE id = 1').get() as DbRow;
      return mapUserStats(row);
    });
    return addXpTransaction();
  });

  ipcMain.handle('stats:updateStreak', () => {
    const today = new Date().toISOString().split('T')[0];
    const stats = db().prepare('SELECT * FROM user_stats WHERE id = 1').get() as DbRow;
    const lastDate = stats.last_study_date as string | null;

    if (lastDate === today) {
      return mapUserStats(stats);
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let newStreak = 1;
    if (lastDate === yesterday) {
      newStreak = (stats.current_streak as number) + 1;
    }

    const longestStreak = Math.max(stats.longest_streak as number, newStreak);
    db().prepare(
      'UPDATE user_stats SET current_streak = ?, longest_streak = ?, last_study_date = ? WHERE id = 1'
    ).run(newStreak, longestStreak, today);

    const updatedRow = db().prepare('SELECT * FROM user_stats WHERE id = 1').get() as DbRow;
    return mapUserStats(updatedRow);
  });

  ipcMain.handle('stats:subjectMastery', () => {
    const rows = db().prepare(`
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

    return rows.map((row) => ({
      subjectId: row.subject_id as string,
      subjectName: row.subject_name as string,
      totalTopics: row.total_topics as number,
      completedTopics: row.completed_topics as number,
      ratio: row.ratio as number,
    }));
  });

  // ── Exams ──

  ipcMain.handle('exams:getAll', () => {
    const rows = db().prepare('SELECT * FROM exams ORDER BY date ASC').all() as DbRow[];
    return rows.map(mapExam);
  });

  ipcMain.handle('exams:create', (_event, data: { name: string; date: string; subjectIds?: string[] }) => {
    const id = uuidv4();
    db().prepare('INSERT INTO exams (id, name, date, subject_ids) VALUES (?, ?, ?, ?)').run(
      id, data.name, data.date, JSON.stringify(data.subjectIds ?? [])
    );
    const row = db().prepare('SELECT * FROM exams WHERE id = ?').get(id) as DbRow;
    return mapExam(row);
  });

  ipcMain.handle('exams:update', (_event, id: string, data: {
    name?: string; date?: string; subjectIds?: string[];
  }) => {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
    if (data.subjectIds !== undefined) { fields.push('subject_ids = ?'); values.push(JSON.stringify(data.subjectIds)); }

    if (fields.length === 0) {
      const row = db().prepare('SELECT * FROM exams WHERE id = ?').get(id) as DbRow;
      return row ? mapExam(row) : null;
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);
    db().prepare(`UPDATE exams SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const row = db().prepare('SELECT * FROM exams WHERE id = ?').get(id) as DbRow;
    return row ? mapExam(row) : null;
  });

  ipcMain.handle('exams:delete', (_event, id: string) => {
    db().prepare('DELETE FROM exams WHERE id = ?').run(id);
    return { success: true };
  });

  // ── Backup ──

  ipcMain.handle('backup:export', () => {
    const subjects = db().prepare('SELECT * FROM subjects').all();
    const units = db().prepare('SELECT * FROM units').all();
    const topics = db().prepare('SELECT * FROM topics').all();
    const checklist = db().prepare('SELECT * FROM checklist_items').all();
    const links = db().prepare('SELECT * FROM links').all();
    const sessions = db().prepare('SELECT * FROM study_sessions').all();
    const reviews = db().prepare('SELECT * FROM review_entries').all();
    const exams = db().prepare('SELECT * FROM exams').all();
    const stats = db().prepare('SELECT * FROM user_stats WHERE id = 1').get();
    const settings = db().prepare('SELECT * FROM app_settings WHERE id = 1').get();

    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { subjects, units, topics, checklist, links, sessions, reviews, exams, stats, settings },
    }, null, 2);
  });

  ipcMain.handle('backup:import', (_event, jsonString: string) => {
    const backup = JSON.parse(jsonString);
    if (!backup.version || !backup.data) {
      throw new Error('Invalid backup format');
    }

    const importTransaction = db().transaction(() => {
      const { data } = backup;

      // Clear existing data in reverse dependency order
      db().prepare('DELETE FROM review_entries').run();
      db().prepare('DELETE FROM study_sessions').run();
      db().prepare('DELETE FROM checklist_items').run();
      db().prepare('DELETE FROM links').run();
      db().prepare('DELETE FROM topics').run();
      db().prepare('DELETE FROM units').run();
      db().prepare('DELETE FROM exams').run();
      db().prepare('DELETE FROM subjects').run();

      for (const s of data.subjects ?? []) {
        db().prepare(
          'INSERT INTO subjects (id, name, color, icon, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(s.id, s.name, s.color, s.icon, s.sort_order, s.created_at, s.updated_at);
      }
      for (const u of data.units ?? []) {
        db().prepare(
          'INSERT INTO units (id, subject_id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(u.id, u.subject_id, u.name, u.sort_order, u.created_at, u.updated_at);
      }
      for (const t of data.topics ?? []) {
        db().prepare(
          'INSERT INTO topics (id, subject_id, unit_id, title, notes, difficulty, importance, tags, column_name, study_time_total, next_review_at, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
          t.id, t.subject_id, t.unit_id, t.title, t.notes, t.difficulty, t.importance,
          t.tags, t.column_name, t.study_time_total, t.next_review_at, t.sort_order,
          t.created_at, t.updated_at
        );
      }
      for (const c of data.checklist ?? []) {
        db().prepare(
          'INSERT INTO checklist_items (id, topic_id, text, checked, sort_order) VALUES (?, ?, ?, ?, ?)'
        ).run(c.id, c.topic_id, c.text, c.checked, c.sort_order);
      }
      for (const l of data.links ?? []) {
        db().prepare(
          'INSERT INTO links (id, topic_id, url, label, sort_order) VALUES (?, ?, ?, ?, ?)'
        ).run(l.id, l.topic_id, l.url, l.label, l.sort_order);
      }
      for (const ss of data.sessions ?? []) {
        db().prepare(
          'INSERT INTO study_sessions (id, topic_id, started_at, ended_at, duration, timer_type) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(ss.id, ss.topic_id, ss.started_at, ss.ended_at, ss.duration, ss.timer_type);
      }
      for (const r of data.reviews ?? []) {
        db().prepare(
          'INSERT INTO review_entries (id, topic_id, reviewed_at, from_column, to_column) VALUES (?, ?, ?, ?, ?)'
        ).run(r.id, r.topic_id, r.reviewed_at, r.from_column, r.to_column);
      }
      for (const e of data.exams ?? []) {
        db().prepare(
          'INSERT INTO exams (id, name, date, subject_ids, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(e.id, e.name, e.date, e.subject_ids, e.created_at, e.updated_at);
      }

      if (data.stats) {
        const s = data.stats;
        db().prepare(
          'UPDATE user_stats SET total_xp = ?, current_streak = ?, longest_streak = ?, last_study_date = ? WHERE id = 1'
        ).run(s.total_xp, s.current_streak, s.longest_streak, s.last_study_date);
      }

      if (data.settings) {
        const st = data.settings;
        db().prepare(
          'UPDATE app_settings SET theme = ?, pomodoro_focus = ?, pomodoro_short_break = ?, pomodoro_long_break = ?, pomodoro_cycles = ?, daily_goal = ?, llm_provider = ?, llm_model = ?, sidebar_collapsed = ? WHERE id = 1'
        ).run(
          st.theme, st.pomodoro_focus, st.pomodoro_short_break, st.pomodoro_long_break,
          st.pomodoro_cycles, st.daily_goal, st.llm_provider, st.llm_model, st.sidebar_collapsed
        );
      }
    });

    importTransaction();
    return { success: true };
  });
}
