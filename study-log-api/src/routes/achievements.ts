import { Router } from 'express';
import { getPool } from '../database/index.js';
import { mapAchievement } from '../database/mappers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ACHIEVEMENT_DEFINITIONS, checkAndAward, getDefinition } from '../services/achievementChecker.js';

const router = Router();

// GET /api/achievements - My unlocked achievements
router.get('/', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM achievements WHERE user_id = $1 ORDER BY unlocked_at DESC',
    [req.userId]
  );
  const achievements = rows.map((row) => {
    const base = mapAchievement(row);
    const def = getDefinition(base.achievementKey);
    return {
      ...base,
      title: def?.title ?? base.achievementKey,
      description: def?.description ?? '',
      icon: def?.icon ?? 'star',
    };
  });
  res.json(achievements);
}));

// GET /api/achievements/available - All achievements with lock status and progress
router.get('/available', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT achievement_key, unlocked_at FROM achievements WHERE user_id = $1',
    [req.userId]
  );
  const unlockedMap = new Map(rows.map((r) => [r.achievement_key as string, r.unlocked_at as string]));

  const results = await Promise.all(
    ACHIEVEMENT_DEFINITIONS.map(async (def) => {
      const unlocked = unlockedMap.has(def.key);
      const checkResult = await def.check(req.userId);
      return {
        achievementKey: def.key,
        title: def.title,
        description: def.description,
        icon: def.icon,
        unlocked,
        unlockedAt: unlockedMap.get(def.key) ?? null,
        progress: checkResult.progress,
        target: checkResult.target,
      };
    })
  );

  res.json(results);
}));

// POST /api/achievements/check - Trigger achievement check
router.post('/check', asyncHandler(async (req, res) => {
  const newlyUnlocked = await checkAndAward(req.userId);
  res.json({ newlyUnlocked });
}));

export default router;
