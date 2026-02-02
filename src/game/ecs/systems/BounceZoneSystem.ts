/**
 * BounceZoneSystem - ECS system for managing bounce zones
 *
 * Bounce zones are temporary areas that apply upward force to entities:
 * 1. Created when certain abilities are used (boss shockwave, etc.)
 * 2. Entities entering the zone get bounced upward
 * 3. Zones expire after a set duration
 */

import { Vector3 } from "@babylonjs/core";
import { world } from "../world";
import { Entity, BounceZoneComponent } from "../components";

export interface BounceZoneSystemCallbacks {
  onBounce?: (zone: Entity, bouncedEntity: Entity) => void;
  onExpire?: (zone: Entity) => void;
}

/**
 * Creates a BounceZoneComponent
 */
export function createBounceZoneComponent(
  bounceForce: number,
  duration: number,
  radius: number
): BounceZoneComponent {
  return {
    bounceForce,
    expiresAt: Date.now() + duration,
    radius,
    triggeredBy: [],
  };
}

/**
 * Creates a bounce zone entity at the given position
 */
export function createBounceZone(
  x: number,
  y: number,
  bounceForce: number,
  duration: number,
  radius: number
): Entity {
  const entity: Entity = {
    id: crypto.randomUUID(),
    position: new Vector3(x, y, 0),
    bounceZone: createBounceZoneComponent(bounceForce, duration, radius),
  };

  world.add(entity);
  return entity;
}

/**
 * Checks if an entity is within a bounce zone
 */
function isInZone(entityPos: Vector3, zonePos: Vector3, radius: number): boolean {
  const dx = entityPos.x - zonePos.x;
  const dy = entityPos.y - zonePos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  return dist < radius;
}

/**
 * BounceZoneSystem - Updates all bounce zones and applies bounce forces
 *
 * @param _deltaTime - Time elapsed in milliseconds (unused but kept for system signature consistency)
 * @param callbacks - Optional callbacks for bounce events
 */
export function BounceZoneSystem(
  _deltaTime: number,
  callbacks?: BounceZoneSystemCallbacks
): void {
  const bounceZones = world.with("bounceZone", "position");
  const bouncableEntities = world.with("position", "velocity");
  const zonesToRemove: Entity[] = [];
  const now = Date.now();

  for (const zone of bounceZones) {
    const { bounceZone, position: zonePos } = zone;

    // Check if zone has expired
    if (now >= bounceZone.expiresAt) {
      callbacks?.onExpire?.(zone);
      zonesToRemove.push(zone);
      continue;
    }

    // Check for entities in the zone
    for (const entity of bouncableEntities) {
      // Skip if this zone has already bounced this entity
      if (entity.id && bounceZone.triggeredBy.includes(entity.id)) {
        continue;
      }

      // Skip if entity is the zone itself
      if (entity.id === zone.id) {
        continue;
      }

      // Skip non-falling entities (e.g., stacked, player)
      if (!entity.falling) {
        continue;
      }

      const entityPos = entity.position!;

      if (isInZone(entityPos, zonePos, bounceZone.radius)) {
        // Apply bounce force
        if (entity.velocity) {
          entity.velocity.y = -Math.abs(bounceZone.bounceForce);

          // Add some horizontal scatter
          entity.velocity.x += (Math.random() - 0.5) * bounceZone.bounceForce * 0.3;
        }

        // Mark entity as bounced by this zone
        if (entity.id) {
          bounceZone.triggeredBy.push(entity.id);
        }

        callbacks?.onBounce?.(zone, entity);
      }
    }
  }

  // Remove expired zones
  for (const zone of zonesToRemove) {
    world.remove(zone);
  }
}

/**
 * Creates a shockwave bounce zone (used by boss abilities)
 */
export function createShockwave(
  x: number,
  y: number,
  force: number = 5,
  duration: number = 500,
  radius: number = 2
): Entity {
  return createBounceZone(x, y, force, duration, radius);
}

/**
 * Query helper - get all active bounce zones
 */
export function getActiveBounceZones(): Entity[] {
  const now = Date.now();
  return Array.from(world.with("bounceZone")).filter(
    (e) => e.bounceZone!.expiresAt > now
  );
}

/**
 * Gets the remaining time for a bounce zone
 */
export function getBounceZoneRemainingTime(zone: Entity): number {
  if (!zone.bounceZone) return 0;
  return Math.max(0, zone.bounceZone.expiresAt - Date.now());
}

/**
 * Gets the progress (0-1) of a bounce zone's lifetime
 */
export function getBounceZoneProgress(zone: Entity, totalDuration: number): number {
  const remaining = getBounceZoneRemainingTime(zone);
  return 1 - remaining / totalDuration;
}
