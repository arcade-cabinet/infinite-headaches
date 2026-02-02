/**
 * Unit Tests for ECS Components
 *
 * Tests that component type definitions work correctly
 * and Entity type composition is valid.
 */

import { describe, expect, it } from "vitest";
import { Vector3, Color3 } from "@babylonjs/core";
import type {
  Entity,
  PositionComponent,
  VelocityComponent,
  ScaleComponent,
  ModelComponent,
  ColorOverlayComponent,
  PhysicsComponent,
  TagComponent,
  MergeableComponent,
  TraitsComponent,
  InputControllableComponent,
  LifetimeComponent,
  WobbleComponent,
  AnimationComponent,
  FrozenComponent,
  GameProjectileComponent,
  BounceZoneComponent,
  AbilityComponent,
  StackableComponent,
  FallingComponent,
  StackedComponent,
  BankingComponent,
  ScatteringComponent,
  PlayerComponent,
  BossComponent,
  MergedComponent,
  EmotionComponent,
  SquishComponent,
} from "./index";

describe("ECS Components", () => {
  describe("PositionComponent", () => {
    it("should store a Vector3 position", () => {
      const component: PositionComponent = {
        position: new Vector3(10, 20, 30),
      };
      expect(component.position.x).toBe(10);
      expect(component.position.y).toBe(20);
      expect(component.position.z).toBe(30);
    });
  });

  describe("VelocityComponent", () => {
    it("should store a Vector3 velocity", () => {
      const component: VelocityComponent = {
        velocity: new Vector3(-5, 10, 0),
      };
      expect(component.velocity.x).toBe(-5);
      expect(component.velocity.y).toBe(10);
      expect(component.velocity.z).toBe(0);
    });
  });

  describe("ScaleComponent", () => {
    it("should store a Vector3 scale", () => {
      const component: ScaleComponent = {
        scale: new Vector3(1.5, 2.0, 1.0),
      };
      expect(component.scale.x).toBe(1.5);
      expect(component.scale.y).toBe(2.0);
      expect(component.scale.z).toBe(1.0);
    });
  });

  describe("ModelComponent", () => {
    it("should store model path and optional offset/rotation", () => {
      const component: ModelComponent = {
        model: "assets/models/cow.glb",
        offset: new Vector3(0, 0.5, 0),
        rotation: new Vector3(0, Math.PI, 0),
      };
      expect(component.model).toBe("assets/models/cow.glb");
      expect(component.offset?.y).toBe(0.5);
      expect(component.rotation?.y).toBe(Math.PI);
    });

    it("should allow model without offset or rotation", () => {
      const component: ModelComponent = {
        model: "assets/models/chicken.glb",
      };
      expect(component.model).toBe("assets/models/chicken.glb");
      expect(component.offset).toBeUndefined();
      expect(component.rotation).toBeUndefined();
    });
  });

  describe("ColorOverlayComponent", () => {
    it("should store color and intensity", () => {
      const component: ColorOverlayComponent = {
        color: new Color3(1, 0, 0),
        intensity: 0.5,
      };
      expect(component.color.r).toBe(1);
      expect(component.color.g).toBe(0);
      expect(component.color.b).toBe(0);
      expect(component.intensity).toBe(0.5);
    });

    it("should support zero intensity for no overlay", () => {
      const component: ColorOverlayComponent = {
        color: new Color3(1, 1, 1),
        intensity: 0,
      };
      expect(component.intensity).toBe(0);
    });
  });

  describe("PhysicsComponent", () => {
    it("should store physics properties", () => {
      const component: PhysicsComponent = {
        mass: 2.5,
        restitution: 0.3,
        friction: 0.7,
        isStatic: false,
      };
      expect(component.mass).toBe(2.5);
      expect(component.restitution).toBe(0.3);
      expect(component.friction).toBe(0.7);
      expect(component.isStatic).toBe(false);
    });

    it("should default isStatic to undefined", () => {
      const component: PhysicsComponent = {
        mass: 1,
        restitution: 0.5,
        friction: 0.5,
      };
      expect(component.isStatic).toBeUndefined();
    });
  });

  describe("TagComponent", () => {
    it("should store type for animal entities", () => {
      const component: TagComponent = {
        type: "animal",
        subtype: "chicken",
      };
      expect(component.type).toBe("animal");
      expect(component.subtype).toBe("chicken");
    });

    it("should store type for player entities", () => {
      const component: TagComponent = {
        type: "player",
        subtype: "farmer_john",
      };
      expect(component.type).toBe("player");
      expect(component.subtype).toBe("farmer_john");
    });

    it("should store type for powerup entities", () => {
      const component: TagComponent = {
        type: "powerup",
        subtype: "rare_candy",
      };
      expect(component.type).toBe("powerup");
      expect(component.subtype).toBe("rare_candy");
    });

    it("should allow type without subtype", () => {
      const component: TagComponent = {
        type: "platform",
      };
      expect(component.type).toBe("platform");
      expect(component.subtype).toBeUndefined();
    });
  });

  describe("MergeableComponent", () => {
    it("should store merge level and radius", () => {
      const component: MergeableComponent = {
        level: 3,
        mergeRadius: 2.0,
      };
      expect(component.level).toBe(3);
      expect(component.mergeRadius).toBe(2.0);
    });
  });

  describe("TraitsComponent", () => {
    it("should store character traits", () => {
      const component: TraitsComponent = {
        name: "Farmer John",
        positiveTraits: ["Steady Hands", "Patient"],
        negativeTraits: ["Slow Walker"],
      };
      expect(component.name).toBe("Farmer John");
      expect(component.positiveTraits).toHaveLength(2);
      expect(component.positiveTraits[0]).toBe("Steady Hands");
      expect(component.negativeTraits[0]).toBe("Slow Walker");
    });

    it("should allow empty trait arrays", () => {
      const component: TraitsComponent = {
        name: "Test",
        positiveTraits: [],
        negativeTraits: [],
      };
      expect(component.positiveTraits).toHaveLength(0);
      expect(component.negativeTraits).toHaveLength(0);
    });
  });

  describe("InputControllableComponent", () => {
    it("should store input control parameters", () => {
      const component: InputControllableComponent = {
        speed: 15,
        smoothness: 0.2,
      };
      expect(component.speed).toBe(15);
      expect(component.smoothness).toBe(0.2);
    });
  });

  describe("LifetimeComponent", () => {
    it("should store creation time and optional duration", () => {
      const now = Date.now();
      const component: LifetimeComponent = {
        createdAt: now,
        duration: 5000,
      };
      expect(component.createdAt).toBe(now);
      expect(component.duration).toBe(5000);
    });

    it("should allow infinite lifetime (no duration)", () => {
      const component: LifetimeComponent = {
        createdAt: Date.now(),
      };
      expect(component.duration).toBeUndefined();
    });
  });

  describe("WobbleComponent", () => {
    it("should store wobble physics parameters", () => {
      const component: WobbleComponent = {
        offset: 0.1,
        velocity: 0.05,
        damping: 0.9,
        springiness: 0.08,
      };
      expect(component.offset).toBe(0.1);
      expect(component.velocity).toBe(0.05);
      expect(component.damping).toBe(0.9);
      expect(component.springiness).toBe(0.08);
    });
  });

  describe("AnimationComponent", () => {
    it("should store animation state", () => {
      const component: AnimationComponent = {
        currentAnimation: "idle",
        animationSpeed: 1.0,
        isPlaying: true,
        availableAnimations: ["idle", "walk", "run"],
      };
      expect(component.currentAnimation).toBe("idle");
      expect(component.animationSpeed).toBe(1.0);
      expect(component.isPlaying).toBe(true);
      expect(component.availableAnimations).toContain("walk");
    });

    it("should support internal animation state", () => {
      const component: AnimationComponent = {
        currentAnimation: "walk",
        animationSpeed: 1.5,
        isPlaying: true,
        availableAnimations: ["idle", "walk"],
        _lastAnimation: "idle",
        _blendWeight: 0.5,
        _transitionDuration: 200,
      };
      expect(component._lastAnimation).toBe("idle");
      expect(component._blendWeight).toBe(0.5);
      expect(component._transitionDuration).toBe(200);
    });
  });

  describe("FrozenComponent", () => {
    it("should store freeze state and crack data", () => {
      const cracks = [
        { x1: 0, y1: 0, x2: 10, y2: 10 },
        { x1: 5, y1: 0, x2: 5, y2: 15 },
      ];
      const component: FrozenComponent = {
        freezeTimer: 3000,
        thawProgress: 0.25,
        crackStage: 1,
        maxCrackStages: 4,
        bobOffset: 0.5,
        bobTime: 100,
        iceRotation: 0.1,
        cracks,
      };
      expect(component.freezeTimer).toBe(3000);
      expect(component.thawProgress).toBe(0.25);
      expect(component.crackStage).toBe(1);
      expect(component.maxCrackStages).toBe(4);
      expect(component.cracks).toHaveLength(2);
      expect(component.cracks[0].x1).toBe(0);
      expect(component.cracks[0].x2).toBe(10);
    });
  });

  describe("GameProjectileComponent", () => {
    it("should store fireball projectile data", () => {
      const component: GameProjectileComponent = {
        type: "fireball",
        direction: new Vector3(1, 0, 0),
        speed: 12,
        lifetime: 2000,
        maxLifetime: 2000,
        size: 20,
        rotation: 0,
        trailParticles: [],
      };
      expect(component.type).toBe("fireball");
      expect(component.direction.x).toBe(1);
      expect(component.speed).toBe(12);
      expect(component.lifetime).toBe(2000);
      expect(component.size).toBe(20);
    });

    it("should store trail particles", () => {
      const component: GameProjectileComponent = {
        type: "corn",
        direction: new Vector3(0, -1, 0),
        speed: 8,
        lifetime: 1500,
        maxLifetime: 2000,
        size: 10,
        rotation: Math.PI / 4,
        trailParticles: [
          { x: 10, y: 20, size: 5, life: 0.8 },
          { x: 12, y: 22, size: 4, life: 0.6 },
        ],
      };
      expect(component.trailParticles).toHaveLength(2);
      expect(component.trailParticles[0].life).toBe(0.8);
    });
  });

  describe("BounceZoneComponent", () => {
    it("should store bounce zone data", () => {
      const component: BounceZoneComponent = {
        bounceForce: 5,
        expiresAt: Date.now() + 3000,
        radius: 2.0,
        triggeredBy: ["entity-1", "entity-2"],
      };
      expect(component.bounceForce).toBe(5);
      expect(component.radius).toBe(2.0);
      expect(component.triggeredBy).toContain("entity-1");
    });
  });

  describe("AbilityComponent", () => {
    it("should store ability data without charges", () => {
      const component: AbilityComponent = {
        abilityId: "fireball",
        cooldownMs: 3000,
        lastUsed: 0,
        isActive: false,
      };
      expect(component.abilityId).toBe("fireball");
      expect(component.cooldownMs).toBe(3000);
      expect(component.isActive).toBe(false);
      expect(component.charges).toBeUndefined();
    });

    it("should store ability data with charges", () => {
      const component: AbilityComponent = {
        abilityId: "freeze",
        cooldownMs: 5000,
        lastUsed: 1000,
        isActive: true,
        charges: 2,
        maxCharges: 3,
      };
      expect(component.charges).toBe(2);
      expect(component.maxCharges).toBe(3);
    });
  });

  describe("StackableComponent", () => {
    it("should store stack position data", () => {
      const component: StackableComponent = {
        stackIndex: 3,
        stackOffset: 0.15,
        landedAt: Date.now(),
        parentEntityId: "entity-below",
      };
      expect(component.stackIndex).toBe(3);
      expect(component.stackOffset).toBe(0.15);
      expect(component.parentEntityId).toBe("entity-below");
    });

    it("should allow base stack position without parent", () => {
      const component: StackableComponent = {
        stackIndex: 0,
        stackOffset: 0,
        landedAt: Date.now(),
      };
      expect(component.stackIndex).toBe(0);
      expect(component.parentEntityId).toBeUndefined();
    });
  });

  describe("FallingComponent", () => {
    it("should store falling behavior data", () => {
      const component: FallingComponent = {
        targetX: 200,
        targetY: 400,
        behaviorType: "seeker",
        spawnX: 150,
        spawnTime: Date.now(),
      };
      expect(component.targetX).toBe(200);
      expect(component.targetY).toBe(400);
      expect(component.behaviorType).toBe("seeker");
      expect(component.spawnX).toBe(150);
    });

    it("should support all behavior types", () => {
      const behaviorTypes: FallingComponent["behaviorType"][] = [
        "normal",
        "seeker",
        "evader",
        "zigzag",
        "swarm",
        "dive",
        "floater",
      ];
      for (const behaviorType of behaviorTypes) {
        const component: FallingComponent = {
          targetX: 0,
          targetY: 0,
          behaviorType,
          spawnX: 0,
          spawnTime: 0,
        };
        expect(component.behaviorType).toBe(behaviorType);
      }
    });
  });

  describe("StackedComponent", () => {
    it("should store stacked entity data", () => {
      const component: StackedComponent = {
        stackIndex: 2,
        stackOffset: -0.1,
        baseEntityId: "player-1",
      };
      expect(component.stackIndex).toBe(2);
      expect(component.stackOffset).toBe(-0.1);
      expect(component.baseEntityId).toBe("player-1");
    });
  });

  describe("BankingComponent", () => {
    it("should store banking animation data", () => {
      const component: BankingComponent = {
        targetX: 50,
        targetY: 100,
        startedAt: Date.now(),
      };
      expect(component.targetX).toBe(50);
      expect(component.targetY).toBe(100);
      expect(component.startedAt).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("ScatteringComponent", () => {
    it("should store scattering animation data", () => {
      const component: ScatteringComponent = {
        rotationVelocity: 0.15,
        startedAt: Date.now(),
      };
      expect(component.rotationVelocity).toBe(0.15);
      expect(component.startedAt).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("PlayerComponent", () => {
    it("should store player control state for farmer_john", () => {
      const component: PlayerComponent = {
        characterId: "farmer_john",
        isDragging: true,
        lastDragX: 150,
        smoothedVelocity: 2.5,
      };
      expect(component.characterId).toBe("farmer_john");
      expect(component.isDragging).toBe(true);
      expect(component.lastDragX).toBe(150);
      expect(component.smoothedVelocity).toBe(2.5);
    });

    it("should store player control state for farmer_mary", () => {
      const component: PlayerComponent = {
        characterId: "farmer_mary",
        isDragging: false,
        lastDragX: 0,
        smoothedVelocity: 0,
      };
      expect(component.characterId).toBe("farmer_mary");
    });
  });

  describe("BossComponent", () => {
    it("should store mega boss data", () => {
      const component: BossComponent = {
        bossType: "mega",
        health: 3,
        maxHealth: 3,
        isPhasing: false,
        hitFlashTime: 0,
        pulsePhase: 0,
        reward: 500,
      };
      expect(component.bossType).toBe("mega");
      expect(component.health).toBe(3);
      expect(component.reward).toBe(500);
    });

    it("should store shadow boss with phasing", () => {
      const component: BossComponent = {
        bossType: "shadow",
        health: 4,
        maxHealth: 5,
        isPhasing: true,
        hitFlashTime: 100,
        pulsePhase: Math.PI,
        reward: 750,
      };
      expect(component.bossType).toBe("shadow");
      expect(component.isPhasing).toBe(true);
      expect(component.hitFlashTime).toBe(100);
    });

    it("should store golden boss data", () => {
      const component: BossComponent = {
        bossType: "golden",
        health: 2,
        maxHealth: 2,
        isPhasing: false,
        hitFlashTime: 0,
        pulsePhase: 0,
        reward: 1000,
      };
      expect(component.bossType).toBe("golden");
      expect(component.reward).toBe(1000);
    });
  });

  describe("MergedComponent", () => {
    it("should store merged animal data", () => {
      const component: MergedComponent = {
        mergeLevel: 5,
        mergeScale: 1.6,
        originalTypes: ["chicken", "chicken", "duck", "chicken", "pig"],
      };
      expect(component.mergeLevel).toBe(5);
      expect(component.mergeScale).toBe(1.6);
      expect(component.originalTypes).toHaveLength(5);
      expect(component.originalTypes).toContain("duck");
    });
  });

  describe("EmotionComponent", () => {
    it("should store emotional state", () => {
      const component: EmotionComponent = {
        isHeadache: true,
        isConfused: false,
        confusedTimer: 0,
      };
      expect(component.isHeadache).toBe(true);
      expect(component.isConfused).toBe(false);
    });

    it("should track confusion timer", () => {
      const component: EmotionComponent = {
        isHeadache: false,
        isConfused: true,
        confusedTimer: 1500,
      };
      expect(component.isConfused).toBe(true);
      expect(component.confusedTimer).toBe(1500);
    });
  });

  describe("SquishComponent", () => {
    it("should store squish animation state", () => {
      const component: SquishComponent = {
        scaleX: 1.2,
        scaleY: 0.8,
        targetScaleX: 1.0,
        targetScaleY: 1.0,
        recoverySpeed: 0.12,
      };
      expect(component.scaleX).toBe(1.2);
      expect(component.scaleY).toBe(0.8);
      expect(component.targetScaleX).toBe(1.0);
      expect(component.targetScaleY).toBe(1.0);
      expect(component.recoverySpeed).toBe(0.12);
    });
  });
});

describe("Entity Type Composition", () => {
  it("should allow creating a minimal entity with just id", () => {
    const entity: Entity = {
      id: "test-entity",
    };
    expect(entity.id).toBe("test-entity");
    expect(entity.position).toBeUndefined();
  });

  it("should allow creating a full animal entity", () => {
    const entity: Entity = {
      id: "animal-1",
      position: new Vector3(100, 200, 0),
      velocity: new Vector3(0, -5, 0),
      scale: new Vector3(1, 1, 1),
      model: "assets/models/chicken.glb",
      tag: { type: "animal", subtype: "chicken" },
      physics: { mass: 1, restitution: 0.2, friction: 0.5 },
      wobble: { offset: 0, velocity: 0, damping: 0.9, springiness: 0.08 },
      mergeable: { level: 1, mergeRadius: 1.5 },
      colorOverlay: { color: new Color3(1, 1, 1), intensity: 0 },
      falling: {
        targetX: 100,
        targetY: 300,
        behaviorType: "normal",
        spawnX: 100,
        spawnTime: Date.now(),
      },
      emotion: { isHeadache: false, isConfused: false, confusedTimer: 0 },
      squish: {
        scaleX: 1,
        scaleY: 1,
        targetScaleX: 1,
        targetScaleY: 1,
        recoverySpeed: 0.12,
      },
    };

    expect(entity.id).toBe("animal-1");
    expect(entity.tag?.type).toBe("animal");
    expect(entity.tag?.subtype).toBe("chicken");
    expect(entity.falling?.behaviorType).toBe("normal");
    expect(entity.emotion?.isHeadache).toBe(false);
  });

  it("should allow creating a player entity", () => {
    const entity: Entity = {
      id: "player-1",
      position: new Vector3(200, 500, 0),
      velocity: new Vector3(0, 0, 0),
      scale: new Vector3(1.2, 1.2, 1.2),
      model: "assets/models/farmer_john.glb",
      tag: { type: "player", subtype: "farmer_john" },
      input: { speed: 10, smoothness: 0.1 },
      wobble: { offset: 0, velocity: 0, damping: 0.9, springiness: 0.05 },
      traits: {
        name: "Farmer John",
        positiveTraits: ["Steady Hands"],
        negativeTraits: ["Slow Walker"],
      },
      player: {
        characterId: "farmer_john",
        isDragging: false,
        lastDragX: 0,
        smoothedVelocity: 0,
      },
    };

    expect(entity.tag?.type).toBe("player");
    expect(entity.player?.characterId).toBe("farmer_john");
    expect(entity.traits?.name).toBe("Farmer John");
    expect(entity.input?.speed).toBe(10);
  });

  it("should allow creating a projectile entity", () => {
    const entity: Entity = {
      id: "fireball-1",
      position: new Vector3(100, 300, 0),
      velocity: new Vector3(12, 0, 0),
      gameProjectile: {
        type: "fireball",
        direction: new Vector3(1, 0, 0),
        speed: 12,
        lifetime: 2000,
        maxLifetime: 2000,
        size: 20,
        rotation: 0,
        trailParticles: [],
      },
      lifetime: {
        createdAt: Date.now(),
        duration: 2000,
      },
    };

    expect(entity.gameProjectile?.type).toBe("fireball");
    expect(entity.lifetime?.duration).toBe(2000);
  });

  it("should allow creating a boss entity", () => {
    const entity: Entity = {
      id: "boss-1",
      position: new Vector3(150, 50, 0),
      velocity: new Vector3(0, 2, 0),
      scale: new Vector3(1.8, 1.8, 1.8),
      model: "assets/models/cow.glb",
      tag: { type: "animal", subtype: "cow" },
      falling: {
        targetX: 150,
        targetY: 400,
        behaviorType: "normal",
        spawnX: 150,
        spawnTime: Date.now(),
      },
      boss: {
        bossType: "mega",
        health: 3,
        maxHealth: 3,
        isPhasing: false,
        hitFlashTime: 0,
        pulsePhase: 0,
        reward: 500,
      },
    };

    expect(entity.boss?.bossType).toBe("mega");
    expect(entity.boss?.health).toBe(3);
    expect(entity.boss?.reward).toBe(500);
    expect(entity.scale?.x).toBe(1.8);
  });

  it("should allow creating a stacked entity", () => {
    const entity: Entity = {
      id: "stacked-animal-1",
      position: new Vector3(200, 350, 0),
      velocity: new Vector3(0, 0, 0),
      scale: new Vector3(1, 1, 1),
      model: "assets/models/duck.glb",
      tag: { type: "animal", subtype: "duck" },
      stacked: {
        stackIndex: 2,
        stackOffset: 0.05,
        baseEntityId: "player-1",
      },
    };

    expect(entity.stacked?.stackIndex).toBe(2);
    expect(entity.stacked?.baseEntityId).toBe("player-1");
  });

  it("should allow creating a frozen entity", () => {
    const entity: Entity = {
      id: "frozen-animal-1",
      position: new Vector3(250, 150, 0),
      velocity: new Vector3(0, 0, 0),
      model: "assets/models/pig.glb",
      tag: { type: "animal", subtype: "pig" },
      frozen: {
        freezeTimer: 3000,
        thawProgress: 0,
        crackStage: 0,
        maxCrackStages: 4,
        bobOffset: 0,
        bobTime: 0,
        iceRotation: 0.1,
        cracks: [{ x1: 0, y1: 0, x2: 5, y2: 5 }],
      },
    };

    expect(entity.frozen?.freezeTimer).toBe(3000);
    expect(entity.frozen?.crackStage).toBe(0);
    expect(entity.frozen?.cracks).toHaveLength(1);
  });

  it("should allow transitioning entity from falling to stacked", () => {
    const entity: Entity = {
      id: "transitioning-entity",
      position: new Vector3(200, 400, 0),
      velocity: new Vector3(0, -5, 0),
      falling: {
        targetX: 200,
        targetY: 500,
        behaviorType: "normal",
        spawnX: 200,
        spawnTime: Date.now(),
      },
    };

    expect(entity.falling).toBeDefined();
    expect(entity.stacked).toBeUndefined();

    // Simulate transition
    delete entity.falling;
    entity.stacked = {
      stackIndex: 0,
      stackOffset: 0,
      baseEntityId: "player-1",
    };
    entity.velocity = new Vector3(0, 0, 0);

    expect(entity.falling).toBeUndefined();
    expect(entity.stacked).toBeDefined();
    expect(entity.stacked?.stackIndex).toBe(0);
  });

  it("should support entity with ability component", () => {
    const entity: Entity = {
      id: "fire-chicken-1",
      position: new Vector3(200, 300, 0),
      tag: { type: "animal", subtype: "chicken" },
      ability: {
        abilityId: "fireball",
        cooldownMs: 3000,
        lastUsed: 0,
        isActive: false,
      },
    };

    expect(entity.ability?.abilityId).toBe("fireball");
    expect(entity.ability?.cooldownMs).toBe(3000);
  });
});
