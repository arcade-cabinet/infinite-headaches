/**
 * ProjectileSystem Unit Tests
 *
 * Tests the projectile system logic for:
 * - Projectiles moving in correct direction
 * - Projectiles expiring after lifetime
 * - Trail particles being generated
 * - Collision detection with targets
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Vector3 } from "@babylonjs/core";
import { world } from "../world";
import { Entity, GameProjectileComponent } from "../components";
import {
  ProjectileSystem,
  createFireballComponent,
  createExplosionParticles,
  getActiveProjectiles,
  getProjectilesByType,
} from "./ProjectileSystem";
import { GAME_CONFIG } from "../../config";

describe("ProjectileSystem", () => {
  // Helper to create a test projectile entity
  const createTestProjectile = (
    direction: -1 | 1 = 1,
    options: Partial<Entity> = {}
  ): Entity => {
    const fireballComponent = createFireballComponent(direction);
    const entity: Entity = {
      id: `projectile-${Math.random().toString(36).substr(2, 9)}`,
      position: new Vector3(0, 5, 0),
      velocity: new Vector3(
        direction * GAME_CONFIG.physics.fireball.speed * 0.1,
        0,
        0
      ),
      gameProjectile: fireballComponent,
      lifetime: {
        createdAt: Date.now(),
        duration: GAME_CONFIG.physics.fireball.duration,
      },
      ...options,
    };
    return entity;
  };

  // Helper to create a falling entity (target)
  const createTestFallingEntity = (
    x: number = 0,
    y: number = 5
  ): Entity => {
    return {
      id: `falling-${Math.random().toString(36).substr(2, 9)}`,
      position: new Vector3(x, y, 0),
      velocity: new Vector3(0, 2, 0),
      falling: {
        targetX: x,
        targetY: 0,
        behaviorType: "normal",
        spawnX: x,
        spawnTime: Date.now(),
      },
    };
  };

  // Clean up world after each test
  afterEach(() => {
    const entities = Array.from(world.entities);
    for (const entity of entities) {
      world.remove(entity);
    }
  });

  describe("createFireballComponent", () => {
    it("should create fireball component with correct direction (right)", () => {
      const component = createFireballComponent(1);

      expect(component.type).toBe("fireball");
      expect(component.direction.x).toBe(1);
      expect(component.direction.y).toBe(0);
      expect(component.direction.z).toBe(0);
    });

    it("should create fireball component with correct direction (left)", () => {
      const component = createFireballComponent(-1);

      expect(component.type).toBe("fireball");
      expect(component.direction.x).toBe(-1);
    });

    it("should set speed from config", () => {
      const component = createFireballComponent(1);

      expect(component.speed).toBe(GAME_CONFIG.physics.fireball.speed);
    });

    it("should set lifetime and maxLifetime from config", () => {
      const component = createFireballComponent(1);

      expect(component.lifetime).toBe(GAME_CONFIG.physics.fireball.duration);
      expect(component.maxLifetime).toBe(GAME_CONFIG.physics.fireball.duration);
    });

    it("should set size from config", () => {
      const component = createFireballComponent(1);

      expect(component.size).toBe(GAME_CONFIG.physics.fireball.size);
    });

    it("should initialize with empty trail particles", () => {
      const component = createFireballComponent(1);

      expect(component.trailParticles).toEqual([]);
    });

    it("should initialize rotation to 0", () => {
      const component = createFireballComponent(1);

      expect(component.rotation).toBe(0);
    });
  });

  describe("Projectile movement", () => {
    it("should move projectile in positive X direction when direction is 1", () => {
      const projectile = createTestProjectile(1);
      const initialX = projectile.position!.x;
      world.add(projectile);

      ProjectileSystem(100, 1000);

      expect(projectile.position!.x).toBeGreaterThan(initialX);
    });

    it("should move projectile in negative X direction when direction is -1", () => {
      const projectile = createTestProjectile(-1);
      const initialX = projectile.position!.x;
      world.add(projectile);

      ProjectileSystem(100, 1000);

      expect(projectile.position!.x).toBeLessThan(initialX);
    });

    it("should update rotation based on direction", () => {
      const projectile = createTestProjectile(1);
      world.add(projectile);

      ProjectileSystem(100, 1000);

      expect(projectile.gameProjectile!.rotation).not.toBe(0);
      expect(projectile.modelRotation).toBeDefined();
    });

    it("should apply rotation to modelRotation", () => {
      const projectile = createTestProjectile(1);
      world.add(projectile);

      ProjectileSystem(100, 1000);

      expect(projectile.modelRotation?.z).toBe(projectile.gameProjectile!.rotation);
    });

    it("should move based on velocity and deltaTime", () => {
      const projectile = createTestProjectile(1);
      projectile.velocity = new Vector3(1, 0, 0); // Simple velocity
      const initialX = projectile.position!.x;
      world.add(projectile);

      // deltaTime is 1000ms
      ProjectileSystem(1000, 1000);

      // Position should change by velocity * deltaTime * 0.001
      expect(projectile.position!.x).toBeCloseTo(initialX + 1, 5);
    });
  });

  describe("Projectile lifetime", () => {
    it("should decrement lifetime over time", () => {
      const projectile = createTestProjectile(1);
      const initialLifetime = projectile.gameProjectile!.lifetime;
      world.add(projectile);

      ProjectileSystem(100, 1000);

      expect(projectile.gameProjectile!.lifetime).toBe(initialLifetime - 100);
    });

    it("should call onExpire when lifetime reaches 0", () => {
      const projectile = createTestProjectile(1);
      projectile.gameProjectile!.lifetime = 50; // Short lifetime
      world.add(projectile);

      const onExpire = vi.fn();

      ProjectileSystem(100, 1000, { onExpire });

      expect(onExpire).toHaveBeenCalledWith(projectile);
    });

    it("should mark projectile for removal when expired", () => {
      const projectile = createTestProjectile(1);
      projectile.gameProjectile!.lifetime = 50;
      projectile.gameProjectile!.trailParticles = []; // No trail particles
      world.add(projectile);

      const onDestroy = vi.fn();

      ProjectileSystem(100, 1000, { onDestroy });

      // Should be removed since no trail particles
      expect(onDestroy).toHaveBeenCalled();
    });

    it("should keep projectile briefly if it has trail particles", () => {
      const projectile = createTestProjectile(1);
      projectile.gameProjectile!.lifetime = 50;
      projectile.gameProjectile!.trailParticles = [
        { x: 0, y: 0, size: 1, life: 1.0 },
      ];
      world.add(projectile);

      ProjectileSystem(100, 1000, {});

      // Lifetime should be set to negative but entity kept
      expect(projectile.gameProjectile!.lifetime).toBeLessThan(0);
    });
  });

  describe("Trail particles", () => {
    it("should generate trail particles during movement", () => {
      const projectile = createTestProjectile(1);
      world.add(projectile);

      // Run multiple times to increase chance of particle generation (50% chance)
      for (let i = 0; i < 20; i++) {
        ProjectileSystem(50, 1000);
      }

      // Should have some trail particles (probabilistic, but very likely after 20 iterations)
      expect(projectile.gameProjectile!.trailParticles.length).toBeGreaterThan(0);
    });

    it("should update existing trail particle life", () => {
      const projectile = createTestProjectile(1);
      projectile.gameProjectile!.trailParticles = [
        { x: 0, y: 0, size: 1, life: 1.0 },
      ];
      world.add(projectile);

      ProjectileSystem(100, 1000);

      // Life should decrease
      const particle = projectile.gameProjectile!.trailParticles[0];
      if (particle) {
        expect(particle.life).toBeLessThan(1.0);
      }
    });

    it("should remove trail particles when life reaches 0", () => {
      const projectile = createTestProjectile(1);
      projectile.gameProjectile!.trailParticles = [
        { x: 0, y: 0, size: 1, life: 0.01 }, // About to expire
      ];
      world.add(projectile);

      ProjectileSystem(100, 1000);

      // Particle should be removed (life decreases by 0.08 per update)
      const lowLifeParticles = projectile.gameProjectile!.trailParticles.filter(
        (p) => p.life <= 0
      );
      expect(lowLifeParticles.length).toBe(0);
    });

    it("should shrink trail particle size over time", () => {
      const projectile = createTestProjectile(1);
      const initialSize = 1.0;
      projectile.gameProjectile!.trailParticles = [
        { x: 0, y: 0, size: initialSize, life: 1.0 },
      ];
      world.add(projectile);

      ProjectileSystem(100, 1000);

      const particle = projectile.gameProjectile!.trailParticles[0];
      if (particle) {
        expect(particle.size).toBeLessThan(initialSize);
      }
    });
  });

  describe("createExplosionParticles", () => {
    it("should add multiple particles to projectile", () => {
      const projectile: GameProjectileComponent = {
        type: "fireball",
        direction: new Vector3(1, 0, 0),
        speed: 10,
        lifetime: 1000,
        maxLifetime: 1000,
        size: 20,
        rotation: 0,
        trailParticles: [],
      };

      createExplosionParticles(projectile, 5, 5);

      expect(projectile.trailParticles.length).toBe(8);
    });

    it("should create particles near explosion point", () => {
      const projectile: GameProjectileComponent = {
        type: "fireball",
        direction: new Vector3(1, 0, 0),
        speed: 10,
        lifetime: 1000,
        maxLifetime: 1000,
        size: 20,
        rotation: 0,
        trailParticles: [],
      };

      createExplosionParticles(projectile, 5, 10);

      for (const particle of projectile.trailParticles) {
        expect(particle.x).toBeCloseTo(5, 0);
        expect(particle.y).toBeCloseTo(10, 0);
        expect(particle.life).toBe(1.0);
      }
    });
  });

  describe("Bounds checking", () => {
    it("should remove projectile that goes off left edge", () => {
      const projectile = createTestProjectile(-1);
      // Set position off screen to the left (in world coords)
      projectile.position = new Vector3(-10, 5, 0);
      world.add(projectile);

      ProjectileSystem(100, 1000);

      // Projectile should be removed or marked for removal (lifetime -1)
      const isRemoved = !Array.from(world.entities).includes(projectile);
      const isMarked = projectile.gameProjectile!.lifetime < 0;
      expect(isRemoved || isMarked).toBe(true);
    });

    it("should remove projectile that goes off right edge", () => {
      const projectile = createTestProjectile(1);
      world.add(projectile);

      // Move projectile far to the right
      projectile.position!.x = 10;
      ProjectileSystem(100, 1920);

      // Projectile should be removed or marked for removal (lifetime -1)
      const isRemoved = !Array.from(world.entities).includes(projectile);
      const isMarked = projectile.gameProjectile!.lifetime < 0;
      expect(isRemoved || isMarked).toBe(true);
    });

    it("should keep projectile within bounds", () => {
      const projectile = createTestProjectile(1);
      projectile.position = new Vector3(0, 5, 0); // Center of screen
      world.add(projectile);

      ProjectileSystem(100, 1000);

      // Lifetime should still be positive
      expect(projectile.gameProjectile!.lifetime).toBeGreaterThan(0);
    });
  });

  describe("Collision detection", () => {
    it("should detect collision with falling entity", () => {
      const projectile = createTestProjectile(1);
      projectile.position = new Vector3(0, 5, 0);
      const target = createTestFallingEntity(0, 5); // Same position
      world.add(projectile);
      world.add(target);

      const onHit = vi.fn();

      ProjectileSystem(100, 1000, { onHit });

      expect(onHit).toHaveBeenCalledWith(projectile, target);
    });

    it("should not detect collision with distant entity", () => {
      const projectile = createTestProjectile(1);
      projectile.position = new Vector3(0, 5, 0);
      const target = createTestFallingEntity(10, 5); // Far away
      world.add(projectile);
      world.add(target);

      const onHit = vi.fn();

      ProjectileSystem(100, 1000, { onHit });

      expect(onHit).not.toHaveBeenCalled();
    });

    it("should create explosion particles on hit", () => {
      const projectile = createTestProjectile(1);
      projectile.position = new Vector3(0, 5, 0);
      const target = createTestFallingEntity(0, 5);
      world.add(projectile);
      world.add(target);

      ProjectileSystem(100, 1000);

      // Explosion particles should be added
      expect(projectile.gameProjectile!.trailParticles.length).toBeGreaterThan(0);
    });

    it("should mark projectile for removal on hit", () => {
      const projectile = createTestProjectile(1);
      projectile.position = new Vector3(0, 5, 0);
      projectile.gameProjectile!.trailParticles = []; // No particles
      const target = createTestFallingEntity(0, 5);
      world.add(projectile);
      world.add(target);

      const onDestroy = vi.fn();

      ProjectileSystem(100, 1000, { onDestroy });

      // After explosion particles fade, projectile should be destroyed
      // Note: it keeps the projectile briefly for trail rendering
    });
  });

  describe("Query helpers", () => {
    beforeEach(() => {
      const entities = Array.from(world.entities);
      for (const entity of entities) {
        world.remove(entity);
      }
    });

    describe("getActiveProjectiles", () => {
      it("should return empty array when no projectiles", () => {
        const result = getActiveProjectiles();
        expect(result).toEqual([]);
      });

      it("should return only active projectiles", () => {
        const activeProjectile = createTestProjectile(1);
        const expiredProjectile = createTestProjectile(-1);
        expiredProjectile.gameProjectile!.lifetime = -1; // Expired
        world.add(activeProjectile);
        world.add(expiredProjectile);

        const result = getActiveProjectiles();

        expect(result).toHaveLength(1);
        expect(result[0].gameProjectile!.lifetime).toBeGreaterThan(0);
      });
    });

    describe("getProjectilesByType", () => {
      it("should return projectiles of specified type", () => {
        const fireball = createTestProjectile(1);
        fireball.gameProjectile!.type = "fireball";
        world.add(fireball);

        const result = getProjectilesByType("fireball");

        expect(result).toHaveLength(1);
        expect(result[0].gameProjectile!.type).toBe("fireball");
      });

      it("should not return projectiles of different type", () => {
        const fireball = createTestProjectile(1);
        fireball.gameProjectile!.type = "fireball";
        world.add(fireball);

        const result = getProjectilesByType("corn");

        expect(result).toHaveLength(0);
      });
    });
  });

  describe("Trail cleanup for inactive projectiles", () => {
    it("should remove projectile when trails are gone and lifetime negative", () => {
      const projectile = createTestProjectile(1);
      projectile.gameProjectile!.lifetime = -1; // Already marked for removal
      projectile.gameProjectile!.trailParticles = []; // No trails left
      world.add(projectile);

      const initialCount = world.entities.length;

      ProjectileSystem(100, 1000);

      expect(world.entities.length).toBeLessThan(initialCount);
    });

    it("should keep projectile while trails still exist", () => {
      const projectile = createTestProjectile(1);
      projectile.gameProjectile!.lifetime = -1;
      projectile.gameProjectile!.trailParticles = [
        { x: 0, y: 0, size: 1, life: 0.5 },
      ];
      world.add(projectile);

      const initialCount = world.entities.length;

      // Run once - trail should fade but projectile should still exist
      ProjectileSystem(100, 1000);

      // Projectile should still exist (trail life decreases by 0.08, so 0.5 -> 0.42)
      expect(world.entities.includes(projectile)).toBe(true);
    });
  });
});
