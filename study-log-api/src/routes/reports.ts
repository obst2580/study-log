import { Router } from 'express';
import { getPool } from '../database/index.js';
import { mapMonthlyReport } from '../database/mappers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateMonthlyReport } from '../services/reportGenerator.js';

const router = Router();

// GET /api/reports - List available reports
router.get('/', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM monthly_reports WHERE user_id = $1 ORDER BY month DESC',
    [req.userId]
  );
  res.json(rows.map(mapMonthlyReport));
}));

// GET /api/reports/:month - Get or generate monthly report
router.get('/:month', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { month } = req.params;

  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: 'Month must be in YYYY-MM format' });
    return;
  }

  const { rows } = await pool.query(
    'SELECT * FROM monthly_reports WHERE user_id = $1 AND month = $2',
    [req.userId, month]
  );

  if (rows.length > 0) {
    res.json(mapMonthlyReport(rows[0]));
    return;
  }

  const reportData = await generateMonthlyReport(req.userId, month);
  const { rows: newRows } = await pool.query(
    'SELECT * FROM monthly_reports WHERE user_id = $1 AND month = $2',
    [req.userId, month]
  );
  res.json(mapMonthlyReport(newRows[0]));
}));

export default router;
