// Level system configuration and utilities

// XP thresholds for each level
// Level 1: 0 XP
// Level 2: 100 XP
// Level 3: 500 XP
// Level 4: 1000 XP
// Level 5: 2000 XP
// Level 6: 3500 XP
// Level 7: 5500 XP
// Level 8: 8000 XP
// Level 9: 11000 XP
// Level 10: 15000 XP
// And continues to scale...

export const LEVEL_THRESHOLDS: { [level: number]: number } = {
  1: 0,
  2: 100,
  3: 500,
  4: 1000,
  5: 2000,
  6: 3500,
  7: 5500,
  8: 8000,
  9: 11000,
  10: 15000,
  11: 20000,
  12: 26000,
  13: 33000,
  14: 41000,
  15: 50000,
  16: 60000,
  17: 71000,
  18: 83000,
  19: 96000,
  20: 110000,
  21: 125000,
  22: 141000,
  23: 158000,
  24: 176000,
  25: 195000,
  26: 215000,
  27: 236000,
  28: 258000,
  29: 281000,
  30: 305000,
  31: 330000,
  32: 356000,
  33: 383000,
  34: 411000,
  35: 440000,
  36: 470000,
  37: 501000,
  38: 533000,
  39: 566000,
  40: 600000,
  41: 635000,
  42: 671000,
  43: 708000,
  44: 746000,
  45: 785000,
  46: 825000,
  47: 866000,
  48: 908000,
  49: 951000,
  50: 995000,
};

/**
 * Calculate user level based on total XP
 * @param xp Total XP amount
 * @returns User level (1-50+)
 */
export function calculateLevel(xp: number): number {
  if (xp < 0) return 1;
  
  // Find the highest level the user has reached
  let level = 1;
  
  for (let i = 50; i >= 1; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }
  
  // If XP exceeds level 50, calculate extended levels
  if (xp >= LEVEL_THRESHOLDS[50]) {
    const xpAbove50 = xp - LEVEL_THRESHOLDS[50];
    const xpPerLevelAbove50 = 50000; // Each level above 50 requires 50k more XP
    const additionalLevels = Math.floor(xpAbove50 / xpPerLevelAbove50);
    level = 50 + additionalLevels;
  }
  
  return level;
}

/**
 * Get XP required for next level
 * @param currentLevel Current user level
 * @returns XP required to reach next level
 */
export function getXPForNextLevel(currentLevel: number): number {
  if (currentLevel >= 50) {
    // For levels above 50, each level requires 50k more XP
    return LEVEL_THRESHOLDS[50] + (currentLevel - 49) * 50000;
  }
  
  return LEVEL_THRESHOLDS[currentLevel + 1] || LEVEL_THRESHOLDS[50];
}

/**
 * Get XP progress to next level
 * @param xp Total XP amount
 * @param currentLevel Current user level
 * @returns Object with current XP, XP for next level, and progress percentage
 */
export function getLevelProgress(xp: number, currentLevel: number): {
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpNeeded: number;
  progressPercent: number;
} {
  const xpForCurrentLevel = currentLevel >= 50 
    ? LEVEL_THRESHOLDS[50] + (currentLevel - 50) * 50000
    : LEVEL_THRESHOLDS[currentLevel];
    
  const xpForNextLevel = getXPForNextLevel(currentLevel);
  const xpIntoCurrentLevel = xp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = Math.min(100, Math.max(0, (xpIntoCurrentLevel / xpNeeded) * 100));
  
  return {
    currentXP: xp,
    xpForCurrentLevel,
    xpForNextLevel,
    xpNeeded: xpForNextLevel - xp,
    progressPercent,
  };
}
