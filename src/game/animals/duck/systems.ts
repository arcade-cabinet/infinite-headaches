/**
 * Duck Variant ECS Systems
 * Systems for duck abilities and effects in Homestead Headaches
 */

import { world } from "../../ecs/world";
import type { Entity } from "../../ecs/components";
import {
  DUCK_VARIANTS,
  RUBBER_DUCK_CONFIG,
  DIVING_DUCK_CONFIG,
  MAMA_DUCK_CONFIG,
  getDuckVariant,
  isDucklingType,
  getAnimalSizeCategory,
  type DuckVariantId,
} from "./config";
import {
  createSqueakBounceComponent,
  createDiveStabilizeComponent,
  createDucklingAttractionComponent,
  type DuckEntity,
  type DuckVariantComponent,
  type DuckAbilityComponent,
  type SqueakBounceComponent,
  type DiveStabilizeComponent,
  type DucklingAttractionComponent,
} from "./components";
import { GAME_CONFIG } from "../../config";

/**
 * Context for duck systems
 */
export interface DuckSystemContext {
  /** Stack top Y position */
  stackTopY: number;
  /** Stack center X position */
  stackCenterX: number;
  /** All falling animal entities */
  fallingAnimals: (Entity & { x?: number; y?: number; velocityX?: number; velocityY?: number })[];
  /** Global wobble multiplier */
  globalWobbleMultiplier: number;
}

let systemContext: DuckSystemContext = {
  stackTopY: 0,
  stackCenterX: 0,
  fallingAnimals: [],
  globalWobbleMultiplier: 1.0,
};

/**
 * Update system context (call before running systems)
 */
export function updateDuckSystemContext(ctx: Partial<DuckSystemContext>): void {
  systemContext = { ...systemContext, ...ctx };
}

/**
 * Duck Ability Cooldown System
 * Updates cooldowns for all duck variant abilities
 */
export function DuckAbilityCooldownSystem(deltaTime: number): void {
  const ducks = world.with("duckAbility" as keyof Entity);

  for (const entity of ducks) {
    const ability = (entity as DuckEntity).duckAbility;
    if (!ability) continue;

    // Update cooldown
    if (ability.cooldownRemaining > 0) {
      ability.cooldownRemaining = Math.max(0, ability.cooldownRemaining - deltaTime);
    }

    // Update active ability duration
    if (ability.isActive && ability.durationRemaining > 0) {
      ability.durationRemaining -= deltaTime;
      if (ability.durationRemaining <= 0) {
        ability.isActive = false;
      }
    }
  }
}

/**
 * Squeak Bounce System
 * Handles Rubber Duck's squeak bounce effect
 */
export function SqueakBounceSystem(deltaTime: number): void {
  const entities = world.with("squeakBounce" as keyof Entity, "position");

  for (const entity of entities) {
    const bounce = (entity as DuckEntity).squeakBounce;
    if (!bounce) continue;

    // Update bounce phase (animation)
    bounce.bouncePhase = Math.min(1, bounce.bouncePhase + deltaTime / 300);

    // Update boop timer
    bounce.boopTimeRemaining -= deltaTime;

    // Apply boop force to falling animals within range
    if (bounce.boopTimeRemaining > 0) {
      for (const falling of systemContext.fallingAnimals) {
        if (!falling.x || !falling.y) continue;

        const dx = falling.x - bounce.centerX;
        const dy = falling.y - bounce.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < bounce.boopRadius && falling.velocityX !== undefined) {
          // Calculate boop direction (toward stack center)
          const boopDirX = systemContext.stackCenterX - falling.x;
          const normalizedBoopX = boopDirX / (Math.abs(boopDirX) || 1);

          // Apply boop force
          const boopStrength = RUBBER_DUCK_CONFIG.ability.params.boopStrength;
          falling.velocityX = (falling.velocityX || 0) + normalizedBoopX * boopStrength;

          // Track booped entity
          if (falling.id && !bounce.boopedEntityIds.includes(falling.id)) {
            bounce.boopedEntityIds.push(falling.id);
          }
        }
      }
    }

    // Clean up completed bounces
    if (bounce.boopTimeRemaining <= 0 && bounce.bouncePhase >= 1) {
      delete (entity as DuckEntity).squeakBounce;
    }
  }
}

/**
 * Dive Stabilize System
 * Handles Diving Duck's dive and stack stabilization
 */
