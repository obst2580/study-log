// ── XP and Level Calculations ──

/**
 * Calculate the level from total XP.
 * Level formula: required_xp = level * 100
 * Level 1: 100 XP, Level 2: 200 XP, Level 3: 300 XP, ...
 * Total XP for level n = sum(1..n) * 100 = n*(n+1)/2 * 100
 */
export function calculateLevel(totalXp: number): number {
  // Solve: n*(n+1)/2 * 100 <= totalXp
  // n^2 + n - 2*totalXp/100 <= 0
  // n = (-1 + sqrt(1 + 8*totalXp/100)) / 2
  if (totalXp <= 0) return 1;
  const level = Math.floor((-1 + Math.sqrt(1 + (8 * totalXp) / 100)) / 2);
  return Math.max(1, level);
}

/**
 * Get the XP required to reach a specific level.
 */
export function xpForLevel(level: number): number {
  return (level * (level + 1)) / 2 * 100;
}

/**
 * Get XP progress within the current level.
 */
export function getLevelProgress(totalXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressXp: number;
  progressPercent: number;
} {
  const level = calculateLevel(totalXp);
  const currentLevelTotalXp = xpForLevel(level);
  const nextLevelTotalXp = xpForLevel(level + 1);
  const xpInLevel = nextLevelTotalXp - currentLevelTotalXp;
  const progressXp = totalXp - currentLevelTotalXp;
  const progressPercent = Math.min(100, Math.round((progressXp / xpInLevel) * 100));

  return {
    level,
    currentLevelXp: currentLevelTotalXp,
    nextLevelXp: nextLevelTotalXp,
    progressXp,
    progressPercent,
  };
}

/**
 * Format XP as a display string.
 */
export function formatXp(xp: number): string {
  if (xp >= 10000) {
    return `${(xp / 1000).toFixed(1)}K`;
  }
  return xp.toLocaleString();
}
