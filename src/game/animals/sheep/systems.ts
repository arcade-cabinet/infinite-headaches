/**
 * Sheep Variant ECS Systems
 *
 * Updates sheep-specific components and handles ability effects.
 */

import { Vector3 } from "@babylonjs/core";
import { world } from "../../ecs/world";
import type { Entity } from "../../ecs/components";
import type {
  ElectricSheepState,
  RainbowSheepState,
  CountingSheepState,
  StunEffect,
  RainbowTrailEffect,
  SleepWaveEffect,
  ZParticle,
} from "./components";
import { createZParticle } from "./components";

// ============================================================================
// GLOBAL EFFECT STATE
// ============================================================================

/** Active stun effects in the world */
const activeStunEffects: StunEffect[] = [];

/** Active rainbow trail effects */
const activeRainbowTrails: RainbowTrailEffect[] = [];

/** Global sleep wave effect (only one active at a time) */
let activeSleepWave: SleepWaveEffect | null = null;

// ============================================================================
// ELECTRIC SHEEP SYSTEM
// ============================================================================

/**
 * Update electric sheep state and chain effects
 */
export function ElectricSheepSystem(
  deltaTime: number,
  entities: Entity[],
  fallingAnimals: { id: string; position: Vector3; velocity: Vector3 }[]
): void {
  // Update active stun effects
  for (let i = activeStunEffects.length - 1; i >= 0; i--) {
    const effect = activeStunEffects[i];
    effect.duration -= deltaTime;

    if (effect.duration <= 0) {
      activeStunEffects.splice(i, 1);
    }
  }

  // Update electric sheep entities
  for (const entity of entities) {
    const state = (entity as any).electricSheepState as ElectricSheepState | undefined;
    if (!state) continue;

    // Build up charge over time (passive)
    state.chargeLevel = Math.min(1, state.chargeLevel + deltaTime * 0.0001);

    // Spawn spark particles
    state.lastSparkTime += deltaTime;
    if (state.lastSparkTime > 200 && state.chargeLevel > 0.3) {
      state.lastSparkTime = 0;
      // Particle spawning would be handled by renderer
    }

    // Update discharge state
    if (state.isDischarging) {
      // Clear chain targets that are no longer valid
      state.chainTargets = state.chainTargets.filter((id) =>
        activeStunEffects.some((e) => e.targetId === id && e.duration > 0)
      );

      if (state.chainTargets.length === 0) {
        state.isDischarging = false;
      }
    }
  }
}

/**
 * Trigger electric chain from a sheep
 * Returns the number of animals affected
 */
export function triggerElectricChain(
  sourceId: string,
  sourcePosition: Vector3,
  maxChainCount: number,
  chainRadius: number,
  stunDuration: number,
  fallingAnimals: { id: string; position: Vector3; velocity: Vector3 }[]
): { affectedIds: string[]; arcPositions: Vector3[] } {
  const affectedIds: string[] = [];
  const arcPositions: Vector3[] = [sourcePosition.clone()];
  let currentPosition = sourcePosition.clone();
  let chainedCount = 0;

  // Find nearest unaffected animals to chain to
  const alreadyHit = new Set<string>();

  while (chainedCount < maxChainCount) {
    let nearestAnimal: { id: string; position: Vector3 } | null = null;
    let nearestDistance = chainRadius;

    for (const animal of fallingAnimals) {
      if (alreadyHit.has(animal.id)) continue;
      if (activeStunEffects.some((e) => e.targetId === animal.id)) continue;

      const distance = Vector3.Distance(currentPosition, animal.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestAnimal = animal;
      }
    }

    if (!nearestAnimal) break;

    // Chain to this animal
    alreadyHit.add(nearestAnimal.id);
    affectedIds.push(nearestAnimal.id);
    arcPositions.push(nearestAnimal.position.clone());

    // Create stun effect
    activeStunEffects.push({
      targetId: nearestAnimal.id,
      duration: stunDuration,
      sourceId,
      isChained: chainedCount > 0,
      chainDepth: chainedCount,
      position: nearestAnimal.position.clone(),
    });

    currentPosition = nearestAnimal.position.clone();
    chainedCount++;
  }

  return { affectedIds, arcPositions };
}