export function DiveStabilizeSystem(deltaTime: number): void {
  const entities = world.with("diveStabilize" as keyof Entity, "position");

  for (const entity of entities) {
    const dive = (entity as DuckEntity).diveStabilize;
    const pos = entity.position;
    if (!dive || !pos) continue;

    // Handle dive phase
    if (dive.isDiving && !dive.diveComplete) {
      const diveSpeed = DIVING_DUCK_CONFIG.ability.params.diveSpeed;
      dive.diveProgress += (diveSpeed * deltaTime) / 1000;

      // Interpolate position during dive
      const newY = dive.startY + (dive.targetY - dive.startY) * dive.diveProgress;
      (pos as any).y = newY;

      if (dive.diveProgress >= 1) {
        dive.diveComplete = true;
        dive.isDiving = false;
        dive.isPhasing = false;
      }
    }

    // Handle stabilization phase
    if (dive.diveComplete && dive.stabilizeDurationRemaining > 0) {
      dive.stabilizeDurationRemaining -= deltaTime;

      // Apply wobble reduction to global multiplier
      const reduction = dive.wobbleReductionFactor;
      systemContext.globalWobbleMultiplier = Math.min(
        systemContext.globalWobbleMultiplier,
        reduction
      );
    }

    // Clean up completed dives
    if (dive.diveComplete && dive.stabilizeDurationRemaining <= 0) {
      delete (entity as DuckEntity).diveStabilize;
    }
  }
}

/**
 * Duckling Attraction System
 * Handles Mama Duck's duckling attraction effect
 */
export function DucklingAttractionSystem(deltaTime: number): void {
  const entities = world.with("ducklingAttraction" as keyof Entity, "position");

  for (const entity of entities) {
    const attraction = (entity as DuckEntity).ducklingAttraction;
    if (!attraction) continue;

    // Update position
    const pos = entity.position;
    if (pos) {
      attraction.centerX = (pos as any).x;
      attraction.centerY = (pos as any).y;
    }

    // Update active duration
    if (attraction.activeTimeRemaining > 0) {
      attraction.activeTimeRemaining -= deltaTime;
    }

    // Apply attraction to falling animals
    attraction.attractedEntityIds = [];

    for (const falling of systemContext.fallingAnimals) {
      if (!falling.x || !falling.y) continue;

      // Check if this is a valid target
      const animalType = (falling as any).tag?.subtype || "";
      const sizeCategory = getAnimalSizeCategory(animalType);

      // Mama Duck attracts small animals more strongly
      const sizeMultiplier = sizeCategory === "small" ? 1.2 : sizeCategory === "medium" ? 0.8 : 0.5;

      const dx = falling.x - attraction.centerX;
      const dy = falling.y - attraction.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check active attraction
      const isActiveAttraction =
        attraction.activeTimeRemaining > 0 && dist < attraction.activeRadius;

      // Check passive attraction
      const isPassiveAttraction = dist < attraction.passiveRadius;

      if (isActiveAttraction || isPassiveAttraction) {
        const strength = isActiveAttraction
          ? attraction.activeStrength
          : attraction.passiveStrength;

        // Calculate attraction direction (toward stack)
        const attractDirX = systemContext.stackCenterX - falling.x;
        const attractDirY = systemContext.stackTopY - falling.y;
        const attractDist = Math.sqrt(attractDirX * attractDirX + attractDirY * attractDirY) || 1;

        // Apply attraction force
        if (falling.velocityX !== undefined && falling.velocityY !== undefined) {
          falling.velocityX += ((attractDirX / attractDist) * strength * sizeMultiplier * deltaTime) / 100;
          falling.velocityY += ((attractDirY / attractDist) * strength * sizeMultiplier * deltaTime) / 200;
        }

        if (falling.id) {
          attraction.attractedEntityIds.push(falling.id);
        }
      }
    }

    // Animation state
    attraction.isCallingAnimation = attraction.activeTimeRemaining > 0;
  }
}

/**
 * Master duck variant system - runs all duck systems
 */
export function DuckVariantSystem(deltaTime: number): void {
  DuckAbilityCooldownSystem(deltaTime);
  SqueakBounceSystem(deltaTime);
  DiveStabilizeSystem(deltaTime);
  DucklingAttractionSystem(deltaTime);
}

/**
 * Trigger a duck variant's ability
 */
