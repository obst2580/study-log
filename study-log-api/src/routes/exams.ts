import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/index.js';
import { mapExam } from '../database/mappers.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// GET /api/exams - Get all exams
router.get('/', asyncHandler(async (_req, res) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM exams ORDER BY date ASC');
  res.json(rows.map(mapExam));
}));

// GET /api/exams/:id - Get exam by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const { rows } = await pool.query('SELECT * FROM exams WHERE id = $1', [id]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'Exam not found' });
    return;
  }
  res.json(mapExam(rows[0]));
}));

// POST /api/exams - Create exam
router.post('/', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { name, date, subjectIds } = req.body;

  if (!name || !date) {
    res.status(400).json({ error: 'name and date are required' });
    return;
  }

  const id = uuidv4();
  await pool.query(
    'INSERT INTO exams (id, name, date, subject_ids) VALUES ($1, $2, $3, $4)',
    [id, name, date, JSON.stringify(subjectIds ?? [])]
  );

  const { rows } = await pool.query('SELECT * FROM exams WHERE id = $1', [id]);
  res.status(201).json(mapExam(rows[0]));
}));

// PATCH /api/exams/:id - Update exam
router.patch('/:id', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const data = req.body;

  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(data.name); }
  if (data.date !== undefined) { fields.push(`date = $${paramIndex++}`); values.push(data.date); }
  if (data.subjectIds !== undefined) { fields.push(`subject_ids = $${paramIndex++}`); values.push(JSON.stringify(data.subjectIds)); }

  if (fields.length === 0) {
    const { rows } = await pool.query('SELECT * FROM exams WHERE id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Exam not found' });
      return;
    }
    res.json(mapExam(rows[0]));
    return;
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  await pool.query(`UPDATE exams SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
  const { rows } = await pool.query('SELECT * FROM exams WHERE id = $1', [id]);

  if (rows.length === 0) {
    res.status(404).json({ error: 'Exam not found' });
    return;
  }
  res.json(mapExam(rows[0]));
}));

// DELETE /api/exams/:id - Delete exam
router.delete('/:id', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  await pool.query('DELETE FROM exams WHERE id = $1', [id]);
  res.json({ success: true });
}));

export default router;
