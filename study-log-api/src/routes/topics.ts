import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/index.js';
import {
  mapTopic,
  mapChecklistItem,
  mapLink,
  mapStudySession,
  mapReviewEntry,
} from '../database/mappers.js';

type DbRow = Record<string, unknown>;

const router = Router();

// GET /api/topics - Get all topics with optional filters
router.get('/', (req, res) => {
  const db = getDatabase();
  const { subjectId, column, unitId } = req.query;

  let sql = 'SELECT * FROM topics WHERE 1=1';
  const params: unknown[] = [];

  if (subjectId) { sql += ' AND subject_id = ?'; params.push(subjectId); }
  if (column) { sql += ' AND column_name = ?'; params.push(column); }
  if (unitId) { sql += ' AND unit_id = ?'; params.push(unitId); }

  sql += ' ORDER BY sort_order ASC';
  const rows = db.prepare(sql).all(...params) as DbRow[];
  res.json(rows.map(mapTopic));
});

// GET /api/topics/:id - Get topic by ID with relations
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  const topicRow = db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as DbRow | undefined;
  if (!topicRow) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }

  const checklistRows = db.prepare(
    'SELECT * FROM checklist_items WHERE topic_id = ? ORDER BY sort_order ASC'
  ).all(id) as DbRow[];

  const linkRows = db.prepare(
    'SELECT * FROM links WHERE topic_id = ? ORDER BY sort_order ASC'
  ).all(id) as DbRow[];

  const sessionRows = db.prepare(
    'SELECT * FROM study_sessions WHERE topic_id = ? ORDER BY started_at DESC'
  ).all(id) as DbRow[];

  const reviewRows = db.prepare(
    'SELECT * FROM review_entries WHERE topic_id = ? ORDER BY reviewed_at DESC'
  ).all(id) as DbRow[];

  res.json({
    ...mapTopic(topicRow),
    checklist: checklistRows.map(mapChecklistItem),
    links: linkRows.map(mapLink),
    studySessions: sessionRows.map(mapStudySession),
    reviewHistory: reviewRows.map(mapReviewEntry),
  });
});

