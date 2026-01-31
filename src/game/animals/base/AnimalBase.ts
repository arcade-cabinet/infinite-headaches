/**
 * Animal Base Module
 *
 * Base ECS components and systems for all animals.
 * Provides common functionality that all animal submodules extend.
 */

import { Vector3, Color3 } from "@babylonjs/core";
import { world } from "../../ecs/world";
import type { Entity } from "../../ecs/components";
import type {
  AnimalEntity,
  AnimalVariantComponent,
  AnimalVariantConfig,
  BushComponent,
  ProjectileComponent,
  PokeResult,
  SeededRandom,
  createSeededRandom,
} from "../types";
import { GAME_CONFIG } from "../../config";

/**
 * Create an animal variant component with default values
 */
export function createAnimalVariantComponent(
  variantId: string,
  baseType: string,
  initialState: Record<string, unknown> = {}
): AnimalVariantComponent {
  return {
    variantId,
    baseType,
    abilityCooldown: 0,
    abilityReady: true,
    abilityUseCount: 0,
    variantState: initialState,
  };
}

/**
 * Create a bush component for bounce pad functionality
 */
export function createBushComponent(
  size: Vector3,
  bounceForce: number,
  seed: string,
  duration: number = 0
): BushComponent {
  return {
    size,
    bounceForce,
    duration,
    seed,
    growthStage: 0,
    isFullyGrown: false,
  };
}

/**
 * Create a projectile component
 */
export function createProjectileComponent(
  sourceAbilityId: string,
  sourceEntityId: string,
  direction: Vector3,
  speed: number,
  duration: number,
  strength: number
): ProjectileComponent {
  return {
    sourceAbilityId,
    sourceEntityId,
    direction: direction.normalize(),
    speed,
    timeRemaining: duration,
    strength,
    hasHit: false,
  };
}

/**
 * Animal Variant System
 *
 * Updates ability cooldowns and variant-specific state for all animal entities.
 */
export function AnimalVariantSystem(deltaTime: number): void {
  // Query all entities with animal variant components
  const animals = world.with("animalVariant" as keyof Entity);

  for (const entity of animals) {
    const variant = (entity as AnimalEntity).animalVariant;
    if (!variant) continue;

    // Update ability cooldown
    if (variant.abilityCooldown > 0) {
      variant.abilityCooldown = Math.max(0, variant.abilityCooldown - deltaTime);
      variant.abilityReady = variant.abilityCooldown <= 0;
    }
  }
}

/**
 * Bush Growth System
 *
 * Handles bush entity growth animation and lifecycle.
 */
export function BushGrowthSystem(deltaTime: number): void {
  const bushes = world.with("bush" as keyof Entity, "position");

  for (const entity of bushes) {
    const bush = (entity as AnimalEntity).bush;
    if (!bush) continue;

    // Grow the bush over time
    if (!bush.isFullyGrown) {
      const growthSpeed = 0.002; // Growth rate per ms
      bush.growthStage = Math.min(1, bush.growthStage + growthSpeed * deltaTime);

      if (bush.growthStage >= 1) {
        bush.isFullyGrown = true;
      }

      // Update visual scale based on growth
      if (entity.scale) {
        const baseScale = bush.size;
        entity.scale.x = baseScale.x * bush.growthStage;
        entity.scale.y = baseScale.y * bush.growthStage;
        entity.scale.z = baseScale.z * bush.growthStage;
      }
    }

    // Handle duration-based despawn
    if (bush.duration > 0) {
      bush.duration -= deltaTime;
      if (bush.duration <= 0) {
        world.remove(entity);
      }
    }
  }
}

/**
 * Bush Bounce System
 *
 * Handles collision detection between falling animals and bushes.
 * When an animal hits a bush, it bounces back up.
 */
