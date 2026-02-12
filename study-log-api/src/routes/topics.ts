import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/index.js';
import { calculateGemCost } from '../services/gemCostCalculator.js';
import {
  mapTopic,
  mapSubject,
  mapUnit,
  mapChecklistItem,
  mapLink,
  mapStudySession,
  mapReviewEntry,
} from '../database/mappers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { SCORE_TO_INTERVAL_DAYS, MASTERY_THRESHOLD, MS_PER_DAY } from '../utils/constants.js';

const router = Router();

// GET /api/topics - Get all topics with optional filters
router.get('/', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { subjectId, column, unitId } = req.query;

  let sql = 'SELECT * FROM topics WHERE 1=1';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (subjectId) { sql += ` AND subject_id = $${paramIndex++}`; params.push(subjectId); }
  if (column) { sql += ` AND column_name = $${paramIndex++}`; params.push(column); }
  if (unitId) { sql += ` AND unit_id = $${paramIndex++}`; params.push(unitId); }

  sql += ' ORDER BY sort_order ASC';
  const { rows } = await pool.query(sql, params);
  res.json(rows.map(mapTopic));
}));

// POST /api/topics/bulk-assign-today - Bulk assign backlog topics to today
router.post('/bulk-assign-today', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { topicIds } = req.body;
  if (!Array.isArray(topicIds) || topicIds.length === 0) {
    res.status(400).json({ error: 'topicIds array is required' });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const placeholders = topicIds.map((_, i) => `$${i + 1}`).join(',');
    await client.query(
      `UPDATE topics SET column_name = 'today', updated_at = NOW()
       WHERE id IN (${placeholders}) AND column_name = 'backlog'`,
      topicIds
    );
    await client.query('COMMIT');
    const { rows } = await client.query(
      `SELECT * FROM topics WHERE id IN (${placeholders})`,
      topicIds
    );
    res.json(rows.map(mapTopic));
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

// GET /api/topics/curriculum-tree - Get full curriculum tree
router.get('/curriculum-tree', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { rows: subjects } = await pool.query(
    'SELECT * FROM subjects WHERE user_id = $1 ORDER BY sort_order',
    [req.userId]
  );
  const result = [];
  for (const subject of subjects) {
    const { rows: units } = await pool.query(
      'SELECT * FROM units WHERE subject_id = $1 ORDER BY sort_order',
      [subject.id]
    );
    const unitResults = [];
    let subjectBacklog = 0, subjectReviewing = 0, subjectMastered = 0;
    for (const unit of units) {
      const { rows: topics } = await pool.query(
        'SELECT * FROM topics WHERE unit_id = $1 ORDER BY sort_order',
        [unit.id]
      );
      const backlog = topics.filter(t => t.column_name === 'backlog').length;
      const reviewing = topics.filter(t => t.column_name === 'reviewing' || t.column_name === 'today').length;
      const mastered = topics.filter(t => t.column_name === 'mastered').length;
      subjectBacklog += backlog;
      subjectReviewing += reviewing;
      subjectMastered += mastered;
      unitResults.push({
        ...mapUnit(unit),
        backlogCount: backlog,
        reviewingCount: reviewing,
        masteredCount: mastered,
        totalCount: topics.length,
        topics: topics.map(mapTopic),
      });
    }
    result.push({
      ...mapSubject(subject),
      backlogCount: subjectBacklog,
      reviewingCount: subjectReviewing,
      masteredCount: subjectMastered,
      units: unitResults,
    });
  }
  res.json(result);
}));

// GET /api/topics/:id - Get topic by ID with relations
router.get('/:id', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;

  const topicResult = await pool.query('SELECT * FROM topics WHERE id = $1', [id]);
  if (topicResult.rows.length === 0) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }

  const [checklistResult, linkResult, sessionResult, reviewResult] = await Promise.all([
    pool.query('SELECT * FROM checklist_items WHERE topic_id = $1 ORDER BY sort_order ASC', [id]),
    pool.query('SELECT * FROM links WHERE topic_id = $1 ORDER BY sort_order ASC', [id]),
    pool.query('SELECT * FROM study_sessions WHERE topic_id = $1 ORDER BY started_at DESC', [id]),
    pool.query('SELECT * FROM review_entries WHERE topic_id = $1 ORDER BY reviewed_at DESC', [id]),
  ]);

  res.json({
    ...mapTopic(topicResult.rows[0]),
    checklist: checklistResult.rows.map(mapChecklistItem),
    links: linkResult.rows.map(mapLink),
    studySessions: sessionResult.rows.map(mapStudySession),
    reviewHistory: reviewResult.rows.map(mapReviewEntry),
  });
}));

