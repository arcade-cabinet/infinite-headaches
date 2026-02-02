/**
 * AnimationSystem Unit Tests
 *
 * Tests the animation system logic for:
 * - Creating animation components with correct defaults
 * - Registering/unregistering entity animations
 * - Normalizing animation names from common prefixes
 * - Querying available animations and fuzzy matching
 * - Automatic locomotion animation switching based on velocity
 * - Triggering one-shot animations manually
 * - Animation blending configuration
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock the world module before importing AnimationSystem
vi.mock("../world", () => ({
  world: {
    with: vi.fn().mockReturnValue([]),
  },
}));

import { world } from "../world";
import type { Entity, AnimationComponent } from "../components";
import {
  AnimationSystem,
  animationRegistry,
  registerEntityAnimations,
  unregisterEntityAnimations,
  createAnimationComponent,
  triggerAnimation,
  getAvailableAnimations,
  hasAnimation,
} from "./AnimationSystem";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/** Creates a mock AnimationGroup with the given name. */
function createMockAnimationGroup(name: string) {
  return {
    name,
    stop: vi.fn(),
    start: vi.fn(),
    isPlaying: false,
    weight: 1,
    speedRatio: 1,
    enableBlending: false,
    onAnimationGroupEndObservable: {
      addOnce: vi.fn(),
    },
  };
}

/** Creates a mock Scene with an observable that stores its callbacks. */
function createMockScene() {
  return {
    onBeforeRenderObservable: {
      add: vi.fn().mockReturnValue("observer-handle"),
      remove: vi.fn(),
    },
  };
}