/**
 * Check if an animal is currently stunned
 */
export function isAnimalStunned(animalId: string): boolean {
  return activeStunEffects.some((e) => e.targetId === animalId && e.duration > 0);
}

/**
 * Get stun effect for rendering
 */
export function getStunEffects(): readonly StunEffect[] {
  return activeStunEffects;
}

// ============================================================================
// RAINBOW SHEEP SYSTEM
// ============================================================================

/**
 * Update rainbow sheep state and trail effects
 */
export function RainbowSheepSystem(
  deltaTime: number,
  entities: Entity[],
  fallingAnimals: { id: string; position: Vector3 }[]
): void {
  // Update rainbow trail effects
  for (let i = activeRainbowTrails.length - 1; i >= 0; i--) {
    const trail = activeRainbowTrails[i];
    trail.duration -= deltaTime;

    // Update trail positions (add new positions, remove old)
    const animal = fallingAnimals.find((a) => a.id === trail.targetId);
    if (animal) {
      trail.trailPositions.push(animal.position.clone());
      // Keep last 20 positions for trail
      while (trail.trailPositions.length > 20) {
        trail.trailPositions.shift();
      }
    }

    if (trail.duration <= 0) {
      activeRainbowTrails.splice(i, 1);
    }
  }

  // Update rainbow sheep entities
  for (const entity of entities) {
    const state = (entity as any).rainbowSheepState as RainbowSheepState | undefined;
    if (!state) continue;

    // Cycle hue continuously
    state.hueRotation = (state.hueRotation + deltaTime * 0.1) % 360;

    // Update trail intensity based on ability state
    if (state.timeSinceActivation > 0) {
      state.timeSinceActivation += deltaTime;
      state.trailIntensity = Math.max(0, 1 - state.timeSinceActivation / 5000);
    }
  }
}

/**
 * Activate rainbow blessing ability
 */
export function activateRainbowBlessing(
  sourceId: string,
  sourcePosition: Vector3,
  radius: number,
  duration: number,
  scoreBonus: number,
  fallingAnimals: { id: string; position: Vector3 }[]
): string[] {
  const affectedIds: string[] = [];

  for (const animal of fallingAnimals) {
    const distance = Vector3.Distance(sourcePosition, animal.position);
    if (distance <= radius) {
      // Check if already has trail
      if (!activeRainbowTrails.some((t) => t.targetId === animal.id)) {
        affectedIds.push(animal.id);
        activeRainbowTrails.push({
          targetId: animal.id,
          duration,
          scoreBonus,
          trailPositions: [animal.position.clone()],
          trailColors: [], // Will be populated by renderer
        });
      }
    }
  }

  return affectedIds;
}

/**
 * Get score bonus for an animal (from rainbow trail)
 */
export function getRainbowScoreBonus(animalId: string): number {
  const trail = activeRainbowTrails.find((t) => t.targetId === animalId);
  return trail ? trail.scoreBonus : 1.0;
}

/**
 * Check if animal has rainbow trail
 */
export function hasRainbowTrail(animalId: string): boolean {
  return activeRainbowTrails.some((t) => t.targetId === animalId && t.duration > 0);
}

/**
 * Get rainbow trail effects for rendering
 */
export function getRainbowTrailEffects(): readonly RainbowTrailEffect[] {
  return activeRainbowTrails;
}

// ============================================================================
// COUNTING SHEEP SYSTEM
// ============================================================================

/** Passive slow aura radius */
const PASSIVE_SLOW_RADIUS = 100;
/** Passive slow strength (smaller = stronger slow) */
const PASSIVE_SLOW_STRENGTH = 0.85;

/**
 * Update counting sheep state and sleep effects
 */
