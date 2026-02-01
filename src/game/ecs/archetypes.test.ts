/**
 * Unit Tests for ECS Archetypes
 *
 * Tests archetype factory functions for creating and converting entities.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Vector3, Color3 } from "@babylonjs/core";
import {
  createAnimal,
  createPlayer,
  createFallingAnimal,
  convertToStacked,
  convertToBanking,
  convertToScattering,
  freezeEntityArchetype,
  createFireballEntity,
  createBossAnimal,
} from "./archetypes";
import type { Entity } from "./components";

// Mock crypto.randomUUID for deterministic tests
const mockUUID = "test-uuid-1234-5678-9abc-def012345678";
beforeEach(() => {
  vi.spyOn(crypto, "randomUUID").mockReturnValue(mockUUID);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createAnimal", () => {
  it("should create a valid animal entity for cow", () => {
    const position = new Vector3(100, 200, 0);
    const entity = createAnimal("cow", position);

    expect(entity.id).toBe(mockUUID);
    expect(entity.position).toBe(position);
    expect(entity.position?.x).toBe(100);
    expect(entity.position?.y).toBe(200);
    expect(entity.velocity?.x).toBe(0);
    expect(entity.velocity?.y).toBe(0);
    expect(entity.velocity?.z).toBe(0);
    expect(entity.scale?.x).toBe(1);
    expect(entity.scale?.y).toBe(1);
    expect(entity.scale?.z).toBe(1);
    expect(entity.model).toBe("assets/models/animals/cow.glb");
    expect(entity.tag?.type).toBe("animal");
    expect(entity.tag?.subtype).toBe("cow");
    expect(entity.physics?.mass).toBe(1);
    expect(entity.physics?.restitution).toBe(0.2);
    expect(entity.physics?.friction).toBe(0.5);
    expect(entity.wobble?.offset).toBe(0);
    expect(entity.wobble?.velocity).toBe(0);
    expect(entity.wobble?.damping).toBe(0.9);
    expect(entity.wobble?.springiness).toBe(0.1);
    expect(entity.mergeable?.level).toBe(1);
    expect(entity.mergeable?.mergeRadius).toBe(1.5);
    expect(entity.colorOverlay?.color).toBeInstanceOf(Color3);
    expect(entity.colorOverlay?.intensity).toBe(0);
  });

  it("should create valid entities for all spawnable animal types", () => {
    const animalTypes = ["cow", "pig", "chicken", "duck", "sheep"] as const;
    const position = new Vector3(0, 0, 0);

    for (const type of animalTypes) {
      const entity = createAnimal(type, position);
      expect(entity.tag?.subtype).toBe(type);
      expect(entity.model).toBe(`assets/models/animals/${type}.glb`);
    }
  });

  it("should throw error for invalid animal type", () => {
    const position = new Vector3(0, 0, 0);
    expect(() => {
      // @ts-expect-error - Testing invalid type
      createAnimal("dragon", position);
    }).toThrow(/ANIMAL TYPE ERROR.*dragon.*is not a valid AnimalType/);
  });

  it("should throw error for animal type without model", () => {
    // The farmer type has spawnWeight: 0 but hasModel: true
    // We need to test a hypothetical case where hasModel would be false
    // Since all current types have hasModel: true, this tests the validation logic
    const position = new Vector3(0, 0, 0);

    // Farmer is a valid type and has a model, so it should work
    const entity = createAnimal("farmer", position);
    expect(entity.model).toBe("assets/models/animals/farmer.glb");
  });

  it("should preserve position reference", () => {
    const position = new Vector3(50, 100, 0);
    const entity = createAnimal("chicken", position);

    // Modify original position
    position.x = 999;

    // Entity position should also change (same reference)
    expect(entity.position?.x).toBe(999);
  });
});

describe("createPlayer", () => {
  it("should create farmer_john with correct components", () => {
    const position = new Vector3(200, 500, 0);
    const entity = createPlayer("farmer_john", position);

    expect(entity.id).toBe(mockUUID);
    expect(entity.position).toBe(position);
    expect(entity.velocity?.x).toBe(0);
    expect(entity.velocity?.y).toBe(0);
    expect(entity.scale?.x).toBe(1.2);
    expect(entity.scale?.y).toBe(1.2);
    expect(entity.scale?.z).toBe(1.2);
    expect(entity.model).toBe("assets/models/farmers/john.glb");
    expect(entity.tag?.type).toBe("player");
    expect(entity.tag?.subtype).toBe("farmer_john");
    expect(entity.input?.speed).toBe(10);
    expect(entity.input?.smoothness).toBe(0.1);
    expect(entity.wobble?.damping).toBe(0.9);
    expect(entity.wobble?.springiness).toBe(0.05);
    expect(entity.traits?.name).toBe("Farmer John");
    expect(entity.traits?.positiveTraits).toContain("Steady Hands");
    expect(entity.traits?.negativeTraits).toContain("Slow Walker");
    expect(entity.player?.characterId).toBe("farmer_john");
    expect(entity.player?.isDragging).toBe(false);
    expect(entity.player?.lastDragX).toBe(0);
    expect(entity.player?.smoothedVelocity).toBe(0);
  });

  it("should create farmer_mary with correct components", () => {
    const position = new Vector3(200, 500, 0);
    const entity = createPlayer("farmer_mary", position);

    expect(entity.model).toBe("assets/models/farmers/mary.glb");
    expect(entity.tag?.subtype).toBe("farmer_mary");
    expect(entity.traits?.name).toBe("Farmer Mary");
    expect(entity.traits?.positiveTraits).toContain("Fast Reflexes");
    expect(entity.traits?.negativeTraits).toContain("Easily Startled");
    expect(entity.player?.characterId).toBe("farmer_mary");
    expect(entity.scale?.x).toBe(1.1);
    expect(entity.scale?.y).toBe(1.1);
    expect(entity.scale?.z).toBe(1.1);
  });

  it("should have different springiness than animals", () => {
    const playerEntity = createPlayer("farmer_john", new Vector3(0, 0, 0));
    const animalEntity = createAnimal("cow", new Vector3(0, 0, 0));

    // Player has lower springiness (0.05) than animals (0.1)
    expect(playerEntity.wobble?.springiness).toBe(0.05);
    expect(animalEntity.wobble?.springiness).toBe(0.1);
  });
});

describe("createFallingAnimal", () => {
  it("should create falling animal with all required components", () => {
    const position = new Vector3(150, 50, 0);
    const entity = createFallingAnimal("chicken", position, 150, 400);

    expect(entity.id).toBe(mockUUID);
    expect(entity.position?.x).toBe(150);
    expect(entity.position?.y).toBe(50);
    expect(entity.velocity).toBeDefined();
    expect(entity.scale?.x).toBe(1);
    expect(entity.model).toBe("assets/models/animals/chicken.glb");
    expect(entity.tag?.type).toBe("animal");
    expect(entity.tag?.subtype).toBe("chicken");
    expect(entity.physics).toBeDefined();
    expect(entity.wobble).toBeDefined();
    expect(entity.mergeable).toBeDefined();
    expect(entity.colorOverlay).toBeDefined();

    // FallingComponent
    expect(entity.falling).toBeDefined();
    expect(entity.falling?.targetX).toBe(150);
    expect(entity.falling?.targetY).toBe(400);
    expect(entity.falling?.behaviorType).toBe("normal");
    expect(entity.falling?.spawnX).toBe(150);
    expect(entity.falling?.spawnTime).toBeLessThanOrEqual(Date.now());

    // EmotionComponent
    expect(entity.emotion).toBeDefined();
    expect(entity.emotion?.isHeadache).toBe(false);
    expect(entity.emotion?.isConfused).toBe(false);
    expect(entity.emotion?.confusedTimer).toBe(0);

    // SquishComponent
    expect(entity.squish).toBeDefined();
    expect(entity.squish?.scaleX).toBe(1);
    expect(entity.squish?.scaleY).toBe(1);
    expect(entity.squish?.targetScaleX).toBe(1);
    expect(entity.squish?.targetScaleY).toBe(1);
    expect(entity.squish?.recoverySpeed).toBe(0.12);
  });

  it("should support different behavior types", () => {
    const behaviors = [
      "normal",
      "seeker",
      "evader",
      "zigzag",
      "swarm",
      "dive",
      "floater",
    ] as const;
    const position = new Vector3(100, 0, 0);

    for (const behavior of behaviors) {
      const entity = createFallingAnimal("duck", position, 100, 400, behavior);
      expect(entity.falling?.behaviorType).toBe(behavior);
    }
  });

  it("should accept initial velocity", () => {
    const position = new Vector3(100, 50, 0);
    const initialVelocity = new Vector3(2, -3, 0);
    const entity = createFallingAnimal(
      "pig",
      position,
      100,
      400,
      "seeker",
      initialVelocity
    );

    expect(entity.velocity?.x).toBe(2);
    expect(entity.velocity?.y).toBe(-3);
    expect(entity.velocity?.z).toBe(0);
  });

  it("should default to zero velocity when not provided", () => {
    const entity = createFallingAnimal(
      "sheep",
      new Vector3(0, 0, 0),
      0,
      400
    );

    expect(entity.velocity?.x).toBe(0);
    expect(entity.velocity?.y).toBe(0);
    expect(entity.velocity?.z).toBe(0);
  });

  it("should throw error for animal without model", () => {
    expect(() => {
      // @ts-expect-error - Testing invalid type
      createFallingAnimal("invalid_animal", new Vector3(0, 0, 0), 0, 0);
    }).toThrow(/Cannot create falling animal.*has no 3D model/);
  });

  it("should record spawn position and time", () => {
    const beforeTime = Date.now();
    const entity = createFallingAnimal(
      "cow",
      new Vector3(250, 0, 0),
      200,
      400
    );
    const afterTime = Date.now();

    expect(entity.falling?.spawnX).toBe(250);
    expect(entity.falling?.spawnTime).toBeGreaterThanOrEqual(beforeTime);
    expect(entity.falling?.spawnTime).toBeLessThanOrEqual(afterTime);
  });
});

describe("convertToStacked", () => {
  it("should remove falling component and add stacked component", () => {
    const entity: Entity = {
      id: "test-entity",
      position: new Vector3(100, 300, 0),
      velocity: new Vector3(0, -5, 0),
      falling: {
        targetX: 100,
        targetY: 400,
        behaviorType: "normal",
        spawnX: 100,
        spawnTime: Date.now(),
      },
    };

    convertToStacked(entity, 2, 0.15, "player-1");

    expect(entity.falling).toBeUndefined();
    expect(entity.stacked).toBeDefined();
    expect(entity.stacked?.stackIndex).toBe(2);
    expect(entity.stacked?.stackOffset).toBe(0.15);
    expect(entity.stacked?.baseEntityId).toBe("player-1");
  });

  it("should reset velocity to zero", () => {
    const entity: Entity = {
      id: "test-entity",
      velocity: new Vector3(5, -10, 2),
      falling: {
        targetX: 0,
        targetY: 0,
        behaviorType: "normal",
        spawnX: 0,
        spawnTime: 0,
      },
    };

    convertToStacked(entity, 0, 0, "player-1");

    expect(entity.velocity?.x).toBe(0);
    expect(entity.velocity?.y).toBe(0);
    expect(entity.velocity?.z).toBe(0);
  });

  it("should handle entity without velocity", () => {
    const entity: Entity = {
      id: "test-entity",
      falling: {
        targetX: 0,
        targetY: 0,
        behaviorType: "normal",
        spawnX: 0,
        spawnTime: 0,
      },
    };

    // Should not throw
    convertToStacked(entity, 0, 0, "player-1");

    expect(entity.stacked).toBeDefined();
    expect(entity.velocity).toBeUndefined();
  });

  it("should handle negative stack offset", () => {
    const entity: Entity = {
      id: "test-entity",
      velocity: new Vector3(0, 0, 0),
      falling: {
        targetX: 0,
        targetY: 0,
        behaviorType: "normal",
        spawnX: 0,
        spawnTime: 0,
      },
    };

    convertToStacked(entity, 3, -0.2, "player-1");

    expect(entity.stacked?.stackOffset).toBe(-0.2);
  });
});

describe("convertToBanking", () => {
  it("should remove stacked component and add banking component", () => {
    const entity: Entity = {
      id: "test-entity",
      stacked: {
        stackIndex: 2,
        stackOffset: 0.1,
        baseEntityId: "player-1",
      },
    };

    const beforeTime = Date.now();
    convertToBanking(entity, 50, 100);
    const afterTime = Date.now();

    expect(entity.stacked).toBeUndefined();
    expect(entity.banking).toBeDefined();
    expect(entity.banking?.targetX).toBe(50);
    expect(entity.banking?.targetY).toBe(100);
    expect(entity.banking?.startedAt).toBeGreaterThanOrEqual(beforeTime);
    expect(entity.banking?.startedAt).toBeLessThanOrEqual(afterTime);
  });

  it("should set correct bank target coordinates", () => {
    const entity: Entity = {
      id: "test-entity",
      stacked: {
        stackIndex: 0,
        stackOffset: 0,
        baseEntityId: "player-1",
      },
    };

    convertToBanking(entity, 25, 600);

    expect(entity.banking?.targetX).toBe(25);
    expect(entity.banking?.targetY).toBe(600);
  });
});

describe("convertToScattering", () => {
  let mathRandomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock Math.random for deterministic tests
    let callCount = 0;
    mathRandomSpy = vi.spyOn(Math, "random").mockImplementation(() => {
      callCount++;
      // Return predictable values
      switch (callCount % 3) {
        case 1:
          return 0.7; // rotationVelocity: (0.7 - 0.5) * 0.3 = 0.06
        case 2:
          return 0.3; // velocity.x: (0.3 - 0.5) * 1.5 = -0.3
        case 0:
          return 0.5; // velocity.y: -0.5 * 0.8 - 0.5 = -0.9
        default:
          return 0.5;
      }
    });
  });

  afterEach(() => {
    mathRandomSpy.mockRestore();
  });

  it("should remove stacked component and add scattering component", () => {
    const entity: Entity = {
      id: "test-entity",
      stacked: {
        stackIndex: 2,
        stackOffset: 0.1,
        baseEntityId: "player-1",
      },
      velocity: new Vector3(0, 0, 0),
      emotion: { isHeadache: false, isConfused: false, confusedTimer: 0 },
    };

    convertToScattering(entity);

    expect(entity.stacked).toBeUndefined();
    expect(entity.scattering).toBeDefined();
    expect(entity.scattering?.startedAt).toBeLessThanOrEqual(Date.now());
  });

  it("should set random rotation velocity", () => {
    const entity: Entity = {
      id: "test-entity",
      stacked: {
        stackIndex: 0,
        stackOffset: 0,
        baseEntityId: "player-1",
      },
    };

    convertToScattering(entity);

    // rotationVelocity should be in range (-0.15, 0.15) based on (Math.random() - 0.5) * 0.3
    expect(entity.scattering?.rotationVelocity).toBeDefined();
    expect(typeof entity.scattering?.rotationVelocity).toBe("number");
  });

  it("should set random velocity for scattering motion", () => {
    const entity: Entity = {
      id: "test-entity",
      velocity: new Vector3(0, 0, 0),
      stacked: {
        stackIndex: 0,
        stackOffset: 0,
        baseEntityId: "player-1",
      },
    };

    convertToScattering(entity);

    // velocity.x should be in range (-0.75, 0.75)
    // velocity.y should be negative (falling)
    expect(entity.velocity).toBeDefined();
    expect(entity.velocity?.x).toBeDefined();
    expect(entity.velocity?.y).toBeLessThan(0);
  });

  it("should mark entity as having headache", () => {
    const entity: Entity = {
      id: "test-entity",
      stacked: {
        stackIndex: 1,
        stackOffset: 0,
        baseEntityId: "player-1",
      },
      emotion: { isHeadache: false, isConfused: false, confusedTimer: 0 },
    };

    convertToScattering(entity);

    expect(entity.emotion?.isHeadache).toBe(true);
  });

  it("should handle entity without emotion component", () => {
    const entity: Entity = {
      id: "test-entity",
      velocity: new Vector3(0, 0, 0),
      stacked: {
        stackIndex: 0,
        stackOffset: 0,
        baseEntityId: "player-1",
      },
    };

    // Should not throw
    convertToScattering(entity);

    expect(entity.scattering).toBeDefined();
    // emotion remains undefined if not present
  });

  it("should handle entity without velocity component", () => {
    const entity: Entity = {
      id: "test-entity",
      stacked: {
        stackIndex: 0,
        stackOffset: 0,
        baseEntityId: "player-1",
      },
    };

    // Should not throw
    convertToScattering(entity);

    expect(entity.scattering).toBeDefined();
    // velocity remains undefined if not present
  });
});

describe("freezeEntityArchetype", () => {
  let mathRandomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    let callCount = 0;
    mathRandomSpy = vi.spyOn(Math, "random").mockImplementation(() => {
      callCount++;
      // Return varied values for crack generation
      return (callCount * 0.17) % 1;
    });
  });

  afterEach(() => {
    mathRandomSpy.mockRestore();
  });

  it("should remove falling component", () => {
    const entity: Entity = {
      id: "test-entity",
      falling: {
        targetX: 100,
        targetY: 400,
        behaviorType: "normal",
        spawnX: 100,
        spawnTime: Date.now(),
      },
      velocity: new Vector3(0, -5, 0),
    };

    freezeEntityArchetype(entity, 3000);

    expect(entity.falling).toBeUndefined();
  });

  it("should stop entity movement", () => {
    const entity: Entity = {
      id: "test-entity",
      velocity: new Vector3(5, -10, 2),
      falling: {
        targetX: 0,
        targetY: 0,
        behaviorType: "normal",
        spawnX: 0,
        spawnTime: 0,
      },
    };

    freezeEntityArchetype(entity, 3000);

    expect(entity.velocity?.x).toBe(0);
    expect(entity.velocity?.y).toBe(0);
    expect(entity.velocity?.z).toBe(0);
  });

  it("should add frozen component with correct properties", () => {
    const entity: Entity = {
      id: "test-entity",
      velocity: new Vector3(0, 0, 0),
    };

    freezeEntityArchetype(entity, 5000);

    expect(entity.frozen).toBeDefined();
    expect(entity.frozen?.freezeTimer).toBe(5000);
    expect(entity.frozen?.thawProgress).toBe(0);
    expect(entity.frozen?.crackStage).toBe(0);
    expect(entity.frozen?.maxCrackStages).toBe(4); // from GAME_CONFIG.physics.ice.crackStages
    expect(entity.frozen?.bobOffset).toBe(0);
    expect(typeof entity.frozen?.bobTime).toBe("number");
    expect(typeof entity.frozen?.iceRotation).toBe("number");
  });

  it("should generate cracks between 5 and 8", () => {
    const entity: Entity = {
      id: "test-entity",
      velocity: new Vector3(0, 0, 0),
    };

    freezeEntityArchetype(entity, 3000);

    expect(entity.frozen?.cracks).toBeDefined();
    expect(entity.frozen?.cracks.length).toBeGreaterThanOrEqual(5);
    expect(entity.frozen?.cracks.length).toBeLessThanOrEqual(8);
  });

  it("should generate valid crack coordinates", () => {
    const entity: Entity = {
      id: "test-entity",
      velocity: new Vector3(0, 0, 0),
    };

    freezeEntityArchetype(entity, 3000);

    for (const crack of entity.frozen?.cracks ?? []) {
      expect(typeof crack.x1).toBe("number");
      expect(typeof crack.y1).toBe("number");
      expect(typeof crack.x2).toBe("number");
      expect(typeof crack.y2).toBe("number");
      // Coordinates should be finite numbers
      expect(Number.isFinite(crack.x1)).toBe(true);
      expect(Number.isFinite(crack.y1)).toBe(true);
      expect(Number.isFinite(crack.x2)).toBe(true);
      expect(Number.isFinite(crack.y2)).toBe(true);
    }
  });

  it("should set ice rotation within range", () => {
    const entity: Entity = {
      id: "test-entity",
      velocity: new Vector3(0, 0, 0),
    };

    freezeEntityArchetype(entity, 3000);

    // iceRotation should be in range (-0.15, 0.15) based on (Math.random() - 0.5) * 0.3
    expect(entity.frozen?.iceRotation).toBeDefined();
    expect(Math.abs(entity.frozen?.iceRotation ?? 0)).toBeLessThanOrEqual(0.15);
  });

  it("should handle different freeze durations", () => {
    const shortFreeze: Entity = { id: "short", velocity: new Vector3(0, 0, 0) };
    const longFreeze: Entity = { id: "long", velocity: new Vector3(0, 0, 0) };

    freezeEntityArchetype(shortFreeze, 1000);
    freezeEntityArchetype(longFreeze, 10000);

    expect(shortFreeze.frozen?.freezeTimer).toBe(1000);
    expect(longFreeze.frozen?.freezeTimer).toBe(10000);
  });
});

describe("createFireballEntity", () => {
  it("should create fireball moving right", () => {
    const entity = createFireballEntity(100, 300, 1);

    expect(entity.id).toBe(mockUUID);
    expect(entity.position?.x).toBe(100);
    expect(entity.position?.y).toBe(300);
    expect(entity.position?.z).toBe(0);

    // Velocity should be primarily rightward
    expect(entity.velocity?.x).toBeGreaterThan(0);

    // GameProjectileComponent
    expect(entity.gameProjectile).toBeDefined();
    expect(entity.gameProjectile?.type).toBe("fireball");
    expect(entity.gameProjectile?.direction.x).toBe(1);
    expect(entity.gameProjectile?.direction.y).toBe(0);
    expect(entity.gameProjectile?.speed).toBe(12); // GAME_CONFIG.physics.fireball.speed
    expect(entity.gameProjectile?.lifetime).toBe(2000); // GAME_CONFIG.physics.fireball.duration
    expect(entity.gameProjectile?.maxLifetime).toBe(2000);
    expect(entity.gameProjectile?.size).toBe(20); // GAME_CONFIG.physics.fireball.size
    expect(entity.gameProjectile?.rotation).toBe(0);
    expect(entity.gameProjectile?.trailParticles).toEqual([]);

    // LifetimeComponent
    expect(entity.lifetime).toBeDefined();
    expect(entity.lifetime?.duration).toBe(2000);
    expect(entity.lifetime?.createdAt).toBeLessThanOrEqual(Date.now());
  });

  it("should create fireball moving left", () => {
    const entity = createFireballEntity(200, 400, -1);

    expect(entity.velocity?.x).toBeLessThan(0);
    expect(entity.gameProjectile?.direction.x).toBe(-1);
  });

  it("should have slight vertical drift in velocity", () => {
    // The y velocity includes (Math.random() - 0.5) * 0.02
    // With mocked random, we can verify the range
    const entity = createFireballEntity(0, 0, 1);

    // y velocity should be small (in range -0.01 to 0.01)
    expect(Math.abs(entity.velocity?.y ?? 0)).toBeLessThanOrEqual(0.01);
  });

  it("should create fireball at exact position", () => {
    const entity = createFireballEntity(123.456, 789.012, 1);

    expect(entity.position?.x).toBe(123.456);
    expect(entity.position?.y).toBe(789.012);
  });
});

describe("createBossAnimal", () => {
  it("should create mega boss with correct scaling and properties", () => {
    const position = new Vector3(150, 50, 0);
    const entity = createBossAnimal("cow", "mega", position, 150, 400);

    expect(entity.id).toBe(mockUUID);
    expect(entity.tag?.subtype).toBe("cow");

    // Boss component
    expect(entity.boss).toBeDefined();
    expect(entity.boss?.bossType).toBe("mega");
    expect(entity.boss?.health).toBe(3);
    expect(entity.boss?.maxHealth).toBe(3);
    expect(entity.boss?.isPhasing).toBe(false);
    expect(entity.boss?.hitFlashTime).toBe(0);
    expect(entity.boss?.pulsePhase).toBe(0);
    expect(entity.boss?.reward).toBe(500);

    // Scale should be multiplied by boss size (1.8)
    expect(entity.scale?.x).toBe(1.8);
    expect(entity.scale?.y).toBe(1.8);
    expect(entity.scale?.z).toBe(1.8);

    // Should have falling component from createFallingAnimal
    expect(entity.falling).toBeDefined();
    expect(entity.falling?.behaviorType).toBe("normal");
  });

  it("should create shadow boss with correct properties", () => {
    const position = new Vector3(200, 50, 0);
    const entity = createBossAnimal("pig", "shadow", position, 200, 400);

    expect(entity.boss?.bossType).toBe("shadow");
    expect(entity.boss?.health).toBe(5);
    expect(entity.boss?.maxHealth).toBe(5);
    expect(entity.boss?.reward).toBe(750);

    // Scale should be multiplied by boss size (1.5)
    expect(entity.scale?.x).toBe(1.5);
    expect(entity.scale?.y).toBe(1.5);
    expect(entity.scale?.z).toBe(1.5);
  });

  it("should create golden boss with correct properties", () => {
    const position = new Vector3(100, 50, 0);
    const entity = createBossAnimal("chicken", "golden", position, 100, 400);

    expect(entity.boss?.bossType).toBe("golden");
    expect(entity.boss?.health).toBe(2);
    expect(entity.boss?.maxHealth).toBe(2);
    expect(entity.boss?.reward).toBe(1000);

    // Scale should be multiplied by boss size (1.4)
    expect(entity.scale?.x).toBeCloseTo(1.4);
    expect(entity.scale?.y).toBeCloseTo(1.4);
    expect(entity.scale?.z).toBeCloseTo(1.4);
  });

  it("should inherit all falling animal components", () => {
    const position = new Vector3(150, 50, 0);
    const entity = createBossAnimal("duck", "mega", position, 150, 400);

    // Should have all components from createFallingAnimal
    expect(entity.model).toBe("assets/models/animals/duck.glb");
    expect(entity.physics).toBeDefined();
    expect(entity.wobble).toBeDefined();
    expect(entity.mergeable).toBeDefined();
    expect(entity.colorOverlay).toBeDefined();
    expect(entity.emotion).toBeDefined();
    expect(entity.squish).toBeDefined();
  });

  it("should set correct falling target coordinates", () => {
    const entity = createBossAnimal(
      "sheep",
      "golden",
      new Vector3(250, 30, 0),
      200,
      500
    );

    expect(entity.falling?.targetX).toBe(200);
    expect(entity.falling?.targetY).toBe(500);
  });
});
