/**
 * StackingSystem - ECS system for managing the animal stack
 *
 * Handles:
 * 1. Stack physics and wobble propagation
 * 2. Stack positions relative to player base
 * 3. Stack stability and tipping detection
 * 4. Stack offset management
 */

import { Vector3 } from "@babylonjs/core";
import { world } from "../world";
import { GAME_CONFIG } from "../../config";
import { Entity, StackedComponent, WobbleComponent } from "../components";

const { physics, animal: animalConfig, effects } = GAME_CONFIG;

export interface StackingSystemCallbacks {
  onTipping?: (dangerLevel: number, centerOfMass: number) => void;
  onTopple?: () => void;
  onDangerStateChange?: (inDanger: boolean) => void;
}

export interface TippingState {
  isTipping: boolean;
  dangerLevel: number;
  centerOfMass: number;
}

/**
 * Creates a StackedComponent
 */
export function createStackedComponent(
  stackIndex: number,
  stackOffset: number,
  baseEntityId: string
): StackedComponent {
  return {
    stackIndex,
    stackOffset,
    baseEntityId,
  };
}

/**
 * Adds an entity to the stack
 */
export function addToStack(
  entity: Entity,
  stackIndex: number,
  stackOffset: number,
  baseEntityId: string
): void {
  // Remove falling component if present
  if (entity.falling) {
    delete entity.falling;
  }

  // Add stacked component
  entity.stacked = createStackedComponent(stackIndex, stackOffset, baseEntityId);

  // Ensure wobble component exists
  if (!entity.wobble) {
    entity.wobble = {
      offset: 0,
      velocity: 0,
      damping: physics.wobbleDamping,
      springiness: physics.wobbleSpringiness,
    };
  }

  // Reset velocity
  if (entity.velocity) {
    entity.velocity = new Vector3(0, 0, 0);
  }
}

/**
 * Removes an entity from the stack
 */
export function removeFromStack(entity: Entity): void {
  if (!entity.stacked) return;
  delete entity.stacked;
}

/**
 * Applies wobble force to an entity
 */
export function applyWobble(entity: Entity, force: number): void {
  if (!entity.wobble) return;

  // Merged entities are more stable
  const mergeLevel = entity.merged?.mergeLevel || 1;
  const stabilityFactor = 1 / Math.sqrt(mergeLevel);

  entity.wobble.velocity += force * stabilityFactor;
}

/**
 * Propagates wobble force through the stack from a given entity
 */
export function propagateWobbleFromEntity(
  startEntity: Entity,
  force: number,
  direction: "up" | "down" | "both" = "both"
): void {
  const stackedEntities = getStackedEntitiesSorted();
  const startIndex = startEntity.stacked?.stackIndex ?? -1;

  if (startIndex < 0) return;

  let propagatedForce = force;

  if (direction === "up" || direction === "both") {
    // Propagate upward (toward top of stack)
    for (let i = startIndex + 1; i < stackedEntities.length; i++) {
      propagatedForce *= physics.stackStability;
      const heightFactor = 1 + (i - startIndex) * 0.1;
      applyWobble(stackedEntities[i], propagatedForce * heightFactor);
    }
  }

  if (direction === "down" || direction === "both") {
    // Propagate downward (toward base)
    propagatedForce = force;
    for (let i = startIndex - 1; i >= 0; i--) {
      propagatedForce *= physics.stackStability;
      applyWobble(stackedEntities[i], propagatedForce * 0.5);
    }
  }
}

/**
 * Propagates wobble from the base through the entire stack
 */
export function propagateWobbleFromBase(baseEntity: Entity, force: number): void {
  // Apply to base
  applyWobble(baseEntity, force * 0.5);

  // Propagate through stack
  const stackedEntities = getStackedEntitiesSorted();
  let propagatedForce = force;

  for (let i = 0; i < stackedEntities.length; i++) {
    const heightFactor = 1 + i * 0.1;
    propagatedForce *= physics.stackStability;
    applyWobble(stackedEntities[i], propagatedForce * heightFactor);
  }
}

/**
 * Calculates the tipping state of the stack
 */
export function calculateTippingState(baseEntity: Entity | null): TippingState {
  const stackedEntities = getStackedEntitiesSorted();

  if (stackedEntities.length === 0) {
    return { isTipping: false, dangerLevel: 0, centerOfMass: 0 };
  }

  const { tipping } = physics;
  const stackHeight = stackedEntities.length;

  let totalMass = 1;
  let weightedOffset = 0;

  for (let i = 0; i < stackHeight; i++) {
    const entity = stackedEntities[i];
    const mergeLevel = entity.merged?.mergeLevel || 1;
    const wobbleOffset = entity.wobble?.offset || 0;
    const stackOffset = entity.stacked?.stackOffset || 0;

    const massFactor = mergeLevel * (1 + i * tipping.massDistribution * 0.2);
    totalMass += massFactor;
    weightedOffset += (wobbleOffset + stackOffset) * massFactor;
  }

  const centerOfMass = weightedOffset / totalMass;

  const criticalAngle = Math.max(
    tipping.minCriticalAngle,
    tipping.criticalAngleBase - stackHeight * tipping.heightPenalty
  );

  const effectiveAngle = Math.abs(centerOfMass) / (animalConfig.width * 0.5);
  const dangerLevel = effectiveAngle / criticalAngle;

  // Check individual wobble danger
  let maxIndividualDanger = 0;
  for (const entity of stackedEntities) {
    const wobbleOffset = entity.wobble?.offset || 0;
    const individualDanger = Math.abs(wobbleOffset) / (animalConfig.width * 0.6);
    maxIndividualDanger = Math.max(maxIndividualDanger, individualDanger);
  }

  const combinedDanger = Math.max(dangerLevel, maxIndividualDanger * 0.8);

  return {
    isTipping: combinedDanger >= 1,
    dangerLevel: Math.min(1, combinedDanger),
    centerOfMass,
  };
}

