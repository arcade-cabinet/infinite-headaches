/**
 * SpawningSystem Unit Tests
 *
 * Tests the spawning system for:
 * - Creating falling components with correct values
 * - Random animal type selection respecting spawn weights
 * - Spawning animals from AI decisions with correct components
 * - SpawningSystem gate logic (null/shouldSpawn checks, callbacks)
 * - Query helpers for falling entities
 * - Removing falling entities from the world
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Vector3 } from "@babylonjs/core";
import { world } from "../world";
import type { Entity } from "../components";
import { ANIMAL_TYPES, GAME_CONFIG } from "../../config";
import type { SpawnDecision } from "../../ai/types";
import {
  createFallingComponent,
  getRandomAnimalType,
  spawnAnimalFromDecision,
  SpawningSystem,
  getFallingEntities,
  getFallingEntitiesByBehavior,
  getActiveFallingCount,
  removeFallingEntity,
} from "./SpawningSystem";

// Deterministic UUID for tests
const mockUUID = "spawn-test-uuid-0000-1111-222233334444";

beforeEach(() => {
  vi.spyOn(crypto, "randomUUID").mockReturnValue(mockUUID as `${string}-${string}-${string}-${string}-${string}`);
});

afterEach(() => {
  // Clean up all entities from the world between tests
  const entities = Array.from(world.entities);
  for (const entity of entities) {
    world.remove(entity);
  }
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helper: build a valid SpawnDecision
// ---------------------------------------------------------------------------
function makeDecision(overrides: Partial<SpawnDecision> = {}): SpawnDecision {
  return {
    shouldSpawn: true,
    x: 400,
    duckType: "chicken",
    behaviorType: "normal",
    initialVelocityX: 0,
    initialVelocityY: 0,
    targetBias: 0.5,
    nextDropX: 400,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createFallingComponent
// ---------------------------------------------------------------------------
describe("createFallingComponent", () => {
  it("should create component with correct target and spawn values", () => {
    const component = createFallingComponent(100, 200, "normal", 50);

    expect(component.targetX).toBe(100);
    expect(component.targetY).toBe(200);
    expect(component.spawnX).toBe(50);
    expect(component.behaviorType).toBe("normal");
  });

  it("should set spawnTime to approximately the current time", () => {
    const before = Date.now();
    const component = createFallingComponent(0, 0, "normal", 0);
    const after = Date.now();

    expect(component.spawnTime).toBeGreaterThanOrEqual(before);
    expect(component.spawnTime).toBeLessThanOrEqual(after);
  });

  it("should preserve behaviorType correctly for each type", () => {
    const types = [
      "normal",
      "seeker",
      "evader",
      "zigzag",
      "dive",
      "floater",
      "swarm",
    ] as const;

    for (const type of types) {
      const component = createFallingComponent(0, 0, type, 0);
      expect(component.behaviorType).toBe(type);
    }
  });
});

// ---------------------------------------------------------------------------
// getRandomAnimalType
// ---------------------------------------------------------------------------
describe("getRandomAnimalType", () => {
  it("should return a valid AnimalType", () => {
    const type = getRandomAnimalType(1);
    const validTypes = Object.keys(ANIMAL_TYPES);
    expect(validTypes).toContain(type);
  });

  it("should never return farmer (spawnWeight: 0)", () => {
    // Run many iterations to gain confidence
    for (let i = 0; i < 200; i++) {
      const type = getRandomAnimalType(1);
      expect(type).not.toBe("farmer");
    }
  });

  it("should distribute roughly according to spawn weights over many samples", () => {
    const counts: Record<string, number> = {};
    const iterations = 5000;

    for (let i = 0; i < iterations; i++) {
      const type = getRandomAnimalType(0);
      counts[type] = (counts[type] || 0) + 1;
    }

    // Calculate expected proportions from config
    const spawnable = Object.entries(ANIMAL_TYPES).filter(
      ([, c]) => c.hasModel && c.spawnWeight > 0
    );
    const totalWeight = spawnable.reduce((sum, [, c]) => sum + c.spawnWeight, 0);

    for (const [type, config] of spawnable) {
      const expectedRatio = config.spawnWeight / totalWeight;
      const actualRatio = (counts[type] || 0) / iterations;
      // Allow generous tolerance for randomness (within 5 percentage points)
      expect(actualRatio).toBeGreaterThan(expectedRatio - 0.05);
      expect(actualRatio).toBeLessThan(expectedRatio + 0.05);
    }
  });

  it("should handle level 0", () => {
    const type = getRandomAnimalType(0);
    const spawnableTypes = Object.entries(ANIMAL_TYPES)
      .filter(([, c]) => c.hasModel && c.spawnWeight > 0)
      .map(([t]) => t);
    expect(spawnableTypes).toContain(type);
  });

  it("should handle high level values without error", () => {
    // High levels should not cause any crashes
    for (let level = 10; level <= 100; level += 10) {
      const type = getRandomAnimalType(level);
      expect(type).not.toBe("farmer");
    }
  });
});

// ---------------------------------------------------------------------------
// spawnAnimalFromDecision
// ---------------------------------------------------------------------------
describe("spawnAnimalFromDecision", () => {
  const screenWidth = 800;
  const screenHeight = 600;

  it("should create an entity from a valid spawn decision", () => {
    const decision = makeDecision({ duckType: "cow" });
    const entity = spawnAnimalFromDecision(
      decision,
      screenWidth,
      screenHeight,
      null,
      0
    );

    expect(entity).toBeDefined();
    expect(entity.id).toBe(mockUUID);
    expect(entity.tag?.type).toBe("animal");
    expect(entity.tag?.subtype).toBe("cow");
  });

  it("should add falling component to the entity", () => {
    const decision = makeDecision({ behaviorType: "seeker" });
    const entity = spawnAnimalFromDecision(
      decision,
      screenWidth,
      screenHeight,
      null,
      0
    );

    expect(entity.falling).toBeDefined();
    expect(entity.falling?.behaviorType).toBe("seeker");
    expect(typeof entity.falling?.targetX).toBe("number");
    expect(typeof entity.falling?.targetY).toBe("number");
    expect(typeof entity.falling?.spawnX).toBe("number");
    expect(typeof entity.falling?.spawnTime).toBe("number");
  });

  it("should set initial velocity from decision", () => {
    const decision = makeDecision({
      initialVelocityX: 500,
      initialVelocityY: -200,
    });
    const entity = spawnAnimalFromDecision(
      decision,
      screenWidth,
      screenHeight,
      null,
      0
    );

    // Velocity is scaled by 0.01
    expect(entity.velocity?.x).toBeCloseTo(5);
    expect(entity.velocity?.y).toBeCloseTo(-2);
    expect(entity.velocity?.z).toBe(0);
  });

  it("should add wobble, emotion, and squish components", () => {
    const decision = makeDecision();
    const entity = spawnAnimalFromDecision(
      decision,
      screenWidth,
      screenHeight,
      null,
      0
    );

    // wobble
    expect(entity.wobble).toBeDefined();
    expect(entity.wobble?.offset).toBe(0);
    expect(entity.wobble?.velocity).toBe(0);
    expect(entity.wobble?.damping).toBe(0.9);
    expect(entity.wobble?.springiness).toBe(0.1);

    // emotion
    expect(entity.emotion).toBeDefined();
    expect(entity.emotion?.isHeadache).toBe(false);
    expect(entity.emotion?.isConfused).toBe(false);
    expect(entity.emotion?.confusedTimer).toBe(0);

    // squish
    expect(entity.squish).toBeDefined();
    expect(entity.squish?.scaleX).toBe(1);
    expect(entity.squish?.scaleY).toBe(1);
    expect(entity.squish?.targetScaleX).toBe(1);
    expect(entity.squish?.targetScaleY).toBe(1);
    expect(entity.squish?.recoverySpeed).toBe(0.12);
  });

  it("should throw error for invalid animal type", () => {
    const decision = makeDecision({ duckType: "dragon" as any });

    expect(() =>
      spawnAnimalFromDecision(decision, screenWidth, screenHeight, null, 0)
    ).toThrow(/Cannot spawn animal type/);
  });

  it("should map screen coordinates to world coordinates", () => {
    const decision = makeDecision({ x: 400 }); // Center of 800px screen
    const entity = spawnAnimalFromDecision(
      decision,
      screenWidth,
      screenHeight,
      null,
      0
    );

    // At center screen X, world X should be near 0
    expect(entity.position).toBeDefined();
    expect(typeof entity.position?.x).toBe("number");
    expect(Number.isFinite(entity.position?.x)).toBe(true);
  });

  it("should handle null playerEntity gracefully", () => {
    const decision = makeDecision();

    // Should not throw with null player
    const entity = spawnAnimalFromDecision(
      decision,
      screenWidth,
      screenHeight,
      null,
      0
    );

    expect(entity).toBeDefined();
    expect(entity.falling).toBeDefined();
  });

  it("should add the entity to the world", () => {
    const initialCount = Array.from(world.entities).length;
    const decision = makeDecision();

    spawnAnimalFromDecision(decision, screenWidth, screenHeight, null, 0);

    const afterCount = Array.from(world.entities).length;
    expect(afterCount).toBe(initialCount + 1);
  });

  it("should use playerEntity position for target calculation when provided", () => {
    const decision = makeDecision({ targetBias: 0.0 }); // Full player-targeting
    const playerEntity: Entity = {
      id: "player-1",
      position: new Vector3(3, -2, 0),
    };

    const entity = spawnAnimalFromDecision(
      decision,
      screenWidth,
      screenHeight,
      playerEntity,
      0
    );

    // Entity should exist and have valid falling target
    expect(entity.falling).toBeDefined();
    expect(Number.isFinite(entity.falling?.targetX)).toBe(true);
    expect(Number.isFinite(entity.falling?.targetY)).toBe(true);
  });

  it("should spawn each spawnable animal type correctly", () => {
    const spawnableTypes = Object.entries(ANIMAL_TYPES)
      .filter(([, c]) => c.hasModel && c.spawnWeight > 0)
      .map(([t]) => t);

    for (const type of spawnableTypes) {
      const decision = makeDecision({ duckType: type as any });
      const entity = spawnAnimalFromDecision(
        decision,
        screenWidth,
        screenHeight,
        null,
        0
      );
      expect(entity.tag?.subtype).toBe(type);
    }
  });
});

// ---------------------------------------------------------------------------
// SpawningSystem
// ---------------------------------------------------------------------------
describe("SpawningSystem", () => {
  const screenWidth = 800;
  const screenHeight = 600;

  it("should return null when decision is null", () => {
    const result = SpawningSystem(null, screenWidth, screenHeight, null, 0);
    expect(result).toBeNull();
  });

  it("should return null when decision.shouldSpawn is false", () => {
    const decision = makeDecision({ shouldSpawn: false });
    const result = SpawningSystem(
      decision,
      screenWidth,
      screenHeight,
      null,
      0
    );
    expect(result).toBeNull();
  });

  it("should return entity when shouldSpawn is true", () => {
    const decision = makeDecision({ shouldSpawn: true });
    const result = SpawningSystem(
      decision,
      screenWidth,
      screenHeight,
      null,
      0
    );

    expect(result).not.toBeNull();
    expect(result?.id).toBeDefined();
    expect(result?.falling).toBeDefined();
  });

  it("should call onSpawn callback when entity is spawned", () => {
    const onSpawn = vi.fn();
    const decision = makeDecision({ shouldSpawn: true });

    const entity = SpawningSystem(
      decision,
      screenWidth,
      screenHeight,
      null,
      0,
      { onSpawn }
    );

    expect(onSpawn).toHaveBeenCalledTimes(1);
    expect(onSpawn).toHaveBeenCalledWith(entity);
  });

  it("should not call onSpawn callback when not spawning", () => {
    const onSpawn = vi.fn();

    SpawningSystem(null, screenWidth, screenHeight, null, 0, { onSpawn });

    expect(onSpawn).not.toHaveBeenCalled();
  });

  it("should not call onSpawn callback when shouldSpawn is false", () => {
    const onSpawn = vi.fn();
    const decision = makeDecision({ shouldSpawn: false });

    SpawningSystem(decision, screenWidth, screenHeight, null, 0, { onSpawn });

    expect(onSpawn).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getFallingEntities
// ---------------------------------------------------------------------------
describe("getFallingEntities", () => {
  it("should return entities with falling component", () => {
    const entity1: Entity = {
      id: "fall-1",
      falling: {
        targetX: 0,
        targetY: 0,
        behaviorType: "normal",
        spawnX: 0,
        spawnTime: Date.now(),
      },
    };
    const entity2: Entity = {
      id: "fall-2",
      falling: {
        targetX: 1,
        targetY: 1,
        behaviorType: "seeker",
        spawnX: 1,
        spawnTime: Date.now(),
      },
    };
    world.add(entity1);
    world.add(entity2);

    const result = getFallingEntities();

    expect(result).toHaveLength(2);
  });

  it("should return empty array when no falling entities exist", () => {
    // Add an entity without falling component
    const entity: Entity = { id: "no-fall" };
    world.add(entity);

    const result = getFallingEntities();

    expect(result).toHaveLength(0);
  });

  it("should not include entities without falling component", () => {
    const falling: Entity = {
      id: "yes-fall",
      falling: {
        targetX: 0,
        targetY: 0,
        behaviorType: "normal",
        spawnX: 0,
        spawnTime: Date.now(),
      },
    };
    const notFalling: Entity = { id: "no-fall" };
    world.add(falling);
    world.add(notFalling);

    const result = getFallingEntities();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("yes-fall");
  });
});

// ---------------------------------------------------------------------------
// getFallingEntitiesByBehavior
// ---------------------------------------------------------------------------
describe("getFallingEntitiesByBehavior", () => {
  it("should filter by behavior type correctly", () => {
    const seeker: Entity = {
      id: "seeker-1",
      falling: {
        targetX: 0,
        targetY: 0,
        behaviorType: "seeker",
        spawnX: 0,
        spawnTime: Date.now(),
      },
    };
    const normal: Entity = {
      id: "normal-1",
      falling: {
        targetX: 0,
        targetY: 0,
        behaviorType: "normal",
        spawnX: 0,
        spawnTime: Date.now(),
      },
    };
    const dive: Entity = {
      id: "dive-1",
      falling: {
        targetX: 0,
        targetY: 0,
        behaviorType: "dive",
        spawnX: 0,
        spawnTime: Date.now(),
      },
    };
    world.add(seeker);
    world.add(normal);
    world.add(dive);

    const seekers = getFallingEntitiesByBehavior("seeker");
    expect(seekers).toHaveLength(1);
    expect(seekers[0].id).toBe("seeker-1");

    const normals = getFallingEntitiesByBehavior("normal");
    expect(normals).toHaveLength(1);
    expect(normals[0].id).toBe("normal-1");
  });

  it("should return empty array for unmatched behavior type", () => {
    const normal: Entity = {
      id: "normal-1",
      falling: {
        targetX: 0,
        targetY: 0,
        behaviorType: "normal",
        spawnX: 0,
        spawnTime: Date.now(),
      },
    };
    world.add(normal);

    const result = getFallingEntitiesByBehavior("zigzag");

    expect(result).toHaveLength(0);
  });

  it("should return multiple entities of the same behavior type", () => {
    for (let i = 0; i < 3; i++) {
      world.add({
        id: `swarm-${i}`,
        falling: {
          targetX: i,
          targetY: 0,
          behaviorType: "swarm",
          spawnX: i,
          spawnTime: Date.now(),
        },
      });
    }

    const result = getFallingEntitiesByBehavior("swarm");
    expect(result).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// getActiveFallingCount
// ---------------------------------------------------------------------------
describe("getActiveFallingCount", () => {
  it("should return count of falling entities", () => {
    expect(getActiveFallingCount()).toBe(0);

    world.add({
      id: "f-1",
      falling: {
        targetX: 0,
        targetY: 0,
        behaviorType: "normal",
        spawnX: 0,
        spawnTime: Date.now(),
      },
    });

    expect(getActiveFallingCount()).toBe(1);

    world.add({
      id: "f-2",
      falling: {
        targetX: 0,
        targetY: 0,
        behaviorType: "dive",
        spawnX: 0,
        spawnTime: Date.now(),
      },
    });

    expect(getActiveFallingCount()).toBe(2);
  });

  it("should not count entities without falling component", () => {
    world.add({ id: "no-fall-1" });
    world.add({
      id: "has-fall",
      falling: {
        targetX: 0,
        targetY: 0,
        behaviorType: "normal",
        spawnX: 0,
        spawnTime: Date.now(),
      },
    });
    world.add({ id: "no-fall-2" });

    expect(getActiveFallingCount()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// removeFallingEntity
// ---------------------------------------------------------------------------
describe("removeFallingEntity", () => {
  it("should remove entity from world", () => {
    const entity: Entity = {
      id: "to-remove",
      falling: {
        targetX: 0,
        targetY: 0,
        behaviorType: "normal",
        spawnX: 0,
        spawnTime: Date.now(),
      },
    };
    world.add(entity);
    expect(getActiveFallingCount()).toBe(1);

    removeFallingEntity(entity);

    expect(getActiveFallingCount()).toBe(0);
    expect(Array.from(world.entities)).not.toContain(entity);
  });

  it("should only remove the specified entity", () => {
    const entity1: Entity = {
      id: "keep-me",
      falling: {
        targetX: 0,
        targetY: 0,
        behaviorType: "normal",
        spawnX: 0,
        spawnTime: Date.now(),
      },
    };
    const entity2: Entity = {
      id: "remove-me",
      falling: {
        targetX: 0,
        targetY: 0,
        behaviorType: "seeker",
        spawnX: 0,
        spawnTime: Date.now(),
      },
    };
    world.add(entity1);
    world.add(entity2);
    expect(getActiveFallingCount()).toBe(2);

    removeFallingEntity(entity2);

    expect(getActiveFallingCount()).toBe(1);
    const remaining = getFallingEntities();
    expect(remaining[0].id).toBe("keep-me");
  });
});
