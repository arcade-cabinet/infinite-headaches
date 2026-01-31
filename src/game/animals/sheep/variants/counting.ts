/**
 * Counting Sheep Variant
 *
 * A sleepy sheep with droopy eyes and floating Z's around it.
 * Has a passive aura that slows nearby falling animals.
 * When poked, activates a powerful sleep wave that makes ALL
 * animals on screen fall at 50% speed for 4 seconds.
 *
 * Visual: Sleepy expression, floating Z particles, purple tint
 * Passive: Slows nearby falling animals
 * Ability: Global slow (50% speed, 4s duration, 20s cooldown)
 */

import { Vector3, Color3 } from "@babylonjs/core";
import { world } from "../../../ecs/world";
import type { Entity } from "../../../ecs/components";
import type { AnimalEntity, PokeResult } from "../../types";
import { COUNTING_SHEEP_CONFIG, COUNTING_SHEEP_ABILITY } from "../config";
import {
  createCountingSheepState,
  createZParticle,
  type CountingSheepState,
  type ZParticle,
} from "../components";
import { activateSleepWave, getSleepSpeedMultiplier, isSleepWaveActive } from "../systems";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Duration of global sleep effect (ms) */
const SLEEP_DURATION = 4000;

/** Speed multiplier during sleep (0.5 = 50% speed) */
const SLEEP_SPEED_MULTIPLIER = 0.5;

/** Passive aura radius (pixels) */
const PASSIVE_AURA_RADIUS = 100;

/** Passive slow strength (0.85 = 15% slower) */
const PASSIVE_SLOW_STRENGTH = 0.85;

/** Maximum Z particles floating around */
const MAX_Z_PARTICLES = 5;

/** Z particle spawn interval (ms) */
const Z_SPAWN_INTERVAL = 800;

/** Sleep wave visual expansion speed */
const WAVE_EXPANSION_SPEED = 0.5;

/** Colors for sleepy effects */
export const SLEEPY_COLORS = {
  primary: new Color3(0.58, 0.44, 0.86),   // Purple
  secondary: new Color3(0.9, 0.9, 1.0),    // Lavender white
  glow: new Color3(0.87, 0.63, 0.87),      // Light purple glow
  z: new Color3(0.7, 0.5, 0.9),            // Z particle color
  aura: new Color3(0.8, 0.7, 1.0),         // Passive aura color
};

// ============================================================================
// ENTITY CREATION
// ============================================================================

/**
 * Create counting sheep entity with all required components
 */
export function createCountingSheep(position: Vector3): AnimalEntity {
  const entity: AnimalEntity = {
    id: crypto.randomUUID(),
    position: position.clone(),
    velocity: new Vector3(0, 0, 0),
    scale: new Vector3(1, 1, 1),
    model: "assets/models/sheep.glb",
    tag: { type: "animal", subtype: "sheep" },
    physics: { mass: 1.1, restitution: 0.2, friction: 0.6 },
    wobble: { offset: 0, velocity: 0, damping: 0.95, springiness: 0.08 }, // More stable
    colorOverlay: {
      color: SLEEPY_COLORS.primary,
      intensity: 0.25,
    },
    animalVariant: {
      variantId: "counting_sheep",
      baseType: "sheep",
      abilityCooldown: 0,
      abilityReady: true,
      abilityUseCount: 0,
      variantState: createCountingSheepState() as unknown as Record<string, unknown>,
    },
  };

  // Add to ECS world
  world.add(entity);

  return entity;
}

/**
 * Get counting sheep state from entity
 */
export function getCountingState(entity: AnimalEntity): CountingSheepState | null {
  if (entity.animalVariant?.variantId !== "counting_sheep") return null;
  return entity.animalVariant.variantState as unknown as CountingSheepState;
}

// ============================================================================
// ABILITY HANDLING
// ============================================================================

/**
 * Handle poke interaction for counting sheep
 */
