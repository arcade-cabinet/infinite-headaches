/**
 * Animal Registry
 *
 * Comprehensive registry for all animals in Homestead Headaches.
 * Defines multiple levels of detail (LOD) for each animal:
 * - HIGH: Full GLB 3D model with animations
 * - MEDIUM: Simplified GLB 3D model
 * - LOW: Procedural 3D geometry (generated at runtime)
 * - 2D: Sprite/portrait for UI and menus
 *
 * Also supports VARIANTS (e.g., fire_chicken, ice_duck) with:
 * - Different visual effects
 * - Special abilities
 * - Gameplay modifiers
 */

import { Color3 } from "@babylonjs/core";

// Quality levels matching graphics settings
export type QualityLevel = "high" | "medium" | "low";

/**
 * 3D Model definition for a quality level
 */
export interface Model3DDefinition {
  /** Path to GLB file relative to public/assets/models/ */
  glbPath: string | null;
  /** Scale modifier for this quality level */
  scale: number;
  /** If no GLB, use procedural generation */
  procedural?: ProceduralGeometry;
}

/**
 * Procedural 3D geometry for low-quality graphics mode
 * Provides lightweight primitives for mobile/low-end devices
 */
export interface ProceduralGeometry {
  /** Base shape to generate */
  shape: "sphere" | "box" | "capsule" | "cylinder";
  /** Dimensions [width, height, depth] or [radius, height] depending on shape */
  dimensions: number[];
  /** Primary color */
  color: Color3;
  /** Optional accent colors for details */
  accents?: { color: Color3; position: "top" | "bottom" | "front" }[];
}

/**
 * 2D sprite/portrait for UI
 */
export interface Sprite2DDefinition {
  /** Path to sprite image relative to public/assets/sprites/ */
  spritePath: string | null;
  /** Emoji representation for UI elements */
  emoji: string;
  /** Procedural drawing instructions if no sprite */
  procedural?: {
    backgroundColor: string;
    foregroundColor: string;
    shape: "circle" | "rounded-rect";
  };
}

/**
 * Animation definitions for an animal
 */
export interface AnimalAnimations {
  /** Idle animation name in GLB */
  idle: string;
  /** Falling/flying animation */
  falling?: string;
  /** Stacked/sitting animation */
  stacked?: string;
  /** Special ability activation */
  ability?: string;
  /** Wobbling/concerned animation */
  wobble?: string;
  /** Peeking out (for tornado intro) */
  peek?: string;
}

/**
 * Ability definition for special animals
 */
export interface AnimalAbility {
  /** Unique ability identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description for help/UI */
  description: string;
  /** Cooldown in milliseconds */
  cooldownMs: number;
  /** Visual effect type */
  effectType: "projectile" | "aoe" | "buff" | "debuff" | "transform";
  /** Effect colors */
  effectColors: {
    primary: string;
    secondary: string;
    glow?: string;
  };
}

/**
 * Gameplay modifiers for variants
 */
export interface GameplayModifiers {
  /** Weight multiplier (affects wobble when stacked) */
  weightMultiplier: number;
  /** Points multiplier when caught */
  scoreMultiplier: number;
  /** Fall speed multiplier */
  fallSpeedMultiplier: number;
  /** Wobble resistance (higher = more stable) */
  stabilityMultiplier: number;
}

/**
 * Complete Animal Definition
 */
export interface AnimalDefinition {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Category for grouping */
  category: "farm" | "special" | "boss" | "player";

  // Visual assets by quality level
  models: Record<QualityLevel, Model3DDefinition>;
  sprite: Sprite2DDefinition;
  animations: AnimalAnimations;

  // Gameplay properties
  spawnWeight: number; // 0 = not spawned naturally
  ability: AnimalAbility | null;
  modifiers: GameplayModifiers;

  // Optional variant info
  isVariant: boolean;
  baseAnimalId?: string; // If variant, which base animal
  variantType?: "fire" | "ice" | "golden" | "heavy" | "swift";
}

/**
 * Registry of all animals
 */
export const ANIMAL_REGISTRY: Map<string, AnimalDefinition> = new Map();

// ============================================================================
// BASE FARM ANIMALS
// ============================================================================