export function CountingSheepSystem(
  deltaTime: number,
  entities: Entity[],
  rng: () => number
): void {
  // Update global sleep wave
  if (activeSleepWave) {
    activeSleepWave.duration -= deltaTime;
    activeSleepWave.waveRadius += deltaTime * 0.5; // Expand wave visual
    activeSleepWave.waveOpacity = Math.max(0.2, activeSleepWave.duration / 4000);

    if (activeSleepWave.duration <= 0) {
      activeSleepWave = null;
    }
  }

  // Update counting sheep entities
  for (const entity of entities) {
    const state = (entity as any).countingSheepState as CountingSheepState | undefined;
    if (!state) continue;

    // Update Z particles
    for (let i = state.zParticles.length - 1; i >= 0; i--) {
      const particle = state.zParticles[i];
      particle.lifetime -= deltaTime;
      particle.position.addInPlace(particle.velocity.scale(deltaTime * 0.001));
      particle.opacity *= 0.99;
      particle.rotation += deltaTime * 0.001;

      if (particle.lifetime <= 0 || particle.opacity < 0.1) {
        state.zParticles.splice(i, 1);
      }
    }

    // Spawn new Z particles periodically
    state.passiveTickTimer += deltaTime;
    if (state.passiveTickTimer > 500 && state.zParticles.length < 5) {
      state.passiveTickTimer = 0;
      const entityPos = entity.position || new Vector3(0, 0, 0);
      state.zParticles.push(createZParticle(entityPos, rng));
    }

    // Update passive sleep aura
    state.sleepAura = 0.3 + Math.sin(Date.now() * 0.002) * 0.1;
  }
}

/**
 * Activate sleep wave ability
 */
export function activateSleepWave(duration: number, speedMultiplier: number): void {
  activeSleepWave = {
    active: true,
    duration,
    speedMultiplier,
    waveRadius: 0,
    waveOpacity: 1,
  };
}

/**
 * Get the current speed multiplier for falling animals
 * Considers both global sleep wave and passive auras
 */
export function getSleepSpeedMultiplier(
  animalPosition: Vector3,
  countingSheepPositions: Vector3[]
): number {
  let multiplier = 1.0;

  // Global sleep wave takes priority
  if (activeSleepWave && activeSleepWave.active) {
    multiplier = activeSleepWave.speedMultiplier;
  } else {
    // Check passive auras from counting sheep
    for (const sheepPos of countingSheepPositions) {
      const distance = Vector3.Distance(animalPosition, sheepPos);
      if (distance < PASSIVE_SLOW_RADIUS) {
        // Stronger effect when closer
        const influence = 1 - distance / PASSIVE_SLOW_RADIUS;
        const passiveSlow = 1 - (1 - PASSIVE_SLOW_STRENGTH) * influence;
        multiplier = Math.min(multiplier, passiveSlow);
      }
    }
  }

  return multiplier;
}

/**
 * Check if sleep wave is currently active
 */
export function isSleepWaveActive(): boolean {
  return activeSleepWave !== null && activeSleepWave.active;
}

/**
 * Get sleep wave effect for rendering
 */
export function getSleepWaveEffect(): SleepWaveEffect | null {
  return activeSleepWave;
}

// ============================================================================
// COMBINED SYSTEM
// ============================================================================

/**
 * Main sheep system that updates all variants
 */
export function SheepVariantSystem(
  deltaTime: number,
  entities: Entity[],
  fallingAnimals: { id: string; position: Vector3; velocity: Vector3 }[],
  rng: () => number
): void {
  ElectricSheepSystem(deltaTime, entities, fallingAnimals);
  RainbowSheepSystem(deltaTime, entities, fallingAnimals);
  CountingSheepSystem(deltaTime, entities, rng);
}

/**
 * Clear all active effects (on game reset)
 */
export function clearSheepEffects(): void {
  activeStunEffects.length = 0;
  activeRainbowTrails.length = 0;
  activeSleepWave = null;
}
