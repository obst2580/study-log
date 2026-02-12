import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  ensureWallet,
  getTransactions,
  getEffectiveCost,
  purchaseCard,
  getNobleProgress,
  getAllDiscounts,
  canAfford,
} from '../services/gemEngine.js';
import { getPool } from '../database/index.js';
import { mapTopic, mapUserStats } from '../database/mappers.js';

const router = Router();

// GET /api/splendor/wallet
router.get('/wallet', asyncHandler(async (req, res) => {
  const wallet = await ensureWallet(req.userId);
  res.json(wallet);
}));

// GET /api/splendor/transactions
router.get('/transactions', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;
  const result = await getTransactions(req.userId, limit, offset);
  res.json(result);
}));

// GET /api/splendor/card/:topicId
router.get('/card/:topicId', asyncHandler(async (req, res) => {
  const costInfo = await getEffectiveCost(req.params.topicId, req.userId);
  if (!costInfo) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }
  const affordable = await canAfford(req.userId, costInfo.effectiveCost);
  res.json({
    topic: mapTopic(costInfo.topic),
    baseCost: costInfo.baseCost,
    discount: costInfo.discount,
    effectiveCost: costInfo.effectiveCost,
    purchasable: affordable && !costInfo.topic.purchased && costInfo.topic.column_name !== 'mastered',
    alreadyPurchased: Boolean(costInfo.topic.purchased),
  });
}));

// POST /api/splendor/purchase/:topicId
router.post('/purchase/:topicId', asyncHandler(async (req, res) => {
  const result = await purchaseCard(req.userId, req.params.topicId);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({
    ...result,
    topic: result.topic ? mapTopic(result.topic) : undefined,
  });
}));

// GET /api/splendor/nobles
router.get('/nobles', asyncHandler(async (req, res) => {
  const nobles = await getNobleProgress(req.userId);
  res.json(nobles);
}));

// GET /api/splendor/discounts
router.get('/discounts', asyncHandler(async (req, res) => {
  const discounts = await getAllDiscounts(req.userId);
  res.json(discounts);
}));

// GET /api/splendor/overview
router.get('/overview', asyncHandler(async (req, res) => {
  const pool = getPool();
  const wallet = await ensureWallet(req.userId);
  const nobles = await getNobleProgress(req.userId);
  const { rows: statsRows } = await pool.query('SELECT * FROM user_stats WHERE user_id = $1', [req.userId]);
  const stats = statsRows.length > 0 ? mapUserStats(statsRows[0]) : null;

  res.json({
    wallet,
    prestigePoints: stats?.prestigePoints ?? 0,
    nobles,
    completedNobles: nobles.filter(n => n.completed).length,
  });
}));

export default router;