const registerAnimal = (def: AnimalDefinition) => {
  if (ANIMAL_REGISTRY.has(def.id)) {
    throw new Error(`REGISTRY ERROR: Animal "${def.id}" already registered`);
  }
  ANIMAL_REGISTRY.set(def.id, def);
  return def;
};

// COW
registerAnimal({
  id: "cow",
  name: "Cow",
  category: "farm",
  models: {
    high: { glbPath: "cow.glb", scale: 1.0 },
    medium: { glbPath: "cow.glb", scale: 0.9 },
    low: {
      glbPath: null,
      scale: 0.8,
      procedural: {
        shape: "capsule",
        dimensions: [0.5, 0.8],
        color: new Color3(0.47, 0.33, 0.28),
        accents: [{ color: new Color3(1, 1, 1), position: "front" }],
      },
    },
  },
  sprite: {
    spritePath: "cow_portrait.png",
    emoji: "🐄",
    procedural: {
      backgroundColor: "#795548",
      foregroundColor: "#FFFFFF",
      shape: "circle",
    },
  },
  animations: {
    idle: "idle",
    falling: "fall",
    stacked: "sit",
    wobble: "wobble",
  },
  spawnWeight: 0.2,
  ability: null,
  modifiers: {
    weightMultiplier: 1.2,
    scoreMultiplier: 1.0,
    fallSpeedMultiplier: 1.0,
    stabilityMultiplier: 1.1,
  },
  isVariant: false,
});

// PIG
registerAnimal({
  id: "pig",
  name: "Pig",
  category: "farm",
  models: {
    high: { glbPath: "pig.glb", scale: 1.0 },
    medium: { glbPath: "pig.glb", scale: 0.9 },
    low: {
      glbPath: null,
      scale: 0.8,
      procedural: {
        shape: "sphere",
        dimensions: [0.5],
        color: new Color3(0.94, 0.38, 0.57),
      },
    },
  },
  sprite: {
    spritePath: "pig_portrait.png",
    emoji: "🐷",
    procedural: {
      backgroundColor: "#F06292",
      foregroundColor: "#FFCDD2",
      shape: "circle",
    },
  },
  animations: {
    idle: "idle",
    falling: "fall",
    stacked: "sit",
  },
  spawnWeight: 0.2,
  ability: null,
  modifiers: {
    weightMultiplier: 1.0,
    scoreMultiplier: 1.0,
    fallSpeedMultiplier: 1.0,
    stabilityMultiplier: 1.0,
  },
  isVariant: false,
});

// CHICKEN
registerAnimal({
  id: "chicken",
  name: "Chicken",
  category: "farm",
  models: {
    high: { glbPath: "chicken.glb", scale: 1.0 },
    medium: { glbPath: "chicken.glb", scale: 0.9 },
    low: {
      glbPath: null,
      scale: 0.7,
      procedural: {
        shape: "capsule",
        dimensions: [0.3, 0.5],
        color: new Color3(1, 1, 1),
        accents: [{ color: new Color3(1, 0.5, 0), position: "front" }],
      },
    },
  },
  sprite: {
    spritePath: "chicken_portrait.png",
    emoji: "🐔",
    procedural: {
      backgroundColor: "#FFFFFF",
      foregroundColor: "#FF9800",
      shape: "circle",
    },
  },
  animations: {
    idle: "idle",
    falling: "flap",
    stacked: "perch",
  },
  spawnWeight: 0.25,
  ability: null,
  modifiers: {
    weightMultiplier: 0.7,
    scoreMultiplier: 1.0,
    fallSpeedMultiplier: 0.9,
    stabilityMultiplier: 0.9,
  },
  isVariant: false,
});

// DUCK
registerAnimal({
  id: "duck",
  name: "Duck",
  category: "farm",
  models: {
    high: { glbPath: "duck.glb", scale: 1.0 },
    medium: { glbPath: "duck.glb", scale: 0.9 },
    low: {
      glbPath: null,
      scale: 0.7,
      procedural: {
        shape: "capsule",
        dimensions: [0.3, 0.4],
        color: new Color3(0.99, 0.85, 0.21),
        accents: [{ color: new Color3(1, 0.6, 0), position: "front" }],
      },
    },
  },
  sprite: {
    spritePath: "duck_portrait.png",
    emoji: "🦆",
    procedural: {
      backgroundColor: "#FDD835",
      foregroundColor: "#FF9800",
      shape: "circle",
    },
  },
  animations: {
    idle: "idle",
    falling: "flap",
    stacked: "sit",
  },
  spawnWeight: 0.2,
  ability: null,
  modifiers: {
    weightMultiplier: 0.8,
    scoreMultiplier: 1.0,
    fallSpeedMultiplier: 0.95,
    stabilityMultiplier: 1.0,
  },
  isVariant: false,
});

