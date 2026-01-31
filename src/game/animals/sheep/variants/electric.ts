/**
 * Electric Sheep Variant
 *
 * A sheep with crackling blue static electricity in its wool.
 * When poked, releases an electric pulse that chains between
 * nearby falling animals, stunning them briefly (they float in place).
 *
 * Visual: White wool with blue electric sparks
 * Ability: Chain stun (up to 3 animals, 1 second stun, 7s cooldown)
 */

import { Vector3, Color3 } from "@babylonjs/core";
import { world } from "../../../ecs/world";
import type { Entity } from "../../../ecs/components";
import type { AnimalEntity, PokeResult } from "../../types";
import { ELECTRIC_SHEEP_CONFIG, ELECTRIC_SHEEP_ABILITY } from "../config";
import {
  createElectricSheepState,
  type ElectricSheepState,
} from "../components";
import { triggerElectricChain, isAnimalStunned } from "../systems";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum number of animals that can be chained */
const MAX_CHAIN_COUNT = 3;

/** Radius to search for chain targets (pixels) */
const CHAIN_RADIUS = 150;

/** Duration each stunned animal floats in place (ms) */
const STUN_DURATION = 1000;

/** Spark particle spawn interval (ms) */
const SPARK_INTERVAL = 150;

/** Colors for electric effects */
export const ELECTRIC_COLORS = {
  primary: new Color3(0, 0.75, 1.0),     // Bright cyan
  secondary: new Color3(1, 1, 1),         // White
  glow: new Color3(0, 1, 1),              // Cyan glow
  arc: new Color3(0.5, 0.8, 1.0),         // Arc color
};

// ============================================================================
// ENTITY CREATION
// ============================================================================

/**
 * Create electric sheep entity with all required components
 */
export function createElectricSheep(position: Vector3): AnimalEntity {
  const entity: AnimalEntity = {
    id: crypto.randomUUID(),
    position: position.clone(),
    velocity: new Vector3(0, 0, 0),
    scale: new Vector3(1, 1, 1),
    model: "assets/models/sheep.glb",
    tag: { type: "animal", subtype: "sheep" },
    physics: { mass: 0.95, restitution: 0.3, friction: 0.5 },
    wobble: { offset: 0, velocity: 0, damping: 0.9, springiness: 0.1 },
    colorOverlay: {
      color: ELECTRIC_COLORS.primary,
      intensity: 0.3,
    },
    animalVariant: {
      variantId: "electric_sheep",
      baseType: "sheep",
      abilityCooldown: 0,
      abilityReady: true,
      abilityUseCount: 0,
      variantState: createElectricSheepState() as unknown as Record<string, unknown>,
    },
  };

  // Add to ECS world
  world.add(entity);

  return entity;
}

/**
 * Get electric sheep state from entity
 */
export function getElectricState(entity: AnimalEntity): ElectricSheepState | null {
  if (entity.animalVariant?.variantId !== "electric_sheep") return null;
  return entity.animalVariant.variantState as unknown as ElectricSheepState;
}

// ============================================================================
// ABILITY HANDLING
// ============================================================================

/**
 * Handle poke interaction for electric sheep
 */
export function handleElectricSheepPoke(
  entity: AnimalEntity,
  fallingAnimals: { id: string; position: Vector3; velocity: Vector3 }[]
): PokeResult {
  const variant = entity.animalVariant;
  if (!variant || variant.variantId !== "electric_sheep") {
    return { poked: false };
  }

  const state = variant.variantState as unknown as ElectricSheepState;

  // Check cooldown
  if (!variant.abilityReady || variant.abilityCooldown > 0) {
    return {
      poked: true,
      wobbleForce: 0.15,
      data: { onCooldown: true },
    };
  }

  // Get source position
  const sourcePosition = entity.position || new Vector3(0, 0, 0);

  // Trigger the chain!
  const { affectedIds, arcPositions } = triggerElectricChain(
    entity.id!,
    sourcePosition,
    MAX_CHAIN_COUNT,
    CHAIN_RADIUS,
    STUN_DURATION,
    fallingAnimals
  );

  // Update state
  state.isDischarging = true;
  state.chainTargets = affectedIds;
  state.arcPositions = arcPositions;
  state.chargeLevel = 0; // Discharge depletes charge

  // Set cooldown
  variant.abilityCooldown = ELECTRIC_SHEEP_ABILITY.cooldownMs;
  variant.abilityReady = false;
  variant.abilityUseCount++;

  return {
    poked: true,
    ability: "electric_pulse",
    wobbleForce: 0.25,
    data: {
      affectedCount: affectedIds.length,
      arcPositions,
      stunDuration: STUN_DURATION,
    },
  };
}

