/**
 * ProjectileSystem - ECS system for handling projectiles
 *
 * Manages projectiles (fireballs, corn, poop, etc.):
 * 1. Movement based on direction and speed
 * 2. Lifetime tracking
 * 3. Collision detection with falling entities
 * 4. Trail particle effects
 */

import { Vector3 } from "@babylonjs/core";
import { world } from "../world";
import { GAME_CONFIG } from "../../config";
import { Entity, GameProjectileComponent } from "../components";

const { physics, effects } = GAME_CONFIG;

export interface ProjectileSystemCallbacks {
  onHit?: (projectile: Entity, target: Entity) => void;
  onExpire?: (projectile: Entity) => void;
  onDestroy?: (projectile: Entity) => void;
}

/**
 * Creates a GameProjectileComponent for a fireball
 */
export function createFireballComponent(direction: -1 | 1): GameProjectileComponent {
  return {
    type: "fireball",
    direction: new Vector3(direction, 0, 0),
    speed: physics.fireball.speed,
    lifetime: physics.fireball.duration,
    maxLifetime: physics.fireball.duration,
    size: physics.fireball.size,
    rotation: 0,
    trailParticles: [],
  };
}

/**
 * Creates a fireball entity at the given position
 */
export function createFireball(x: number, y: number, direction: -1 | 1): Entity {
  const worldY = 5 - (y / window.innerHeight) * 10; // Convert screen to world coords
  const worldX = (x / window.innerWidth - 0.5) * 10;

  return {
    id: crypto.randomUUID(),
    position: new Vector3(worldX, worldY, 0),
    velocity: new Vector3(direction * physics.fireball.speed * 0.1, (Math.random() - 0.5) * 0.02, 0),
    gameProjectile: createFireballComponent(direction),
    lifetime: { createdAt: Date.now(), duration: physics.fireball.duration },
    tag: { type: "powerup", subtype: undefined }, // Use powerup tag for now
  };
}

/**
 * Spawns a fireball from an entity position
 */
export function spawnFireballsFrom(entity: Entity): Entity[] {
  if (!entity.position) return [];

  const x = entity.position.x;
  const y = entity.position.y;

  // Spawn two fireballs going left and right
  const leftFireball: Entity = {
    id: crypto.randomUUID(),
    position: new Vector3(x, y, 0),
    velocity: new Vector3(-physics.fireball.speed * 0.1, (Math.random() - 0.5) * 0.02, 0),
    gameProjectile: createFireballComponent(-1),
    lifetime: { createdAt: Date.now(), duration: physics.fireball.duration },
  };

  const rightFireball: Entity = {
    id: crypto.randomUUID(),
    position: new Vector3(x, y, 0),
    velocity: new Vector3(physics.fireball.speed * 0.1, (Math.random() - 0.5) * 0.02, 0),
    gameProjectile: createFireballComponent(1),
    lifetime: { createdAt: Date.now(), duration: physics.fireball.duration },
  };

  world.add(leftFireball);
  world.add(rightFireball);

  return [leftFireball, rightFireball];
}

/**
 * Updates trail particles for a projectile
 */
function updateTrailParticles(projectile: GameProjectileComponent, x: number, y: number): void {
  // Add new trail particle
  if (Math.random() > 0.5) {
    projectile.trailParticles.push({
      x: x - projectile.direction.x * projectile.speed * 0.05 + (Math.random() - 0.5) * 0.1,
      y: y + (Math.random() - 0.5) * 0.1,
      size: projectile.size * 0.01 * (0.3 + Math.random() * 0.3),
      life: 1.0,
    });
  }

  // Update existing particles
  for (let i = projectile.trailParticles.length - 1; i >= 0; i--) {
    const particle = projectile.trailParticles[i];
    particle.life -= 0.08;
    particle.size *= 0.95;

    if (particle.life <= 0) {
      projectile.trailParticles.splice(i, 1);
    }
  }
}

/**
 * Checks collision between projectile and target
 */