// SHEEP
registerAnimal({
  id: "sheep",
  name: "Sheep",
  category: "farm",
  models: {
    high: { glbPath: "sheep.glb", scale: 1.0 },
    medium: { glbPath: "sheep.glb", scale: 0.9 },
    low: {
      glbPath: null,
      scale: 0.8,
      procedural: {
        shape: "sphere",
        dimensions: [0.5],
        color: new Color3(0.96, 0.96, 0.96),
      },
    },
  },
  sprite: {
    spritePath: "sheep_portrait.png",
    emoji: "🐑",
    procedural: {
      backgroundColor: "#F5F5F5",
      foregroundColor: "#424242",
      shape: "circle",
    },
  },
  animations: {
    idle: "idle",
    falling: "fall",
    stacked: "sit",
  },
  spawnWeight: 0.15,
  ability: null,
  modifiers: {
    weightMultiplier: 1.0,
    scoreMultiplier: 1.0,
    fallSpeedMultiplier: 1.0,
    stabilityMultiplier: 1.2, // Fluffy = bouncy/stable
  },
  isVariant: false,
});

// ============================================================================
// PLAYER CHARACTERS (not spawned, used for player avatar)
// ============================================================================

registerAnimal({
  id: "farmer_john",
  name: "Farmer John",
  category: "player",
  models: {
    high: { glbPath: "farmer_john.glb", scale: 1.2 },
    medium: { glbPath: "farmer_john.glb", scale: 1.1 },
    low: {
      glbPath: null,
      scale: 1.0,
      procedural: {
        shape: "capsule",
        dimensions: [0.4, 1.0],
        color: new Color3(0.1, 0.46, 0.82),
      },
    },
  },
  sprite: {
    spritePath: "farmer_john_portrait.png",
    emoji: "👨‍🌾",
    procedural: {
      backgroundColor: "#1976D2",
      foregroundColor: "#FFFFFF",
      shape: "rounded-rect",
    },
  },
  animations: {
    idle: "idle",
    wobble: "wobble",
  },
  spawnWeight: 0, // Not spawned
  ability: null,
  modifiers: {
    weightMultiplier: 1.0,
    scoreMultiplier: 1.0,
    fallSpeedMultiplier: 1.0,
    stabilityMultiplier: 1.0,
  },
  isVariant: false,
});

registerAnimal({
  id: "farmer_mary",
  name: "Farmer Mary",
  category: "player",
  models: {
    high: { glbPath: "farmer_mary.glb", scale: 1.2 },
    medium: { glbPath: "farmer_mary.glb", scale: 1.1 },
    low: {
      glbPath: null,
      scale: 1.0,
      procedural: {
        shape: "capsule",
        dimensions: [0.4, 1.0],
        color: new Color3(0.91, 0.12, 0.39),
      },
    },
  },
  sprite: {
    spritePath: "farmer_mary_portrait.png",
    emoji: "👩‍🌾",
    procedural: {
      backgroundColor: "#E91E63",
      foregroundColor: "#FFFFFF",
      shape: "rounded-rect",
    },
  },
  animations: {
    idle: "idle",
    wobble: "wobble",
  },
  spawnWeight: 0, // Not spawned
  ability: null,
  modifiers: {
    weightMultiplier: 1.0,
    scoreMultiplier: 1.0,
    fallSpeedMultiplier: 1.0,
    stabilityMultiplier: 1.0,
  },
  isVariant: false,
});

// ============================================================================
// VARIANT ANIMALS (special versions with abilities)
// ============================================================================

