/**
 * Rainbow Sheep Variant
 *
 * A magical sheep with multicolored, shimmering wool that cycles
 * through all colors of the rainbow. Worth 2x points passively.
 * When poked, creates rainbow trails behind falling animals that
 * make them worth bonus points when caught.
 *
 * Visual: Multicolored wool with constant color cycling
 * Passive: Worth 2x points
 * Ability: Rainbow blessing (trails on falling animals, 10s cooldown)
 */

import { Vector3, Color3 } from "@babylonjs/core";
import { world } from "../../../ecs/world";
import type { Entity } from "../../../ecs/components";
import type { AnimalEntity, PokeResult } from "../../types";
import { RAINBOW_SHEEP_CONFIG, RAINBOW_SHEEP_ABILITY } from "../config";
import {
  createRainbowSheepState,
  createRainbowTrailEffect,
  type RainbowSheepState,
} from "../components";
import { activateRainbowBlessing, hasRainbowTrail, getRainbowScoreBonus } from "../systems";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Passive score multiplier (applied when catching this sheep) */
const PASSIVE_SCORE_MULTIPLIER = 2.0;

/** Bonus score multiplier for animals with rainbow trail */
const TRAIL_SCORE_BONUS = 1.5;

/** Duration of rainbow trail effect (ms) */
const TRAIL_DURATION = 5000;

/** Radius to affect with rainbow blessing */
const BLESSING_RADIUS = 300;

/** Speed of hue rotation (degrees per second) */
const HUE_ROTATION_SPEED = 90;

/** Rainbow color palette */
export const RAINBOW_COLORS = [
  new Color3(1.0, 0.0, 0.0),   // Red
  new Color3(1.0, 0.5, 0.0),   // Orange
  new Color3(1.0, 1.0, 0.0),   // Yellow
  new Color3(0.0, 1.0, 0.0),   // Green
  new Color3(0.0, 0.5, 1.0),   // Blue
  new Color3(0.3, 0.0, 0.5),   // Indigo
  new Color3(0.6, 0.0, 0.8),   // Violet
];

// ============================================================================
// ENTITY CREATION
// ============================================================================

/**
 * Create rainbow sheep entity with all required components
 */
export function createRainbowSheep(position: Vector3): AnimalEntity {
  const entity: AnimalEntity = {
    id: crypto.randomUUID(),
    position: position.clone(),
    velocity: new Vector3(0, 0, 0),
    scale: new Vector3(1, 1, 1),
    model: "assets/models/sheep.glb",
    tag: { type: "animal", subtype: "sheep" },
    physics: { mass: 0.9, restitution: 0.3, friction: 0.5 },
    wobble: { offset: 0, velocity: 0, damping: 0.9, springiness: 0.1 },
    colorOverlay: {
      color: RAINBOW_COLORS[0],
      intensity: 0.4,
    },
    animalVariant: {
      variantId: "rainbow_sheep",
      baseType: "sheep",
      abilityCooldown: 0,
      abilityReady: true,
      abilityUseCount: 0,
      variantState: createRainbowSheepState() as unknown as Record<string, unknown>,
    },
  };

  // Add to ECS world
  world.add(entity);

  return entity;
}

/**
 * Get rainbow sheep state from entity
 */
export function getRainbowState(entity: AnimalEntity): RainbowSheepState | null {
  if (entity.animalVariant?.variantId !== "rainbow_sheep") return null;
  return entity.animalVariant.variantState as unknown as RainbowSheepState;
}

// ============================================================================
// ABILITY HANDLING
// ============================================================================

/**
 * Handle poke interaction for rainbow sheep
 */
export function handleRainbowSheepPoke(
  entity: AnimalEntity,
  fallingAnimals: { id: string; position: Vector3 }[]
): PokeResult {
  const variant = entity.animalVariant;
  if (!variant || variant.variantId !== "rainbow_sheep") {
    return { poked: false };
  }

  const state = variant.variantState as unknown as RainbowSheepState;

  // Check cooldown
  if (!variant.abilityReady || variant.abilityCooldown > 0) {
    return {
      poked: true,
      wobbleForce: 0.12,
      data: { onCooldown: true },
    };
  }

  // Get source position
  const sourcePosition = entity.position || new Vector3(0, 0, 0);

  // Activate rainbow blessing!
  const affectedIds = activateRainbowBlessing(
    entity.id!,
    sourcePosition,
    BLESSING_RADIUS,
    TRAIL_DURATION,
    TRAIL_SCORE_BONUS,
    fallingAnimals
  );

  // Update state
  state.trailedAnimals = new Set(affectedIds);
  state.trailIntensity = 1.0;
  state.timeSinceActivation = 0;

  // Set cooldown
  variant.abilityCooldown = RAINBOW_SHEEP_ABILITY.cooldownMs;
  variant.abilityReady = false;
  variant.abilityUseCount++;

  return {
    poked: true,
    ability: "rainbow_trail",
    wobbleForce: 0.2,
    data: {
      affectedCount: affectedIds.length,
      trailDuration: TRAIL_DURATION,
      scoreBonus: TRAIL_SCORE_BONUS,
    },
  };
}