export function handleCountingSheepPoke(entity: AnimalEntity): PokeResult {
  const variant = entity.animalVariant;
  if (!variant || variant.variantId !== "counting_sheep") {
    return { poked: false };
  }

  const state = variant.variantState as unknown as CountingSheepState;

  // Check cooldown
  if (!variant.abilityReady || variant.abilityCooldown > 0) {
    return {
      poked: true,
      wobbleForce: 0.1,
      data: {
        onCooldown: true,
        yawn: true, // Visual feedback even when on cooldown
      },
    };
  }

  // Activate sleep wave!
  activateSleepWave(SLEEP_DURATION, SLEEP_SPEED_MULTIPLIER);

  // Update state
  state.sleepActive = true;

  // Set cooldown
  variant.abilityCooldown = COUNTING_SHEEP_ABILITY.cooldownMs;
  variant.abilityReady = false;
  variant.abilityUseCount++;

  return {
    poked: true,
    ability: "sleep_wave",
    wobbleForce: 0.15,
    data: {
      sleepDuration: SLEEP_DURATION,
      speedMultiplier: SLEEP_SPEED_MULTIPLIER,
      isGlobalEffect: true,
    },
  };
}

/**
 * Update counting sheep entity
 */
export function updateCountingSheep(
  entity: AnimalEntity,
  deltaTime: number,
  rng: () => number
): void {
  const variant = entity.animalVariant;
  if (!variant || variant.variantId !== "counting_sheep") return;

  const state = variant.variantState as unknown as CountingSheepState;
  const position = entity.position || new Vector3(0, 0, 0);

  // Update cooldown
  if (variant.abilityCooldown > 0) {
    variant.abilityCooldown -= deltaTime;
    if (variant.abilityCooldown <= 0) {
      variant.abilityCooldown = 0;
      variant.abilityReady = true;
    }
  }

  // Track global sleep state
  state.sleepActive = isSleepWaveActive();

  // Update Z particles
  for (let i = state.zParticles.length - 1; i >= 0; i--) {
    const particle = state.zParticles[i];

    // Update position (float upward with wobble)
    particle.position.x += particle.velocity.x * deltaTime * 0.001;
    particle.position.y += particle.velocity.y * deltaTime * 0.001;
    particle.position.z += particle.velocity.z * deltaTime * 0.001;

    // Update properties
    particle.lifetime -= deltaTime;
    particle.opacity *= 0.995;
    particle.rotation += 0.001 * deltaTime;
    particle.size *= 1.001; // Grow slightly as they float up

    // Remove dead particles
    if (particle.lifetime <= 0 || particle.opacity < 0.1) {
      state.zParticles.splice(i, 1);
    }
  }

  // Spawn new Z particles
  state.passiveTickTimer += deltaTime;
  if (state.passiveTickTimer > Z_SPAWN_INTERVAL && state.zParticles.length < MAX_Z_PARTICLES) {
    state.passiveTickTimer = 0;
    state.zParticles.push(createZParticle(position, rng));
  }

  // Update sleep aura (pulsing effect)
  state.sleepAura = 0.3 + Math.sin(Date.now() * 0.002) * 0.15;

  // Update visual intensity
  if (entity.colorOverlay) {
    const baseIntensity = 0.2;
    const sleepBonus = state.sleepActive ? 0.2 : 0;
    const auraBonus = state.sleepAura * 0.1;
    entity.colorOverlay.intensity = baseIntensity + sleepBonus + auraBonus;
  }
}

/**
 * Get passive slow effect for a position near counting sheep
 */
export function getPassiveSlowEffect(
  targetPosition: Vector3,
  countingSheepPositions: Vector3[]
): number {
  return getSleepSpeedMultiplier(targetPosition, countingSheepPositions);
}

/**
 * Check if the counting sheep ability is ready
 */
export function isCountingAbilityReady(entity: AnimalEntity): boolean {
  const variant = entity.animalVariant;
  return variant?.variantId === "counting_sheep" && variant.abilityReady;
}