// POST /api/topics - Create topic
router.post('/', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { subjectId, unitId, title, notes, difficulty, importance, tags, column } = req.body;

  if (!subjectId || !unitId || !title) {
    res.status(400).json({ error: 'subjectId, unitId, and title are required' });
    return;
  }

  const id = uuidv4();
  const columnName = column ?? 'backlog';
  const maxOrder = await pool.query(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM topics WHERE column_name = $1',
    [columnName]
  );

  const effectiveDifficulty = difficulty ?? 'medium';
  const effectiveImportance = importance ?? 'medium';
  const gemCost = calculateGemCost(effectiveDifficulty, effectiveImportance);

  await pool.query(`
    INSERT INTO topics (id, subject_id, unit_id, title, notes, difficulty, importance, tags, column_name, sort_order, gem_cost)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
    id, subjectId, unitId, title,
    notes ?? '', effectiveDifficulty, effectiveImportance,
    JSON.stringify(tags ?? []),
    columnName, maxOrder.rows[0].next_order,
    JSON.stringify(gemCost),
  ]);

  const { rows } = await pool.query('SELECT * FROM topics WHERE id = $1', [id]);
  res.status(201).json(mapTopic(rows[0]));
}));

// PATCH /api/topics/:id - Update topic
router.patch('/:id', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const data = req.body;

  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    title: 'title', notes: 'notes', difficulty: 'difficulty',
    importance: 'importance', column: 'column_name', sortOrder: 'sort_order',
    nextReviewAt: 'next_review_at', studyTimeTotal: 'study_time_total',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) { fields.push(`${col} = $${paramIndex++}`); values.push(data[key]); }
  }

  if (data.tags !== undefined) { fields.push(`tags = $${paramIndex++}`); values.push(JSON.stringify(data.tags)); }

  if (fields.length === 0) {
    const { rows } = await pool.query('SELECT * FROM topics WHERE id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Topic not found' });
      return;
    }
    res.json(mapTopic(rows[0]));
    return;
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  await pool.query(`UPDATE topics SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
  const { rows } = await pool.query('SELECT * FROM topics WHERE id = $1', [id]);

  if (rows.length === 0) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }
  res.json(mapTopic(rows[0]));
}));

// DELETE /api/topics/:id - Delete topic
router.delete('/:id', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  await pool.query('DELETE FROM topics WHERE id = $1', [id]);
  res.json({ success: true });
}));

// POST /api/topics/:id/move - Move topic to column
router.post('/:id/move', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const { column, sortOrder } = req.body;

  if (!column) {
    res.status(400).json({ error: 'column is required' });
    return;
  }

  await pool.query(
    'UPDATE topics SET column_name = $1, sort_order = $2, updated_at = NOW() WHERE id = $3',
    [column, sortOrder ?? 0, id]
  );

  const { rows } = await pool.query('SELECT * FROM topics WHERE id = $1', [id]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }
  res.json(mapTopic(rows[0]));
}));

// POST /api/topics/:id/advance - Move to next review column
router.post('/:id/advance', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const understandingScore = req.body.understandingScore ?? 3;

  const topicResult = await pool.query('SELECT * FROM topics WHERE id = $1', [id]);
  if (topicResult.rows.length === 0) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }

  const topicRow = topicResult.rows[0];
  const currentColumn = topicRow.column_name as string;

  if (currentColumn === 'mastered') {
    res.status(400).json({ success: false, message: 'Card is already mastered.' });
    return;
  }

  const intervalDays = SCORE_TO_INTERVAL_DAYS[understandingScore] || 1;
  const nextReviewAt = new Date(Date.now() + intervalDays * MS_PER_DAY).toISOString();

  const newMasteryCount = understandingScore === 5 ? ((topicRow.mastery_count as number) + 1) : 0;
  const targetColumn = newMasteryCount >= MASTERY_THRESHOLD ? 'mastered' : 'reviewing';
  const finalNextReview = targetColumn === 'mastered' ? null : nextReviewAt;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE topics SET column_name = $1, next_review_at = $2, mastery_count = $3, updated_at = NOW() WHERE id = $4',
      [targetColumn, finalNextReview, newMasteryCount, id]
    );

    const reviewId = uuidv4();
    await client.query(
      'INSERT INTO review_entries (id, topic_id, from_column, to_column, understanding_score, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [reviewId, id, currentColumn, targetColumn, understandingScore, req.userId]
    );

    const xpAmount = targetColumn === 'mastered' ? 30 : 10;
    await client.query('UPDATE user_stats SET total_xp = total_xp + $1 WHERE user_id = $2', [xpAmount, req.userId]);
    await client.query('INSERT INTO xp_log (amount, reason, user_id) VALUES ($1, $2, $3)', [
      xpAmount, targetColumn === 'mastered' ? 'topic_mastered' : 'review_completed', req.userId,
    ]);

    const updatedResult = await client.query('SELECT * FROM topics WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      topic: mapTopic(updatedResult.rows[0]),
      fromColumn: currentColumn,
      toColumn: targetColumn,
      xpAwarded: xpAmount,
    });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

