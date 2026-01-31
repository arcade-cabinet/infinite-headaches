/**
 * AbilitySystem - ECS system for managing entity abilities
 *
 * Handles special abilities like:
 * 1. Fireball (fire-type animals)
 * 2. Freeze (ice-type animals)
 * 3. Boss abilities (shockwave, phase, dodge)
 *
 * Manages cooldowns, charges, and ability activation
 */

import { world } from "../world";
import { GAME_CONFIG, ANIMAL_TYPES, AnimalType } from "../../config";
import { Entity, AbilityComponent } from "../components";

export interface AbilitySystemCallbacks {
  onAbilityReady?: (entity: Entity, abilityId: string) => void;
  onAbilityUsed?: (entity: Entity, abilityId: string) => void;
  onAbilityCooldownComplete?: (entity: Entity, abilityId: string) => void;
}

/**
 * Creates an AbilityComponent for a given ability type
 */
export function createAbilityComponent(
  abilityId: string,
  cooldownMs: number,
  charges?: number
): AbilityComponent {
  return {
    abilityId,
    cooldownMs,
    lastUsed: 0, // Never used
    isActive: false,
    charges,
    maxCharges: charges,
  };
}

/**
 * Creates an AbilityComponent based on animal type
 */
export function createAbilityFromAnimalType(type: AnimalType): AbilityComponent | undefined {
  const config = ANIMAL_TYPES[type];
  if (!config || !config.ability) {
    return undefined;
  }

  return createAbilityComponent(
    config.ability,
    config.abilityCooldown || 3000
  );
}

/**
 * Checks if an ability is ready to use
 */
export function isAbilityReady(ability: AbilityComponent): boolean {
  const now = Date.now();
  const cooldownComplete = now - ability.lastUsed >= ability.cooldownMs;
  const hasCharges = ability.charges === undefined || ability.charges > 0;

  return cooldownComplete && hasCharges && !ability.isActive;
}

/**
 * Gets the cooldown progress (0 = just used, 1 = ready)
 */
export function getAbilityCooldownProgress(ability: AbilityComponent): number {
  const now = Date.now();
  const elapsed = now - ability.lastUsed;

  if (elapsed >= ability.cooldownMs) {
    return 1;
  }

  return elapsed / ability.cooldownMs;
}

/**
 * Uses an ability on an entity
 * Returns true if ability was successfully used
 */
export function useAbility(entity: Entity): boolean {
  if (!entity.ability) return false;

  const { ability } = entity;

  if (!isAbilityReady(ability)) {
    return false;
  }

  // Use a charge if applicable
  if (ability.charges !== undefined) {
    ability.charges--;
  }

  // Set last used time
  ability.lastUsed = Date.now();
  ability.isActive = true;

  return true;
}

/**
 * Deactivates an ability (call after ability effect completes)
 */
export function deactivateAbility(entity: Entity): void {
  if (!entity.ability) return;
  entity.ability.isActive = false;
}

/**
 * Restores charges to an ability
 */
export function restoreCharges(entity: Entity, amount: number = 1): void {
  if (!entity.ability || entity.ability.maxCharges === undefined) return;

  entity.ability.charges = Math.min(
    entity.ability.maxCharges,
    (entity.ability.charges || 0) + amount
  );
}

/**
 * AbilitySystem - Updates all entity abilities
 *
 * @param deltaTime - Time elapsed in milliseconds
 * @param callbacks - Optional callbacks for ability events
 */
export function AbilitySystem(
  deltaTime: number,
  callbacks?: AbilitySystemCallbacks
): void {
  const entitiesWithAbilities = world.with("ability");

  for (const entity of entitiesWithAbilities) {
    const { ability } = entity;

    // Track if ability just became ready
    const wasOnCooldown = Date.now() - ability.lastUsed < ability.cooldownMs;
    const nowReady = isAbilityReady(ability);

    // Fire cooldown complete callback
    if (wasOnCooldown && nowReady && !ability.isActive) {
      callbacks?.onAbilityCooldownComplete?.(entity, ability.abilityId);
    }

    // Fire ability ready callback (only once when ready)
    if (nowReady && ability.lastUsed === 0) {
      callbacks?.onAbilityReady?.(entity, ability.abilityId);
    }
  }
}

/**
 * Triggers ability on an entity (used when entity is poked/clicked)
 * Returns the ability ID if triggered, null otherwise
 */
export function triggerAbility(entity: Entity, callbacks?: AbilitySystemCallbacks): string | null {
  if (!entity.ability) return null;

  if (useAbility(entity)) {
    callbacks?.onAbilityUsed?.(entity, entity.ability.abilityId);
    return entity.ability.abilityId;
  }

  return null;
}

/**
 * Query helper - get all entities with ready abilities
 */
export function getEntitiesWithReadyAbilities(): Entity[] {
  return Array.from(world.with("ability")).filter((e) =>
    isAbilityReady(e.ability!)
  );
}

/**
 * Query helper - get entities by ability type
 */
export function getEntitiesByAbility(abilityId: string): Entity[] {
  return Array.from(world.with("ability")).filter(
    (e) => e.ability!.abilityId === abilityId
  );
}

/**
 * Gets aggregate ability state for UI display
 */
export interface AbilityStateUI {
  fireReady: number; // 0-1 cooldown progress for fire
  iceReady: number; // 0-1 cooldown progress for ice
  hasFire: boolean; // Whether any entity has fire ability
  hasIce: boolean; // Whether any entity has ice ability
}

export function getAbilityStateForUI(): AbilityStateUI {
  const entitiesWithAbilities = Array.from(world.with("ability"));

  let fireReady = 0;
  let iceReady = 0;
  let hasFire = false;
  let hasIce = false;

  for (const entity of entitiesWithAbilities) {
    const { ability } = entity;

    if (ability.abilityId === "fireball") {
      hasFire = true;
      fireReady = Math.max(fireReady, getAbilityCooldownProgress(ability));
    } else if (ability.abilityId === "freeze") {
      hasIce = true;
      iceReady = Math.max(iceReady, getAbilityCooldownProgress(ability));
    }
  }

  return { fireReady, iceReady, hasFire, hasIce };
}
