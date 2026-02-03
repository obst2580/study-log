import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/index.js';
import { mapSubject, mapUnit } from '../database/mappers.js';

type DbRow = Record<string, unknown>;

const router = Router();

// ── Subjects ──

// GET /api/subjects - Get all subjects
router.get('/', (_req, res) => {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM subjects ORDER BY sort_order ASC').all() as DbRow[];
  res.json(rows.map(mapSubject));
});

// POST /api/subjects - Create subject
router.post('/', (req, res) => {
  const db = getDatabase();
  const { name, color, icon } = req.body;

  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const id = uuidv4();
  const maxOrder = db.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM subjects'
  ).get() as { next_order: number };

  db.prepare(
    'INSERT INTO subjects (id, name, color, icon, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, color ?? '#1890ff', icon ?? 'BookOutlined', maxOrder.next_order);

  const row = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id) as DbRow;
  res.status(201).json(mapSubject(row));
});

// PATCH /api/subjects/:id - Update subject
router.patch('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const data = req.body;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
  if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon); }
  if (data.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(data.sortOrder); }

  if (fields.length === 0) {
    const row = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id) as DbRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Subject not found' });
      return;
    }
    res.json(mapSubject(row));
    return;
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE subjects SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const row = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id) as DbRow | undefined;

  if (!row) {
    res.status(404).json({ error: 'Subject not found' });
    return;
  }
  res.json(mapSubject(row));
});

// DELETE /api/subjects/:id - Delete subject
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  db.prepare('DELETE FROM subjects WHERE id = ?').run(id);
  res.json({ success: true });
});

// ── Units ──

// GET /api/subjects/:id/units - Get units by subject
router.get('/:id/units', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const rows = db.prepare(
    'SELECT * FROM units WHERE subject_id = ? ORDER BY sort_order ASC'
  ).all(id) as DbRow[];
  res.json(rows.map(mapUnit));
});

// POST /api/subjects/:id/units - Create unit
router.post('/:id/units', (req, res) => {
  const db = getDatabase();
  const subjectId = req.params.id;
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const id = uuidv4();
  const maxOrder = db.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM units WHERE subject_id = ?'
  ).get(subjectId) as { next_order: number };

  db.prepare(
    'INSERT INTO units (id, subject_id, name, sort_order) VALUES (?, ?, ?, ?)'
  ).run(id, subjectId, name, maxOrder.next_order);

  const row = db.prepare('SELECT * FROM units WHERE id = ?').get(id) as DbRow;
  res.status(201).json(mapUnit(row));
});

export default router;
