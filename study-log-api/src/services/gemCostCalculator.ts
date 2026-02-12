import { DIFFICULTY_GEM_WEIGHT, IMPORTANCE_GEM_WEIGHT } from '../utils/constants.js';

export interface GemCost {
  emerald: number;
  sapphire: number;
  ruby: number;
  diamond: number;
}

export const EMPTY_GEM_COST: GemCost = { emerald: 0, sapphire: 0, ruby: 0, diamond: 0 };

export function calculateGemCost(difficulty: string, importance: string): GemCost {
  const d = DIFFICULTY_GEM_WEIGHT[difficulty] || 2;
  const i = IMPORTANCE_GEM_WEIGHT[importance] || 2;
  const total = d + i; // 2-6

  // Distribute gems based on total difficulty+importance
  // Higher total = more expensive, more gem types required
  if (total <= 2) {
    return { emerald: 1, sapphire: 0, ruby: 0, diamond: 0 };
  } else if (total <= 3) {
    return { emerald: 1, sapphire: 1, ruby: 0, diamond: 0 };
  } else if (total <= 4) {
    return { emerald: 2, sapphire: 1, ruby: 1, diamond: 0 };
  } else if (total <= 5) {
    return { emerald: 2, sapphire: 2, ruby: 1, diamond: 1 };
  } else {
    return { emerald: 3, sapphire: 2, ruby: 2, diamond: 1 };
  }
}
