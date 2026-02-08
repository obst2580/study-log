import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/index.js';

export interface AchievementDefinition {
  key: string;
  title: string;
  description: string;
  icon: string;
  check: (userId: string) => Promise<{ unlocked: boolean; progress: number; target: number }>;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    key: 'first_review',
    title: '첫 복습',
    description: '첫 번째 복습을 완료했습니다',
    icon: 'star',
    check: async (userId) => {
      const pool = getPool();
      const { rows } = await pool.query('SELECT COUNT(*) AS cnt FROM review_entries WHERE user_id = $1', [userId]);
      const count = Number(rows[0].cnt);
      return { unlocked: count >= 1, progress: Math.min(count, 1), target: 1 };
    },
  },
  {
    key: 'streak_3',
    title: '3일 연속',
    description: '3일 연속으로 공부했습니다',
    icon: 'fire',
    check: async (userId) => {
      const pool = getPool();
      const { rows } = await pool.query('SELECT longest_streak FROM user_stats WHERE user_id = $1', [userId]);
      const streak = rows.length > 0 ? (rows[0].longest_streak as number) : 0;
      return { unlocked: streak >= 3, progress: Math.min(streak, 3), target: 3 };
    },
  },
  {
    key: 'streak_7',
    title: '1주일 연속',
    description: '7일 연속으로 공부했습니다',
    icon: 'fire',
    check: async (userId) => {
      const pool = getPool();
      const { rows } = await pool.query('SELECT longest_streak FROM user_stats WHERE user_id = $1', [userId]);
      const streak = rows.length > 0 ? (rows[0].longest_streak as number) : 0;
      return { unlocked: streak >= 7, progress: Math.min(streak, 7), target: 7 };
    },
  },
  {
    key: 'streak_14',
    title: '2주 연속',
    description: '14일 연속으로 공부했습니다',
    icon: 'fire',
    check: async (userId) => {
      const pool = getPool();
      const { rows } = await pool.query('SELECT longest_streak FROM user_stats WHERE user_id = $1', [userId]);
      const streak = rows.length > 0 ? (rows[0].longest_streak as number) : 0;
      return { unlocked: streak >= 14, progress: Math.min(streak, 14), target: 14 };
    },
  },
  {
    key: 'streak_30',
    title: '30일 연속',
    description: '30일 연속으로 공부했습니다',
    icon: 'fire',
    check: async (userId) => {
      const pool = getPool();
      const { rows } = await pool.query('SELECT longest_streak FROM user_stats WHERE user_id = $1', [userId]);
      const streak = rows.length > 0 ? (rows[0].longest_streak as number) : 0;
      return { unlocked: streak >= 30, progress: Math.min(streak, 30), target: 30 };
    },
  },
  {
    key: 'all_goals_met',
    title: '목표 달성왕',
    description: '주간 목표를 100% 달성했습니다',
    icon: 'trophy',
    check: async (userId) => {
      const pool = getPool();
      const { rows } = await pool.query(
        'SELECT COUNT(*) AS cnt FROM weekly_goals WHERE user_id = $1 AND achievement_rate >= 1.0',
        [userId]
      );
      const count = Number(rows[0].cnt);
      return { unlocked: count >= 1, progress: Math.min(count, 1), target: 1 };
    },
  },
  {
    key: 'study_hour_10',
    title: '공부 10시간',
    description: '총 10시간 공부했습니다',
    icon: 'clock',
    check: async (userId) => {
      const pool = getPool();
      const { rows } = await pool.query(
        'SELECT COALESCE(SUM(duration), 0) AS total FROM study_sessions WHERE user_id = $1',
        [userId]
      );
      const totalSeconds = Number(rows[0].total);
      const hours = totalSeconds / 3600;
      return { unlocked: hours >= 10, progress: Math.min(Math.floor(hours), 10), target: 10 };
    },
  },
  {
    key: 'study_hour_50',
    title: '공부 50시간',
    description: '총 50시간 공부했습니다',
    icon: 'clock',
    check: async (userId) => {
      const pool = getPool();
      const { rows } = await pool.query(
        'SELECT COALESCE(SUM(duration), 0) AS total FROM study_sessions WHERE user_id = $1',
        [userId]
      );
      const totalSeconds = Number(rows[0].total);
      const hours = totalSeconds / 3600;
      return { unlocked: hours >= 50, progress: Math.min(Math.floor(hours), 50), target: 50 };
    },
  },
  {
    key: 'study_hour_100',
    title: '공부 100시간',
    description: '총 100시간 공부했습니다',
    icon: 'clock',
    check: async (userId) => {
      const pool = getPool();
      const { rows } = await pool.query(
        'SELECT COALESCE(SUM(duration), 0) AS total FROM study_sessions WHERE user_id = $1',
        [userId]
      );
      const totalSeconds = Number(rows[0].total);
      const hours = totalSeconds / 3600;
      return { unlocked: hours >= 100, progress: Math.min(Math.floor(hours), 100), target: 100 };
    },
  },
  {
    key: 'perfect_understanding',
    title: '완벽한 이해',
    description: '이해도 5점 복습을 10번 달성했습니다',
    icon: 'brain',
    check: async (userId) => {
      const pool = getPool();
      const { rows } = await pool.query(
        'SELECT COUNT(*) AS cnt FROM review_entries WHERE user_id = $1 AND understanding_score = 5',
        [userId]
      );
      const count = Number(rows[0].cnt);
      return { unlocked: count >= 10, progress: Math.min(count, 10), target: 10 };
    },
  },
  {
    key: 'reflection_writer',
    title: '성찰의 달인',
    description: '주간 성찰을 3번 작성했습니다',
    icon: 'pencil',
    check: async (userId) => {
      const pool = getPool();
      const { rows } = await pool.query(
        'SELECT COUNT(*) AS cnt FROM weekly_reflections WHERE user_id = $1',
        [userId]
      );
      const count = Number(rows[0].cnt);
      return { unlocked: count >= 3, progress: Math.min(count, 3), target: 3 };
    },
  },
];

export async function checkAndAward(userId: string): Promise<string[]> {
  const pool = getPool();
  const newlyUnlocked: string[] = [];

  const { rows: existing } = await pool.query(
    'SELECT achievement_key FROM achievements WHERE user_id = $1',
    [userId]
  );
  const alreadyUnlocked = new Set(existing.map((r) => r.achievement_key as string));

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (alreadyUnlocked.has(def.key)) continue;

    const result = await def.check(userId);
    if (result.unlocked) {
      const id = uuidv4();
      await pool.query(
        'INSERT INTO achievements (id, user_id, achievement_key) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [id, userId, def.key]
      );
      newlyUnlocked.push(def.key);
    }
  }

  return newlyUnlocked;
}

export function getDefinition(key: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_DEFINITIONS.find((d) => d.key === key);
}
