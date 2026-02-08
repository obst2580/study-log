import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService.js';

declare global {
  namespace Express {
    interface Request {
      userId: string;
      userRole: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    req.userRole = decoded.role ?? 'student';
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
