import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from '../services/authService.js';

const router = Router();

function mapUser(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    grade: (row.grade as string) || null,
    role: row.role as string,
    avatar: row.avatar as string,
    createdAt: row.created_at as string,
  };
}

// POST /api/auth/register
router.post('/register', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { email, password, name, grade, role } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: 'email, password, and name are required' });
    return;
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const id = uuidv4();
  const passwordHash = await hashPassword(password);
  const userRole = role || 'student';
  const accessToken = generateAccessToken(id, userRole);
  const refreshToken = generateRefreshToken(id);
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await pool.query(
    `INSERT INTO users (id, email, password_hash, name, grade, role, refresh_token, refresh_token_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, email, passwordHash, name, grade || null, userRole, refreshToken, refreshExpiresAt]
  );

  // Create initial user_stats and app_settings
  await pool.query('INSERT INTO user_stats (user_id, total_xp, current_streak, longest_streak) VALUES ($1, 0, 0, 0)', [id]);
  await pool.query('INSERT INTO app_settings (user_id) VALUES ($1)', [id]);
  await pool.query('INSERT INTO gem_wallets (user_id) VALUES ($1)', [id]);

  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  res.status(201).json({ user: mapUser(rows[0]), accessToken, refreshToken });
}));

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (rows.length === 0) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const user = rows[0];
  const valid = await verifyPassword(password, user.password_hash as string);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const accessToken = generateAccessToken(user.id as string, user.role as string);
  const refreshToken = generateRefreshToken(user.id as string);
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await pool.query(
    'UPDATE users SET refresh_token = $1, refresh_token_expires_at = $2, updated_at = NOW() WHERE id = $3',
    [refreshToken, refreshExpiresAt, user.id]
  );

  res.json({ user: mapUser(user), accessToken, refreshToken });
}));

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: 'refreshToken is required' });
    return;
  }

  try {
    const decoded = verifyToken(refreshToken);
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND refresh_token = $2 AND refresh_token_expires_at > NOW()',
      [decoded.userId, refreshToken]
    );

    if (rows.length === 0) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const user = rows[0];
    const newAccessToken = generateAccessToken(user.id as string, user.role as string);
    const newRefreshToken = generateRefreshToken(user.id as string);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await pool.query(
      'UPDATE users SET refresh_token = $1, refresh_token_expires_at = $2, updated_at = NOW() WHERE id = $3',
      [newRefreshToken, refreshExpiresAt, user.id]
    );

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}));

// POST /api/auth/logout
router.post('/logout', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = verifyToken(authHeader.slice(7));
      const pool = getPool();
      await pool.query(
        'UPDATE users SET refresh_token = NULL, refresh_token_expires_at = NULL WHERE id = $1',
        [decoded.userId]
      );
    } catch {
      // Token invalid, still clear
    }
  }
  res.json({ success: true });
}));

// GET /api/auth/me
router.get('/me', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const decoded = verifyToken(authHeader.slice(7));
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(mapUser(rows[0]));
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}));

export default router;
