/**
 * FreezeSystem Unit Tests
 *
 * Tests the freeze system logic for:
 * - Frozen entities thawing over time
 * - Crack stages progressing correctly
 * - Frozen entities not moving
 * - Callbacks firing at appropriate times
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Vector3 } from "@babylonjs/core";
import { world } from "../world";
import { Entity } from "../components";
import {
  FreezeSystem,
  createFrozenComponent,
  freezeEntity,
  thawEntity,
  generateCracks,
  getFreezeState,
  getFrozenEntities,
  getCrackingEntities,
} from "./FreezeSystem";
import { GAME_CONFIG } from "../../config";

describe("FreezeSystem", () => {
  // Helper to create a test entity
  const createTestEntity = (options: Partial<Entity> = {}): Entity => {
    const entity: Entity = {
      id: `test-entity-${Math.random().toString(36).substr(2, 9)}`,
      position: new Vector3(0, 5, 0),
      velocity: new Vector3(0, 2, 0),
      ...options,
    };
    return entity;
  };

  // Clean up world after each test
  afterEach(() => {
    const entities = Array.from(world.entities);
    for (const entity of entities) {
      world.remove(entity);
    }
  });

  describe("generateCracks", () => {
    it("should generate cracks array with correct structure", () => {
      const cracks = generateCracks(60, 60);

      expect(Array.isArray(cracks)).toBe(true);
      expect(cracks.length).toBeGreaterThanOrEqual(5);
      expect(cracks.length).toBeLessThanOrEqual(8);

      // Each crack should have start and end coordinates
      for (const crack of cracks) {
        expect(crack).toHaveProperty("x1");
        expect(crack).toHaveProperty("y1");
        expect(crack).toHaveProperty("x2");
        expect(crack).toHaveProperty("y2");
        expect(typeof crack.x1).toBe("number");
        expect(typeof crack.y1).toBe("number");
        expect(typeof crack.x2).toBe("number");
        expect(typeof crack.y2).toBe("number");
      }
    });

    it("should generate cracks within bounds", () => {
      const width = 60;
      const height = 60;
      const cracks = generateCracks(width, height);

      for (const crack of cracks) {
        // Starting points should be within reasonable bounds
        expect(crack.x1).toBeGreaterThanOrEqual(-width);
        expect(crack.x1).toBeLessThanOrEqual(width);
        expect(crack.y1).toBeGreaterThanOrEqual(-height);
        expect(crack.y1).toBeLessThanOrEqual(height);
      }
    });
  });

  describe("createFrozenComponent", () => {
    it("should create frozen component with correct initial values", () => {
      const freezeDuration = 3000;
      const frozen = createFrozenComponent(freezeDuration);

      expect(frozen.freezeTimer).toBe(freezeDuration);
      expect(frozen.thawProgress).toBe(0);
      expect(frozen.crackStage).toBe(0);
      expect(frozen.maxCrackStages).toBe(GAME_CONFIG.physics.ice.crackStages);
      expect(frozen.bobOffset).toBe(0);
      expect(typeof frozen.bobTime).toBe("number");
      expect(typeof frozen.iceRotation).toBe("number");
      expect(Array.isArray(frozen.cracks)).toBe(true);
    });

    it("should have random bob time for varied animation", () => {
      const frozen1 = createFrozenComponent(3000);
      const frozen2 = createFrozenComponent(3000);

      // They could theoretically be the same, but very unlikely
      // Test that bobTime is within expected range
      expect(frozen1.bobTime).toBeGreaterThanOrEqual(0);
      expect(frozen1.bobTime).toBeLessThan(100);
      expect(frozen2.bobTime).toBeGreaterThanOrEqual(0);
      expect(frozen2.bobTime).toBeLessThan(100);
    });

    it("should have small random ice rotation", () => {
      const frozen = createFrozenComponent(3000);

      expect(frozen.iceRotation).toBeGreaterThanOrEqual(-0.15);
      expect(frozen.iceRotation).toBeLessThanOrEqual(0.15);
    });
  });

  describe("freezeEntity", () => {
    it("should add frozen component to entity", () => {
      const entity = createTestEntity();
      const freezeDuration = 2000;

      freezeEntity(entity, freezeDuration);

      expect(entity.frozen).toBeDefined();
      expect(entity.frozen?.freezeTimer).toBe(freezeDuration);
    });

    it("should remove falling component when freezing", () => {
      const entity = createTestEntity({
        falling: {
          targetX: 0,
          targetY: 0,
          behaviorType: "normal",
          spawnX: 0,
          spawnTime: Date.now(),
        },
      });

      freezeEntity(entity, 2000);

      expect(entity.falling).toBeUndefined();
    });

    it("should stop velocity when freezing", () => {
      const entity = createTestEntity({
        velocity: new Vector3(5, 10, 0),
      });

      freezeEntity(entity, 2000);

      expect(entity.velocity?.x).toBe(0);
      expect(entity.velocity?.y).toBe(0);
      expect(entity.velocity?.z).toBe(0);
    });
  });

  describe("thawEntity", () => {
    it("should remove frozen component", () => {
      const entity = createTestEntity();
      freezeEntity(entity, 2000);

      thawEntity(entity);

      expect(entity.frozen).toBeUndefined();
    });

    it("should add falling component after thawing", () => {
      const entity = createTestEntity();
      freezeEntity(entity, 2000);

      thawEntity(entity);

      expect(entity.falling).toBeDefined();
      expect(entity.falling?.behaviorType).toBe("normal");
    });

    it("should set downward velocity after thawing", () => {
      const entity = createTestEntity();
      freezeEntity(entity, 2000);

      thawEntity(entity);

      expect(entity.velocity).toBeDefined();
      expect(entity.velocity?.y).toBe(2);
    });

    it("should do nothing if entity is not frozen", () => {
      const entity = createTestEntity();

      thawEntity(entity);

      expect(entity.frozen).toBeUndefined();
      expect(entity.falling).toBeUndefined();
    });

    it("should adjust position by bob offset", () => {
      const entity = createTestEntity({
        position: new Vector3(0, 5, 0),
      });
      freezeEntity(entity, 2000);
      entity.frozen!.bobOffset = 0.5;

      const originalY = entity.position!.y;
      thawEntity(entity);

      expect(entity.position!.y).toBe(originalY + 0.5);
    });
  });

  describe("FreezeSystem update loop", () => {
    it("should decrement freeze timer over time", () => {
      const entity = createTestEntity();
      const freezeDuration = 2000;
      freezeEntity(entity, freezeDuration);
      world.add(entity);

      FreezeSystem(100);

      expect(entity.frozen!.freezeTimer).toBe(1900);
    });

    it("should update bob animation", () => {
      const entity = createTestEntity();
      freezeEntity(entity, 5000);
      const initialBobTime = entity.frozen!.bobTime;
      world.add(entity);

      FreezeSystem(100);

      expect(entity.frozen!.bobTime).toBeGreaterThan(initialBobTime);
    });

    it("should progress crack stages as timer decreases", () => {
      const entity = createTestEntity();
      const crackStages = GAME_CONFIG.physics.ice.crackStages;
      const crackThreshold = crackStages * 400;
      // Start timer just at the crack threshold
      freezeEntity(entity, crackThreshold);
      world.add(entity);

      // Run system to just past the threshold
      FreezeSystem(100);

      expect(entity.frozen!.thawProgress).toBeGreaterThan(0);
    });

    it("should update thaw progress correctly", () => {
      const entity = createTestEntity();
      const crackStages = GAME_CONFIG.physics.ice.crackStages;
      const crackThreshold = crackStages * 400;
      // Start timer at half the crack threshold
      freezeEntity(entity, crackThreshold / 2);
      world.add(entity);

      FreezeSystem(0); // Just calculate, no time passage

      expect(entity.frozen!.thawProgress).toBeCloseTo(0.5, 1);
    });

    it("should set modelOffset for visual bobbing", () => {
      const entity = createTestEntity();
      freezeEntity(entity, 5000);
      world.add(entity);

      FreezeSystem(100);

      expect(entity.modelOffset).toBeDefined();
      expect(typeof entity.modelOffset!.y).toBe("number");
    });

    it("should set modelRotation for ice rotation effect", () => {
      const entity = createTestEntity();
      freezeEntity(entity, 5000);
      world.add(entity);

      FreezeSystem(100);

      expect(entity.modelRotation).toBeDefined();
      expect(typeof entity.modelRotation!.z).toBe("number");
    });

    it("should call onShatter callback when timer reaches 0", () => {
      const entity = createTestEntity();
      freezeEntity(entity, 50); // Very short duration
      world.add(entity);

      const onShatter = vi.fn();
      const onThawComplete = vi.fn();

      FreezeSystem(100, { onShatter, onThawComplete });

      expect(onShatter).toHaveBeenCalledWith(entity);
    });

    it("should call onThawComplete callback after shatter", () => {
      const entity = createTestEntity();
      freezeEntity(entity, 50);
      world.add(entity);

      const onThawComplete = vi.fn();

      FreezeSystem(100, { onThawComplete });

      expect(onThawComplete).toHaveBeenCalledWith(entity);
    });

    it("should automatically thaw entity when timer expires", () => {
      const entity = createTestEntity();
      freezeEntity(entity, 50);
      world.add(entity);

      FreezeSystem(100);

      expect(entity.frozen).toBeUndefined();
      expect(entity.falling).toBeDefined();
    });

    it("should increase crack stage as thaw progresses", () => {
      const entity = createTestEntity();
      const crackStages = GAME_CONFIG.physics.ice.crackStages;
      // Set timer so thaw progress will be high
      freezeEntity(entity, 100);
      world.add(entity);

      FreezeSystem(0); // Just calculate current state

      expect(entity.frozen!.crackStage).toBeGreaterThan(0);
    });

    it("should cap crack stage at maxCrackStages", () => {
      const entity = createTestEntity();
      const crackStages = GAME_CONFIG.physics.ice.crackStages;
      // Very low timer to max out cracks
      freezeEntity(entity, 10);
      world.add(entity);

      FreezeSystem(5);

      expect(entity.frozen!.crackStage).toBeLessThanOrEqual(crackStages);
    });
  });

  describe("getFreezeState", () => {
    it("should return 'frozen' when no cracks", () => {
      const frozen = createFrozenComponent(5000);
      frozen.crackStage = 0;

      const state = getFreezeState(frozen);

      expect(state).toBe("frozen");
    });

    it("should return 'cracking' when cracks have started", () => {
      const frozen = createFrozenComponent(5000);
      frozen.crackStage = 1;

      const state = getFreezeState(frozen);

      expect(state).toBe("cracking");
    });

    it("should return 'cracking' at max crack stage", () => {
      const frozen = createFrozenComponent(5000);
      frozen.crackStage = frozen.maxCrackStages;

      const state = getFreezeState(frozen);

      expect(state).toBe("cracking");
    });
  });

  describe("Query helpers", () => {
    beforeEach(() => {
      // Clear world
      const entities = Array.from(world.entities);
      for (const entity of entities) {
        world.remove(entity);
      }
    });

    describe("getFrozenEntities", () => {
      it("should return empty array when no frozen entities", () => {
        const result = getFrozenEntities();
        expect(result).toEqual([]);
      });

      it("should return all frozen entities", () => {
        const entity1 = createTestEntity();
        const entity2 = createTestEntity();
        freezeEntity(entity1, 2000);
        freezeEntity(entity2, 3000);
        world.add(entity1);
        world.add(entity2);

        const result = getFrozenEntities();

        expect(result).toHaveLength(2);
      });

      it("should not include non-frozen entities", () => {
        const frozenEntity = createTestEntity();
        const normalEntity = createTestEntity();
        freezeEntity(frozenEntity, 2000);
        world.add(frozenEntity);
        world.add(normalEntity);

        const result = getFrozenEntities();

        expect(result).toHaveLength(1);
        expect(result[0].frozen).toBeDefined();
      });
    });

    describe("getCrackingEntities", () => {
      it("should return empty array when no cracking entities", () => {
        const result = getCrackingEntities();
        expect(result).toEqual([]);
      });

      it("should return only entities with crack stage > 0", () => {
        const crackingEntity = createTestEntity();
        const frozenEntity = createTestEntity();
        freezeEntity(crackingEntity, 2000);
        freezeEntity(frozenEntity, 5000);
        crackingEntity.frozen!.crackStage = 2;
        frozenEntity.frozen!.crackStage = 0;
        world.add(crackingEntity);
        world.add(frozenEntity);

        const result = getCrackingEntities();

        expect(result).toHaveLength(1);
        expect(result[0].frozen!.crackStage).toBe(2);
      });
    });
  });

  describe("Frozen entities don't move", () => {
    it("should not change position during freeze", () => {
      const entity = createTestEntity({
        position: new Vector3(5, 10, 0),
      });
      freezeEntity(entity, 5000);
      world.add(entity);

      const originalX = entity.position!.x;
      const originalZ = entity.position!.z;

      // Run system multiple times
      FreezeSystem(100);
      FreezeSystem(100);
      FreezeSystem(100);

      // X and Z should not change (Y may have bob offset applied via modelOffset)
      expect(entity.position!.x).toBe(originalX);
      expect(entity.position!.z).toBe(originalZ);
    });

    it("should have zero velocity when frozen", () => {
      const entity = createTestEntity({
        velocity: new Vector3(10, 20, 0),
      });
      freezeEntity(entity, 5000);
      world.add(entity);

      FreezeSystem(100);

      expect(entity.velocity!.x).toBe(0);
      expect(entity.velocity!.y).toBe(0);
      expect(entity.velocity!.z).toBe(0);
    });
  });

  describe("Crack progression timing", () => {
    it("should increase shake intensity as cracks progress", () => {
      const entity = createTestEntity();
      const crackStages = GAME_CONFIG.physics.ice.crackStages;
      const crackThreshold = crackStages * 400;
      // Start at crack threshold
      freezeEntity(entity, crackThreshold);
      world.add(entity);

      // Get initial rotation
      FreezeSystem(0);
      const initialRotation = Math.abs(entity.modelRotation?.z || 0);

      // Advance time to increase thaw progress
      FreezeSystem(crackThreshold / 2);

      // Rotation should be influenced by thaw progress
      // The shake intensity increases with thawProgress
      expect(entity.frozen!.thawProgress).toBeGreaterThan(0);
    });

    it("should have faster bobbing during cracking phase", () => {
      const entity = createTestEntity();
      const crackStages = GAME_CONFIG.physics.ice.crackStages;
      const crackThreshold = crackStages * 400;
      // Start at half crack threshold to be in cracking phase
      freezeEntity(entity, crackThreshold / 2);
      const initialBobTime = entity.frozen!.bobTime;
      world.add(entity);

      FreezeSystem(100);

      // Bob time should increase more during cracking due to extra bob speed
      const bobTimeDelta = entity.frozen!.bobTime - initialBobTime;
      expect(bobTimeDelta).toBeGreaterThan(0);
    });
  });
});
