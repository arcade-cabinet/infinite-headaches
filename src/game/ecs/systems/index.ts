/**
 * ECS Systems Index
 *
 * Exports all ECS systems for the game.
 * Systems should be run in the order listed here for correct behavior.
 */

// Import systems for use in runAllSystems
import { MovementSystem as _MovementSystem } from "./MovementSystem";
import { WobbleSystem as _WobbleSystem } from "./WobbleSystem";
import { AnimationSystem as _AnimationSystem } from "./AnimationSystem";
import { StackingSystem as _StackingSystem } from "./StackingSystem";
import { FreezeSystem as _FreezeSystem } from "./FreezeSystem";
import { ProjectileSystem as _ProjectileSystem } from "./ProjectileSystem";
import { BounceZoneSystem as _BounceZoneSystem } from "./BounceZoneSystem";
import { AbilitySystem as _AbilitySystem } from "./AbilitySystem";

// Core movement and physics
export { MovementSystem } from "./MovementSystem";
export { WobbleSystem } from "./WobbleSystem";

// Animation
export {
  AnimationSystem,
  registerEntityAnimations,
  unregisterEntityAnimations,
  createAnimationComponent,
  triggerAnimation,
  getAvailableAnimations,
  hasAnimation,
  animationRegistry,
} from "./AnimationSystem";

// Stacking and stack physics
export {
  StackingSystem,
  createStackedComponent,
  addToStack,
  removeFromStack,
  applyWobble,
  propagateWobbleFromEntity,
  propagateWobbleFromBase,
  calculateTippingState,
  getStackedEntitiesSorted,
  getStackHeight,
  getTopOfStack,
  scatterStack,
  squishEntity,
  type StackingSystemCallbacks,
  type TippingState,
} from "./StackingSystem";

// Falling and spawning
export {
  SpawningSystem,
  createFallingComponent,
  spawnAnimalFromDecision,
  getRandomAnimalType,
  getFallingEntities,
  getFallingEntitiesByBehavior,
  getActiveFallingCount,
  removeFallingEntity,
  type SpawningSystemCallbacks,
} from "./SpawningSystem";

// Freeze mechanics
export {
  FreezeSystem,
  createFrozenComponent,
  freezeEntity,
  thawEntity,
  generateCracks,
  getFreezeState,
  getFrozenEntities,
  getCrackingEntities,
  type FreezeSystemCallbacks,
  type FreezeState,
} from "./FreezeSystem";

// Projectiles (uses GameProjectileComponent to avoid conflict with animals/types.ts)
export {
  ProjectileSystem,
  createFireballComponent,
  createFireball,
  spawnFireballsFrom,
  createExplosionParticles,
  getActiveProjectiles,
  getProjectilesByType,
  type ProjectileSystemCallbacks,
} from "./ProjectileSystem";

// Bounce zones
export {
  BounceZoneSystem,
  createBounceZoneComponent,
  createBounceZone,
  createShockwave,
  getActiveBounceZones,
  getBounceZoneRemainingTime,
  getBounceZoneProgress,
  type BounceZoneSystemCallbacks,
} from "./BounceZoneSystem";

// Abilities
export {
  AbilitySystem,
  createAbilityComponent,
  createAbilityFromAnimalType,
  isAbilityReady,
  getAbilityCooldownProgress,
  useAbility,
  deactivateAbility,
  restoreCharges,
  triggerAbility,
  getEntitiesWithReadyAbilities,
  getEntitiesByAbility,
  getAbilityStateForUI,
  type AbilitySystemCallbacks,
  type AbilityStateUI,
} from "./AbilitySystem";

/**
 * Runs all ECS systems in the correct order.
 *
 * This is the main update loop for ECS-driven game logic.
 * Systems are ordered to ensure dependencies are met:
 * 1. Input/Spawning (creates entities)
 * 2. AI/Behavior (updates intentions)
 * 3. Physics (applies forces)
 * 4. Collision detection
 * 5. State updates (freeze, abilities)
 * 6. Animation (visual updates)
 *
 * @param deltaTime - Time elapsed in milliseconds
 * @param baseEntity - The player base entity
 * @param screenWidth - Screen width for bounds
 * @param screenHeight - Screen height for bounds
 * @param callbacks - Callbacks for various system events
 */
export interface AllSystemsCallbacks {
  onTipping?: (dangerLevel: number, centerOfMass: number) => void;
  onTopple?: () => void;
  onDangerStateChange?: (inDanger: boolean) => void;
  onShatter?: (entity: import("../components").Entity) => void;
  onThawComplete?: (entity: import("../components").Entity) => void;
  onProjectileHit?: (projectile: import("../components").Entity, target: import("../components").Entity) => void;
  onProjectileExpire?: (projectile: import("../components").Entity) => void;
  onBounce?: (zone: import("../components").Entity, bouncedEntity: import("../components").Entity) => void;
  onAbilityReady?: (entity: import("../components").Entity, abilityId: string) => void;
  onAbilityUsed?: (entity: import("../components").Entity, abilityId: string) => void;
}

export function runAllSystems(
  deltaTime: number,
  baseEntity: import("../components").Entity | null,
  screenWidth: number,
  screenHeight: number,
  callbacks?: AllSystemsCallbacks
): void {
  // 1. Movement (applies velocity to position)
  _MovementSystem(deltaTime / 1000); // Convert to seconds

  // 2. Wobble physics
  _WobbleSystem(deltaTime / 1000);

  // 3. Stacking system (stack physics, tipping)
  _StackingSystem(deltaTime, baseEntity, {
    onTipping: callbacks?.onTipping,
    onTopple: callbacks?.onTopple,
    onDangerStateChange: callbacks?.onDangerStateChange,
  });

  // 4. Freeze system (frozen entity updates)
  _FreezeSystem(deltaTime, {
    onShatter: callbacks?.onShatter,
    onThawComplete: callbacks?.onThawComplete,
  });

  // 5. Projectile system (fireball movement, collisions)
  _ProjectileSystem(deltaTime, screenWidth, {
    onHit: callbacks?.onProjectileHit,
    onExpire: callbacks?.onProjectileExpire,
  });

  // 6. Bounce zone system
  _BounceZoneSystem(deltaTime, {
    onBounce: callbacks?.onBounce,
  });

  // 7. Ability system (cooldowns)
  _AbilitySystem(deltaTime, {
    onAbilityReady: callbacks?.onAbilityReady,
    onAbilityUsed: callbacks?.onAbilityUsed,
  });

  // 8. Animation system (visual updates)
  _AnimationSystem(deltaTime / 1000);
}
