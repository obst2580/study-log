import { Router } from 'express';
import { getDatabase } from '../database/index.js';
import { mapTopic } from '../database/mappers.js';

type DbRow = Record<string, unknown>;

const router = Router();

// GET /api/search?q=xxx - Full-text search
router.get('/', (req, res) => {
  const db = getDatabase();
  const { q, subjectId } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    res.json([]);
    return;
  }

  // Sanitize query for FTS5: escape special characters and add prefix matching
  const sanitized = q.replace(/['"]/g, '').trim();
  if (sanitized.length === 0) {
    res.json([]);
    return;
  }

  let sql = `
    SELECT t.* FROM topics t
    JOIN topics_fts fts ON t.rowid = fts.rowid
    WHERE topics_fts MATCH ?
  `;
  const params: unknown[] = [sanitized + '*'];

  if (subjectId) {
    sql += ' AND t.subject_id = ?';
    params.push(subjectId);
  }

  sql += ' ORDER BY rank LIMIT 50';

  try {
    const rows = db.prepare(sql).all(...params) as DbRow[];
    res.json(rows.map(mapTopic));
  } catch {
    // FTS query syntax error fallback: try LIKE search
    let fallbackSql = `SELECT * FROM topics WHERE (title LIKE ? OR notes LIKE ?)`;
    const fallbackParams: unknown[] = [`%${sanitized}%`, `%${sanitized}%`];

    if (subjectId) {
      fallbackSql += ' AND subject_id = ?';
      fallbackParams.push(subjectId);
    }

    fallbackSql += ' ORDER BY updated_at DESC LIMIT 50';
    const rows = db.prepare(fallbackSql).all(...fallbackParams) as DbRow[];
    res.json(rows.map(mapTopic));
  }
});

export default router;
