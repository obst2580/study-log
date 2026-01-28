import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { createSchema } from './schema';
import { runMigrations } from './migrations';

let db: Database.Database | null = null;

export function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'studylog.db');
}

export function initDatabase(): Database.Database {
  const dbPath = getDbPath();
  db = new Database(dbPath);

  // Performance and integrity pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('cache_size = -8000'); // 8MB cache

  createSchema(db);
  runMigrations(db);

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
