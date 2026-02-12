export const SCORE_TO_INTERVAL_DAYS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 10,
  5: 30,
};

export const MASTERY_THRESHOLD = 3;
export const DEFAULT_DAILY_LIMIT = 10;
export const MS_PER_DAY = 86400000;

// Gem types
export const GEM_TYPES = ['emerald', 'sapphire', 'ruby', 'diamond'] as const;
export type GemType = typeof GEM_TYPES[number];

// Gem rewards
export const GEM_REWARDS = {
  STUDY_30_MIN: { type: 'emerald' as GemType, amount: 1 },
  REVIEW_NOTE_50_CHARS: { type: 'sapphire' as GemType, amount: 1 },
  UNDERSTANDING_4_PLUS: { type: 'ruby' as GemType, amount: 1 },
  UNDERSTANDING_5: { type: 'diamond' as GemType, amount: 1 },
} as const;

// Prestige points
export const PRESTIGE_POINTS = {
  CARD_PURCHASE: 1,
  CARD_PURCHASE_HIGH_DIFFICULTY: 1, // bonus
  NOBLE_COMPLETED: 3,
} as const;

// Gem cost calculation from difficulty + importance
export const DIFFICULTY_GEM_WEIGHT: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export const IMPORTANCE_GEM_WEIGHT: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};