// FIRE CHICKEN - shoots fireballs
registerAnimal({
  id: "fire_chicken",
  name: "Fire Chicken",
  category: "special",
  models: {
    high: { glbPath: "chicken.glb", scale: 1.0 }, // Same model, different shader/material
    medium: { glbPath: "chicken.glb", scale: 0.9 },
    low: {
      glbPath: null,
      scale: 0.7,
      procedural: {
        shape: "capsule",
        dimensions: [0.3, 0.5],
        color: new Color3(1, 0.44, 0.26), // Orange-red
        accents: [{ color: new Color3(1, 0.84, 0), position: "top" }], // Flame crown
      },
    },
  },
  sprite: {
    spritePath: "fire_chicken_portrait.png",
    emoji: "🔥🐔",
    procedural: {
      backgroundColor: "#FF7043",
      foregroundColor: "#FFAB91",
      shape: "circle",
    },
  },
  animations: {
    idle: "idle",
    falling: "flap",
    stacked: "perch",
    ability: "fire_breath",
  },
  spawnWeight: 0.03, // Rare
  ability: {
    id: "fireball",
    name: "Fireball",
    description: "Shoots fireballs that destroy falling animals",
    cooldownMs: 3000,
    effectType: "projectile",
    effectColors: {
      primary: "#FF5722",
      secondary: "#FFAB91",
      glow: "#FF9800",
    },
  },
  modifiers: {
    weightMultiplier: 0.7,
    scoreMultiplier: 1.5,
    fallSpeedMultiplier: 1.1,
    stabilityMultiplier: 0.8,
  },
  isVariant: true,
  baseAnimalId: "chicken",
  variantType: "fire",
});

// ICE DUCK - freezes nearby falling animals
registerAnimal({
  id: "ice_duck",
  name: "Ice Duck",
  category: "special",
  models: {
    high: { glbPath: "duck.glb", scale: 1.0 },
    medium: { glbPath: "duck.glb", scale: 0.9 },
    low: {
      glbPath: null,
      scale: 0.7,
      procedural: {
        shape: "capsule",
        dimensions: [0.3, 0.4],
        color: new Color3(0.51, 0.83, 0.98), // Light blue
        accents: [{ color: new Color3(0.88, 0.95, 1), position: "top" }], // Ice crystals
      },
    },
  },
  sprite: {
    spritePath: "ice_duck_portrait.png",
    emoji: "❄️🦆",
    procedural: {
      backgroundColor: "#81D4FA",
      foregroundColor: "#E1F5FE",
      shape: "circle",
    },
  },
  animations: {
    idle: "idle",
    falling: "flap",
    stacked: "sit",
    ability: "freeze",
  },
  spawnWeight: 0.03, // Rare
  ability: {
    id: "freeze",
    name: "Freeze",
    description: "Freezes the nearest falling animal in ice",
    cooldownMs: 5000,
    effectType: "projectile",
    effectColors: {
      primary: "#4FC3F7",
      secondary: "#E1F5FE",
      glow: "#81D4FA",
    },
  },
  modifiers: {
    weightMultiplier: 0.9,
    scoreMultiplier: 1.5,
    fallSpeedMultiplier: 0.9,
    stabilityMultiplier: 1.1,
  },
  isVariant: true,
  baseAnimalId: "duck",
  variantType: "ice",
});

// GOLDEN PIG - bonus points
registerAnimal({
  id: "golden_pig",
  name: "Golden Pig",
  category: "special",
  models: {
    high: { glbPath: "pig.glb", scale: 1.0 },
    medium: { glbPath: "pig.glb", scale: 0.9 },
    low: {
      glbPath: null,
      scale: 0.8,
      procedural: {
        shape: "sphere",
        dimensions: [0.5],
        color: new Color3(1, 0.84, 0), // Gold
      },
    },
  },
  sprite: {
    spritePath: "golden_pig_portrait.png",
    emoji: "✨🐷",
    procedural: {
      backgroundColor: "#FFD700",
      foregroundColor: "#FFF8E1",
      shape: "circle",
    },
  },
  animations: {
    idle: "idle",
    falling: "fall",
    stacked: "sit",
  },
  spawnWeight: 0.02, // Very rare
  ability: null,
  modifiers: {
    weightMultiplier: 1.0,
    scoreMultiplier: 3.0, // Triple points!
    fallSpeedMultiplier: 1.2, // Falls faster
    stabilityMultiplier: 1.0,
  },
  isVariant: true,
  baseAnimalId: "pig",
  variantType: "golden",
});

