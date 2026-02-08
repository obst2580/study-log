import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(userId: string, role: string): string {
  return jwt.sign(
    { userId, role },
    config.jwt.secret,
    { expiresIn: '15m' }
  );
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): { userId: string; role?: string } {
  const decoded = jwt.verify(token, config.jwt.secret) as {
    userId: string;
    role?: string;
  };
  return { userId: decoded.userId, role: decoded.role };
}
