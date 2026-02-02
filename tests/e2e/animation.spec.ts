/**
 * Animation E2E Tests
 *
 * Verifies that 3D model animations work correctly:
 * - Player loads with idle animation at full weight (no T-pose)
 * - Animation transitions to walk during movement
 * - Animation returns to idle when movement stops
 * - Animation state is consistent in the ECS
 */

import { test, expect } from "@playwright/test";
import {
  navigateToGameplay,
  getPlayerAnimationState,
  movePlayerTo,
} from "./helpers";

test.describe("Animation System", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGameplay(page);
  });

  // -----------------------------------------------------------------------
  // T-pose prevention (critical regression test)
  // -----------------------------------------------------------------------

  test("player has idle animation playing at full weight after loading (no T-pose)", async ({ page }) => {
    const anim = await getPlayerAnimationState(page);

    expect(anim).not.toBeNull();
    expect(anim!.currentAnimation).toBe("idle");
    expect(anim!.isPlaying).toBe(true);
    // _lastAnimation being set means playAnimation succeeded
    expect(anim!.lastAnimation).toBe("idle");
    // _blendWeight = 1 means the animation is applied at full strength.
    // If this were 0 the model would show its bind pose (T-pose).
    expect(anim!.blendWeight).toBe(1);
    // Player model should have at least idle and walk animations
    expect(anim!.availableAnimations).toContain("idle");
    expect(anim!.availableAnimations).toContain("walk");
  });

  // -----------------------------------------------------------------------
  // Locomotion transitions
  // -----------------------------------------------------------------------

  test("animation transitions to walk when player moves", async ({ page }) => {
    // Verify starting at idle
    let anim = await getPlayerAnimationState(page);
    expect(anim!.currentAnimation).toBe("idle");

    // Hold right arrow to move
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(800);

    // Check animation switched to walk or run
    anim = await getPlayerAnimationState(page);
    expect(["walk", "run"]).toContain(anim!.currentAnimation);

    await page.keyboard.up("ArrowRight");
  });

  test("animation returns to idle when movement stops", async ({ page }) => {
    // Move right briefly
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(800);
    await page.keyboard.up("ArrowRight");

    // Wait for the player to decelerate and animation to blend back.
    // Under heavy parallel load, game time advances slower than real time
    // due to the 100ms per-frame cap in the game loop.
    await page.waitForFunction(
      () => {
        const world = (window as any).GAME_WORLD;
        if (!world) return false;
        const player = world.entities.find((e: any) => e.tag?.type === "player");
        return player?.animation?.currentAnimation === "idle";
      },
      undefined,
      { timeout: 10000 }
    );

    const anim = await getPlayerAnimationState(page);
    expect(anim!.currentAnimation).toBe("idle");
  });

  // -----------------------------------------------------------------------
  // Animation availability
  // -----------------------------------------------------------------------

  test("player has expected animations registered", async ({ page }) => {
    const anim = await getPlayerAnimationState(page);

    expect(anim).not.toBeNull();
    // The farmer model (john.glb) should have idle and walk
    expect(anim!.availableAnimations.length).toBeGreaterThanOrEqual(2);
    expect(anim!.availableAnimations).toContain("idle");
    expect(anim!.availableAnimations).toContain("walk");
  });

  // -----------------------------------------------------------------------
  // BabylonJS animation group weight verification
  // -----------------------------------------------------------------------

  test("BabylonJS animation groups have correct weights after initial load", async ({ page }) => {
    // Access the animation registry directly to verify the actual
    // BabylonJS AnimationGroup weights (not just the ECS component).
    // This catches the T-pose bug at the rendering layer.
    const weights = await page.evaluate(() => {
      const world = (window as any).GAME_WORLD;
      if (!world) return null;
      const player = world.entities.find((e: any) => e.tag?.type === "player");
      if (!player?.id) return null;

      // The AnimationSystem module exports animationRegistry
      // but it's not on window. We can check via scene animation groups.
      const scenes = (window as any).BABYLON?.Engine?.Instances?.[0]?.scenes;
      if (!scenes?.length) {
        // BABYLON not exposed as global; check ECS state instead
        return {
          source: "ecs",
          currentAnimation: player.animation?.currentAnimation,
          lastAnimation: player.animation?._lastAnimation,
          blendWeight: player.animation?._blendWeight,
          isPlaying: player.animation?.isPlaying,
        };
      }

      const scene = scenes[0];
      return {
        source: "babylon",
        groups: scene.animationGroups.map((g: any) => ({
          name: g.name,
          isPlaying: g.isPlaying,
          weight: g.weight,
        })),
      };
    });

    expect(weights).not.toBeNull();

    if (weights!.source === "ecs") {
      // Verify via ECS state
      expect(weights!.lastAnimation).toBe("idle");
      expect(weights!.blendWeight).toBe(1);
      expect(weights!.isPlaying).toBe(true);
    } else {
      // Verify via BabylonJS directly
      const playingGroups = weights!.groups.filter((g: any) => g.isPlaying);
      expect(playingGroups.length).toBeGreaterThanOrEqual(1);
      // The playing animation must have weight=1 (not 0 which causes T-pose)
      for (const g of playingGroups) {
        expect(g.weight).toBe(1);
      }
    }
  });
});
