import Database from 'better-sqlite3';

interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  {
    version: 2,
    description: 'Add links table and migrate JSON links from topics',
    up: (db) => {
      // Check if links table already exists (created by schema.ts on fresh install)
      const tableExists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='links'"
      ).get();

      if (!tableExists) {
        db.exec(`
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
      const columnsResult = db.prepare("PRAGMA table_info(topics)").all() as { name: string }[];
      const hasLinksColumn = columnsResult.some((col) => col.name === 'links');

      if (hasLinksColumn) {
        // Migrate existing JSON links data to the new links table
        const topicsWithLinks = db.prepare(
          "SELECT id, links FROM topics WHERE links IS NOT NULL AND links != '[]'"
        ).all() as { id: string; links: string }[];

        const insertLink = db.prepare(
          'INSERT INTO links (id, topic_id, url, label, sort_order) VALUES (?, ?, ?, ?, ?)'
        );

        for (const topic of topicsWithLinks) {
          try {
            const linksArray = JSON.parse(topic.links);
            if (Array.isArray(linksArray)) {
              linksArray.forEach((link: string | { url: string; label?: string }, index: number) => {
                const linkId = `migrated-${topic.id}-${index}`;
                if (typeof link === 'string') {
                  insertLink.run(linkId, topic.id, link, '', index);
                } else if (link && typeof link === 'object' && link.url) {
                  insertLink.run(linkId, topic.id, link.url, link.label ?? '', index);
                }
              });
            }
          } catch {
            // Skip malformed JSON
          }
        }

        // Note: SQLite does not support DROP COLUMN before version 3.35.0.
        // We leave the column in place but it will no longer be used.
      }
    },
  },
];

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const getApplied = db.prepare('SELECT version FROM schema_migrations');
  const appliedVersions = new Set(
    (getApplied.all() as { version: number }[]).map((r) => r.version)
  );

  const insertMigration = db.prepare(
    'INSERT INTO schema_migrations (version, description) VALUES (?, ?)'
  );

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      const runMigration = db.transaction(() => {
        migration.up(db);
        insertMigration.run(migration.version, migration.description);
      });
      runMigration();
      console.log(`Migration ${migration.version} applied: ${migration.description}`);
    }
  }
}
