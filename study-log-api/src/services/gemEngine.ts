import { PoolClient } from 'pg';
import { getPool } from '../database/index.js';
import { mapGemWallet, mapGemTransaction } from '../database/mappers.js';
import { calculateGemCost, type GemCost, EMPTY_GEM_COST } from './gemCostCalculator.js';
import { PRESTIGE_POINTS } from '../utils/constants.js';

export async function ensureWallet(userId: string, client?: PoolClient) {
  const db = client || getPool();
  const { rows } = await db.query('SELECT * FROM gem_wallets WHERE user_id = $1', [userId]);
  if (rows.length > 0) {
    return mapGemWallet(rows[0]);
  }
  const { rows: inserted } = await db.query(
    'INSERT INTO gem_wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING RETURNING *',
    [userId]
  );
  if (inserted.length > 0) {
    return mapGemWallet(inserted[0]);
  }
  const { rows: refetch } = await db.query('SELECT * FROM gem_wallets WHERE user_id = $1', [userId]);
  return mapGemWallet(refetch[0]);
}

const VALID_GEM_COLUMNS = new Set(['emerald', 'sapphire', 'ruby', 'diamond']);

export async function earnGems(
  userId: string,
  gemType: string,
  amount: number,
  reason: string,
  referenceId?: string,
  client?: PoolClient,
) {
  if (!VALID_GEM_COLUMNS.has(gemType)) {
    throw new Error(`Invalid gem type: ${gemType}`);
  }
  const db = client || getPool();
  await ensureWallet(userId, client);

  await db.query(
    `UPDATE gem_wallets SET ${gemType} = ${gemType} + $1, updated_at = NOW() WHERE user_id = $2`,
    [amount, userId]
  );

  await db.query(
    'INSERT INTO gem_transactions (user_id, gem_type, amount, reason, reference_id) VALUES ($1, $2, $3, $4, $5)',
    [userId, gemType, amount, reason, referenceId || null]
  );
}

export async function canAfford(userId: string, cost: GemCost): Promise<boolean> {
  const wallet = await ensureWallet(userId);
  return (
    wallet.emerald >= cost.emerald &&
    wallet.sapphire >= cost.sapphire &&
    wallet.ruby >= cost.ruby &&
    wallet.diamond >= cost.diamond
  );
}

export async function spendGems(
  userId: string,
  cost: GemCost,
  reason: string,
  referenceId?: string,
  client?: PoolClient,
) {
  const db = client || getPool();

  await db.query(
    `UPDATE gem_wallets
     SET emerald = emerald - $1, sapphire = sapphire - $2, ruby = ruby - $3, diamond = diamond - $4, updated_at = NOW()
     WHERE user_id = $5`,
    [cost.emerald, cost.sapphire, cost.ruby, cost.diamond, userId]
  );

  const gemTypes = ['emerald', 'sapphire', 'ruby', 'diamond'] as const;
  for (const gem of gemTypes) {
    if (cost[gem] > 0) {
      await db.query(
        'INSERT INTO gem_transactions (user_id, gem_type, amount, reason, reference_id) VALUES ($1, $2, $3, $4, $5)',
        [userId, gem, -cost[gem], reason, referenceId || null]
      );
    }
  }
}

export async function getTransactions(userId: string, limit: number, offset: number) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM gem_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [userId, limit, offset]
  );
  const { rows: countRows } = await pool.query(
    'SELECT COUNT(*) AS total FROM gem_transactions WHERE user_id = $1',
    [userId]
  );
  return {
    transactions: rows.map(mapGemTransaction),
    total: Number(countRows[0].total),
  };
}

