/**
 * loadModel3D Unit Tests
 *
 * Tests the shared 3D model loading utility:
 * - selectIdleAnimation: prioritization logic and fallback behavior
 * - findIdleAnimationGroup: name pattern matching and fallback to first group
 * - disposeModelResult: verifying dispose is called on meshes and animation groups
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  selectIdleAnimation,
  findIdleAnimationGroup,
  disposeModelResult,
} from "./loadModel3D";
import type { AnimationGroup, ISceneLoaderAsyncResult } from "@babylonjs/core";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/** Creates a mock AnimationGroup with the given name. */
function createMockAnimationGroup(name: string) {
  return {
    name,
    dispose: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    enableBlending: false,
    targetedAnimations: [],
  } as unknown as AnimationGroup;
}

/** Creates a mock AbstractMesh with the given name. */
function createMockMesh(name: string) {
  return {
    name,
    dispose: vi.fn(),
    material: null,
  };
}

/** Creates a mock ISceneLoaderAsyncResult. */
function createMockLoaderResult(
  meshNames: string[],
  animGroupNames: string[]
): ISceneLoaderAsyncResult {
  return {
    meshes: meshNames.map((n) => createMockMesh(n)),
    animationGroups: animGroupNames.map((n) => createMockAnimationGroup(n)),
    skeletons: [],
    particleSystems: [],
    transformNodes: [],
    geometries: [],
    lights: [],
    spriteManagers: [],
  } as unknown as ISceneLoaderAsyncResult;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ===========================================================================
// selectIdleAnimation
// ===========================================================================

describe("selectIdleAnimation", () => {
  describe("priority-based selection", () => {
    it("returns 'idle' when present", () => {
      const result = selectIdleAnimation(["walk", "idle", "run"]);
      expect(result).toBe("idle");
    });

    it("returns 'stand' when 'idle' is absent", () => {
      const result = selectIdleAnimation(["walk", "stand", "run"]);
      expect(result).toBe("stand");
    });

    it("returns 'breathe' when 'idle' and 'stand' are absent", () => {
      const result = selectIdleAnimation(["walk", "breathe", "run"]);
      expect(result).toBe("breathe");
    });

    it("returns 'rest' when higher-priority candidates are absent", () => {
      const result = selectIdleAnimation(["walk", "rest", "run"]);
      expect(result).toBe("rest");
    });

    it("returns 'wait' when it is the only priority candidate", () => {
      const result = selectIdleAnimation(["walk", "wait", "run"]);
      expect(result).toBe("wait");
    });

    it("prefers 'idle' over 'stand' even when 'stand' comes first in the list", () => {
      const result = selectIdleAnimation(["stand", "idle", "breathe"]);
      expect(result).toBe("idle");
    });

    it("respects full priority order: idle > stand > breathe > rest > wait", () => {
      // Only rest and wait available
      expect(selectIdleAnimation(["rest", "wait"])).toBe("rest");
      // Only breathe and rest available
      expect(selectIdleAnimation(["rest", "breathe"])).toBe("breathe");
      // Only stand and breathe available
      expect(selectIdleAnimation(["breathe", "stand"])).toBe("stand");
    });
  });

  describe("fallback to non-movement animation", () => {
    it("picks the first non-movement animation when no priority candidates exist", () => {
      const result = selectIdleAnimation(["walk", "attack", "run"]);
      expect(result).toBe("attack");
    });

    it("skips movement animations (walk, run, sprint, jog, locomotion, move)", () => {
      const movementOnly = [
        "walk",
        "run",
        "sprint",
        "jog",
        "locomotion",
        "move",
      ];
      const withOneNonMovement = [...movementOnly, "dance"];
      const result = selectIdleAnimation(withOneNonMovement);
      expect(result).toBe("dance");
    });

    it("skips animations containing movement substrings", () => {
      // "fast_walk" contains "walk", "run_cycle" contains "run"
      const result = selectIdleAnimation([
        "fast_walk",
        "run_cycle",
        "celebrate",
      ]);
      expect(result).toBe("celebrate");
    });

    it("returns the first animation when all are movement animations", () => {
      const result = selectIdleAnimation(["walk", "run", "sprint"]);
      expect(result).toBe("walk");
    });
  });

  describe("edge cases", () => {
    it("returns 'idle' for an empty animation list", () => {
      const result = selectIdleAnimation([]);
      expect(result).toBe("idle");
    });

    it("returns the only animation if there is exactly one", () => {
      expect(selectIdleAnimation(["dance"])).toBe("dance");
    });

    it("returns the only animation even if it is a movement animation", () => {
      expect(selectIdleAnimation(["walk"])).toBe("walk");
    });

    it("handles duplicate animation names", () => {
      const result = selectIdleAnimation(["idle", "idle", "walk"]);
      expect(result).toBe("idle");
    });
  });
});

// ===========================================================================
// findIdleAnimationGroup
// ===========================================================================

describe("findIdleAnimationGroup", () => {
  describe("name pattern matching", () => {
    it("finds a group with 'idle' in the name (case-insensitive)", () => {
      const groups = [
        createMockAnimationGroup("Walk"),
        createMockAnimationGroup("Idle"),
        createMockAnimationGroup("Run"),
      ];
      const result = findIdleAnimationGroup(groups);
      expect(result).toBe(groups[1]);
    });

    it("finds a group with 'Idle' in mixed case name", () => {
      const groups = [
        createMockAnimationGroup("Walk"),
        createMockAnimationGroup("CharacterIdle"),
      ];
      const result = findIdleAnimationGroup(groups);
      expect(result).toBe(groups[1]);
    });

    it("finds a group with 'stand' in the name", () => {
      const groups = [
        createMockAnimationGroup("Walk"),
        createMockAnimationGroup("Standing"),
        createMockAnimationGroup("Run"),
      ];
      const result = findIdleAnimationGroup(groups);
      expect(result).toBe(groups[1]);
    });

    it("finds a group with 'breathe' in the name", () => {
      const groups = [
        createMockAnimationGroup("Walk"),
        createMockAnimationGroup("Breathe_Slow"),
      ];
      const result = findIdleAnimationGroup(groups);
      expect(result).toBe(groups[1]);
    });

    it("matches 'idle' substring anywhere in the name", () => {
      const groups = [
        createMockAnimationGroup("Run"),
        createMockAnimationGroup("Armature|CowIdle"),
      ];
      const result = findIdleAnimationGroup(groups);
      expect(result).toBe(groups[1]);
    });

    it("matches 'stand' substring anywhere in the name", () => {
      const groups = [
        createMockAnimationGroup("Run"),
        createMockAnimationGroup("mixamo.com|StandPose"),
      ];
      const result = findIdleAnimationGroup(groups);
      expect(result).toBe(groups[1]);
    });

    it("prefers 'idle' over 'stand' when idle appears first", () => {
      const groups = [
        createMockAnimationGroup("IdleBreathing"),
        createMockAnimationGroup("StandPose"),
      ];
      const result = findIdleAnimationGroup(groups);
      expect(result).toBe(groups[0]);
    });

    it("returns the first match when multiple idle-like groups exist", () => {
      const groups = [
        createMockAnimationGroup("Walk"),
        createMockAnimationGroup("Standing"),
        createMockAnimationGroup("IdleLoop"),
      ];
      // "Standing" comes first in iteration order and matches "stand"
      const result = findIdleAnimationGroup(groups);
      expect(result).toBe(groups[1]);
    });
  });

  describe("fallback behavior", () => {
    it("falls back to the first group when no idle-like groups exist", () => {
      const groups = [
        createMockAnimationGroup("Walk"),
        createMockAnimationGroup("Run"),
        createMockAnimationGroup("Jump"),
      ];
      const result = findIdleAnimationGroup(groups);
      expect(result).toBe(groups[0]);
    });

    it("returns null for an empty array", () => {
      const result = findIdleAnimationGroup([]);
      expect(result).toBeNull();
    });
  });

  describe("case insensitivity", () => {
    it("matches 'IDLE' in uppercase", () => {
      const groups = [createMockAnimationGroup("IDLE_LOOP")];
      const result = findIdleAnimationGroup(groups);
      expect(result).toBe(groups[0]);
    });

    it("matches 'STAND' in uppercase", () => {
      const groups = [createMockAnimationGroup("STAND_POSE")];
      const result = findIdleAnimationGroup(groups);
      expect(result).toBe(groups[0]);
    });

    it("matches 'BREATHE' in uppercase", () => {
      const groups = [createMockAnimationGroup("BREATHE_DEEP")];
      const result = findIdleAnimationGroup(groups);
      expect(result).toBe(groups[0]);
    });

    it("matches mixed case like 'iDlE'", () => {
      const groups = [createMockAnimationGroup("mixamo|iDlE_v2")];
      const result = findIdleAnimationGroup(groups);
      expect(result).toBe(groups[0]);
    });
  });
});

// ===========================================================================
// disposeModelResult
// ===========================================================================

describe("disposeModelResult", () => {
  it("calls dispose on all meshes", () => {
    const result = createMockLoaderResult(
      ["__root__", "Body", "Head"],
      ["Idle"]
    );

    disposeModelResult(result);

    for (const mesh of result.meshes) {
      expect((mesh as any).dispose).toHaveBeenCalledTimes(1);
    }
  });

  it("calls dispose on all animation groups", () => {
    const result = createMockLoaderResult(
      ["__root__"],
      ["Idle", "Walk", "Run"]
    );

    disposeModelResult(result);

    for (const group of result.animationGroups) {
      expect(group.dispose).toHaveBeenCalledTimes(1);
    }
  });

  it("disposes animation groups before meshes (groups iterated first in source)", () => {
    const callOrder: string[] = [];
    const result = createMockLoaderResult(["Mesh1"], ["Anim1"]);

    (result.animationGroups[0].dispose as ReturnType<typeof vi.fn>).mockImplementation(
      () => callOrder.push("animGroup")
    );
    (result.meshes[0] as any).dispose.mockImplementation(() =>
      callOrder.push("mesh")
    );

    disposeModelResult(result);

    expect(callOrder).toEqual(["animGroup", "mesh"]);
  });

  it("handles result with no meshes", () => {
    const result = createMockLoaderResult([], ["Idle"]);

    // Should not throw
    expect(() => disposeModelResult(result)).not.toThrow();

    for (const group of result.animationGroups) {
      expect(group.dispose).toHaveBeenCalledTimes(1);
    }
  });

  it("handles result with no animation groups", () => {
    const result = createMockLoaderResult(["__root__", "Body"], []);

    // Should not throw
    expect(() => disposeModelResult(result)).not.toThrow();

    for (const mesh of result.meshes) {
      expect((mesh as any).dispose).toHaveBeenCalledTimes(1);
    }
  });

  it("handles result with no meshes and no animation groups", () => {
    const result = createMockLoaderResult([], []);

    // Should not throw
    expect(() => disposeModelResult(result)).not.toThrow();
  });

  it("disposes many meshes and animation groups correctly", () => {
    const meshNames = Array.from({ length: 20 }, (_, i) => `Mesh_${i}`);
    const animNames = Array.from({ length: 10 }, (_, i) => `Anim_${i}`);
    const result = createMockLoaderResult(meshNames, animNames);

    disposeModelResult(result);

    expect(result.meshes).toHaveLength(20);
    expect(result.animationGroups).toHaveLength(10);

    for (const mesh of result.meshes) {
      expect((mesh as any).dispose).toHaveBeenCalledTimes(1);
    }
    for (const group of result.animationGroups) {
      expect(group.dispose).toHaveBeenCalledTimes(1);
    }
  });
});