// HEAVY COW - hard to stack but worth more
registerAnimal({
  id: "heavy_cow",
  name: "Heavy Cow",
  category: "special",
  models: {
    high: { glbPath: "cow.glb", scale: 1.3 }, // Bigger!
    medium: { glbPath: "cow.glb", scale: 1.2 },
    low: {
      glbPath: null,
      scale: 1.1,
      procedural: {
        shape: "capsule",
        dimensions: [0.6, 0.9],
        color: new Color3(0.35, 0.25, 0.2), // Darker brown
      },
    },
  },
  sprite: {
    spritePath: "heavy_cow_portrait.png",
    emoji: "🐄💪",
    procedural: {
      backgroundColor: "#5D4037",
      foregroundColor: "#BCAAA4",
      shape: "circle",
    },
  },
  animations: {
    idle: "idle",
    falling: "fall",
    stacked: "sit",
  },
  spawnWeight: 0.02,
  ability: null,
  modifiers: {
    weightMultiplier: 2.0, // Very heavy!
    scoreMultiplier: 2.0,
    fallSpeedMultiplier: 1.3,
    stabilityMultiplier: 0.7, // Makes stack less stable
  },
  isVariant: true,
  baseAnimalId: "cow",
  variantType: "heavy",
});

// ============================================================================
// REGISTRY API
// ============================================================================

/**
 * Get animal definition by ID
 * @throws Error if animal not found
 */
export function getAnimal(id: string): AnimalDefinition {
  const animal = ANIMAL_REGISTRY.get(id);
  if (!animal) {
    throw new Error(
      `ANIMAL NOT FOUND: "${id}". ` +
        `Available animals: ${Array.from(ANIMAL_REGISTRY.keys()).join(", ")}`
    );
  }
  return animal;
}

/**
 * Get all spawnable animals (non-zero spawn weight)
 */
export function getSpawnableAnimals(): AnimalDefinition[] {
  return Array.from(ANIMAL_REGISTRY.values()).filter((a) => a.spawnWeight > 0);
}

/**
 * Get animals by category
 */
export function getAnimalsByCategory(
  category: AnimalDefinition["category"]
): AnimalDefinition[] {
  return Array.from(ANIMAL_REGISTRY.values()).filter((a) => a.category === category);
}

/**
 * Get all variants of a base animal
 */
export function getVariants(baseAnimalId: string): AnimalDefinition[] {
  return Array.from(ANIMAL_REGISTRY.values()).filter(
    (a) => a.isVariant && a.baseAnimalId === baseAnimalId
  );
}

/**
 * Get model path for an animal at a given quality level
 * Returns null if procedural generation should be used
 */
export function getModelPath(animalId: string, quality: QualityLevel): string | null {
  const animal = getAnimal(animalId);
  const modelDef = animal.models[quality];
  return modelDef.glbPath ? `assets/models/${modelDef.glbPath}` : null;
}

/**
 * Check if an animal requires procedural generation at a given quality
 */
export function needsProceduralGeneration(
  animalId: string,
  quality: QualityLevel
): boolean {
  const animal = getAnimal(animalId);
  return animal.models[quality].glbPath === null;
}

/**
 * Get procedural geometry definition
 */
export function getProceduralGeometry(
  animalId: string,
  quality: QualityLevel
): ProceduralGeometry | undefined {
  const animal = getAnimal(animalId);
  return animal.models[quality].procedural;
}

/**
 * Pick a random animal based on spawn weights
 */
export function pickRandomAnimal(levelBonus: number = 0): AnimalDefinition {
  const spawnable = getSpawnableAnimals();

  // Calculate total weight including level bonus for special animals
  let totalWeight = 0;
  const weights: { animal: AnimalDefinition; weight: number }[] = [];

  for (const animal of spawnable) {
    let weight = animal.spawnWeight;
    // Increase special animal spawn chance with level
    if (animal.category === "special") {
      weight += levelBonus * 0.01;
    }
    weights.push({ animal, weight });
    totalWeight += weight;
  }

  // Pick random
  const rand = Math.random() * totalWeight;
  let cumulative = 0;

  for (const { animal, weight } of weights) {
    cumulative += weight;
    if (rand < cumulative) {
      return animal;
    }
  }

  // Default return (weighted selection should always succeed above)
  return spawnable[0];
}

// Export types for external use
export type { AnimalDefinition, AnimalAbility, GameplayModifiers, QualityLevel };