export function BushBounceSystem(deltaTime: number): void {
  const bushes = world.with("bush" as keyof Entity, "position");
  const fallingAnimals = world.with("velocity", "position", "tag");

  for (const bushEntity of bushes) {
    const bush = (bushEntity as AnimalEntity).bush;
    if (!bush || !bush.isFullyGrown) continue;

    const bushPos = bushEntity.position!;
    const bushSize = bush.size;

    for (const animal of fallingAnimals) {
      // Only bounce falling animals (not players)
      if (animal.tag?.type !== "animal") continue;

      // Skip animals moving upward (already bouncing)
      if (animal.velocity!.y < 0) continue;

      const animalPos = animal.position!;
      const animalVel = animal.velocity!;

      // Simple AABB collision check
      const dx = Math.abs(animalPos.x - bushPos.x);
      const dy = Math.abs(animalPos.y - bushPos.y);
      const dz = Math.abs(animalPos.z - bushPos.z);

      const collisionThresholdX = bushSize.x * 0.5 + 0.3; // Animal radius ~0.3
      const collisionThresholdY = bushSize.y * 0.5 + 0.3;
      const collisionThresholdZ = bushSize.z * 0.5 + 0.3;

      if (
        dx < collisionThresholdX &&
        dy < collisionThresholdY &&
        dz < collisionThresholdZ
      ) {
        // Bounce the animal
        const bounceForce = bush.bounceForce;

        // Get variant modifier if available
        let bounceMultiplier = 1.0;
        const animalVariant = (animal as AnimalEntity).animalVariant;
        if (animalVariant?.variantState?.bounceMultiplier) {
          bounceMultiplier = animalVariant.variantState.bounceMultiplier as number;
        }

        // Apply bounce - reverse Y velocity and amplify
        animalVel.y = -Math.abs(animalVel.y) * bounceForce * bounceMultiplier;

        // Add slight horizontal scatter for variety
        animalVel.x += (Math.random() - 0.5) * 2;
        animalVel.z += (Math.random() - 0.5) * 2;

        // Apply a minimum upward velocity
        if (animalVel.y > -5) {
          animalVel.y = -5 * bounceForce * bounceMultiplier;
        }

        // Mark that this animal has bounced (for scoring/tracking)
        if (animalVariant) {
          animalVariant.variantState.lastBounceTime = Date.now();
          animalVariant.variantState.bounceCount =
            ((animalVariant.variantState.bounceCount as number) || 0) + 1;
        }
      }
    }
  }
}

/**
 * Projectile Movement System
 *
 * Moves projectiles and handles their lifecycle.
 */
export function ProjectileMovementSystem(deltaTime: number): void {
  const projectiles = world.with("projectile" as keyof Entity, "position", "velocity");

  for (const entity of projectiles) {
    const proj = (entity as AnimalEntity).projectile;
    if (!proj || proj.hasHit) continue;

    // Update position based on direction and speed
    const moveAmount = proj.speed * (deltaTime / 1000);
    entity.position!.addInPlace(proj.direction.scale(moveAmount));

    // Apply gravity if configured (would need to check projectile config)
    // For now, projectiles fly straight

    // Update time remaining
    proj.timeRemaining -= deltaTime;
    if (proj.timeRemaining <= 0) {
      world.remove(entity);
    }
  }
}

/**
 * Projectile Impact System
 *
 * Handles projectile collisions and effects.
 */
export function ProjectileImpactSystem(
  deltaTime: number,
  onProjectileImpact?: (
    projectile: AnimalEntity,
    hitPosition: Vector3,
    abilityId: string
  ) => void
): void {
  const projectiles = world.with("projectile" as keyof Entity, "position");

  for (const entity of projectiles) {
    const proj = (entity as AnimalEntity).projectile;
    if (!proj || proj.hasHit) continue;

    const projPos = entity.position!;

    // Check ground collision (Y = 0 is ground level in our coordinate system)
    // Adjust based on your game's coordinate system
    const groundY = 0;
    if (projPos.y <= groundY) {
      proj.hasHit = true;

      // Calculate impact position at ground level
      const impactPos = new Vector3(projPos.x, groundY, projPos.z);

      // Trigger callback for ability-specific effects
      if (onProjectileImpact) {
        onProjectileImpact(entity as AnimalEntity, impactPos, proj.sourceAbilityId);
      }

      // Remove projectile after a short delay (for visual effects)
      setTimeout(() => {
        if (world.has(entity)) {
          world.remove(entity);
        }
      }, 100);
    }

    // Check screen bounds
    const maxBounds = 20; // Adjust based on your game bounds
    if (
      Math.abs(projPos.x) > maxBounds ||
      Math.abs(projPos.z) > maxBounds ||
      projPos.y > maxBounds
    ) {
      world.remove(entity);
    }
  }
}

