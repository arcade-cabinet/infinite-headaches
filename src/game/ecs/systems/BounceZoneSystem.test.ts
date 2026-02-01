/**
 * BounceZoneSystem Unit Tests
 *
 * Tests the bounce zone system logic for:
 * - Bounce zones applying force to entities
 * - Expired zones being cleaned up
 * - Entities only bouncing once per zone
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Vector3 } from "@babylonjs/core";
import { world } from "../world";
import { Entity } from "../components";
import {
  BounceZoneSystem,
  createBounceZoneComponent,
  createBounceZone,
  createShockwave,
  getActiveBounceZones,
  getBounceZoneRemainingTime,
  getBounceZoneProgress,
} from "./BounceZoneSystem";

describe("BounceZoneSystem", () => {
  // Helper to create a bounce zone entity directly
  const createTestBounceZone = (
    x: number = 0,
    y: number = 0,
    force: number = 5,
    duration: number = 1000,
    radius: number = 2
  ): Entity => {
    return {
      id: `zone-${Math.random().toString(36).substr(2, 9)}`,
      position: new Vector3(x, y, 0),
      bounceZone: createBounceZoneComponent(force, duration, radius),
    };
  };

  // Helper to create a bounceable entity
  const createTestBounceable = (
    x: number = 0,
    y: number = 0,
    isFalling: boolean = true
  ): Entity => {
    const entity: Entity = {
      id: `entity-${Math.random().toString(36).substr(2, 9)}`,
      position: new Vector3(x, y, 0),
      velocity: new Vector3(0, 2, 0),
    };

    if (isFalling) {
      entity.falling = {
        targetX: x,
        targetY: 0,
        behaviorType: "normal",
        spawnX: x,
        spawnTime: Date.now(),
      };
    }

    return entity;
  };

  // Clean up world after each test
  afterEach(() => {
    const entities = Array.from(world.entities);
    for (const entity of entities) {
      world.remove(entity);
    }
  });

  describe("createBounceZoneComponent", () => {
    it("should create component with correct bounce force", () => {
      const component = createBounceZoneComponent(5, 1000, 2);

      expect(component.bounceForce).toBe(5);
    });

    it("should set expiration time correctly", () => {
      const before = Date.now();
      const component = createBounceZoneComponent(5, 1000, 2);
      const after = Date.now();

      expect(component.expiresAt).toBeGreaterThanOrEqual(before + 1000);
      expect(component.expiresAt).toBeLessThanOrEqual(after + 1000);
    });

    it("should set radius correctly", () => {
      const component = createBounceZoneComponent(5, 1000, 3);

      expect(component.radius).toBe(3);
    });

    it("should initialize with empty triggeredBy array", () => {
      const component = createBounceZoneComponent(5, 1000, 2);

      expect(component.triggeredBy).toEqual([]);
    });
  });

  describe("createBounceZone", () => {
    it("should create and add zone to world", () => {
      const initialCount = world.entities.size;

      createBounceZone(0, 0, 5, 1000, 2);

      expect(world.entities.size).toBe(initialCount + 1);
    });

    it("should set position correctly", () => {
      const zone = createBounceZone(5, 10, 5, 1000, 2);

      expect(zone.position?.x).toBe(5);
      expect(zone.position?.y).toBe(10);
    });

    it("should return the created entity", () => {
      const zone = createBounceZone(0, 0, 5, 1000, 2);

      expect(zone.id).toBeDefined();
      expect(zone.bounceZone).toBeDefined();
    });
  });

  describe("createShockwave", () => {
    it("should create bounce zone with default values", () => {
      const zone = createShockwave(0, 0);

      expect(zone.bounceZone?.bounceForce).toBe(5);
      expect(zone.bounceZone?.radius).toBe(2);
    });

    it("should allow custom values", () => {
      const zone = createShockwave(0, 0, 10, 2000, 5);

      expect(zone.bounceZone?.bounceForce).toBe(10);
      expect(zone.bounceZone?.radius).toBe(5);
    });
  });

  describe("Bounce zones apply force", () => {
    it("should apply upward bounce force to entity in zone", () => {
      const zone = createTestBounceZone(0, 0, 5, 5000, 2);
      const entity = createTestBounceable(0, 0, true);
      world.add(zone);
      world.add(entity);

      BounceZoneSystem(100);

      // Y velocity should be negative (upward in this system)
      expect(entity.velocity!.y).toBe(-5);
    });

    it("should add horizontal scatter to bounced entity", () => {
      const zone = createTestBounceZone(0, 0, 5, 5000, 2);
      const entity = createTestBounceable(0, 0, true);
      entity.velocity = new Vector3(0, 0, 0);
      world.add(zone);
      world.add(entity);

      // Run multiple times to test randomness
      let hadHorizontalVelocity = false;
      for (let i = 0; i < 10; i++) {
        // Reset for next test
        entity.velocity = new Vector3(0, 0, 0);
        zone.bounceZone!.triggeredBy = [];

        BounceZoneSystem(100);

        if (entity.velocity!.x !== 0) {
          hadHorizontalVelocity = true;
          break;
        }
      }

      // Horizontal scatter is random, should happen at least once in 10 tries
      expect(hadHorizontalVelocity || entity.velocity!.x !== 0).toBe(true);
    });

    it("should not bounce entity outside zone radius", () => {
      const zone = createTestBounceZone(0, 0, 5, 5000, 1);
      const entity = createTestBounceable(5, 5, true); // Outside radius
      const originalVelocityY = entity.velocity!.y;
      world.add(zone);
      world.add(entity);

      BounceZoneSystem(100);

      expect(entity.velocity!.y).toBe(originalVelocityY);
    });

    it("should call onBounce callback when entity bounces", () => {
      const zone = createTestBounceZone(0, 0, 5, 5000, 2);
      const entity = createTestBounceable(0, 0, true);
      world.add(zone);
      world.add(entity);

      const onBounce = vi.fn();

      BounceZoneSystem(100, { onBounce });

      expect(onBounce).toHaveBeenCalledWith(zone, entity);
    });

    it("should apply bounce force as negative absolute value", () => {
      const zone = createTestBounceZone(0, 0, 10, 5000, 2);
      const entity = createTestBounceable(0, 0, true);
      world.add(zone);
      world.add(entity);

      BounceZoneSystem(100);

      // Should always be negative (upward)
      expect(entity.velocity!.y).toBe(-10);
    });
  });

  describe("Entities bounce only once per zone", () => {
    it("should add entity ID to triggeredBy after bounce", () => {
      const zone = createTestBounceZone(0, 0, 5, 5000, 2);
      const entity = createTestBounceable(0, 0, true);
      world.add(zone);
      world.add(entity);

      BounceZoneSystem(100);

      expect(zone.bounceZone!.triggeredBy).toContain(entity.id);
    });

    it("should not bounce same entity twice", () => {
      const zone = createTestBounceZone(0, 0, 5, 5000, 2);
      const entity = createTestBounceable(0, 0, true);
      world.add(zone);
      world.add(entity);

      // First bounce
      BounceZoneSystem(100);
      expect(entity.velocity!.y).toBe(-5);

      // Reset velocity to test second bounce attempt
      entity.velocity!.y = 2;

      // Second bounce attempt - should not bounce
      BounceZoneSystem(100);
      expect(entity.velocity!.y).toBe(2);
    });

    it("should bounce different entities independently", () => {
      const zone = createTestBounceZone(0, 0, 5, 5000, 2);
      const entity1 = createTestBounceable(0, 0, true);
      const entity2 = createTestBounceable(0.5, 0.5, true);
      world.add(zone);
      world.add(entity1);
      world.add(entity2);

      BounceZoneSystem(100);

      expect(entity1.velocity!.y).toBe(-5);
      expect(entity2.velocity!.y).toBe(-5);
      expect(zone.bounceZone!.triggeredBy).toHaveLength(2);
    });
  });

  describe("Zone expiration and cleanup", () => {
    it("should remove zone when expired", () => {
      const zone: Entity = {
        id: "test-zone",
        position: new Vector3(0, 0, 0),
        bounceZone: {
          bounceForce: 5,
          expiresAt: Date.now() - 100, // Already expired
          radius: 2,
          triggeredBy: [],
        },
      };
      world.add(zone);

      BounceZoneSystem(100);

      expect(world.entities.has(zone)).toBe(false);
    });

    it("should call onExpire callback when zone expires", () => {
      const zone: Entity = {
        id: "test-zone",
        position: new Vector3(0, 0, 0),
        bounceZone: {
          bounceForce: 5,
          expiresAt: Date.now() - 100,
          radius: 2,
          triggeredBy: [],
        },
      };
      world.add(zone);

      const onExpire = vi.fn();

      BounceZoneSystem(100, { onExpire });

      expect(onExpire).toHaveBeenCalledWith(zone);
    });

    it("should not remove zone that has not expired", () => {
      const zone = createTestBounceZone(0, 0, 5, 10000, 2); // 10 second duration
      world.add(zone);

      BounceZoneSystem(100);

      expect(world.entities.has(zone)).toBe(true);
    });

    it("should skip expired zones when checking for bounces", () => {
      const zone: Entity = {
        id: "test-zone",
        position: new Vector3(0, 0, 0),
        bounceZone: {
          bounceForce: 5,
          expiresAt: Date.now() - 100,
          radius: 2,
          triggeredBy: [],
        },
      };
      const entity = createTestBounceable(0, 0, true);
      const originalVelocity = entity.velocity!.y;
      world.add(zone);
      world.add(entity);

      BounceZoneSystem(100);

      // Entity should not have been bounced
      expect(entity.velocity!.y).toBe(originalVelocity);
    });
  });

  describe("Non-falling entities are not bounced", () => {
    it("should not bounce entities without falling component", () => {
      const zone = createTestBounceZone(0, 0, 5, 5000, 2);
      const entity = createTestBounceable(0, 0, false); // No falling component
      const originalVelocity = entity.velocity!.y;
      world.add(zone);
      world.add(entity);

      BounceZoneSystem(100);

      expect(entity.velocity!.y).toBe(originalVelocity);
    });

    it("should not bounce the zone entity itself", () => {
      // Create a zone that also has velocity (edge case)
      const zone: Entity = {
        id: "zone-with-velocity",
        position: new Vector3(0, 0, 0),
        velocity: new Vector3(0, 0, 0),
        bounceZone: createBounceZoneComponent(5, 5000, 2),
        falling: {
          targetX: 0,
          targetY: 0,
          behaviorType: "normal",
          spawnX: 0,
          spawnTime: Date.now(),
        },
      };
      world.add(zone);

      BounceZoneSystem(100);

      // Zone should not bounce itself
      expect(zone.velocity!.y).toBe(0);
    });
  });

  describe("Query helpers", () => {
    beforeEach(() => {
      const entities = Array.from(world.entities);
      for (const entity of entities) {
        world.remove(entity);
      }
    });

    describe("getActiveBounceZones", () => {
      it("should return empty array when no zones", () => {
        const result = getActiveBounceZones();
        expect(result).toEqual([]);
      });

      it("should return only active zones", () => {
        const activeZone = createTestBounceZone(0, 0, 5, 10000, 2);
        const expiredZone: Entity = {
          id: "expired-zone",
          position: new Vector3(0, 0, 0),
          bounceZone: {
            bounceForce: 5,
            expiresAt: Date.now() - 100,
            radius: 2,
            triggeredBy: [],
          },
        };
        world.add(activeZone);
        world.add(expiredZone);

        const result = getActiveBounceZones();

        expect(result).toHaveLength(1);
        expect(result[0]).toBe(activeZone);
      });
    });

    describe("getBounceZoneRemainingTime", () => {
      it("should return remaining time for active zone", () => {
        const zone = createTestBounceZone(0, 0, 5, 10000, 2);

        const remaining = getBounceZoneRemainingTime(zone);

        expect(remaining).toBeGreaterThan(9000);
        expect(remaining).toBeLessThanOrEqual(10000);
      });

      it("should return 0 for expired zone", () => {
        const zone: Entity = {
          id: "expired-zone",
          bounceZone: {
            bounceForce: 5,
            expiresAt: Date.now() - 100,
            radius: 2,
            triggeredBy: [],
          },
        };

        const remaining = getBounceZoneRemainingTime(zone);

        expect(remaining).toBe(0);
      });

      it("should return 0 for entity without bounceZone", () => {
        const entity: Entity = { id: "no-zone" };

        const remaining = getBounceZoneRemainingTime(entity);

        expect(remaining).toBe(0);
      });
    });

    describe("getBounceZoneProgress", () => {
      it("should return 0 for new zone", () => {
        const zone = createTestBounceZone(0, 0, 5, 1000, 2);

        const progress = getBounceZoneProgress(zone, 1000);

        expect(progress).toBeCloseTo(0, 1);
      });

      it("should return 1 for expired zone", () => {
        const zone: Entity = {
          id: "expired-zone",
          bounceZone: {
            bounceForce: 5,
            expiresAt: Date.now() - 100,
            radius: 2,
            triggeredBy: [],
          },
        };

        const progress = getBounceZoneProgress(zone, 1000);

        expect(progress).toBe(1);
      });

      it("should return intermediate value for partially elapsed zone", () => {
        const zone: Entity = {
          id: "partial-zone",
          bounceZone: {
            bounceForce: 5,
            expiresAt: Date.now() + 500, // 500ms remaining of 1000ms total
            radius: 2,
            triggeredBy: [],
          },
        };

        const progress = getBounceZoneProgress(zone, 1000);

        expect(progress).toBeCloseTo(0.5, 1);
      });
    });
  });

  describe("Multiple zones interaction", () => {
    it("should allow entity to be bounced by different zones", () => {
      const zone1 = createTestBounceZone(0, 0, 3, 5000, 2);
      const zone2 = createTestBounceZone(3, 0, 3, 5000, 2);
      const entity = createTestBounceable(0, 0, true);
      world.add(zone1);
      world.add(zone2);
      world.add(entity);

      // First bounce by zone1
      BounceZoneSystem(100);
      expect(entity.velocity!.y).toBe(-3);

      // Move entity to zone2
      entity.position!.x = 3;
      entity.velocity!.y = 2;

      // Second bounce by zone2
      BounceZoneSystem(100);
      expect(entity.velocity!.y).toBe(-3);

      // Both zones should have triggered
      expect(zone1.bounceZone!.triggeredBy).toContain(entity.id);
      expect(zone2.bounceZone!.triggeredBy).toContain(entity.id);
    });
  });

  describe("Edge cases", () => {
    it("should handle entity without ID gracefully", () => {
      const zone = createTestBounceZone(0, 0, 5, 5000, 2);
      const entity: Entity = {
        position: new Vector3(0, 0, 0),
        velocity: new Vector3(0, 2, 0),
        falling: {
          targetX: 0,
          targetY: 0,
          behaviorType: "normal",
          spawnX: 0,
          spawnTime: Date.now(),
        },
        // No id
      };
      world.add(zone);
      world.add(entity);

      // Should not throw
      expect(() => BounceZoneSystem(100)).not.toThrow();

      // Entity should still be bounced
      expect(entity.velocity!.y).toBe(-5);
    });

    it("should handle entity without velocity gracefully", () => {
      const zone = createTestBounceZone(0, 0, 5, 5000, 2);
      const entity: Entity = {
        id: "no-velocity",
        position: new Vector3(0, 0, 0),
        falling: {
          targetX: 0,
          targetY: 0,
          behaviorType: "normal",
          spawnX: 0,
          spawnTime: Date.now(),
        },
        // No velocity
      };
      world.add(zone);
      world.add(entity);

      // Should not throw
      expect(() => BounceZoneSystem(100)).not.toThrow();
    });
  });
});