// POST /api/topics - Create topic
router.post('/', (req, res) => {
  const db = getDatabase();
  const { subjectId, unitId, title, notes, difficulty, importance, tags, column } = req.body;

  if (!subjectId || !unitId || !title) {
    res.status(400).json({ error: 'subjectId, unitId, and title are required' });
    return;
  }

  const id = uuidv4();
  const columnName = column ?? 'today';
  const maxOrder = db.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM topics WHERE column_name = ?'
  ).get(columnName) as { next_order: number };

  db.prepare(`
    INSERT INTO topics (id, subject_id, unit_id, title, notes, difficulty, importance, tags, column_name, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, subjectId, unitId, title,
    notes ?? '', difficulty ?? 'medium', importance ?? 'medium',
    JSON.stringify(tags ?? []),
    columnName, maxOrder.next_order
  );

  const row = db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as DbRow;
  res.status(201).json(mapTopic(row));
});

// PATCH /api/topics/:id - Update topic
router.patch('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const data = req.body;

  const fields: string[] = [];
  const values: unknown[] = [];

  const fieldMap: Record<string, string> = {
    title: 'title', notes: 'notes', difficulty: 'difficulty',
    importance: 'importance', column: 'column_name', sortOrder: 'sort_order',
    nextReviewAt: 'next_review_at', studyTimeTotal: 'study_time_total',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) { fields.push(`${col} = ?`); values.push(data[key]); }
  }

  if (data.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(data.tags)); }

  if (fields.length === 0) {
    const row = db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as DbRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Topic not found' });
      return;
    }
    res.json(mapTopic(row));
    return;
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE topics SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const row = db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as DbRow | undefined;

  if (!row) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }
  res.json(mapTopic(row));
});

// DELETE /api/topics/:id - Delete topic
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  db.prepare('DELETE FROM topics WHERE id = ?').run(id);
  res.json({ success: true });
});

// POST /api/topics/:id/move - Move topic to column
router.post('/:id/move', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { column, sortOrder } = req.body;

  if (!column) {
    res.status(400).json({ error: 'column is required' });
    return;
  }

  db.prepare(
    "UPDATE topics SET column_name = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(column, sortOrder ?? 0, id);

  const row = db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as DbRow | undefined;
  if (!row) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }
  res.json(mapTopic(row));
});

// POST /api/topics/:id/advance - Move to next review column
router.post('/:id/advance', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  const topicRow = db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as DbRow | undefined;
  if (!topicRow) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }

  const currentColumn = topicRow.column_name as string;
  const progression: Record<string, { next: string; days: number } | null> = {
    today: { next: 'three_days', days: 3 },
    three_days: { next: 'one_week', days: 7 },
    one_week: { next: 'one_month', days: 30 },
    one_month: { next: 'done', days: 0 },
    done: null,
  };

  const step = progression[currentColumn];
  if (!step) {
    res.status(400).json({ success: false, message: 'Card is already completed.' });
    return;
  }

  const targetColumn = step.next;
  let nextReviewAt: string | null = null;
  if (targetColumn !== 'done' && step.days > 0) {
    const reviewDate = new Date(Date.now() + step.days * 86400000);
    nextReviewAt = reviewDate.toISOString();
  }

  const moveTransaction = db.transaction(() => {
    db.prepare(
      "UPDATE topics SET column_name = ?, next_review_at = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(targetColumn, nextReviewAt, id);

    const reviewId = uuidv4();
    db.prepare(
      'INSERT INTO review_entries (id, topic_id, from_column, to_column) VALUES (?, ?, ?, ?)'
    ).run(reviewId, id, currentColumn, targetColumn);

    // Award XP
    const xpAmount = targetColumn === 'done' ? 30 : 10;
    db.prepare('UPDATE user_stats SET total_xp = total_xp + ? WHERE id = 1').run(xpAmount);
    db.prepare('INSERT INTO xp_log (amount, reason) VALUES (?, ?)').run(
      xpAmount, targetColumn === 'done' ? 'topic_mastered' : 'review_completed'
    );

    const updatedRow = db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as DbRow;
    return {
      success: true,
      topic: mapTopic(updatedRow),
      fromColumn: currentColumn,
      toColumn: targetColumn,
      xpAwarded: xpAmount,
    };
  });

  res.json(moveTransaction());
});

// ── Checklist ──

// GET /api/topics/:id/checklist - Get checklist items
router.get('/:id/checklist', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const rows = db.prepare(
    'SELECT * FROM checklist_items WHERE topic_id = ? ORDER BY sort_order ASC'
  ).all(id) as DbRow[];
  res.json(rows.map(mapChecklistItem));
});

// POST /api/topics/:id/checklist - Create/update checklist item
router.post('/:id/checklist', (req, res) => {
  const db = getDatabase();
  const topicId = req.params.id;
  const { id: itemId, text, checked, sortOrder } = req.body;

  if (!text) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  const id = itemId ?? uuidv4();
  db.prepare(`
    INSERT INTO checklist_items (id, topic_id, text, checked, sort_order)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET text = excluded.text, checked = excluded.checked, sort_order = excluded.sort_order
  `).run(id, topicId, text, checked ? 1 : 0, sortOrder ?? 0);

  const row = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(id) as DbRow;
  res.json(mapChecklistItem(row));
});

// DELETE /api/topics/:topicId/checklist/:itemId - Delete checklist item
router.delete('/:topicId/checklist/:itemId', (req, res) => {
  const db = getDatabase();
  const { itemId } = req.params;
  db.prepare('DELETE FROM checklist_items WHERE id = ?').run(itemId);
  res.json({ success: true });
});

// ── Links ──

// GET /api/topics/:id/links - Get links
router.get('/:id/links', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const rows = db.prepare(
    'SELECT * FROM links WHERE topic_id = ? ORDER BY sort_order ASC'
  ).all(id) as DbRow[];
  res.json(rows.map(mapLink));
});

// POST /api/topics/:id/links - Create/update link
router.post('/:id/links', (req, res) => {
  const db = getDatabase();
  const topicId = req.params.id;
  const { id: linkId, url, label, sortOrder } = req.body;

  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  const id = linkId ?? uuidv4();
  db.prepare(`
    INSERT INTO links (id, topic_id, url, label, sort_order)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET url = excluded.url, label = excluded.label, sort_order = excluded.sort_order
  `).run(id, topicId, url, label ?? '', sortOrder ?? 0);

  const row = db.prepare('SELECT * FROM links WHERE id = ?').get(id) as DbRow;
  res.json(mapLink(row));
});

// DELETE /api/topics/:topicId/links/:linkId - Delete link
router.delete('/:topicId/links/:linkId', (req, res) => {
  const db = getDatabase();
  const { linkId } = req.params;
  db.prepare('DELETE FROM links WHERE id = ?').run(linkId);
  res.json({ success: true });
});

export default router;
