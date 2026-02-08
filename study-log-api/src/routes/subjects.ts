import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/index.js';
import { mapSubject, mapUnit } from '../database/mappers.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// GET /api/subjects - Get all subjects
router.get('/', asyncHandler(async (_req, res) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM subjects ORDER BY sort_order ASC');
  res.json(rows.map(mapSubject));
}));

// POST /api/subjects - Create subject
router.post('/', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { name, color, icon } = req.body;

  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const id = uuidv4();
  const maxOrder = await pool.query(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM subjects'
  );

  await pool.query(
    'INSERT INTO subjects (id, name, color, icon, sort_order) VALUES ($1, $2, $3, $4, $5)',
    [id, name, color ?? '#1890ff', icon ?? 'BookOutlined', maxOrder.rows[0].next_order]
  );

  const { rows } = await pool.query('SELECT * FROM subjects WHERE id = $1', [id]);
  res.status(201).json(mapSubject(rows[0]));
}));

// PATCH /api/subjects/:id - Update subject
router.patch('/:id', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const data = req.body;

  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(data.name); }
  if (data.color !== undefined) { fields.push(`color = $${paramIndex++}`); values.push(data.color); }
  if (data.icon !== undefined) { fields.push(`icon = $${paramIndex++}`); values.push(data.icon); }
  if (data.sortOrder !== undefined) { fields.push(`sort_order = $${paramIndex++}`); values.push(data.sortOrder); }

  if (fields.length === 0) {
    const { rows } = await pool.query('SELECT * FROM subjects WHERE id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Subject not found' });
      return;
    }
    res.json(mapSubject(rows[0]));
    return;
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  await pool.query(`UPDATE subjects SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
  const { rows } = await pool.query('SELECT * FROM subjects WHERE id = $1', [id]);

  if (rows.length === 0) {
    res.status(404).json({ error: 'Subject not found' });
    return;
  }
  res.json(mapSubject(rows[0]));
}));

// DELETE /api/subjects/:id - Delete subject
router.delete('/:id', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  await pool.query('DELETE FROM subjects WHERE id = $1', [id]);
  res.json({ success: true });
}));

// ── Units ──

// GET /api/subjects/:id/units - Get units by subject
router.get('/:id/units', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const { rows } = await pool.query(
    'SELECT * FROM units WHERE subject_id = $1 ORDER BY sort_order ASC',
    [id]
  );
  res.json(rows.map(mapUnit));
}));

// POST /api/subjects/:id/units - Create unit
router.post('/:id/units', asyncHandler(async (req, res) => {
  const pool = getPool();
  const subjectId = req.params.id;
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const id = uuidv4();
  const maxOrder = await pool.query(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM units WHERE subject_id = $1',
    [subjectId]
  );

  await pool.query(
    'INSERT INTO units (id, subject_id, name, sort_order) VALUES ($1, $2, $3, $4)',
    [id, subjectId, name, maxOrder.rows[0].next_order]
  );

  const { rows } = await pool.query('SELECT * FROM units WHERE id = $1', [id]);
  res.status(201).json(mapUnit(rows[0]));
}));

// PATCH /api/subjects/:subjectId/units/:id - Update unit
router.patch('/:subjectId/units/:id', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const data = req.body;

  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(data.name); }
  if (data.sortOrder !== undefined) { fields.push(`sort_order = $${paramIndex++}`); values.push(data.sortOrder); }

  if (fields.length === 0) {
    const { rows } = await pool.query('SELECT * FROM units WHERE id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Unit not found' });
      return;
    }
    res.json(mapUnit(rows[0]));
    return;
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  await pool.query(`UPDATE units SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
  const { rows } = await pool.query('SELECT * FROM units WHERE id = $1', [id]);

  if (rows.length === 0) {
    res.status(404).json({ error: 'Unit not found' });
    return;
  }
  res.json(mapUnit(rows[0]));
}));

// DELETE /api/subjects/:subjectId/units/:id - Delete unit
router.delete('/:subjectId/units/:id', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  await pool.query('DELETE FROM units WHERE id = $1', [id]);
  res.json({ success: true });
}));

export default router;