export async function getSubjectDiscount(userId: string, subjectId: string): Promise<GemCost> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS cnt FROM topics
     WHERE subject_id = $1 AND purchased = true AND column_name = 'mastered'`,
    [subjectId]
  );
  const masteredCount = Number(rows[0].cnt);
  if (masteredCount === 0) {
    return { ...EMPTY_GEM_COST };
  }

  const discount: GemCost = { emerald: 0, sapphire: 0, ruby: 0, diamond: 0 };
  let remaining = masteredCount;
  const gemOrder: (keyof GemCost)[] = ['emerald', 'sapphire', 'ruby', 'diamond'];
  for (const gem of gemOrder) {
    if (remaining <= 0) break;
    discount[gem] = remaining;
    remaining = 0;
  }
  return discount;
}

export async function getEffectiveCost(topicId: string, userId: string) {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM topics WHERE id = $1', [topicId]);
  if (rows.length === 0) return null;

  const topic = rows[0];
  const baseCost = topic.gem_cost as GemCost;
  const discount = await getSubjectDiscount(userId, topic.subject_id as string);

  const effectiveCost: GemCost = {
    emerald: Math.max(0, baseCost.emerald - discount.emerald),
    sapphire: Math.max(0, baseCost.sapphire - discount.sapphire),
    ruby: Math.max(0, baseCost.ruby - discount.ruby),
    diamond: Math.max(0, baseCost.diamond - discount.diamond),
  };

  return { baseCost, discount, effectiveCost, topic };
}

export async function purchaseCard(userId: string, topicId: string) {
  const pool = getPool();

  // Get topic and verify it's purchasable
  const { rows: topicRows } = await pool.query('SELECT * FROM topics WHERE id = $1', [topicId]);
  if (topicRows.length === 0) {
    return { success: false, error: 'Topic not found' };
  }
  const topic = topicRows[0];

  if (topic.purchased) {
    return { success: false, error: 'Topic already purchased' };
  }
  if (topic.column_name === 'mastered') {
    return { success: false, error: 'Topic already mastered' };
  }

  // Calculate effective cost
  const costInfo = await getEffectiveCost(topicId, userId);
  if (!costInfo) {
    return { success: false, error: 'Topic not found' };
  }

  // Check affordability
  const affordable = await canAfford(userId, costInfo.effectiveCost);
  if (!affordable) {
    return { success: false, error: 'Insufficient gems' };
  }

  // Execute purchase in transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Deduct gems
    await spendGems(userId, costInfo.effectiveCost, 'card_purchase', topicId, client);

    // Mark topic as purchased + mastered
    await client.query(
      `UPDATE topics SET purchased = true, column_name = 'mastered', mastery_count = 3,
       purchase_discount = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(costInfo.discount), topicId]
    );

    // Award prestige points
    let prestigeAwarded = PRESTIGE_POINTS.CARD_PURCHASE;
    if (topic.difficulty === 'high') {
      prestigeAwarded += PRESTIGE_POINTS.CARD_PURCHASE_HIGH_DIFFICULTY;
    }
    await client.query(
      'UPDATE user_stats SET prestige_points = prestige_points + $1 WHERE user_id = $2',
      [prestigeAwarded, userId]
    );

    // XP for mastery via purchase
    await client.query('UPDATE user_stats SET total_xp = total_xp + 30 WHERE user_id = $1', [userId]);
    await client.query(
      'INSERT INTO xp_log (amount, reason, user_id) VALUES (30, $1, $2)',
      ['card_purchased', userId]
    );

    await client.query('COMMIT');

    const wallet = await ensureWallet(userId);
    const { rows: updatedTopicRows } = await pool.query('SELECT * FROM topics WHERE id = $1', [topicId]);

    return {
      success: true,
      topic: updatedTopicRows[0],
      wallet,
      prestigeAwarded,
      effectiveCost: costInfo.effectiveCost,
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getNobleProgress(userId: string) {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT u.id AS unit_id, u.name AS unit_name, s.name AS subject_name, s.color AS subject_color,
      COUNT(t.id) AS total_topics,
      COUNT(CASE WHEN t.column_name = 'mastered' THEN 1 END) AS mastered_topics
    FROM units u
    JOIN subjects s ON s.id = u.subject_id AND s.user_id = $1
    JOIN topics t ON t.unit_id = u.id
    GROUP BY u.id, u.name, s.name, s.color
    ORDER BY s.name, u.sort_order
  `, [userId]);

  return rows.map(row => ({
    unitId: row.unit_id as string,
    unitName: row.unit_name as string,
    subjectName: row.subject_name as string,
    subjectColor: row.subject_color as string,
    totalTopics: Number(row.total_topics),
    masteredTopics: Number(row.mastered_topics),
    completed: Number(row.mastered_topics) === Number(row.total_topics) && Number(row.total_topics) > 0,
  }));
}

export async function getAllDiscounts(userId: string) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT id, name FROM subjects WHERE user_id = $1 ORDER BY name',
    [userId]
  );

  const discounts: Array<{ subjectId: string; subjectName: string; discount: GemCost }> = [];
  for (const subject of rows) {
    const discount = await getSubjectDiscount(userId, subject.id as string);
    const hasDiscount = discount.emerald > 0 || discount.sapphire > 0 || discount.ruby > 0 || discount.diamond > 0;
    if (hasDiscount) {
      discounts.push({
        subjectId: subject.id as string,
        subjectName: subject.name as string,
        discount,
      });
    }
  }
  return discounts;
}
