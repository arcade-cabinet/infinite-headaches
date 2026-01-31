/**
 * Chicken Variant Configuration
 *
 * Defines all chicken variants with their abilities, visuals, and gameplay modifiers.
 * Each variant extends the base chicken with unique mechanics.
 */

import { Color3 } from "@babylonjs/core";
import type { AnimalAbility, GameplayModifiers } from "../../registry/AnimalRegistry";

/**
 * Chicken variant types
 */
export type ChickenVariant = "corn" | "egg" | "rooster";

/**
 * Ability effect types specific to chicken variants
 */
export type ChickenAbilityEffect =
  | "corn_magnet"      // Pulls falling animals toward stack
  | "egg_hatch"        // Spawns baby chick that auto-catches
  | "rooster_crow";    // Slows all falling animals

/**
 * Corn Chicken Configuration
 * - Shoots corn kernels that act as magnets
 * - Pulls nearest falling animal toward stack
 */
export const CORN_CHICKEN_CONFIG = {
  id: "corn_chicken",
  name: "Corn Chicken",
  description: "A golden chicken with corn cob patterns. Shoots magnetic corn kernels!",

  // Visual configuration
  visual: {
    baseColor: new Color3(1.0, 0.84, 0.0),        // Golden yellow
    accentColor: new Color3(0.96, 0.76, 0.0),     // Darker gold for corn patterns
    kernelColor: new Color3(1.0, 0.92, 0.23),     // Bright yellow kernels
    glowColor: "rgba(255, 215, 0, 0.6)",
    patternType: "corn_cob" as const,
  },

  // Ability configuration
  ability: {
    id: "corn_magnet",
    name: "Corn Shot",
    description: "Shoots corn kernels that magnetically pull falling animals toward your stack",
    cooldownMs: 4000,
    effectType: "projectile" as const,
    effectColors: {
      primary: "#FFD700",
      secondary: "#FFF59D",
      glow: "#FFEB3B",
    },
    // Corn-specific parameters
    projectileSpeed: 15,
    magnetStrength: 0.15,        // Pull force per frame
    magnetDuration: 2000,        // How long magnet effect lasts (ms)
    magnetRange: 300,            // Max distance to affect falling animal
    kernelCount: 5,              // Number of kernels shot
    spreadAngle: 30,             // Degrees of spread
  } satisfies AnimalAbility & {
    projectileSpeed: number;
    magnetStrength: number;
    magnetDuration: number;
    magnetRange: number;
    kernelCount: number;
    spreadAngle: number;
  },

  // Gameplay modifiers
  modifiers: {
    weightMultiplier: 0.75,
    scoreMultiplier: 1.2,
    fallSpeedMultiplier: 0.95,
    stabilityMultiplier: 0.9,
  } satisfies GameplayModifiers,

  // Spawn configuration
  spawnWeight: 0.04,
} as const;

/**
 * Egg Chicken Configuration
 * - Lays eggs that hatch into baby chicks
 * - Baby chicks auto-catch one falling animal then disappear
 */
export const EGG_CHICKEN_CONFIG = {
  id: "egg_chicken",
  name: "Egg Chicken",
  description: "A white chicken with brown spots. Lays magical eggs that hatch helpers!",

  // Visual configuration
  visual: {
    baseColor: new Color3(1.0, 1.0, 1.0),          // White
    accentColor: new Color3(0.65, 0.45, 0.32),     // Brown spots
    eggColor: new Color3(1.0, 0.98, 0.94),         // Cream egg
    chickColor: new Color3(1.0, 0.95, 0.4),        // Baby yellow
    glowColor: "rgba(255, 248, 225, 0.6)",
    patternType: "spotted" as const,
  },

  // Ability configuration
  ability: {
    id: "egg_hatch",
    name: "Lay Egg",
    description: "Lays an egg that hatches into a baby chick. The chick auto-catches one falling animal!",
    cooldownMs: 8000,
    effectType: "transform" as const,
    effectColors: {
      primary: "#FFFDE7",
      secondary: "#FFF59D",
      glow: "#FFECB3",
    },
    // Egg-specific parameters
    eggRollSpeed: 3,             // Horizontal roll speed
    eggHatchTime: 3000,          // Time until egg hatches (ms)
    chickLifetime: 10000,        // How long chick lives if not catching
    chickCatchRadius: 80,        // Catch radius for baby chick
    chickMoveSpeed: 8,           // Movement speed of baby chick
  } satisfies AnimalAbility & {
    eggRollSpeed: number;
    eggHatchTime: number;
    chickLifetime: number;
    chickCatchRadius: number;
    chickMoveSpeed: number;
  },

  // Gameplay modifiers
  modifiers: {
    weightMultiplier: 0.7,
    scoreMultiplier: 1.0,
    fallSpeedMultiplier: 0.9,
    stabilityMultiplier: 1.0,
  } satisfies GameplayModifiers,

  // Spawn configuration
  spawnWeight: 0.03,
} as const;

