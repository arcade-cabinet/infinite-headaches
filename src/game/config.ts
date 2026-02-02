/**
 * Game Configuration
 * Central place for all game constants and tuning parameters
 */

export const GAME_INFO = {
  title: "Homestead Headaches",
  shortTitle: "Headache Tower",
  tagline: "Everyone has bad Mondays. But on this Nebraska homestead, animals are falling from the sky.",
} as const;

/**
 * Animal types - ONLY types with actual GLB models in public/assets/models/
 *
 * Available models: chicken.glb, cow.glb, duck.glb, pig.glb, sheep.glb, farmer_john.glb, farmer_mary.glb
 *
 * IMPORTANT: Do NOT add animal types here without corresponding .glb models.
 * The game will throw errors if models are missing.
 */
export type AnimalType =
  | "cow"
  | "pig"
  | "chicken"
  | "duck"
  | "sheep"
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
  | "full_restore"
  | "shield"
  | "slow_motion"
  | "score_frenzy";

/**
 * Animal configuration - ONLY includes animals with GLB models
 *
 * To add a new animal:
 * 1. Add the .glb model to public/assets/models/{animal_name}.glb
 * 2. Add the type to AnimalType union above
 * 3. Add the config here with hasModel: true
 *
 * DO NOT set hasModel: true unless the model file exists!
 */
export const ANIMAL_TYPES: Record<AnimalType, {
  color: string; // Debug wireframe color (used only in development mode)
  spawnWeight: number;
  weight: number; // Physics weight
  modelScale: number; // Scale factor for the 3D model
  ability: string | null;
  abilityColor?: string;
  abilityCooldown?: number;
  freezeDuration?: { min: number; max: number };
  hasModel: boolean; // REQUIRED: must be true, enforces that model exists
}> = {
  // Standard farm animals (all have models)
  // modelScale is tuned so animals are visually proportional to each other and the farmer (2.5)
  // Keep animals clearly smaller than farmer so stacks stay readable
  cow: { color: "#795548", spawnWeight: 0.2, weight: 2.0, modelScale: 1.15, ability: null, hasModel: true },
  pig: { color: "#F06292", spawnWeight: 0.2, weight: 1.2, modelScale: 0.85, ability: null, hasModel: true },
  chicken: { color: "#FFFFFF", spawnWeight: 0.25, weight: 0.3, modelScale: 0.5, ability: null, hasModel: true },
  duck: { color: "#FDD835", spawnWeight: 0.2, weight: 0.5, modelScale: 0.55, ability: null, hasModel: true },
  sheep: { color: "#F5F5F5", spawnWeight: 0.15, weight: 1.5, modelScale: 1.0, ability: null, hasModel: true },

  // Player character - not spawned as falling animal
  farmer: { color: "#1976D2", spawnWeight: 0, weight: 1.0, modelScale: 2.5, ability: null, hasModel: true }
} as const;

// Runtime validation - crash fast if config is wrong
const AVAILABLE_MODELS = ["cow", "pig", "chicken", "duck", "sheep", "farmer_john", "farmer_mary"] as const;

for (const [type, config] of Object.entries(ANIMAL_TYPES)) {
  if (config.hasModel && type !== "farmer" && !AVAILABLE_MODELS.includes(type as typeof AVAILABLE_MODELS[number])) {
    throw new Error(
      `ANIMAL CONFIG ERROR: ${type} has hasModel:true but no .glb file exists in public/assets/models/. ` +
      `Available models: ${AVAILABLE_MODELS.join(", ")}. ` +
      `Either add the model file or remove this animal type.`
    );
  }
}

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
  shield: {
    name: "Scarecrow",
    description: "Absorb one miss!",
    color: "#8D6E63",
    glowColor: "rgba(141, 110, 99, 0.6)",
    spawnWeight: 0.10,
    duration: 15000,
  },
  slow_motion: {
    name: "Sundial",
    description: "Slow time for 5 seconds!",
    color: "#B0BEC5",
    glowColor: "rgba(176, 190, 197, 0.6)",
    spawnWeight: 0.08,
    duration: 5000,
    multiplier: 0.5,
  },
  score_frenzy: {
    name: "County Fair",
    description: "3× score for 6 seconds!",
    color: "#FF6F00",
    glowColor: "rgba(255, 111, 0, 0.6)",
    spawnWeight: 0.06,
    duration: 6000,
    multiplier: 3,
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
    gravity: 20, // Increased for snappy falling (was 0.35)
    maxFallSpeed: 25,
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
    squishFactor: 0.30,
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
    comboDecayTime: 3500,
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
    maxLevel: 999,
    speedIncreasePerLevel: 0.035,
    spawnRateCurve: 0.88,
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
    // Debug wireframe colors (3D models are always used)
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