import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { calculateGemCost } from '../services/gemCostCalculator.js';

interface Migration {
  version: number;
  description: string;
  up: (client: PoolClient) => Promise<void>;
}

const migrations: Migration[] = [
  {
    version: 2,
    description: 'Add links table and migrate JSON links from topics',
    up: async (client) => {
      // Check if links table already exists (created by schema.ts on fresh install)
      const tableCheck = await client.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'links'"
      );

      if (tableCheck.rows.length === 0) {
        await client.query(`
          CREATE TABLE links (
            id TEXT PRIMARY KEY,
            topic_id TEXT NOT NULL,
            url TEXT NOT NULL,
            label TEXT NOT NULL DEFAULT '',
            sort_order INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
          );
          CREATE INDEX idx_links_topic ON links(topic_id);
        `);
      }

      // Check if topics table still has a links column (old schema)
      const columnCheck = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'links'"
      );

      if (columnCheck.rows.length > 0) {
        // Migrate existing JSON links data to the new links table
        const topicsWithLinks = await client.query(
          "SELECT id, links FROM topics WHERE links IS NOT NULL AND links != '[]'"
        );

        for (const topic of topicsWithLinks.rows) {
          try {
            const linksArray = JSON.parse(topic.links);
            if (Array.isArray(linksArray)) {
              for (let index = 0; index < linksArray.length; index++) {
                const link = linksArray[index];
                const linkId = `migrated-${topic.id}-${index}`;
                if (typeof link === 'string') {
                  await client.query(
                    'INSERT INTO links (id, topic_id, url, label, sort_order) VALUES ($1, $2, $3, $4, $5)',
                    [linkId, topic.id, link, '', index]
                  );
                } else if (link && typeof link === 'object' && link.url) {
                  await client.query(
                    'INSERT INTO links (id, topic_id, url, label, sort_order) VALUES ($1, $2, $3, $4, $5)',
                    [linkId, topic.id, link.url, link.label ?? '', index]
                  );
                }
              }
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    },
  },
  {
    version: 3,
    description: 'Add profiles table and profile_id to existing tables',
    up: async (client) => {
      // Create profiles table
      await client.query(`
        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          avatar TEXT NOT NULL DEFAULT 'default',
          pin TEXT,
          role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'parent')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Create default profile and migrate existing data
      const defaultProfileId = uuidv4();
      await client.query(
        "INSERT INTO profiles (id, name, avatar, role) VALUES ($1, '학생1', 'default', 'student')",
        [defaultProfileId]
      );

      // Add profile_id to subjects
      const subjectsCol = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'profile_id'"
      );
      if (subjectsCol.rows.length === 0) {
        await client.query('ALTER TABLE subjects ADD COLUMN profile_id TEXT REFERENCES profiles(id)');
        await client.query('UPDATE subjects SET profile_id = $1', [defaultProfileId]);
        await client.query('CREATE INDEX idx_subjects_profile ON subjects(profile_id)');
      }

      // Add profile_id to study_sessions
      const sessionsCol = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'study_sessions' AND column_name = 'profile_id'"
      );
      if (sessionsCol.rows.length === 0) {
        await client.query('ALTER TABLE study_sessions ADD COLUMN profile_id TEXT REFERENCES profiles(id)');
        await client.query('UPDATE study_sessions SET profile_id = $1', [defaultProfileId]);
        await client.query('CREATE INDEX idx_study_sessions_profile ON study_sessions(profile_id)');
      }

      // Add profile_id to review_entries
      const reviewsCol = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'review_entries' AND column_name = 'profile_id'"
      );
      if (reviewsCol.rows.length === 0) {
        await client.query('ALTER TABLE review_entries ADD COLUMN profile_id TEXT REFERENCES profiles(id)');
        await client.query('UPDATE review_entries SET profile_id = $1', [defaultProfileId]);
        await client.query('CREATE INDEX idx_review_entries_profile ON review_entries(profile_id)');
      }

      // Add profile_id to xp_log
      const xpLogCol = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'xp_log' AND column_name = 'profile_id'"
      );
      if (xpLogCol.rows.length === 0) {
        await client.query('ALTER TABLE xp_log ADD COLUMN profile_id TEXT REFERENCES profiles(id)');
        await client.query('UPDATE xp_log SET profile_id = $1', [defaultProfileId]);
        await client.query('CREATE INDEX idx_xp_log_profile ON xp_log(profile_id)');
      }

      // Transform user_stats: remove id=1 constraint, add profile_id
      const statsProfileCol = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'profile_id'"
      );
      if (statsProfileCol.rows.length === 0) {
        // Drop the CHECK constraint on id
        await client.query('ALTER TABLE user_stats DROP CONSTRAINT IF EXISTS user_stats_id_check');
        await client.query('ALTER TABLE user_stats ADD COLUMN profile_id TEXT REFERENCES profiles(id)');
        await client.query('UPDATE user_stats SET profile_id = $1 WHERE id = 1', [defaultProfileId]);
        // Drop old PK and create new one based on profile_id
        await client.query('ALTER TABLE user_stats DROP CONSTRAINT user_stats_pkey');
        await client.query('ALTER TABLE user_stats DROP COLUMN id');
        await client.query('ALTER TABLE user_stats ADD PRIMARY KEY (profile_id)');
      }

      // Transform app_settings: remove id=1 constraint, add profile_id
      const settingsProfileCol = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'profile_id'"
      );
      if (settingsProfileCol.rows.length === 0) {
        await client.query('ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_id_check');
        await client.query('ALTER TABLE app_settings ADD COLUMN profile_id TEXT REFERENCES profiles(id)');
        await client.query('UPDATE app_settings SET profile_id = $1 WHERE id = 1', [defaultProfileId]);
        await client.query('ALTER TABLE app_settings DROP CONSTRAINT app_settings_pkey');
        await client.query('ALTER TABLE app_settings DROP COLUMN id');
        await client.query('ALTER TABLE app_settings ADD PRIMARY KEY (profile_id)');
      }
    },
  },
  {
    version: 4,
    description: 'Add weekly_goals table and self-eval columns to review_entries',
    up: async (client) => {
      // Create weekly_goals table
      await client.query(`
        CREATE TABLE IF NOT EXISTS weekly_goals (
          id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL REFERENCES profiles(id),
          week_start DATE NOT NULL,
          goals JSONB NOT NULL DEFAULT '[]',
          reflection TEXT,
          achievement_rate REAL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(profile_id, week_start)
        );
        CREATE INDEX IF NOT EXISTS idx_weekly_goals_profile ON weekly_goals(profile_id);
        CREATE INDEX IF NOT EXISTS idx_weekly_goals_week ON weekly_goals(week_start);
      `);

      // Add self-eval columns to review_entries
      const scoreCol = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'review_entries' AND column_name = 'understanding_score'"
      );
      if (scoreCol.rows.length === 0) {
        await client.query('ALTER TABLE review_entries ADD COLUMN understanding_score INTEGER CHECK (understanding_score BETWEEN 1 AND 5)');
      }

      const noteCol = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'review_entries' AND column_name = 'self_note'"
      );
      if (noteCol.rows.length === 0) {
        await client.query('ALTER TABLE review_entries ADD COLUMN self_note TEXT');
      }
    },
  },
  {
    version: 5,
    description: 'Add weekly_reflections and achievements tables',
    up: async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS weekly_reflections (
          id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL REFERENCES profiles(id),
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
          UNIQUE(profile_id, week_start)
        );
        CREATE INDEX IF NOT EXISTS idx_weekly_reflections_profile ON weekly_reflections(profile_id);
        CREATE INDEX IF NOT EXISTS idx_weekly_reflections_week ON weekly_reflections(week_start);

        CREATE TABLE IF NOT EXISTS achievements (
          id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL REFERENCES profiles(id),
          achievement_key TEXT NOT NULL,
          unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(profile_id, achievement_key)
        );
        CREATE INDEX IF NOT EXISTS idx_achievements_profile ON achievements(profile_id);
      `);
    },
  },
  {
    version: 6,
    description: 'Add monthly_reports, challenges, and challenge_participants tables',
    up: async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS monthly_reports (
          id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL REFERENCES profiles(id),
          month TEXT NOT NULL,
          report_data JSONB NOT NULL,
          generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(profile_id, month)
        );
        CREATE INDEX IF NOT EXISTS idx_monthly_reports_profile ON monthly_reports(profile_id);

        CREATE TABLE IF NOT EXISTS challenges (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          challenge_type TEXT NOT NULL CHECK (challenge_type IN ('study_time', 'review_count', 'streak', 'goal_rate')),
          target_value INTEGER NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          created_by TEXT REFERENCES profiles(id),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_challenges_dates ON challenges(start_date, end_date);

        CREATE TABLE IF NOT EXISTS challenge_participants (
          challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
          profile_id TEXT NOT NULL REFERENCES profiles(id),
          current_value INTEGER NOT NULL DEFAULT 0,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          completed_at TIMESTAMPTZ,
          PRIMARY KEY (challenge_id, profile_id)
        );
        CREATE INDEX IF NOT EXISTS idx_challenge_participants_profile ON challenge_participants(profile_id);
      `);
    },
  },
  {
    version: 7,
    description: 'Migrate profiles to users with auth, add curriculum tables',
    up: async (client) => {
      // Create users table
      const usersTable = await client.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users'"
      );
      if (usersTable.rows.length === 0) {
        await client.query(`
          CREATE TABLE users (
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
          CREATE INDEX idx_users_email ON users(email);
        `);

        // Migrate profiles to users
        const profilesExist = await client.query(
          "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles'"
        );
        if (profilesExist.rows.length > 0) {
          const { rows: profiles } = await client.query('SELECT * FROM profiles');
          for (const p of profiles) {
            await client.query(
              `INSERT INTO users (id, email, password_hash, name, role, avatar, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [p.id, `${p.id}@migrated.local`, '$2b$12$placeholder.hash.for.migration', p.name, p.role, p.avatar, p.created_at]
            );
          }
        }
      }

      // Rename profile_id to user_id in all tables
      const tablesToRename = [
        'subjects', 'study_sessions', 'review_entries', 'xp_log',
        'weekly_goals', 'weekly_reflections', 'achievements', 'monthly_reports',
      ];
      for (const table of tablesToRename) {
        const col = await client.query(
          "SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = 'profile_id'",
          [table]
        );
        if (col.rows.length > 0) {
          await client.query(`ALTER TABLE ${table} RENAME COLUMN profile_id TO user_id`);
        }
      }

      // Handle user_stats (profile_id is PK)
      const statsPk = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'profile_id'"
      );
      if (statsPk.rows.length > 0) {
        await client.query('ALTER TABLE user_stats RENAME COLUMN profile_id TO user_id');
      }

      // Handle app_settings (profile_id is PK)
      const settingsPk = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'profile_id'"
      );
      if (settingsPk.rows.length > 0) {
        await client.query('ALTER TABLE app_settings RENAME COLUMN profile_id TO user_id');
      }

      // Handle challenge_participants (profile_id in composite PK)
      const cpCol = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'challenge_participants' AND column_name = 'profile_id'"
      );
      if (cpCol.rows.length > 0) {
        await client.query('ALTER TABLE challenge_participants RENAME COLUMN profile_id TO user_id');
      }

      // Handle challenges.created_by FK (already references profiles, need to re-point to users)
      // No column rename needed since created_by is not profile_id

      // Create curriculum tables
      await client.query(`
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

      // Add template FK columns to subjects, units, topics
      const ctSubCol = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'ct_subject_id'"
      );
      if (ctSubCol.rows.length === 0) {
        await client.query('ALTER TABLE subjects ADD COLUMN ct_subject_id TEXT');
      }

      const ctUnitCol = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'ct_unit_id'"
      );
      if (ctUnitCol.rows.length === 0) {
        await client.query('ALTER TABLE units ADD COLUMN ct_unit_id TEXT');
      }

      const ctTopicCol = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'template_topic_id'"
      );
      if (ctTopicCol.rows.length === 0) {
        await client.query('ALTER TABLE topics ADD COLUMN template_topic_id TEXT');
      }

      // Drop profiles table
      const profilesExist2 = await client.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles'"
      );
      if (profilesExist2.rows.length > 0) {
        await client.query('DROP TABLE profiles CASCADE');
      }
    },
  },
  {
    version: 8,
    description: 'Redesign kanban columns for spaced repetition with mastery tracking',
    up: async (client) => {
      // 1) Add mastery_count column
      const masteryCol = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'mastery_count'"
      );
      if (masteryCol.rows.length === 0) {
        await client.query('ALTER TABLE topics ADD COLUMN mastery_count INTEGER NOT NULL DEFAULT 0');
      }

      // 2) Migrate data FIRST (before CHECK change)
      await client.query(`
        UPDATE topics SET column_name = 'reviewing',
          next_review_at = COALESCE(next_review_at, NOW() + INTERVAL '3 days')
          WHERE column_name = 'three_days'
      `);
      await client.query(`
        UPDATE topics SET column_name = 'reviewing',
          next_review_at = COALESCE(next_review_at, NOW() + INTERVAL '7 days')
          WHERE column_name = 'one_week'
      `);
      await client.query(`
        UPDATE topics SET column_name = 'reviewing',
          next_review_at = COALESCE(next_review_at, NOW() + INTERVAL '30 days')
          WHERE column_name = 'one_month'
      `);
      await client.query(`
        UPDATE topics SET column_name = 'mastered', mastery_count = 3
          WHERE column_name = 'done'
      `);

      // 3) Drop old CHECK and add new one
      await client.query('ALTER TABLE topics DROP CONSTRAINT IF EXISTS topics_column_name_check');
      await client.query(`
        ALTER TABLE topics ADD CONSTRAINT topics_column_name_check
          CHECK (column_name IN ('backlog', 'today', 'reviewing', 'mastered'))
      `);

      // 4) Index for reviewing queries
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_topics_column_reviewing
          ON topics(column_name, next_review_at)
          WHERE column_name = 'reviewing'
      `);
    },
  },
  {
    version: 9,
    description: 'Add gem economy tables and columns for Study Splendor',
    up: async (client) => {
      // 1. Create gem_wallets table
      await client.query(`
        CREATE TABLE IF NOT EXISTS gem_wallets (
          user_id TEXT PRIMARY KEY REFERENCES users(id),
          emerald INTEGER NOT NULL DEFAULT 0,
          sapphire INTEGER NOT NULL DEFAULT 0,
          ruby INTEGER NOT NULL DEFAULT 0,
          diamond INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      // 2. Create gem_transactions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS gem_transactions (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          gem_type TEXT NOT NULL CHECK (gem_type IN ('emerald','sapphire','ruby','diamond')),
          amount INTEGER NOT NULL,
          reason TEXT NOT NULL,
          reference_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await client.query('CREATE INDEX IF NOT EXISTS idx_gem_tx_user ON gem_transactions(user_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_gem_tx_created ON gem_transactions(created_at)');

      // 3. Add columns to topics
      const gemCostCol = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'gem_cost'"
      );
      if (gemCostCol.rows.length === 0) {
        await client.query(`ALTER TABLE topics ADD COLUMN gem_cost JSONB NOT NULL DEFAULT '{"emerald":0,"sapphire":0,"ruby":0,"diamond":0}'`);
      }

      const purchasedCol = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'purchased'"
      );
      if (purchasedCol.rows.length === 0) {
        await client.query('ALTER TABLE topics ADD COLUMN purchased BOOLEAN NOT NULL DEFAULT FALSE');
      }

      const discountCol = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'purchase_discount'"
      );
      if (discountCol.rows.length === 0) {
        await client.query(`ALTER TABLE topics ADD COLUMN purchase_discount JSONB NOT NULL DEFAULT '{"emerald":0,"sapphire":0,"ruby":0,"diamond":0}'`);
      }

      // 4. Add prestige_points to user_stats
      const prestigeCol = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'prestige_points'"
      );
      if (prestigeCol.rows.length === 0) {
        await client.query('ALTER TABLE user_stats ADD COLUMN prestige_points INTEGER NOT NULL DEFAULT 0');
      }

      // 5. Backfill existing topics with calculated gem_cost
      const { rows: topics } = await client.query('SELECT id, difficulty, importance FROM topics');
      for (const topic of topics) {
        const cost = calculateGemCost(topic.difficulty as string, topic.importance as string);
        await client.query('UPDATE topics SET gem_cost = $1 WHERE id = $2', [JSON.stringify(cost), topic.id]);
      }

      // 6. Mark mastered topics as purchased=true
      await client.query("UPDATE topics SET purchased = true WHERE column_name = 'mastered'");

      // 7. Create gem_wallets for existing users
      await client.query(`
        INSERT INTO gem_wallets (user_id)
        SELECT id FROM users
        WHERE id NOT IN (SELECT user_id FROM gem_wallets)
      `);
    },
  },
  {
    version: 10,
    description: 'Add progress column to curriculum_templates for two-phase generation',
    up: async (client) => {
      const progressCol = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'curriculum_templates' AND column_name = 'progress'"
      );
      if (progressCol.rows.length === 0) {
        await client.query(`ALTER TABLE curriculum_templates ADD COLUMN progress JSONB NOT NULL DEFAULT '{}'`);
      }
    },
  },
];

export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const { rows: appliedRows } = await pool.query('SELECT version FROM schema_migrations');
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  // Fresh database: createSchema already created the latest schema,
  // so mark all migrations as applied without running them.
  if (appliedVersions.size === 0) {
    const { rows: tableCheck } = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'topics'"
    );
    if (tableCheck.length > 0) {
      for (const migration of migrations) {
        await pool.query(
          'INSERT INTO schema_migrations (version, description) VALUES ($1, $2)',
          [migration.version, migration.description]
        );
      }
      console.log(`Fresh database detected: marked ${migrations.length} migrations as applied`);
      return;
    }
  }

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await migration.up(client);
        await client.query(
          'INSERT INTO schema_migrations (version, description) VALUES ($1, $2)',
          [migration.version, migration.description]
        );
        await client.query('COMMIT');
        console.log(`Migration ${migration.version} applied: ${migration.description}`);
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
  }
}