/**
 * StackingSystem - Updates all stacked entities
 *
 * @param deltaTime - Time elapsed in milliseconds
 * @param baseEntity - The player base entity
 * @param callbacks - Optional callbacks for stacking events
 */
export function StackingSystem(
  deltaTime: number,
  baseEntity: Entity | null,
  callbacks?: StackingSystemCallbacks
): void {
  if (!baseEntity || !baseEntity.position) return;

  const stackedEntities = getStackedEntitiesSorted();
  const baseX = baseEntity.position.x;
  const baseY = baseEntity.position.y;

  // Update each stacked entity
  for (let i = 0; i < stackedEntities.length; i++) {
    const entity = stackedEntities[i];

    // Update position relative to base
    if (entity.position) {
      // Stack Y position (each animal stacks on top)
      const stackYOffset = (i + 1) * animalConfig.height * 0.008; // Scale for 3D world
      entity.position.y = baseY + stackYOffset;

      // X position follows base + wobble + stack offset
      const wobbleOffset = entity.wobble?.offset || 0;
      const stackOffset = entity.stacked?.stackOffset || 0;
      entity.position.x = baseX + (wobbleOffset + stackOffset) * 0.01;
    }

    // Update wobble physics
    if (entity.wobble) {
      const { wobble } = entity;

      // Merged entities are more stable
      const mergeLevel = entity.merged?.mergeLevel || 1;
      const stabilityBonus = 1 - (mergeLevel - 1) * physics.mergedStabilityBonus;
      const effectiveSpringiness = physics.wobbleSpringiness * stabilityBonus;

      wobble.velocity += -wobble.offset * effectiveSpringiness;
      wobble.velocity *= physics.wobbleDamping;
      wobble.offset += wobble.velocity;

      // Update emotion based on wobble
      if (entity.emotion) {
        entity.emotion.isHeadache =
          Math.abs(wobble.offset) > effects.headacheThreshold * 50;
      }

      // Apply wobble to visual rotation
      if (!entity.modelRotation) {
        entity.modelRotation = new Vector3(0, 0, 0);
      }
      entity.modelRotation.z = wobble.offset * 0.02;
    }

    // Update squish recovery
    if (entity.squish) {
      entity.squish.scaleX += (entity.squish.targetScaleX - entity.squish.scaleX) * entity.squish.recoverySpeed;
      entity.squish.scaleY += (entity.squish.targetScaleY - entity.squish.scaleY) * entity.squish.recoverySpeed;

      if (entity.scale) {
        entity.scale.x = entity.squish.scaleX;
        entity.scale.y = entity.squish.scaleY;
      }
    }
  }

  // Check tipping state
  const tippingState = calculateTippingState(baseEntity);
  const { tipping } = physics;

  const inDanger = tippingState.dangerLevel >= tipping.warningThreshold;
  callbacks?.onDangerStateChange?.(inDanger);

  if (tippingState.dangerLevel >= tipping.dangerThreshold) {
    callbacks?.onTipping?.(tippingState.dangerLevel, tippingState.centerOfMass);
  }

  if (tippingState.isTipping && stackedEntities.length > 0) {
    callbacks?.onTopple?.();
  }
}

/**
 * Query helper - get all stacked entities sorted by stack index
 */
export function getStackedEntitiesSorted(): Entity[] {
  const stacked = Array.from(world.with("stacked"));
  return stacked.sort((a, b) => a.stacked!.stackIndex - b.stacked!.stackIndex);
}

/**
 * Query helper - get stack height
 */
export function getStackHeight(): number {
  return world.with("stacked").size;
}

/**
 * Query helper - get the top entity in the stack
 */
export function getTopOfStack(): Entity | null {
  const sorted = getStackedEntitiesSorted();
  return sorted.length > 0 ? sorted[sorted.length - 1] : null;
}

/**
 * Converts stacked entities to scattering state (for topple)
 */
export function scatterStack(): void {
  const stackedEntities = Array.from(world.with("stacked"));

  for (const entity of stackedEntities) {
    // Remove stacked component
    delete entity.stacked;

    // Add scattering component
    entity.scattering = {
      rotationVelocity: (Math.random() - 0.5) * 0.3,
      startedAt: Date.now(),
    };

    // Give random velocity
    if (entity.velocity) {
      entity.velocity.x = (Math.random() - 0.5) * 1.5;
      entity.velocity.y = -Math.random() * 0.8 - 0.5;
    }

    // Mark as headache
    if (entity.emotion) {
      entity.emotion.isHeadache = true;
    }
  }
}

/**
 * Applies squish effect to an entity
 */
export function squishEntity(entity: Entity): void {
  if (!entity.squish) {
    entity.squish = {
      scaleX: 1,
      scaleY: 1,
      targetScaleX: 1,
      targetScaleY: 1,
      recoverySpeed: 0.12,
    };
  }

  entity.squish.scaleX = 1 + effects.squishFactor;
  entity.squish.scaleY = 1 - effects.squishFactor;
}
