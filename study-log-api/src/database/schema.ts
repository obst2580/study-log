import { Pool } from 'pg';

export async function createSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      grade TEXT CHECK (grade IN (
        'middle-1','middle-2','middle-3',
        'high-1','high-2','high-2-science',
        'high-3','high-3-science'
      )),
      role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'parent')),
      avatar TEXT NOT NULL DEFAULT 'default',
      refresh_token TEXT,
      refresh_token_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#1890ff',
      icon TEXT NOT NULL DEFAULT 'BookOutlined',
      sort_order INTEGER NOT NULL DEFAULT 0,
      user_id TEXT REFERENCES users(id),
      ct_subject_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      ct_unit_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
      next_review_at TIMESTAMPTZ,
      sort_order INTEGER NOT NULL DEFAULT 0,
      template_topic_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      search_vector TSVECTOR,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS checklist_items (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      text TEXT NOT NULL,
      checked BOOLEAN NOT NULL DEFAULT FALSE,
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
      started_at TIMESTAMPTZ NOT NULL,
      ended_at TIMESTAMPTZ NOT NULL,
      duration INTEGER NOT NULL,
      timer_type TEXT NOT NULL DEFAULT 'stopwatch' CHECK (timer_type IN ('pomodoro', 'stopwatch')),
      user_id TEXT REFERENCES users(id),
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_entries (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      from_column TEXT NOT NULL,
      to_column TEXT NOT NULL,
      understanding_score INTEGER CHECK (understanding_score BETWEEN 1 AND 5),
      self_note TEXT,
      user_id TEXT REFERENCES users(id),
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      subject_ids TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_stats (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      total_xp INTEGER NOT NULL DEFAULT 0,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_study_date TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      theme TEXT NOT NULL DEFAULT 'light',
      pomodoro_focus INTEGER NOT NULL DEFAULT 1500,
      pomodoro_short_break INTEGER NOT NULL DEFAULT 300,
      pomodoro_long_break INTEGER NOT NULL DEFAULT 900,
      pomodoro_cycles INTEGER NOT NULL DEFAULT 4,
      daily_goal INTEGER NOT NULL DEFAULT 5,
      llm_provider TEXT,
      llm_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
      sidebar_collapsed BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS weekly_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      week_start DATE NOT NULL,
      goals JSONB NOT NULL DEFAULT '[]',
      reflection TEXT,
      achievement_rate REAL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, week_start)
    );

    CREATE TABLE IF NOT EXISTS weekly_reflections (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      week_start DATE NOT NULL,
      what_went_well TEXT,
      what_to_improve TEXT,
      next_week_focus TEXT,
      mood INTEGER CHECK (mood BETWEEN 1 AND 5),
      study_time_total INTEGER NOT NULL DEFAULT 0,
      review_count INTEGER NOT NULL DEFAULT 0,
      goal_rate REAL NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, week_start)
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      achievement_key TEXT NOT NULL,
      unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, achievement_key)
    );

    CREATE TABLE IF NOT EXISTS monthly_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      month TEXT NOT NULL,
      report_data JSONB NOT NULL,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, month)
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      challenge_type TEXT NOT NULL CHECK (challenge_type IN ('study_time', 'review_count', 'streak', 'goal_rate')),
      target_value INTEGER NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      created_by TEXT REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS challenge_participants (
      challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      current_value INTEGER NOT NULL DEFAULT 0,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      completed_at TIMESTAMPTZ,
      PRIMARY KEY (challenge_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS xp_log (
      id SERIAL PRIMARY KEY,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      user_id TEXT REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS curriculum_templates (
      id TEXT PRIMARY KEY,
      grade TEXT NOT NULL UNIQUE,
      version INTEGER NOT NULL DEFAULT 1,
      generated_by TEXT NOT NULL DEFAULT 'claude',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('generating','active','archived')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ct_subjects (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES curriculum_templates(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#1890ff',
      icon TEXT NOT NULL DEFAULT 'BookOutlined',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ct_units (
      id TEXT PRIMARY KEY,
      ct_subject_id TEXT NOT NULL REFERENCES ct_subjects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ct_topics (
      id TEXT PRIMARY KEY,
      ct_unit_id TEXT NOT NULL REFERENCES ct_units(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'medium',
      importance TEXT NOT NULL DEFAULT 'medium',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ct_checklist_items (
      id TEXT PRIMARY KEY,
      ct_topic_id TEXT NOT NULL REFERENCES ct_topics(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_curriculum_assignments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      template_id TEXT NOT NULL REFERENCES curriculum_templates(id),
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived'))
    );
  `);

  // Create tsvector trigger function and trigger
  await pool.query(`
    CREATE OR REPLACE FUNCTION topics_search_vector_update() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.notes, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.tags, '')), 'C');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'topics_search_vector_trigger'
      ) THEN
        CREATE TRIGGER topics_search_vector_trigger
          BEFORE INSERT OR UPDATE ON topics
          FOR EACH ROW
          EXECUTE FUNCTION topics_search_vector_update();
      END IF;
    END $$;
  `);

  // Create indexes
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id);
    CREATE INDEX IF NOT EXISTS idx_topics_unit ON topics(unit_id);
    CREATE INDEX IF NOT EXISTS idx_topics_column ON topics(column_name);
    CREATE INDEX IF NOT EXISTS idx_topics_next_review ON topics(next_review_at);
    CREATE INDEX IF NOT EXISTS idx_topics_search ON topics USING GIN(search_vector);
    CREATE INDEX IF NOT EXISTS idx_study_sessions_topic ON study_sessions(topic_id);
    CREATE INDEX IF NOT EXISTS idx_study_sessions_started ON study_sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_review_entries_topic ON review_entries(topic_id);
    CREATE INDEX IF NOT EXISTS idx_review_entries_user ON review_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_checklist_topic ON checklist_items(topic_id);
    CREATE INDEX IF NOT EXISTS idx_units_subject ON units(subject_id);
    CREATE INDEX IF NOT EXISTS idx_links_topic ON links(topic_id);
    CREATE INDEX IF NOT EXISTS idx_subjects_user ON subjects(user_id);
    CREATE INDEX IF NOT EXISTS idx_xp_log_user ON xp_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_weekly_goals_user ON weekly_goals(user_id);
    CREATE INDEX IF NOT EXISTS idx_weekly_goals_week ON weekly_goals(week_start);
    CREATE INDEX IF NOT EXISTS idx_weekly_reflections_user ON weekly_reflections(user_id);
    CREATE INDEX IF NOT EXISTS idx_weekly_reflections_week ON weekly_reflections(week_start);
    CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
    CREATE INDEX IF NOT EXISTS idx_monthly_reports_user ON monthly_reports(user_id);
    CREATE INDEX IF NOT EXISTS idx_challenges_dates ON challenges(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON challenge_participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_curriculum_templates_grade ON curriculum_templates(grade);
    CREATE INDEX IF NOT EXISTS idx_ct_subjects_template ON ct_subjects(template_id);
    CREATE INDEX IF NOT EXISTS idx_ct_units_subject ON ct_units(ct_subject_id);
    CREATE INDEX IF NOT EXISTS idx_ct_topics_unit ON ct_topics(ct_unit_id);
    CREATE INDEX IF NOT EXISTS idx_ct_checklist_topic ON ct_checklist_items(ct_topic_id);
    CREATE INDEX IF NOT EXISTS idx_user_curriculum_user ON user_curriculum_assignments(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_curriculum_template ON user_curriculum_assignments(template_id);
  `);
}