/**
 * Get cooldown progress (0-1, 1 = ready)
 */
export function getCountingCooldownProgress(entity: AnimalEntity): number {
  const variant = entity.animalVariant;
  if (!variant || variant.variantId !== "counting_sheep") return 0;

  const maxCooldown = COUNTING_SHEEP_ABILITY.cooldownMs;
  return 1 - variant.abilityCooldown / maxCooldown;
}

// ============================================================================
// VISUAL HELPERS
// ============================================================================

/**
 * Get current Z particles for rendering
 */
export function getZParticles(entity: AnimalEntity): ZParticle[] {
  const state = getCountingState(entity);
  return state?.zParticles || [];
}

/**
 * Generate sleep aura circle points for rendering
 */
export function generateAuraPoints(
  centerPosition: Vector3,
  segments: number = 32
): Vector3[] {
  const points: Vector3[] = [];
  const radius = PASSIVE_AURA_RADIUS / 100; // Convert to world units

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(
      new Vector3(
        centerPosition.x + Math.cos(angle) * radius,
        centerPosition.y,
        centerPosition.z + Math.sin(angle) * radius
      )
    );
  }

  return points;
}

/**
 * Generate sleep wave visual for global effect
 */
export function generateSleepWaveVisual(
  centerPosition: Vector3,
  waveRadius: number,
  segments: number = 64
): { inner: Vector3[]; outer: Vector3[] } {
  const innerPoints: Vector3[] = [];
  const outerPoints: Vector3[] = [];
  const innerRadius = waveRadius * 0.9;
  const outerRadius = waveRadius;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    innerPoints.push(
      new Vector3(
        centerPosition.x + Math.cos(angle) * innerRadius,
        centerPosition.y + 0.1,
        centerPosition.z + Math.sin(angle) * innerRadius
      )
    );
    outerPoints.push(
      new Vector3(
        centerPosition.x + Math.cos(angle) * outerRadius,
        centerPosition.y + 0.1,
        centerPosition.z + Math.sin(angle) * outerRadius
      )
    );
  }

  return { inner: innerPoints, outer: outerPoints };
}

/**
 * Create a Z character mesh points (for 3D rendering)
 */
export function createZShapePoints(size: number): Vector3[] {
  // Z shape as a series of points
  const halfSize = size / 2;
  return [
    new Vector3(-halfSize, halfSize, 0),   // Top-left
    new Vector3(halfSize, halfSize, 0),    // Top-right
    new Vector3(-halfSize, -halfSize, 0),  // Bottom-left (diagonal)
    new Vector3(halfSize, -halfSize, 0),   // Bottom-right
  ];
}

/**
 * Generate droopy eyelid position offset
 * Returns Y offset for eyelid animation
 */
export function getEyelidOffset(time: number): number {
  // Slow blink cycle with occasional full blinks
  const baseDroop = 0.3; // Always slightly droopy
  const blinkCycle = Math.sin(time * 0.0005) * 0.1;
  const occasionalBlink = Math.sin(time * 0.001) > 0.98 ? 0.5 : 0;

  return baseDroop + blinkCycle + occasionalBlink;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const CountingSheepVariant = {
  config: COUNTING_SHEEP_CONFIG,
  ability: COUNTING_SHEEP_ABILITY,
  colors: SLEEPY_COLORS,
  passiveRadius: PASSIVE_AURA_RADIUS,
  passiveSlowStrength: PASSIVE_SLOW_STRENGTH,
  create: createCountingSheep,
  handlePoke: handleCountingSheepPoke,
  update: updateCountingSheep,
  isAbilityReady: isCountingAbilityReady,
  getCooldownProgress: getCountingCooldownProgress,
  getState: getCountingState,
  getPassiveSlowEffect,
  getZParticles,
  generateAuraPoints,
  generateSleepWaveVisual,
  createZShapePoints,
  getEyelidOffset,
};

export default CountingSheepVariant;
