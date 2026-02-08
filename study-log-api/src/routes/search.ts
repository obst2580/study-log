import { Router } from 'express';
import { getPool } from '../database/index.js';
import { mapTopic } from '../database/mappers.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// GET /api/search?q=xxx - Full-text search
router.get('/', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { q, subjectId } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    res.json([]);
    return;
  }

  const sanitized = q.replace(/['"]/g, '').trim();
  if (sanitized.length === 0) {
    res.json([]);
    return;
  }

  let paramIndex = 1;

  let sql = `
    SELECT t.* FROM topics t
    WHERE t.search_vector @@ plainto_tsquery('simple', $${paramIndex++})
  `;
  const params: unknown[] = [sanitized];

  if (subjectId) {
    sql += ` AND t.subject_id = $${paramIndex++}`;
    params.push(subjectId);
  }

  sql += ` ORDER BY ts_rank(t.search_vector, plainto_tsquery('simple', $1)) DESC LIMIT 50`;

  try {
    const { rows } = await pool.query(sql, params);
    res.json(rows.map(mapTopic));
  } catch {
    // FTS query error fallback: try LIKE search
    let fallbackParamIndex = 1;
    const fallbackParams: unknown[] = [`%${sanitized}%`, `%${sanitized}%`];
    let fallbackSql = `SELECT * FROM topics WHERE (title LIKE $${fallbackParamIndex++} OR notes LIKE $${fallbackParamIndex++})`;

    if (subjectId) {
      fallbackSql += ` AND subject_id = $${fallbackParamIndex++}`;
      fallbackParams.push(subjectId);
    }

    fallbackSql += ' ORDER BY updated_at DESC LIMIT 50';
    const { rows } = await pool.query(fallbackSql, fallbackParams);
    res.json(rows.map(mapTopic));
  }
}));

export default router;