/**
 * Update rainbow sheep entity
 */
export function updateRainbowSheep(
  entity: AnimalEntity,
  deltaTime: number
): void {
  const variant = entity.animalVariant;
  if (!variant || variant.variantId !== "rainbow_sheep") return;

  const state = variant.variantState as unknown as RainbowSheepState;

  // Update cooldown
  if (variant.abilityCooldown > 0) {
    variant.abilityCooldown -= deltaTime;
    if (variant.abilityCooldown <= 0) {
      variant.abilityCooldown = 0;
      variant.abilityReady = true;
    }
  }

  // Rotate hue
  state.hueRotation = (state.hueRotation + (HUE_ROTATION_SPEED * deltaTime) / 1000) % 360;

  // Update activation timer
  if (state.timeSinceActivation >= 0) {
    state.timeSinceActivation += deltaTime;
    state.trailIntensity = Math.max(0, 1 - state.timeSinceActivation / TRAIL_DURATION);
  }

  // Update color overlay based on hue rotation
  if (entity.colorOverlay) {
    const color = hueToColor3(state.hueRotation);
    entity.colorOverlay.color = color;
    entity.colorOverlay.intensity = 0.3 + state.trailIntensity * 0.2;
  }
}

/**
 * Get the passive score multiplier for rainbow sheep
 */
export function getRainbowPassiveMultiplier(): number {
  return PASSIVE_SCORE_MULTIPLIER;
}

/**
 * Check if the rainbow sheep ability is ready
 */
export function isRainbowAbilityReady(entity: AnimalEntity): boolean {
  const variant = entity.animalVariant;
  return variant?.variantId === "rainbow_sheep" && variant.abilityReady;
}

/**
 * Get cooldown progress (0-1, 1 = ready)
 */
export function getRainbowCooldownProgress(entity: AnimalEntity): number {
  const variant = entity.animalVariant;
  if (!variant || variant.variantId !== "rainbow_sheep") return 0;

  const maxCooldown = RAINBOW_SHEEP_ABILITY.cooldownMs;
  return 1 - variant.abilityCooldown / maxCooldown;
}

// ============================================================================
// VISUAL HELPERS
// ============================================================================

/**
 * Convert hue (0-360) to Color3
 */
export function hueToColor3(hue: number): Color3 {
  const h = hue / 60;
  const x = 1 - Math.abs(h % 2 - 1);

  let r = 0, g = 0, b = 0;
  if (h < 1) { r = 1; g = x; }
  else if (h < 2) { r = x; g = 1; }
  else if (h < 3) { g = 1; b = x; }
  else if (h < 4) { g = x; b = 1; }
  else if (h < 5) { r = x; b = 1; }
  else { r = 1; b = x; }

  return new Color3(r, g, b);
}

/**
 * Get current rainbow color for the sheep
 */
export function getCurrentRainbowColor(entity: AnimalEntity): Color3 {
  const state = getRainbowState(entity);
  if (!state) return new Color3(1, 1, 1);
  return hueToColor3(state.hueRotation);
}

/**
 * Generate trail color array for rendering
 */
export function generateTrailColors(length: number, startHue: number): Color3[] {
  const colors: Color3[] = [];
  for (let i = 0; i < length; i++) {
    const hue = (startHue + i * 20) % 360;
    colors.push(hueToColor3(hue));
  }
  return colors;
}

/**
 * Generate shimmer particle positions
 */
export function generateShimmerPositions(
  basePosition: Vector3,
  count: number,
  radius: number,
  rng: () => number
): { position: Vector3; color: Color3 }[] {
  const particles: { position: Vector3; color: Color3 }[] = [];

  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const r = rng() * radius;
    const y = (rng() - 0.5) * radius;

    particles.push({
      position: new Vector3(
        basePosition.x + Math.cos(angle) * r,
        basePosition.y + y + 0.3,
        basePosition.z + Math.sin(angle) * r
      ),
      color: hueToColor3(rng() * 360),
    });
  }

  return particles;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const RainbowSheepVariant = {
  config: RAINBOW_SHEEP_CONFIG,
  ability: RAINBOW_SHEEP_ABILITY,
  colors: RAINBOW_COLORS,
  passiveMultiplier: PASSIVE_SCORE_MULTIPLIER,
  create: createRainbowSheep,
  handlePoke: handleRainbowSheepPoke,
  update: updateRainbowSheep,
  isAbilityReady: isRainbowAbilityReady,
  getCooldownProgress: getRainbowCooldownProgress,
  getState: getRainbowState,
  getCurrentColor: getCurrentRainbowColor,
  hueToColor3,
  generateTrailColors,
  generateShimmerPositions,
};

export default RainbowSheepVariant;
