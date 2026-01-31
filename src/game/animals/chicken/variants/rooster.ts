/**
 * Rooster Variant
 *
 * A proud red rooster with an impressive comb and tail feathers.
 * When poked, crows loudly causing all falling animals to briefly
 * slow down (2 seconds), giving you more time to position.
 *
 * Visual: Red body, orange highlights, dark green tail, prominent red comb
 * Cooldown: 10 seconds
 */

import { Vector3, Color3 } from "@babylonjs/core";
import { World } from "miniplex";
import { Entity } from "../../../ecs/components";
import { ROOSTER_CONFIG } from "../config";
import {
  type ChickenEntity,
  createChickenVariantComponent,
  createChickenAbilityComponent,
} from "../components";
import { activateRoosterCrow } from "../systems";
import type { AnimalDefinition } from "../../../registry/AnimalRegistry";

// ============================================================================
// ROOSTER ENTITY FACTORY
// ============================================================================

/**
 * Creates a rooster entity with all required components
 */
export function createRooster(
  position: Vector3,
  world: World<Entity & ChickenEntity>
): Entity & ChickenEntity {
  const config = ROOSTER_CONFIG;

  const entity: Entity & ChickenEntity = {
    id: crypto.randomUUID(),
    position: position.clone(),
    velocity: new Vector3(0, 0, 0),
    scale: new Vector3(1.1, 1.1, 1.1), // Slightly larger than regular chicken
    model: "assets/models/chicken.glb", // Uses base chicken model with color overlay
    colorOverlay: {
      color: config.visual.baseColor,
      intensity: 0.5, // Strong red tint
    },
    tag: { type: "animal", subtype: "chicken" },
    physics: { mass: 1.0, restitution: 0.2, friction: 0.5 },
    wobble: { offset: 0, velocity: 0, damping: 0.88, springiness: 0.12 },
    mergeable: { level: 1, mergeRadius: 1.5 },

    // Chicken variant components
    chickenVariant: createChickenVariantComponent("rooster", config.id),
    chickenAbility: createChickenAbilityComponent(config.ability.cooldownMs),
  };

  return entity;
}

/**
 * Activates the rooster's ability
 * Crows to slow all falling animals
 */
export function activateRoosterAbility(
  world: World<Entity & ChickenEntity>,
  rooster: Entity & ChickenEntity
): boolean {
  if (!rooster.chickenAbility?.isReady) {
    return false;
  }

  activateRoosterCrow(world, rooster);
  return true;
}

// ============================================================================
// ROOSTER STATE HELPERS
// ============================================================================

/**
 * Check if rooster is currently crowing
 */
export function isRoosterCrowing(
  rooster: Entity & ChickenEntity
): boolean {
  return rooster.roosterCrow?.isCrowing ?? false;
}

/**
 * Get crow animation progress (0 = starting, 1 = complete)
 */
export function getRoosterCrowProgress(
  rooster: Entity & ChickenEntity
): number {
  return rooster.roosterCrow?.crowProgress ?? 0;
}

/**
 * Count active sound waves from this rooster
 */
export function getActiveSoundWaveCount(
  rooster: Entity & ChickenEntity
): number {
  return rooster.roosterCrow?.soundWaveIds.length ?? 0;
}

// ============================================================================
// SLOW EFFECT HELPERS
// ============================================================================

/**
 * Count how many entities are currently slowed
 */
export function countSlowedEntities(
  world: World<Entity & ChickenEntity>
): number {
  const slowed = world.with("crowSlowed");
  let count = 0;
  for (const _ of slowed) {
    count++;
  }
  return count;
}

/**
 * Get the remaining slow time for an entity
 */
export function getSlowTimeRemaining(
  entity: Entity & ChickenEntity
): number {
  return entity.crowSlowed?.slowTimeRemaining ?? 0;
}

/**
 * Check if an entity is being slowed by a specific rooster
 */
export function isSlowedByRooster(
  entity: Entity & ChickenEntity,
  roosterId: string
): boolean {
  return entity.crowSlowed?.sourceRoosterId === roosterId;
}

// ============================================================================
// ROOSTER REGISTRY DEFINITION
// ============================================================================

/**
 * Full registry definition for rooster
 * For use with AnimalRegistry
 */
export const ROOSTER_DEFINITION: AnimalDefinition = {
  id: "rooster",
  name: "Rooster",
  category: "special",

  models: {
    high: { glbPath: "chicken.glb", scale: 1.1 }, // Larger than chicken
    medium: { glbPath: "chicken.glb", scale: 1.0 },
    low: {
      glbPath: null,
      scale: 0.8,
      procedural: {
        shape: "capsule",
        dimensions: [0.35, 0.55],
        color: ROOSTER_CONFIG.visual.baseColor,
        accents: [
          { color: ROOSTER_CONFIG.visual.combColor, position: "top" },
          { color: ROOSTER_CONFIG.visual.tailColor, position: "bottom" },
        ],
      },
    },
  },

  sprite: {
    spritePath: "rooster_portrait.png",
    emoji: "🐓",
    procedural: {
      backgroundColor: "#C62828",
      foregroundColor: "#FF5722",
      shape: "circle",
    },
  },

  animations: {
    idle: "idle",
    falling: "flap",
    stacked: "perch",
    ability: "crow", // Head back, beak open crow animation
  },

  spawnWeight: ROOSTER_CONFIG.spawnWeight,

  ability: {
    id: ROOSTER_CONFIG.ability.id,
    name: ROOSTER_CONFIG.ability.name,
    description: ROOSTER_CONFIG.ability.description,
    cooldownMs: ROOSTER_CONFIG.ability.cooldownMs,
    effectType: ROOSTER_CONFIG.ability.effectType,
    effectColors: ROOSTER_CONFIG.ability.effectColors,
  },

  modifiers: ROOSTER_CONFIG.modifiers,

  isVariant: true,
  baseAnimalId: "chicken",
  variantType: "fire" as const, // Red theme
};