/**
 * Rooster Configuration
 * - Crows to slow down all falling animals
 * - Area of effect ability with visual sound waves
 */
export const ROOSTER_CONFIG = {
  id: "rooster",
  name: "Rooster",
  description: "A proud red rooster. Its mighty crow slows everything down!",

  // Visual configuration
  visual: {
    baseColor: new Color3(0.8, 0.2, 0.1),          // Red body
    accentColor: new Color3(1.0, 0.4, 0.0),        // Orange highlights
    combColor: new Color3(0.9, 0.1, 0.1),          // Red comb
    wattleColor: new Color3(0.85, 0.15, 0.1),      // Slightly darker red
    tailColor: new Color3(0.1, 0.3, 0.15),         // Dark green tail feathers
    glowColor: "rgba(255, 87, 34, 0.6)",
    patternType: "rooster" as const,
  },

  // Ability configuration
  ability: {
    id: "rooster_crow",
    name: "Mighty Crow",
    description: "Crows loudly, creating sound waves that slow all falling animals for 2 seconds",
    cooldownMs: 10000,
    effectType: "aoe" as const,
    effectColors: {
      primary: "#FF5722",
      secondary: "#FFCCBC",
      glow: "#FF8A65",
    },
    // Crow-specific parameters
    slowDuration: 2000,          // Duration of slow effect (ms)
    slowFactor: 0.3,             // Speed multiplier (0.3 = 30% speed)
    waveCount: 4,                // Number of visible sound waves
    waveExpandSpeed: 200,        // Pixels per second
    waveMaxRadius: 500,          // Maximum wave radius
  } satisfies AnimalAbility & {
    slowDuration: number;
    slowFactor: number;
    waveCount: number;
    waveExpandSpeed: number;
    waveMaxRadius: number;
  },

  // Gameplay modifiers
  modifiers: {
    weightMultiplier: 1.0,
    scoreMultiplier: 1.5,
    fallSpeedMultiplier: 1.0,
    stabilityMultiplier: 0.85,   // Slightly less stable (top-heavy with comb)
  } satisfies GameplayModifiers,

  // Spawn configuration
  spawnWeight: 0.025,
} as const;

/**
 * All chicken variant configurations indexed by variant type
 */
export const CHICKEN_VARIANTS = {
  corn: CORN_CHICKEN_CONFIG,
  egg: EGG_CHICKEN_CONFIG,
  rooster: ROOSTER_CONFIG,
} as const;

/**
 * Get configuration for a specific chicken variant
 */
export function getChickenVariantConfig(variant: ChickenVariant) {
  return CHICKEN_VARIANTS[variant];
}

/**
 * Type guard to check if an animal ID is a chicken variant
 */
export function isChickenVariant(animalId: string): animalId is `${ChickenVariant}_chicken` | "rooster" {
  return animalId === "corn_chicken" ||
         animalId === "egg_chicken" ||
         animalId === "rooster";
}

/**
 * Get the variant type from an animal ID
 */
export function getVariantFromId(animalId: string): ChickenVariant | null {
  if (animalId === "corn_chicken") return "corn";
  if (animalId === "egg_chicken") return "egg";
  if (animalId === "rooster") return "rooster";
  return null;
}