function checkCollision(
  projectilePos: Vector3,
  projectileSize: number,
  targetPos: Vector3,
  targetRadius: number
): boolean {
  const dx = projectilePos.x - targetPos.x;
  const dy = projectilePos.y - targetPos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  return dist < projectileSize * 0.05 + targetRadius;
}

/**
 * Creates explosion particles when a projectile is destroyed
 */
export function createExplosionParticles(projectile: GameProjectileComponent, x: number, y: number): void {
  for (let i = 0; i < 8; i++) {
    projectile.trailParticles.push({
      x: x + (Math.random() - 0.5) * 0.2,
      y: y + (Math.random() - 0.5) * 0.2,
      size: projectile.size * 0.01 * (0.4 + Math.random() * 0.4),
      life: 1.0,
    });
  }
}

/**
 * ProjectileSystem - Updates all projectile entities
 *
 * @param deltaTime - Time elapsed in milliseconds
 * @param screenWidth - Screen width for bounds checking
 * @param callbacks - Optional callbacks for projectile events
 */
export function ProjectileSystem(
  deltaTime: number,
  screenWidth: number,
  callbacks?: ProjectileSystemCallbacks
): void {
  const projectileEntities = world.with("gameProjectile", "position", "velocity");
  const fallingEntities = world.with("falling", "position");
  const entitiesToRemove: Entity[] = [];

  for (const entity of projectileEntities) {
    const { gameProjectile, position, velocity } = entity;

    // Update lifetime
    gameProjectile.lifetime -= deltaTime;

    // Check if expired
    if (gameProjectile.lifetime <= 0) {
      callbacks?.onExpire?.(entity);
      entitiesToRemove.push(entity);
      continue;
    }

    // Move projectile
    position.addInPlace(velocity.scale(deltaTime * 0.001));

    // Update rotation
    gameProjectile.rotation += 0.2 * Math.sign(velocity.x);

    // Update trail particles
    updateTrailParticles(gameProjectile, position.x, position.y);

    // Apply rotation to model
    if (!entity.modelRotation) {
      entity.modelRotation = new Vector3(0, 0, 0);
    }
    entity.modelRotation.z = gameProjectile.rotation;

    // Check bounds (convert world coords to screen for comparison)
    const screenX = (position.x / 10 + 0.5) * screenWidth;
    if (screenX < -50 || screenX > screenWidth + 50) {
      entitiesToRemove.push(entity);
      continue;
    }

    // Check collisions with falling entities
    for (const target of fallingEntities) {
      if (!target.position) continue;

      const targetRadius = 0.5; // Approximate animal radius in world units

      if (checkCollision(position, gameProjectile.size, target.position, targetRadius)) {
        // Hit!
        createExplosionParticles(gameProjectile, position.x, position.y);
        callbacks?.onHit?.(entity, target);

        // Mark both for removal
        entitiesToRemove.push(entity);
        break;
      }
    }
  }

  // Remove expired/hit projectiles
  for (const entity of entitiesToRemove) {
    // Keep entity alive briefly if it has trail particles to render
    if (entity.gameProjectile && entity.gameProjectile.trailParticles.length > 0) {
      // Just mark as inactive by setting lifetime negative
      entity.gameProjectile.lifetime = -1;
    } else {
      callbacks?.onDestroy?.(entity);
      world.remove(entity);
    }
  }

  // Clean up projectiles that are only showing trails
  const trailOnlyEntities = world.with("gameProjectile");
  for (const entity of trailOnlyEntities) {
    if (entity.gameProjectile!.lifetime < 0 && entity.gameProjectile!.trailParticles.length === 0) {
      world.remove(entity);
    }
  }
}

/**
 * Query helper - get all active projectiles
 */
export function getActiveProjectiles(): Entity[] {
  return Array.from(world.with("gameProjectile")).filter(
    (e) => e.gameProjectile!.lifetime > 0
  );
}

/**
 * Query helper - get projectiles by type
 */
export function getProjectilesByType(type: GameProjectileComponent["type"]): Entity[] {
  return Array.from(world.with("gameProjectile")).filter(
    (e) => e.gameProjectile!.type === type
  );
}