/** Creates a minimal mock AbstractMesh. */
function createMockRootMesh() {
  return { id: "mock-root-mesh" };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  animationRegistry.clear();
  vi.mocked(world.with).mockReturnValue([]);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ===========================================================================
// Tests
// ===========================================================================

describe("createAnimationComponent", () => {
  it("creates a component with sensible defaults", () => {
    const comp = createAnimationComponent();

    expect(comp.currentAnimation).toBe("idle");
    expect(comp.animationSpeed).toBe(1.0);
    expect(comp.isPlaying).toBe(true);
    expect(comp.availableAnimations).toEqual([]);
    expect(comp._blendWeight).toBe(1);
    expect(comp._transitionDuration).toBe(0.2);
    expect(comp._lastAnimation).toBeUndefined();
  });

  it("creates a component with custom options", () => {
    const comp = createAnimationComponent({
      currentAnimation: "walk",
      animationSpeed: 2.5,
      isPlaying: false,
      availableAnimations: ["walk", "run"],
      _transitionDuration: 0.5,
    });

    expect(comp.currentAnimation).toBe("walk");
    expect(comp.animationSpeed).toBe(2.5);
    expect(comp.isPlaying).toBe(false);
    expect(comp.availableAnimations).toEqual(["walk", "run"]);
    expect(comp._transitionDuration).toBe(0.5);
  });

  it("merges partial options correctly with defaults", () => {
    const comp = createAnimationComponent({
      animationSpeed: 0.5,
    });

    // Overridden
    expect(comp.animationSpeed).toBe(0.5);
    // Defaults preserved
    expect(comp.currentAnimation).toBe("idle");
    expect(comp.isPlaying).toBe(true);
    expect(comp.availableAnimations).toEqual([]);
    expect(comp._blendWeight).toBe(1);
    expect(comp._transitionDuration).toBe(0.2);
  });
});

// ---------------------------------------------------------------------------

describe("registerEntityAnimations", () => {
  it("registers animation groups and returns normalized names", () => {
    const groups = [
      createMockAnimationGroup("Idle"),
      createMockAnimationGroup("Walk"),
    ];
    const scene = createMockScene();
    const mesh = createMockRootMesh();

    const names = registerEntityAnimations(
      "entity-1",
      groups as any,
      mesh as any,
      scene as any
    );

    expect(names).toEqual(["idle", "walk"]);
    expect(animationRegistry.has("entity-1")).toBe(true);
  });

  it("normalizes 'Armature|Idle' to 'idle'", () => {
    const groups = [createMockAnimationGroup("Armature|Idle")];
    const names = registerEntityAnimations(
      "ent-armature",
      groups as any,
      createMockRootMesh() as any,
      createMockScene() as any
    );

    expect(names).toEqual(["idle"]);
  });

  it("normalizes 'mixamo.com|Walk' to 'walk'", () => {
    const groups = [createMockAnimationGroup("mixamo.com|Walk")];
    const names = registerEntityAnimations(
      "ent-mixamo",
      groups as any,
      createMockRootMesh() as any,
      createMockScene() as any
    );

    expect(names).toEqual(["walk"]);
  });

  it("normalizes 'Anim_Jump' to 'jump'", () => {
    const groups = [createMockAnimationGroup("Anim_Jump")];
    const names = registerEntityAnimations(
      "ent-anim",
      groups as any,
      createMockRootMesh() as any,
      createMockScene() as any
    );

    expect(names).toEqual(["jump"]);
  });

  it("normalizes 'Animation_Die' to 'die'", () => {
    const groups = [createMockAnimationGroup("Animation_Die")];
    const names = registerEntityAnimations(
      "ent-die",
      groups as any,
      createMockRootMesh() as any,
      createMockScene() as any
    );

    expect(names).toEqual(["die"]);
  });

  it("stops all animation groups on register", () => {
    const groups = [
      createMockAnimationGroup("Idle"),
      createMockAnimationGroup("Walk"),
      createMockAnimationGroup("Run"),
    ];

    registerEntityAnimations(
      "entity-stop",
      groups as any,
      createMockRootMesh() as any,
      createMockScene() as any
    );

    for (const group of groups) {
      expect(group.stop).toHaveBeenCalled();
    }
  });

  it("stores the entry in animationRegistry", () => {
    const groups = [createMockAnimationGroup("Idle")];
    const scene = createMockScene();
    const mesh = createMockRootMesh();

    registerEntityAnimations(
      "entity-reg",
      groups as any,
      mesh as any,
      scene as any
    );

    const entry = animationRegistry.get("entity-reg");
    expect(entry).toBeDefined();
    expect(entry!.groups.size).toBe(1);
    expect(entry!.groups.has("idle")).toBe(true);
    expect(entry!.rootMesh).toBe(mesh);
    expect(entry!.scene).toBe(scene);
  });
});

// ---------------------------------------------------------------------------

describe("unregisterEntityAnimations", () => {
  it("stops all animations and removes from registry", () => {
    const groups = [
      createMockAnimationGroup("Idle"),
      createMockAnimationGroup("Walk"),
    ];

    registerEntityAnimations(
      "entity-unreg",
      groups as any,
      createMockRootMesh() as any,
      createMockScene() as any
    );

    // Reset call counts from registration
    for (const g of groups) {
      g.stop.mockClear();
    }

    unregisterEntityAnimations("entity-unreg");

    for (const g of groups) {
      expect(g.stop).toHaveBeenCalled();
    }
    expect(animationRegistry.has("entity-unreg")).toBe(false);
  });

  it("handles non-existent entityId gracefully", () => {
    // Should not throw
    expect(() => unregisterEntityAnimations("does-not-exist")).not.toThrow();
  });

  it("clears registry entry completely", () => {
    const groups = [createMockAnimationGroup("Idle")];

    registerEntityAnimations(
      "entity-clear",
      groups as any,
      createMockRootMesh() as any,
      createMockScene() as any
    );

    unregisterEntityAnimations("entity-clear");

    expect(animationRegistry.get("entity-clear")).toBeUndefined();
    expect(animationRegistry.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------

describe("getAvailableAnimations", () => {
  it("returns animation names for a registered entity", () => {
    const groups = [
      createMockAnimationGroup("Idle"),
      createMockAnimationGroup("Walk"),
      createMockAnimationGroup("Attack"),
    ];

    registerEntityAnimations(
      "entity-avail",
      groups as any,
      createMockRootMesh() as any,
      createMockScene() as any
    );

    const available = getAvailableAnimations("entity-avail");

    expect(available).toEqual(["idle", "walk", "attack"]);
  });

  it("returns empty array for unregistered entity", () => {
    const available = getAvailableAnimations("no-such-entity");
    expect(available).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe("hasAnimation", () => {
  beforeEach(() => {
    const groups = [
      createMockAnimationGroup("Idle"),
      createMockAnimationGroup("Walk"),
      createMockAnimationGroup("Death"),
    ];

    registerEntityAnimations(
      "entity-has",
      groups as any,
      createMockRootMesh() as any,
      createMockScene() as any
    );
  });

  it("returns true for exact match", () => {
    expect(hasAnimation("entity-has", "idle")).toBe(true);
    expect(hasAnimation("entity-has", "walk")).toBe(true);
  });

  it("returns true for similar/fuzzy match", () => {
    // "die" should fuzzy-match "death" via the mappings: die -> ["die","death","dead","fall"]
    expect(hasAnimation("entity-has", "die")).toBe(true);
  });

  it("returns false for no match", () => {
    expect(hasAnimation("entity-has", "swim")).toBe(false);
  });

  it("returns false for unregistered entity", () => {
    expect(hasAnimation("no-entity", "idle")).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe("AnimationSystem", () => {
  /** Helper to register animations for an entity and return the mock groups. */
  function registerTestAnimations(entityId: string, animNames: string[]) {
    const groups = animNames.map((n) => createMockAnimationGroup(n));
    const scene = createMockScene();
    registerEntityAnimations(
      entityId,
      groups as any,
      createMockRootMesh() as any,
      scene as any
    );
    return { groups, scene };
  }

  it("skips entities without id", () => {
    const entity: Entity = {
      animation: createAnimationComponent(),
      // no id
    };

    vi.mocked(world.with).mockReturnValue([entity] as any);

    // Should not throw
    expect(() => AnimationSystem(0.016)).not.toThrow();
  });

  it("skips entities without registered animations", () => {
    const entity: Entity = {
      id: "unregistered-entity",
      animation: createAnimationComponent(),
    };

    vi.mocked(world.with).mockReturnValue([entity] as any);

    // Should not throw and not modify _lastAnimation
    AnimationSystem(0.016);
    expect(entity.animation!._lastAnimation).toBeUndefined();
  });

  it("auto-determines 'idle' from zero velocity", () => {
    const entityId = "entity-idle";
    const { groups } = registerTestAnimations(entityId, [
      "Idle",
      "Walk",
      "Run",
    ]);

    const entity: Entity = {
      id: entityId,
      animation: createAnimationComponent({ currentAnimation: "idle" }),
      velocity: { x: 0, y: 0, z: 0 } as any,
    };

    vi.mocked(world.with).mockReturnValue([entity] as any);

    AnimationSystem(0.016);

    expect(entity.animation!.currentAnimation).toBe("idle");
    expect(entity.animation!._lastAnimation).toBe("idle");
  });

  it("auto-determines 'walk' from moderate velocity", () => {
    const entityId = "entity-walk";
    const { groups } = registerTestAnimations(entityId, [
      "Idle",
      "Walk",
      "Run",
    ]);

    const entity: Entity = {
      id: entityId,
      animation: createAnimationComponent({ currentAnimation: "idle" }),
      velocity: { x: 2, y: 0, z: 0 } as any,
    };

    vi.mocked(world.with).mockReturnValue([entity] as any);

    AnimationSystem(0.016);

    expect(entity.animation!.currentAnimation).toBe("walk");
    expect(entity.animation!._lastAnimation).toBe("walk");
  });

  it("auto-determines 'run' from high velocity (x > 5)", () => {
    const entityId = "entity-run";
    registerTestAnimations(entityId, ["Idle", "Walk", "Run"]);

    const entity: Entity = {
      id: entityId,
      animation: createAnimationComponent({ currentAnimation: "idle" }),
      velocity: { x: 8, y: 0, z: 0 } as any,
    };

    vi.mocked(world.with).mockReturnValue([entity] as any);

    AnimationSystem(0.016);

    expect(entity.animation!.currentAnimation).toBe("run");
    expect(entity.animation!._lastAnimation).toBe("run");
  });

  it("plays animation when currentAnimation changes", () => {
    const entityId = "entity-play";
    const { groups } = registerTestAnimations(entityId, [
      "Idle",
      "Walk",
      "Run",
    ]);

    const entity: Entity = {
      id: entityId,
      animation: createAnimationComponent({ currentAnimation: "walk" }),
    };

    vi.mocked(world.with).mockReturnValue([entity] as any);

    AnimationSystem(0.016);

    // The walk animation group should have been started
    const walkGroup = groups.find((g) => g.name === "Walk")!;
    expect(walkGroup.start).toHaveBeenCalled();
    expect(entity.animation!._lastAnimation).toBe("walk");
  });

  it("does not replay the same animation", () => {
    const entityId = "entity-noreplay";
    const { groups } = registerTestAnimations(entityId, [
      "Idle",
      "Walk",
      "Run",
    ]);

    const entity: Entity = {
      id: entityId,
      animation: createAnimationComponent({ currentAnimation: "idle" }),
    };

    vi.mocked(world.with).mockReturnValue([entity] as any);

    // First frame: plays idle
    AnimationSystem(0.016);
    const idleGroup = groups.find((g) => g.name === "Idle")!;
    expect(idleGroup.start).toHaveBeenCalledTimes(1);

    // Second frame: same animation, should not replay
    idleGroup.start.mockClear();
    AnimationSystem(0.016);
    expect(idleGroup.start).not.toHaveBeenCalled();
  });

  it("respects animation.isPlaying = false and stops animations", () => {
    const entityId = "entity-stop-playing";
    const { groups } = registerTestAnimations(entityId, ["Idle", "Walk"]);

    const animation = createAnimationComponent({ currentAnimation: "idle" });
    const entity: Entity = {
      id: entityId,
      animation,
    };

    vi.mocked(world.with).mockReturnValue([entity] as any);

    // First tick to set _lastAnimation
    AnimationSystem(0.016);
    expect(animation._lastAnimation).toBe("idle");

    // Now set isPlaying to false
    animation.isPlaying = false;
    AnimationSystem(0.016);

    // All groups should have stop called (via stopAnimation)
    for (const g of groups) {
      // stop is called during register + during stopAnimation
      expect(g.stop).toHaveBeenCalled();
    }
    expect(animation._lastAnimation).toBeUndefined();
  });

  it("only auto-switches for locomotion animations (idle/walk/run)", () => {
    const entityId = "entity-locomotion-only";
    registerTestAnimations(entityId, ["Idle", "Walk", "Run", "Attack"]);

    const entity: Entity = {
      id: entityId,
      animation: createAnimationComponent({ currentAnimation: "idle" }),
      velocity: { x: 3, y: 0, z: 0 } as any,
    };

    vi.mocked(world.with).mockReturnValue([entity] as any);

    // From idle with velocity -> should switch to walk
    AnimationSystem(0.016);
    expect(entity.animation!.currentAnimation).toBe("walk");
  });

  it("does not auto-switch non-locomotion animations (e.g., 'attack')", () => {
    const entityId = "entity-no-autoswitch";
    registerTestAnimations(entityId, ["Idle", "Walk", "Run", "Attack"]);

    const entity: Entity = {
      id: entityId,
      animation: createAnimationComponent({ currentAnimation: "attack" }),
      velocity: { x: 3, y: 0, z: 0 } as any,
    };

    vi.mocked(world.with).mockReturnValue([entity] as any);

    AnimationSystem(0.016);

    // Should remain "attack" because it is not a locomotion animation
    expect(entity.animation!.currentAnimation).toBe("attack");
  });

  it("uses custom blend config when provided", () => {
    const entityId = "entity-custom-blend";
    registerTestAnimations(entityId, ["Idle", "Walk"]);

    const entity: Entity = {
      id: entityId,
      animation: createAnimationComponent({ currentAnimation: "idle" }),
      velocity: { x: 0.05, y: 0, z: 0 } as any, // below default 0.1 but above custom 0.01
    };

    vi.mocked(world.with).mockReturnValue([entity] as any);

    // With custom low velocity threshold, 0.05 should trigger "walk"
    AnimationSystem(0.016, {
      transitionDuration: 0.5,
      velocityThreshold: 0.01,
    });

    expect(entity.animation!.currentAnimation).toBe("walk");
  });
});

// ---------------------------------------------------------------------------

describe("triggerAnimation", () => {
  /** Helper to set up an entity with registered animations. */
  function setupTriggerEntity(entityId: string, animNames: string[]) {
    const groups = animNames.map((n) => createMockAnimationGroup(n));
    const scene = createMockScene();
    registerEntityAnimations(
      entityId,
      groups as any,
      createMockRootMesh() as any,
      scene as any
    );

    const animation = createAnimationComponent({
      availableAnimations: animNames.map((n) => n.toLowerCase()),
    });

    const entity: Entity = {
      id: entityId,
      animation,
    };

    return { entity, groups, scene, animation };
  }

  it("returns false for entity without id", () => {
    const entity: Entity = {
      animation: createAnimationComponent(),
    };

    const result = triggerAnimation(entity, "attack");
    expect(result).toBe(false);
  });

  it("returns false for entity without animation component", () => {
    const entity: Entity = {
      id: "no-anim",
    };

    const result = triggerAnimation(entity, "attack");
    expect(result).toBe(false);
  });

  it("returns false for unregistered entity", () => {
    const entity: Entity = {
      id: "not-registered",
      animation: createAnimationComponent(),
    };

    const result = triggerAnimation(entity, "attack");
    expect(result).toBe(false);
  });

  it("sets currentAnimation on entity", () => {
    const { entity } = setupTriggerEntity("trigger-set", [
      "Idle",
      "Attack",
    ]);

    triggerAnimation(entity, "attack");

    expect(entity.animation!.currentAnimation).toBe("attack");
  });

  it("plays animation with specified options and returns true", () => {
    const { entity, groups } = setupTriggerEntity("trigger-play", [
      "Idle",
      "Attack",
    ]);

    const result = triggerAnimation(entity, "attack", {
      speed: 2.0,
      loop: true,
      blendDuration: 0.3,
    });

    expect(result).toBe(true);

    const attackGroup = groups.find((g) => g.name === "Attack")!;
    expect(attackGroup.speedRatio).toBe(2.0);
    expect(attackGroup.start).toHaveBeenCalledWith(true);
  });

  it("supports loop option defaulting to false", () => {
    const { entity, groups } = setupTriggerEntity("trigger-loop", [
      "Idle",
      "Jump",
    ]);

    triggerAnimation(entity, "jump");

    const jumpGroup = groups.find((g) => g.name === "Jump")!;
    // Default loop is false, so start should be called with false
    expect(jumpGroup.start).toHaveBeenCalledWith(false);
  });

  it("supports speed option", () => {
    const { entity, groups } = setupTriggerEntity("trigger-speed", [
      "Idle",
      "Attack",
    ]);

    triggerAnimation(entity, "attack", { speed: 3.0 });

    const attackGroup = groups.find((g) => g.name === "Attack")!;
    expect(attackGroup.speedRatio).toBe(3.0);
  });
});
