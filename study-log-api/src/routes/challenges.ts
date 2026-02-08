import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/index.js';
import { mapChallenge, mapChallengeParticipant } from '../database/mappers.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// GET /api/challenges - Active challenges
router.get('/', asyncHandler(async (_req, res) => {
  const pool = getPool();
  const today = new Date().toISOString().split('T')[0];
  const { rows } = await pool.query(
    'SELECT * FROM challenges WHERE end_date >= $1 ORDER BY start_date ASC',
    [today]
  );
  res.json(rows.map(mapChallenge));
}));

// POST /api/challenges - Create challenge
router.post('/', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { title, description, challengeType, targetValue, startDate, endDate } = req.body;

  if (!title || !challengeType || !targetValue || !startDate || !endDate) {
    res.status(400).json({ error: 'title, challengeType, targetValue, startDate, endDate are required' });
    return;
  }

  const id = uuidv4();
  await pool.query(
    'INSERT INTO challenges (id, title, description, challenge_type, target_value, start_date, end_date, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [id, title, description ?? null, challengeType, targetValue, startDate, endDate, req.userId]
  );

  // Auto-join the creator
  await pool.query(
    'INSERT INTO challenge_participants (challenge_id, user_id) VALUES ($1, $2)',
    [id, req.userId]
  );

  const { rows } = await pool.query('SELECT * FROM challenges WHERE id = $1', [id]);
  res.status(201).json(mapChallenge(rows[0]));
}));

// GET /api/challenges/:id - Challenge detail with participants
router.get('/:id', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;

  const { rows: challengeRows } = await pool.query('SELECT * FROM challenges WHERE id = $1', [id]);
  if (challengeRows.length === 0) {
    res.status(404).json({ error: 'Challenge not found' });
    return;
  }

  const { rows: participantRows } = await pool.query(
    `SELECT cp.*, p.name AS profile_name
     FROM challenge_participants cp
     JOIN users p ON p.id = cp.user_id
     WHERE cp.challenge_id = $1`,
    [id]
  );

  res.json({
    ...mapChallenge(challengeRows[0]),
    participants: participantRows.map((row) => ({
      ...mapChallengeParticipant(row),
      profileName: row.profile_name as string,
    })),
  });
}));

// POST /api/challenges/:id/join - Join a challenge
router.post('/:id/join', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;

  await pool.query(
    'INSERT INTO challenge_participants (challenge_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [id, req.userId]
  );

  res.json({ success: true });
}));

// PATCH /api/challenges/:id/progress - Update progress
router.patch('/:id/progress', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const { currentValue } = req.body;

  if (currentValue === undefined) {
    res.status(400).json({ error: 'currentValue is required' });
    return;
  }

  // Get challenge target
  const { rows: challengeRows } = await pool.query('SELECT target_value FROM challenges WHERE id = $1', [id]);
  if (challengeRows.length === 0) {
    res.status(404).json({ error: 'Challenge not found' });
    return;
  }

  const targetValue = challengeRows[0].target_value as number;
  const completed = currentValue >= targetValue;

  await pool.query(
    `UPDATE challenge_participants SET current_value = $1, completed = $2, completed_at = $3
     WHERE challenge_id = $4 AND user_id = $5`,
    [currentValue, completed, completed ? new Date().toISOString() : null, id, req.userId]
  );

  const { rows } = await pool.query(
    'SELECT * FROM challenge_participants WHERE challenge_id = $1 AND user_id = $2',
    [id, req.userId]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Not participating in this challenge' });
    return;
  }

  res.json(mapChallengeParticipant(rows[0]));
}));

export default router;