/**
 * Update electric sheep entity
 */
export function updateElectricSheep(
  entity: AnimalEntity,
  deltaTime: number
): void {
  const variant = entity.animalVariant;
  if (!variant || variant.variantId !== "electric_sheep") return;

  const state = variant.variantState as unknown as ElectricSheepState;

  // Update cooldown
  if (variant.abilityCooldown > 0) {
    variant.abilityCooldown -= deltaTime;
    if (variant.abilityCooldown <= 0) {
      variant.abilityCooldown = 0;
      variant.abilityReady = true;
    }
  }

  // Build up charge over time
  state.chargeLevel = Math.min(1, state.chargeLevel + deltaTime * 0.0002);

  // Update spark timing
  state.lastSparkTime += deltaTime;

  // Update visual intensity based on charge
  if (entity.colorOverlay) {
    entity.colorOverlay.intensity = 0.2 + state.chargeLevel * 0.3;
  }
}

/**
 * Check if the electric sheep ability is ready
 */
export function isElectricAbilityReady(entity: AnimalEntity): boolean {
  const variant = entity.animalVariant;
  return variant?.variantId === "electric_sheep" && variant.abilityReady;
}

/**
 * Get cooldown progress (0-1, 1 = ready)
 */
export function getElectricCooldownProgress(entity: AnimalEntity): number {
  const variant = entity.animalVariant;
  if (!variant || variant.variantId !== "electric_sheep") return 0;

  const maxCooldown = ELECTRIC_SHEEP_ABILITY.cooldownMs;
  return 1 - variant.abilityCooldown / maxCooldown;
}

// ============================================================================
// VISUAL HELPERS
// ============================================================================

/**
 * Generate spark particle positions around the sheep
 */
export function generateSparkPositions(
  basePosition: Vector3,
  count: number,
  rng: () => number
): Vector3[] {
  const positions: Vector3[] = [];
  const woolRadius = 0.4; // Approximate wool radius

  for (let i = 0; i < count; i++) {
    // Random position on sphere surface
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);

    positions.push(
      new Vector3(
        basePosition.x + woolRadius * Math.sin(phi) * Math.cos(theta),
        basePosition.y + woolRadius * Math.sin(phi) * Math.sin(theta) + 0.2,
        basePosition.z + woolRadius * Math.cos(phi)
      )
    );
  }

  return positions;
}

/**
 * Generate electric arc points between two positions
 * Creates a jagged lightning-like path
 */
export function generateArcPoints(
  start: Vector3,
  end: Vector3,
  segments: number,
  jitter: number,
  rng: () => number
): Vector3[] {
  const points: Vector3[] = [start.clone()];

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const basePoint = Vector3.Lerp(start, end, t);

    // Add perpendicular jitter
    const direction = end.subtract(start).normalize();
    const perpX = new Vector3(-direction.z, 0, direction.x);
    const perpY = new Vector3(0, 1, 0);

    const jitterAmount = jitter * Math.sin(t * Math.PI); // Less jitter at ends
    basePoint.addInPlace(perpX.scale((rng() - 0.5) * 2 * jitterAmount));
    basePoint.addInPlace(perpY.scale((rng() - 0.5) * 2 * jitterAmount * 0.5));

    points.push(basePoint);
  }

  points.push(end.clone());
  return points;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const ElectricSheepVariant = {
  config: ELECTRIC_SHEEP_CONFIG,
  ability: ELECTRIC_SHEEP_ABILITY,
  colors: ELECTRIC_COLORS,
  create: createElectricSheep,
  handlePoke: handleElectricSheepPoke,
  update: updateElectricSheep,
  isAbilityReady: isElectricAbilityReady,
  getCooldownProgress: getElectricCooldownProgress,
  getState: getElectricState,
  generateSparkPositions,
  generateArcPoints,
};

export default ElectricSheepVariant;
