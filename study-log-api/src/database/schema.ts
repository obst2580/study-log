import Database from 'better-sqlite3';

export function createSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#1890ff',
      icon TEXT NOT NULL DEFAULT 'BookOutlined',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('high', 'medium', 'low')),
      importance TEXT NOT NULL DEFAULT 'medium' CHECK (importance IN ('high', 'medium', 'low')),
      tags TEXT NOT NULL DEFAULT '[]',
      column_name TEXT NOT NULL DEFAULT 'today' CHECK (column_name IN ('today', 'three_days', 'one_week', 'one_month', 'done')),
      study_time_total INTEGER NOT NULL DEFAULT 0,
      next_review_at TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS checklist_items (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      text TEXT NOT NULL,
      checked INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      url TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT NOT NULL,
      duration INTEGER NOT NULL,
      timer_type TEXT NOT NULL DEFAULT 'stopwatch' CHECK (timer_type IN ('pomodoro', 'stopwatch')),
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_entries (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
      from_column TEXT NOT NULL,
      to_column TEXT NOT NULL,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      subject_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_stats (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_xp INTEGER NOT NULL DEFAULT 0,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_study_date TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      theme TEXT NOT NULL DEFAULT 'light',
      pomodoro_focus INTEGER NOT NULL DEFAULT 1500,
      pomodoro_short_break INTEGER NOT NULL DEFAULT 300,
      pomodoro_long_break INTEGER NOT NULL DEFAULT 900,
      pomodoro_cycles INTEGER NOT NULL DEFAULT 4,
      daily_goal INTEGER NOT NULL DEFAULT 5,
      llm_provider TEXT,
      llm_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
      sidebar_collapsed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS xp_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Initialize singleton rows
    INSERT OR IGNORE INTO user_stats (id, total_xp, current_streak, longest_streak) VALUES (1, 0, 0, 0);
    INSERT OR IGNORE INTO app_settings (id) VALUES (1);

    -- FTS5 virtual table for full-text search on topic title, notes, and tags
    CREATE VIRTUAL TABLE IF NOT EXISTS topics_fts USING fts5(
      title,
      notes,
      tags,
      content=topics,
      content_rowid=rowid
    );

    -- Triggers to keep FTS index in sync
    CREATE TRIGGER IF NOT EXISTS topics_ai AFTER INSERT ON topics BEGIN
      INSERT INTO topics_fts(rowid, title, notes, tags) VALUES (new.rowid, new.title, new.notes, new.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS topics_ad AFTER DELETE ON topics BEGIN
      INSERT INTO topics_fts(topics_fts, rowid, title, notes, tags) VALUES ('delete', old.rowid, old.title, old.notes, old.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS topics_au AFTER UPDATE ON topics BEGIN
      INSERT INTO topics_fts(topics_fts, rowid, title, notes, tags) VALUES ('delete', old.rowid, old.title, old.notes, old.tags);
      INSERT INTO topics_fts(rowid, title, notes, tags) VALUES (new.rowid, new.title, new.notes, new.tags);
    END;

    -- Indexes for query performance
    CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id);
    CREATE INDEX IF NOT EXISTS idx_topics_unit ON topics(unit_id);
    CREATE INDEX IF NOT EXISTS idx_topics_column ON topics(column_name);
    CREATE INDEX IF NOT EXISTS idx_topics_next_review ON topics(next_review_at);
    CREATE INDEX IF NOT EXISTS idx_study_sessions_topic ON study_sessions(topic_id);
    CREATE INDEX IF NOT EXISTS idx_study_sessions_started ON study_sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_review_entries_topic ON review_entries(topic_id);
    CREATE INDEX IF NOT EXISTS idx_checklist_topic ON checklist_items(topic_id);
    CREATE INDEX IF NOT EXISTS idx_units_subject ON units(subject_id);
    CREATE INDEX IF NOT EXISTS idx_links_topic ON links(topic_id);
  `);
}
