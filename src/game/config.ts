/**
 * Game Configuration
 * Central place for all game constants and tuning parameters
 */

export const GAME_INFO = {
  title: "Homestead Headaches",
  shortTitle: "Headache Tower",
  tagline: "Everyone has bad Mondays. But on this Nebraska homestead, animals are falling from the sky.",
} as const;

// Animal types
export type AnimalType = 
  | "cow" 
  | "pig" 
  | "chicken" 
  | "chick" 
  | "duck" 
  | "goat" 
  | "horse" 
  | "rabbit" 
  | "sheep"
  | "penguin" 
  | "frog"
  | "farmer";

// Special ability types (mapped to animals)
export type SpecialType = "normal" | "fire" | "ice";

// Power-up types
export type PowerUpType =
  | "rare_candy"
  | "potion"
  | "max_up"
  | "great_ball"
  | "x_attack"
  | "full_restore";

export const ANIMAL_TYPES: Record<AnimalType, {
  color: string; // Fallback color
  spawnWeight: number;
  ability: string | null;
  abilityColor?: string;
  abilityCooldown?: number;
  freezeDuration?: { min: number; max: number };
}> = {
  cow: { color: "#795548", spawnWeight: 0.15, ability: null },
  pig: { color: "#F06292", spawnWeight: 0.15, ability: null },
  chicken: { color: "#FFFFFF", spawnWeight: 0.15, ability: null },
  chick: { color: "#FFEB3B", spawnWeight: 0.1, ability: null },
  duck: { color: "#FDD835", spawnWeight: 0.1, ability: null },
  goat: { color: "#BDBDBD", spawnWeight: 0.1, ability: null },
  horse: { color: "#8D6E63", spawnWeight: 0.1, ability: null },
  rabbit: { color: "#E0E0E0", spawnWeight: 0.1, ability: null },
  sheep: { color: "#F5F5F5", spawnWeight: 0.1, ability: null },
  
  // Special Animals
  frog: { 
    color: "#4CAF50", 
    spawnWeight: 0.025, 
    ability: "fireball", // Renaming effect later? Keeping fireball logic for now
    abilityColor: "#FF5722",
    abilityCooldown: 3000 
  },
  penguin: { 
    color: "#0277BD", 
    spawnWeight: 0.025, 
    ability: "freeze",
    abilityColor: "#4FC3F7",
    freezeDuration: { min: 3000, max: 6000 }
  },
  farmer: { color: "#1976D2", spawnWeight: 0, ability: null }
} as const;

export const POWER_UPS = {
  rare_candy: {
    name: "Golden Egg",
    description: "Merge stack into one mega Animal!",
    color: "#FFD700",
    glowColor: "rgba(255, 215, 0, 0.6)",
    spawnWeight: 0.12,
    minStackToUse: 3,
  },
  potion: {
    name: "Milk Bottle",
    description: "Restore one heart",
    color: "#F5F5F5",
    glowColor: "rgba(245, 245, 245, 0.6)",
    spawnWeight: 0.35,
  },
  max_up: {
    name: "Vitamin",
    description: "Increase max hearts by 1",
    color: "#4CAF50",
    glowColor: "rgba(76, 175, 80, 0.6)",
    spawnWeight: 0.08,
  },
  great_ball: {
    name: "Lasso",
    description: "Magnetic pull for 5 seconds!",
    color: "#795548",
    glowColor: "rgba(121, 85, 72, 0.6)",
    spawnWeight: 0.15,
    duration: 5000,
  },
  x_attack: {
    name: "Coffee",
    description: "Double points for 8 seconds!",
    color: "#6D4C41",
    glowColor: "rgba(109, 76, 65, 0.6)",
    spawnWeight: 0.15,
    duration: 8000,
    multiplier: 2,
  },
  full_restore: {
    name: "Grandma's Pie",
    description: "Full hearts + 3s invincibility!",
    color: "#E64A19",
    glowColor: "rgba(230, 74, 25, 0.6)",
    spawnWeight: 0.05,
    invincibilityDuration: 3000,
  },
} as const;