// ============================================================================
// VISUAL EFFECT HELPERS
// ============================================================================

/**
 * Creates particle effect data for rooster crow start
 */
export function createCrowStartParticleData(origin: Vector3): {
  position: Vector3;
  color: string;
  count: number;
  spread: number;
  lifetime: number;
  upwardBias: number;
} {
  return {
    position: origin.clone(),
    color: ROOSTER_CONFIG.ability.effectColors.primary,
    count: 10,
    spread: Math.PI / 6,
    lifetime: 500,
    upwardBias: 0.9, // Particles shoot mostly upward from beak
  };
}

/**
 * Creates sound wave ring visual data
 */
export function createSoundWaveRingData(
  origin: Vector3,
  waveIndex: number
): {
  center: Vector3;
  color: string;
  initialRadius: number;
  maxRadius: number;
  thickness: number;
  expandSpeed: number;
  fadeStart: number;
} {
  const config = ROOSTER_CONFIG.ability;
  return {
    center: origin.clone(),
    color: waveIndex % 2 === 0
      ? config.effectColors.primary
      : config.effectColors.secondary,
    initialRadius: 0,
    maxRadius: config.waveMaxRadius,
    thickness: 3 - waveIndex * 0.5, // Thinner waves further out
    expandSpeed: config.waveExpandSpeed,
    fadeStart: 0.3, // Start fading at 30% radius
  };
}

/**
 * Creates visual indicator for slowed entities
 */
export function createSlowIndicatorData(): {
  color: string;
  pulseSpeed: number;
  scale: number;
  opacity: number;
} {
  return {
    color: ROOSTER_CONFIG.ability.effectColors.glow,
    pulseSpeed: 4,
    scale: 1.2,
    opacity: 0.3,
  };
}

/**
 * Creates "time warp" distortion effect data
 */
export function createTimeWarpEffectData(
  waveRadius: number,
  maxRadius: number
): {
  intensity: number;
  color: string;
  distortionScale: number;
} {
  const progress = waveRadius / maxRadius;
  return {
    intensity: Math.max(0, 1 - progress) * 0.15,
    color: ROOSTER_CONFIG.ability.effectColors.glow,
    distortionScale: 1 + (1 - progress) * 0.1,
  };
}

// ============================================================================
// SOUND WAVE GEOMETRY HELPERS
// ============================================================================

/**
 * Calculate points for a sound wave ring (for 2D/3D rendering)
 */
export function calculateSoundWavePoints(
  center: Vector3,
  radius: number,
  segments: number = 32
): Vector3[] {
  const points: Vector3[] = [];
  const angleStep = (Math.PI * 2) / segments;

  for (let i = 0; i <= segments; i++) {
    const angle = i * angleStep;
    points.push(
      new Vector3(
        center.x + Math.cos(angle) * radius,
        center.y + Math.sin(angle) * radius,
        center.z
      )
    );
  }

  return points;
}

/**
 * Calculate opacity for a sound wave based on radius
 */
export function calculateSoundWaveOpacity(
  currentRadius: number,
  maxRadius: number,
  fadeStartRatio: number = 0.3
): number {
  const progress = currentRadius / maxRadius;

  if (progress < fadeStartRatio) {
    return 1;
  }

  // Smooth fade out
  const fadeProgress = (progress - fadeStartRatio) / (1 - fadeStartRatio);
  return Math.max(0, 1 - fadeProgress * fadeProgress);
}

// ============================================================================
// GAMEPLAY HELPER FUNCTIONS
// ============================================================================

/**
 * Get cooldown progress (0 = on cooldown, 1 = ready)
 */
export function getRoosterCooldownProgress(
  rooster: Entity & ChickenEntity
): number {
  if (!rooster.chickenAbility) return 0;

  const { cooldownRemaining, cooldownDuration } = rooster.chickenAbility;
  if (cooldownDuration === 0) return 1;

  return 1 - cooldownRemaining / cooldownDuration;
}

/**
 * Calculate how many animals are in range of the slow effect
 */
export function countAnimalsInSlowRange(
  world: World<Entity & ChickenEntity>,
  roosterPosition: Vector3
): number {
  // The crow affects ALL falling animals regardless of distance
  // This is intentional for the "mighty crow" theme
  const fallingAnimals = world.with("tag", "velocity").where(
    (e) => e.tag?.type === "animal" && e.velocity && e.velocity.y > 0
  );

  let count = 0;
  for (const _ of fallingAnimals) {
    count++;
  }
  return count;
}

/**
 * Calculate the current slow factor being applied to an entity
 * Takes into account multiple roosters potentially stacking effects
 */
export function getEffectiveSlowFactor(
  entity: Entity & ChickenEntity
): number {
  if (!entity.crowSlowed) return 1;
  return entity.crowSlowed.slowFactor;
}

/**
 * Get display text for crow ability
 */
export function getCrowAbilityDisplayText(
  rooster: Entity & ChickenEntity,
  world: World<Entity & ChickenEntity>
): string {
  if (!rooster.chickenAbility) return "";

  if (rooster.chickenAbility.isReady) {
    const inRange = countAnimalsInSlowRange(world, rooster.position!);
    if (inRange > 0) {
      return `Crow! (${inRange} animals in range)`;
    }
    return "Crow!";
  }

  const remaining = Math.ceil(rooster.chickenAbility.cooldownRemaining / 1000);
  return `Cooldown: ${remaining}s`;
}