/**
 * Base poke handler - checks cooldown and updates state
 * Returns true if poke should trigger ability
 */
export function handleBasePoke(
  entity: AnimalEntity,
  config: AnimalVariantConfig
): { canTrigger: boolean; wobbleForce: number } {
  const variant = entity.animalVariant;
  if (!variant) {
    return { canTrigger: false, wobbleForce: GAME_CONFIG.poke.wobbleAmount };
  }

  const canTrigger = variant.abilityReady && config.ability !== null;

  if (canTrigger && config.ability) {
    // Put ability on cooldown
    variant.abilityCooldown = config.ability.cooldownMs;
    variant.abilityReady = false;
    variant.abilityUseCount++;
  }

  return {
    canTrigger,
    wobbleForce: GAME_CONFIG.poke.wobbleAmount,
  };
}

/**
 * Apply visual modifiers from variant config to an entity
 */
export function applyVisualModifiers(
  entity: AnimalEntity,
  config: AnimalVariantConfig
): void {
  const { visuals } = config;

  if (visuals.colorTint && entity.colorOverlay) {
    entity.colorOverlay.color = visuals.colorTint;
    entity.colorOverlay.intensity = 0.5; // Default blend
  }

  if (visuals.scaleModifier && entity.scale) {
    entity.scale.multiplyInPlace(visuals.scaleModifier);
  }
}

/**
 * Calculate spawn position with some randomization
 */
export function calculateSpawnPosition(
  sourcePosition: Vector3,
  direction: Vector3,
  distance: number,
  randomOffset: number = 0
): Vector3 {
  const targetPos = sourcePosition.add(direction.scale(distance));

  if (randomOffset > 0) {
    targetPos.x += (Math.random() - 0.5) * randomOffset;
    targetPos.z += (Math.random() - 0.5) * randomOffset;
  }

  return targetPos;
}

/**
 * Generate a random direction for projectiles/spawns
 */
export function getRandomDirection(
  excludeUp: boolean = false,
  seed?: string
): Vector3 {
  let x: number, y: number, z: number;

  if (seed) {
    // Use seeded random for determinism
    const hash = hashString(seed);
    const rng = () => {
      const x = Math.sin(hash) * 10000;
      return x - Math.floor(x);
    };
    const angle = rng() * Math.PI * 2;
    x = Math.cos(angle);
    z = Math.sin(angle);
    y = excludeUp ? 0 : rng() * 0.5 - 0.25;
  } else {
    const angle = Math.random() * Math.PI * 2;
    x = Math.cos(angle);
    z = Math.sin(angle);
    y = excludeUp ? 0 : Math.random() * 0.5 - 0.25;
  }

  return new Vector3(x, y, z).normalize();
}

/**
 * Simple string hash helper
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash;
}

/**
 * All base animal systems that should run each frame
 */
export function runBaseAnimalSystems(
  deltaTime: number,
  onProjectileImpact?: (
    projectile: AnimalEntity,
    hitPosition: Vector3,
    abilityId: string
  ) => void
): void {
  AnimalVariantSystem(deltaTime);
  BushGrowthSystem(deltaTime);
  BushBounceSystem(deltaTime);
  ProjectileMovementSystem(deltaTime);
  ProjectileImpactSystem(deltaTime, onProjectileImpact);
}

/**
 * Export all base functionality
 */
export const AnimalBase = {
  createAnimalVariantComponent,
  createBushComponent,
  createProjectileComponent,
  handleBasePoke,
  applyVisualModifiers,
  calculateSpawnPosition,
  getRandomDirection,
  runBaseAnimalSystems,
  systems: {
    AnimalVariantSystem,
    BushGrowthSystem,
    BushBounceSystem,
    ProjectileMovementSystem,
    ProjectileImpactSystem,
  },
};

export default AnimalBase;
