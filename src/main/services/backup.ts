import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { getDbPath } from '../database';

const MAX_BACKUPS = 7;

function getBackupDir(): string {
  const backupDir = path.join(app.getPath('userData'), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

function createBackup(): void {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) return;

  const backupDir = getBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupPath = path.join(backupDir, `studylog-${timestamp}.db`);

  if (fs.existsSync(backupPath)) return;

  try {
    fs.copyFileSync(dbPath, backupPath);
    console.log(`Backup created: ${backupPath}`);
    cleanOldBackups();
  } catch (err) {
    console.error('Backup failed:', err);
  }
}

function cleanOldBackups(): void {
  const backupDir = getBackupDir();
  const files = fs.readdirSync(backupDir)
    .filter((f) => f.startsWith('studylog-') && f.endsWith('.db'))
    .map((f) => ({
      name: f,
      path: path.join(backupDir, f),
      time: fs.statSync(path.join(backupDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.time - a.time);

  for (let i = MAX_BACKUPS; i < files.length; i++) {
    try {
      fs.unlinkSync(files[i].path);
      console.log(`Old backup removed: ${files[i].name}`);
    } catch (err) {
      console.error(`Failed to remove old backup: ${files[i].name}`, err);
    }
  }
}

export function setupAutoBackup(): void {
  createBackup();

  // Run backup check every 12 hours
  setInterval(createBackup, 12 * 60 * 60 * 1000);
}