// POST /api/topics/:id/assign-today - Assign backlog topic to today
router.post('/:id/assign-today', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const topicResult = await pool.query('SELECT * FROM topics WHERE id = $1', [id]);
  if (topicResult.rows.length === 0) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }
  if (topicResult.rows[0].column_name !== 'backlog') {
    res.status(400).json({ error: 'Topic is not in backlog' });
    return;
  }
  await pool.query(
    "UPDATE topics SET column_name = 'today', updated_at = NOW() WHERE id = $1",
    [id]
  );
  const { rows } = await pool.query('SELECT * FROM topics WHERE id = $1', [id]);
  res.json(mapTopic(rows[0]));
}));

// ── Checklist ──

// GET /api/topics/:id/checklist - Get checklist items
router.get('/:id/checklist', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const { rows } = await pool.query(
    'SELECT * FROM checklist_items WHERE topic_id = $1 ORDER BY sort_order ASC',
    [id]
  );
  res.json(rows.map(mapChecklistItem));
}));

// POST /api/topics/:id/checklist - Create/update checklist item
router.post('/:id/checklist', asyncHandler(async (req, res) => {
  const pool = getPool();
  const topicId = req.params.id;
  const { id: itemId, text, checked, sortOrder } = req.body;

  if (!text) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  const id = itemId ?? uuidv4();
  await pool.query(`
    INSERT INTO checklist_items (id, topic_id, text, checked, sort_order)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT(id) DO UPDATE SET text = EXCLUDED.text, checked = EXCLUDED.checked, sort_order = EXCLUDED.sort_order
  `, [id, topicId, text, checked ?? false, sortOrder ?? 0]);

  const { rows } = await pool.query('SELECT * FROM checklist_items WHERE id = $1', [id]);
  res.json(mapChecklistItem(rows[0]));
}));

// DELETE /api/topics/:topicId/checklist/:itemId - Delete checklist item
router.delete('/:topicId/checklist/:itemId', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { itemId } = req.params;
  await pool.query('DELETE FROM checklist_items WHERE id = $1', [itemId]);
  res.json({ success: true });
}));

// ── Links ──

// GET /api/topics/:id/links - Get links
router.get('/:id/links', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const { rows } = await pool.query(
    'SELECT * FROM links WHERE topic_id = $1 ORDER BY sort_order ASC',
    [id]
  );
  res.json(rows.map(mapLink));
}));

// POST /api/topics/:id/links - Create/update link
router.post('/:id/links', asyncHandler(async (req, res) => {
  const pool = getPool();
  const topicId = req.params.id;
  const { id: linkId, url, label, sortOrder } = req.body;

  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  const id = linkId ?? uuidv4();
  await pool.query(`
    INSERT INTO links (id, topic_id, url, label, sort_order)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT(id) DO UPDATE SET url = EXCLUDED.url, label = EXCLUDED.label, sort_order = EXCLUDED.sort_order
  `, [id, topicId, url, label ?? '', sortOrder ?? 0]);

  const { rows } = await pool.query('SELECT * FROM links WHERE id = $1', [id]);
  res.json(mapLink(rows[0]));
}));

// DELETE /api/topics/:topicId/links/:linkId - Delete link
router.delete('/:topicId/links/:linkId', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { linkId } = req.params;
  await pool.query('DELETE FROM links WHERE id = $1', [linkId]);
  res.json({ success: true });
}));

export default router;
