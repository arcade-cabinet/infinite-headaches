/**
 * Brown Cow Variant
 *
 * Special cow variant that produces poop projectiles which grow
 * bouncy bushes where they land.
 *
 * Gameplay:
 * - When poked, launches cow poop in a random direction
 * - Poop follows an arc (gravity affected)
 * - Where poop lands, a bush grows procedurally
 * - Bush acts as bounce pad for falling animals
 * - Falling animals that hit the bush bounce back up
 * - Gives player another chance to catch them
 * - Farmer can walk through bushes (no collision for player)
 * - Bush has limited durability (tramples)
 * - Bush despawns after 30 seconds
 */

import { Vector3, Color3 } from "@babylonjs/core";
import type { AnimalVariantConfig } from "../../types";
import {
  BROWN_COW_CONFIG,
  POOP_BUSH_CONFIG,
  BROWN_COW_POOP_ABILITY,
} from "../config";

/**
 * Re-export the Brown Cow configuration
 */
export const BrownCowConfig = BROWN_COW_CONFIG;

/**
 * Brown Cow variant ID
 */
export const BROWN_COW_ID = "brown_cow";

/**
 * Brown Cow spawn requirements
 */
export const BROWN_COW_SPAWN = {
  /** Minimum level required */
  minLevel: 3,
  /** Spawn weight (relative to other animals) */
  weight: 0.05,
  /** Can only spawn after first bank */
  requiresBank: false,
  /** Maximum concurrent brown cows */
  maxConcurrent: 2,
};

/**
 * Brown Cow ability timings
 */
export const BROWN_COW_TIMINGS = {
  /** Ability cooldown in ms */
  cooldown: BROWN_COW_POOP_ABILITY.cooldownMs,
  /** Poop flight time (before hitting ground) */
  maxFlightTime: 3000,
  /** Bush growth duration */
  bushGrowthTime: 500,
  /** Bush active duration */
  bushDuration: POOP_BUSH_CONFIG.duration,
};

/**
 * Brown Cow visual effects
 */
export const BROWN_COW_EFFECTS = {
  /** Poop trail particle colors */
  poopTrail: {
    primary: "#5D4037",
    secondary: "#8D6E63",
    particles: 3,
  },
  /** Poop impact splat effect */
  poopImpact: {
    particleCount: 8,
    colors: ["#5D4037", "#8D6E63", "#4E342E"],
    duration: 300,
  },
  /** Bush spawn effect */
  bushSpawn: {
    particleCount: 12,
    colors: ["#4CAF50", "#8BC34A", "#CDDC39"],
    duration: 400,
  },
  /** Bush bounce effect */
  bushBounce: {
    particleCount: 6,
    colors: ["#4CAF50", "#8BC34A"],
    shakeIntensity: 0.3,
    duration: 200,
  },
};

/**
 * Brown Cow audio cues
 */
export const BROWN_COW_SOUNDS = {
  /** Sound when ability activates */
  abilityActivate: "cow_moo",
  /** Sound when poop launches */
  poopLaunch: "splat_soft",
  /** Sound when poop lands */
  poopImpact: "splat",
  /** Sound when bush grows */
  bushGrow: "grow_rustle",
  /** Sound when animal bounces on bush */
  bushBounce: "boing",
  /** Sound when bush is destroyed */
  bushDestroy: "rustle_fade",
};

/**
 * Poop projectile physics
 */
export const POOP_PHYSICS = {
  /** Initial speed */
  speed: 8,
  /** Gravity strength */
  gravity: 9.8,
  /** Air resistance factor */
  airResistance: 0.98,
  /** Minimum arc height */
  minArcHeight: 2,
  /** Maximum arc height */
  maxArcHeight: 5,
  /** Horizontal spread range */
  horizontalSpread: Math.PI * 0.5, // 90 degrees
};

/**
 * Bush physics for bouncing
 */
export const BUSH_PHYSICS = {
  /** Base bounce force multiplier */
  bounceForce: POOP_BUSH_CONFIG.bounceForce,
  /** Minimum bounce velocity */
  minBounceVelocity: 5,
  /** Maximum bounces before bush is destroyed */
  maxTramples: 5,
  /** Bounce force reduction per trample */
  forceDecayPerTrample: 0.95,
  /** Size reduction per trample */
  sizeDecayPerTrample: 0.9,
};

/**
 * Procedural bush generation settings
 */
export const BUSH_GENERATION = {
  /** Seed prefix for determinism */
  seedPrefix: "bush_",
  /** Branch count range */
  branches: POOP_BUSH_CONFIG.procedural.branchCount,
  /** Leaf density range */
  leafDensity: POOP_BUSH_CONFIG.procedural.leafDensity,
  /** Maximum bush height */
  maxHeight: POOP_BUSH_CONFIG.procedural.maxHeight,
  /** Spread factor for branches */
  spreadFactor: POOP_BUSH_CONFIG.procedural.spreadFactor,
  /** Color palette */
  colors: POOP_BUSH_CONFIG.colors,
};

/**
 * Get the full Brown Cow variant configuration
 */
export function getBrownCowConfig(): AnimalVariantConfig {
  return { ...BROWN_COW_CONFIG };
}

/**
 * Calculate poop trajectory
 * Returns the predicted landing position given initial conditions
 */
export function calculatePoopTrajectory(
  startPos: Vector3,
  direction: Vector3,
  speed: number
): { landingPos: Vector3; flightTime: number; arcHeight: number } {
  // Simplified ballistic calculation
  const vx = direction.x * speed;
  const vy = direction.y * speed + 3; // Initial upward boost
  const vz = direction.z * speed;

  const g = POOP_PHYSICS.gravity;

  // Time to hit ground (y = 0)
  // y = y0 + vy*t - 0.5*g*t^2
  // 0 = y0 + vy*t - 0.5*g*t^2
  // t = (vy + sqrt(vy^2 + 2*g*y0)) / g
  const y0 = startPos.y;
  const discriminant = vy * vy + 2 * g * y0;
  const flightTime = discriminant > 0 ? (vy + Math.sqrt(discriminant)) / g : 1;

  // Landing position
  const landingX = startPos.x + vx * flightTime;
  const landingZ = startPos.z + vz * flightTime;

  // Arc height (vertex of parabola)
  const tVertex = vy / g;
  const arcHeight = y0 + vy * tVertex - 0.5 * g * tVertex * tVertex;

  return {
    landingPos: new Vector3(landingX, 0, landingZ),
    flightTime: flightTime * 1000, // Convert to ms
    arcHeight: Math.max(POOP_PHYSICS.minArcHeight, arcHeight),
  };
}

/**
 * Generate a deterministic bush seed from position and time
 */
export function generateBushSeed(
  position: Vector3,
  timestamp: number,
  cowId: string
): string {
  const posHash = Math.floor(position.x * 1000) ^ Math.floor(position.z * 1000);
  return `${BUSH_GENERATION.seedPrefix}${cowId}_${posHash}_${timestamp}`;
}

export default {
  config: BROWN_COW_CONFIG,
  spawn: BROWN_COW_SPAWN,
  timings: BROWN_COW_TIMINGS,
  effects: BROWN_COW_EFFECTS,
  sounds: BROWN_COW_SOUNDS,
  poopPhysics: POOP_PHYSICS,
  bushPhysics: BUSH_PHYSICS,
  bushGeneration: BUSH_GENERATION,
  getBrownCowConfig,
  calculatePoopTrajectory,
  generateBushSeed,
};