export function triggerDuckAbility(
  entity: Entity & DuckEntity,
  context: { stackCenterX: number; stackTopY: number; stackBottomY: number }
): boolean {
  const variant = entity.duckVariant;
  const ability = entity.duckAbility;

  if (!variant || !ability) return false;
  if (ability.cooldownRemaining > 0 || ability.isActive) return false;

  const config = getDuckVariant(variant.variantId);
  const pos = entity.position;
  if (!config || !pos) return false;

  // Mark ability as active
  ability.isActive = true;
  ability.activatedAt = Date.now();
  ability.durationRemaining = config.ability.durationMs;
  ability.cooldownRemaining = config.ability.cooldownMs;

  // Update variant state
  variant.activated = true;
  variant.lastActivationTime = Date.now();

  // Create ability-specific components
  switch (variant.variantId) {
    case "rubber_duck":
      entity.squeakBounce = createSqueakBounceComponent(
        (pos as any).x,
        (pos as any).y,
        config.ability.effectRadius,
        config.ability.params.boopDuration
      );
      break;

    case "diving_duck":
      entity.diveStabilize = createDiveStabilizeComponent(
        (pos as any).y,
        context.stackBottomY,
        config.ability.params.wobbleReduction,
        config.ability.params.stabilizeDuration
      );
      break;

    case "mama_duck":
      entity.ducklingAttraction = createDucklingAttractionComponent(
        (pos as any).x,
        (pos as any).y,
        config.ability.effectRadius,
        config.ability.params.passiveAttractionRange,
        config.ability.params.attractionStrength,
        config.ability.params.passiveAttractionStrength,
        config.ability.durationMs
      );
      break;
  }

  return true;
}

/**
 * Check if a duck's ability is ready
 */
export function isDuckAbilityReady(entity: Entity & DuckEntity): boolean {
  const ability = entity.duckAbility;
  return ability ? ability.cooldownRemaining <= 0 && !ability.isActive : false;
}

/**
 * Get ability cooldown progress (0-1)
 */
export function getDuckAbilityCooldownProgress(entity: Entity & DuckEntity): number {
  const ability = entity.duckAbility;
  const variant = entity.duckVariant;
  if (!ability || !variant) return 0;

  const config = getDuckVariant(variant.variantId);
  if (!config) return 0;

  if (ability.cooldownRemaining <= 0) return 1;
  return 1 - ability.cooldownRemaining / config.ability.cooldownMs;
}

/**
 * Get current wobble reduction from dive ducks
 */
export function getGlobalWobbleReduction(): number {
  return systemContext.globalWobbleMultiplier;
}

/**
 * Reset wobble reduction (call each frame before systems)
 */
export function resetGlobalWobbleReduction(): void {
  systemContext.globalWobbleMultiplier = 1.0;
}

/**
 * Get all entities attracted by mama ducks
 */
export function getAttractedEntityIds(): string[] {
  const ids: string[] = [];
  const entities = world.with("ducklingAttraction" as keyof Entity);

  for (const entity of entities) {
    const attraction = (entity as DuckEntity).ducklingAttraction;
    if (attraction) {
      ids.push(...attraction.attractedEntityIds);
    }
  }

  return [...new Set(ids)];
}

/**
 * Get all active squeak effects for rendering
 */
export function getActiveSqueakEffects(): SqueakBounceComponent[] {
  const effects: SqueakBounceComponent[] = [];
  const entities = world.with("squeakBounce" as keyof Entity);

  for (const entity of entities) {
    const bounce = (entity as DuckEntity).squeakBounce;
    if (bounce) {
      effects.push(bounce);
    }
  }

  return effects;
}

/**
 * Get all active dive effects for rendering
 */
export function getActiveDiveEffects(): DiveStabilizeComponent[] {
  const effects: DiveStabilizeComponent[] = [];
  const entities = world.with("diveStabilize" as keyof Entity);

  for (const entity of entities) {
    const dive = (entity as DuckEntity).diveStabilize;
    if (dive) {
      effects.push(dive);
    }
  }

  return effects;
}

export default {
  updateDuckSystemContext,
  DuckVariantSystem,
  DuckAbilityCooldownSystem,
  SqueakBounceSystem,
  DiveStabilizeSystem,
  DucklingAttractionSystem,
  triggerDuckAbility,
  isDuckAbilityReady,
  getDuckAbilityCooldownProgress,
  getGlobalWobbleReduction,
  resetGlobalWobbleReduction,
  getAttractedEntityIds,
  getActiveSqueakEffects,
  getActiveDiveEffects,
};
