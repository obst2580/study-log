import { ipcMain } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database';
import { mapSubject, mapUnit } from '../database/mappers';

type DbRow = Record<string, unknown>;

export function registerSubjectHandlers(): void {
  const db = () => getDatabase();

  // ── Subjects ──

  ipcMain.handle('subjects:getAll', () => {
    const rows = db().prepare('SELECT * FROM subjects ORDER BY sort_order ASC').all() as DbRow[];
    return rows.map(mapSubject);
  });

  ipcMain.handle('subjects:create', (_event, data: { name: string; color?: string; icon?: string }) => {
    const id = uuidv4();
    const maxOrder = db().prepare(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM subjects'
    ).get() as { next_order: number };

    db().prepare(
      'INSERT INTO subjects (id, name, color, icon, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run(id, data.name, data.color ?? '#1890ff', data.icon ?? 'BookOutlined', maxOrder.next_order);

    const row = db().prepare('SELECT * FROM subjects WHERE id = ?').get(id) as DbRow;
    return mapSubject(row);
  });

  ipcMain.handle('subjects:update', (_event, id: string, data: {
    name?: string; color?: string; icon?: string; sortOrder?: number;
  }) => {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
    if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon); }
    if (data.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(data.sortOrder); }

    if (fields.length === 0) {
      const row = db().prepare('SELECT * FROM subjects WHERE id = ?').get(id) as DbRow;
      return row ? mapSubject(row) : null;
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    db().prepare(`UPDATE subjects SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const row = db().prepare('SELECT * FROM subjects WHERE id = ?').get(id) as DbRow;
    return row ? mapSubject(row) : null;
  });

  ipcMain.handle('subjects:delete', (_event, id: string) => {
    db().prepare('DELETE FROM subjects WHERE id = ?').run(id);
    return { success: true };
  });

  // ── Units ──

  ipcMain.handle('units:getBySubject', (_event, subjectId: string) => {
    const rows = db().prepare(
      'SELECT * FROM units WHERE subject_id = ? ORDER BY sort_order ASC'
    ).all(subjectId) as DbRow[];
    return rows.map(mapUnit);
  });

  ipcMain.handle('units:create', (_event, data: { subjectId: string; name: string }) => {
    const id = uuidv4();
    const maxOrder = db().prepare(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM units WHERE subject_id = ?'
    ).get(data.subjectId) as { next_order: number };

    db().prepare(
      'INSERT INTO units (id, subject_id, name, sort_order) VALUES (?, ?, ?, ?)'
    ).run(id, data.subjectId, data.name, maxOrder.next_order);

    const row = db().prepare('SELECT * FROM units WHERE id = ?').get(id) as DbRow;
    return mapUnit(row);
  });

  ipcMain.handle('units:update', (_event, id: string, data: { name?: string; sortOrder?: number }) => {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(data.sortOrder); }

    if (fields.length === 0) {
      const row = db().prepare('SELECT * FROM units WHERE id = ?').get(id) as DbRow;
      return row ? mapUnit(row) : null;
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    db().prepare(`UPDATE units SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const row = db().prepare('SELECT * FROM units WHERE id = ?').get(id) as DbRow;
    return row ? mapUnit(row) : null;
  });

  ipcMain.handle('units:delete', (_event, id: string) => {
    db().prepare('DELETE FROM units WHERE id = ?').run(id);
    return { success: true };
  });
}