export const GAME_CONFIG = {
  // Animal dimensions
  animal: {
    width: 60,
    height: 60,
    mergeScaleBase: 1.0,
    mergeScalePerDuck: 0.12,
    maxMergeScale: 2.5,
  },

  // Physics
  physics: {
    gravity: 0.35,
    maxFallSpeed: 14,
    wobbleStrength: 0.045,
    wobbleDamping: 0.94,
    wobbleSpringiness: 0.08,
    stackStability: 0.72,
    impactWobble: 0.025,
    mergedStabilityBonus: 0.35,
    aiWobble: {
      seekerImpact: 0.015,
      diveImpact: 0.025,
      evaderImpact: 0.008,
      swarmBonus: 0.005,
      maxAIWobble: 0.08,
    },
    tipping: {
      criticalAngleBase: 0.58,
      heightPenalty: 0.007,
      minCriticalAngle: 0.22,
      massDistribution: 0.32,
      cascadeMultiplier: 1.06,
      warningThreshold: 0.6,
      dangerThreshold: 0.88,
    },
    fireball: {
      speed: 12,
      size: 20,
      duration: 2000,
    },
    ice: {
      fallSpeed: 0.5,
      crackStages: 4,
    },
  },

  lives: {
    starting: 3,
    max: 5,
    absoluteMax: 8,
    earnThresholds: {
      perfectStreak: 5,
      scoreBonus: 500,
      bankingBonus: 10,
    },
    invincibilityDuration: 1500,
  },

  powerUps: {
    baseSpawnChance: 0.08,
    spawnInterval: 8000,
    minLevelToSpawn: 2,
    fallSpeed: 3,
    collectRadius: 50,
    bobSpeed: 0.003,
    bobAmount: 8,
  },

  spawning: {
    initialInterval: 2200,
    minInterval: 700,
    intervalDecreasePerLevel: 120,
    horizontalPadding: 50,
    horizontalDrift: 0.8,
    targetingBias: 0.3,
  },

  collision: {
    catchWindowTop: 0.9,
    catchWindowBottom: 0.3,
    perfectTolerance: 8,
    goodTolerance: 0.5,
    hitTolerance: 0.7,
    interpolationSteps: 3,
    landingOffset: 0.82,
    imperfectOffsetScale: 0.4,
  },

  effects: {
    squishFactor: 0.22,
    headacheThreshold: 0.4,
    dangerShake: 0.02,
    particleCount: 18,
    particleDecay: 0.022,
    mergeParticles: 30,
    mergeFlashDuration: 500,
    fireTrailParticles: 3,
    iceShardCount: 8,
  },

  scoring: {
    basePoints: 10,
    stackMultiplier: 1.6,
    perfectBonus: 2.5,
    goodBonus: 1.3,
    maxMultiplier: 15,
    comboDecayTime: 3000,
    comboMultiplier: 0.15,
    bankingPenalty: 0.4,
    bankingBonusPerDuck: 5,
    mergeBonus: 50,
    mergeBonusPerDuck: 20,
    fireKillBonus: 25,
    iceAssistBonus: 15,
  },

  banking: {
    minStackToBank: 5,
    bankAnimationDuration: 600,
  },

  difficulty: {
    levelUpThreshold: 75,
    maxLevel: 25,
    speedIncreasePerLevel: 0.04,
    spawnRateCurve: 0.85,
    specialDuckLevelBonus: 0.02,
  },

  layout: {
    platformHeight: 90,
    bankWidth: 65,
    safeZoneTop: 80,
    floorY: 0.92,
  },

  poke: {
    cooldown: 400,
    wobbleAmount: 0.25,
    confusionChance: 0.25,
  },

  colors: {
    background: {
      primary: "#5D4037", // Barn wood brown
      secondary: "#795548",
      tertiary: "#3E2723",
    },
    // Keep these for fallback, but we use sprites now
    duck: { body: "#FDD835", beak: "#FFE082", feet: "#FFCCBC", outline: "#3E2723" },
    fireDuck: { body: "#FF7043", beak: "#FFAB91", flame: "#FF5722" },
    iceDuck: { body: "#81D4FA", beak: "#B3E5FC", frost: "#E1F5FE" },
    
    platform: "#8BC34A", // Grass green
    bank: "#FF5722", // Red barn
    danger: "#F44336",
    warning: "#FF9800",
    captureball: {
      top: "#EF5350",
      bottom: "#FAFAFA",
      band: "#424242",
      button: "#FAFAFA",
    },
    heart: "#E91E63",
    heartEmpty: "#424242",
    ice: {
      solid: "rgba(129, 212, 250, 0.8)",
      crack: "rgba(255, 255, 255, 0.9)",
      shard: "#B3E5FC",
    },
    fire: {
      core: "#FFEB3B",
      mid: "#FF9800",
      outer: "#F44336",
    },
  },
} as const;

export const FAIL_MESSAGES = [
  "Barnyard chaos!",
  "The coop has fallen.",
  "Mooooove over!",
  "Total haywire!",
  "Farm overload!",
  "The animals have scattered!",
  "Wobbled too hard!",
  "Should've banked the herd!",
  "Physics wins again!",
  "Center of mass: lost!",
  "Not enough support!",
  "Timber!",
] as const;

export type GameMode = "MENU" | "PLAYING" | "GAMEOVER";