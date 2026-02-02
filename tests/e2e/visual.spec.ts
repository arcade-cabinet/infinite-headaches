/**
 * Gameplay Mechanics E2E Tests
 *
 * Comprehensive tests for core game mechanics:
 * - Stacking: catch animals, verify stack height and HUD
 * - Scoring: catches increase score, combos/multipliers
 * - Miss detection: animals that miss are cleaned up (no accumulation)
 * - Banking: bank stack to convert to score
 * - Game over: lives deplete, game over screen shown
 * - Player movement: keyboard and drag
 * - Falling entity cleanup: safety net removes stuck entities
 */

import { test, expect } from "@playwright/test";
import {
  navigateToGameplay,
  getGameState,
  getEntities,
  getStackedEntities,
  getFallingEntities,
  movePlayerTo,
  spawnAnimal,
  stackAnimals,
  setLives,
  setScore,
  setInvincible,
  setSpawnPaused,
  setGameSpeed,
  bankStack,
  triggerGameOver,
  waitForStackHeight,
  waitForNoFalling,
} from "./helpers";

test.describe("Gameplay Mechanics", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGameplay(page);
  });

  // -----------------------------------------------------------------------
  // Stacking
  // -----------------------------------------------------------------------

  test("catching an animal increases stack height", async ({ page }) => {
    await movePlayerTo(page, 0);

    const stateBefore = await getGameState(page);
    expect(stateBefore.stackHeight).toBe(0);

    // Spawn cow directly above player
    await spawnAnimal(page, 0, "cow");

    // Wait for it to land on the player
    await waitForStackHeight(page, 1);

    const stateAfter = await getGameState(page);
    expect(stateAfter.stackHeight).toBe(1);
  });

  test("stacking multiple animals increases stack height incrementally", async ({ page }) => {
    await movePlayerTo(page, 0);

    // Spawn first animal
    await spawnAnimal(page, 0, "cow");
    await waitForStackHeight(page, 1);

    // Spawn second animal
    await spawnAnimal(page, 0, "pig");
    await waitForStackHeight(page, 2);

    const state = await getGameState(page);
    expect(state.stackHeight).toBe(2);
  });

  test("HUD STACK count updates after catch", async ({ page }) => {
    await movePlayerTo(page, 0);

    await spawnAnimal(page, 0, "cow");
    await waitForStackHeight(page, 1);

    await expect(page.getByText("STACK: 1")).toBeVisible({ timeout: 5000 });
  });

  // -----------------------------------------------------------------------
  // Scoring
  // -----------------------------------------------------------------------

  test("catching and banking animals increases score", async ({ page }) => {
    await movePlayerTo(page, 0);
    await setInvincible(page, true);

    const stateBefore = await getGameState(page);
    const scoreBefore = stateBefore.score;

    // Stack 5 animals (minStackToBank is 5)
    await stackAnimals(page, 5);

    // Bank the stack to realize the score
    await bankStack(page);

    // Wait for banking animation to finish and stack to clear
    await page.waitForFunction(
      () => {
        const result = (window as any).__DEV_API__?.getStackHeight();
        return result?.data === 0;
      },
      undefined,
      { timeout: 10000 }
    );

    const stateAfter = await getGameState(page);
    expect(stateAfter.score).toBeGreaterThan(scoreBefore);
  });

  // -----------------------------------------------------------------------
  // Miss detection & cleanup
  // -----------------------------------------------------------------------

  test("missed animal is cleaned up (no accumulation)", async ({ page }) => {
    await setInvincible(page, true);
    // Speed up game time so miss detection (8000ms game time) fires faster
    await setGameSpeed(page, 4);

    // Move player far left, spawn animal far right
    await movePlayerTo(page, -6);
    await spawnAnimal(page, 6, "pig");

    // Wait for the animal to fall past catch zone and get cleaned up
    await waitForNoFalling(page, 20000);

    // Verify no falling entities remain
    const falling = await getFallingEntities(page);
    expect(falling.length).toBe(0);
  });

  test("multiple missed animals are all cleaned up", async ({ page }) => {
    await setInvincible(page, true);
    await setGameSpeed(page, 4);
    await movePlayerTo(page, -6);

    // Spawn 3 animals that will miss
    await spawnAnimal(page, 5, "cow");
    await page.waitForTimeout(500);
    await spawnAnimal(page, 6, "pig");
    await page.waitForTimeout(500);
    await spawnAnimal(page, 4, "chicken");

    // Wait for all to be cleaned up
    await waitForNoFalling(page, 25000);

    const falling = await getFallingEntities(page);
    expect(falling.length).toBe(0);

    // Stacked should also be 0 (they missed)
    const state = await getGameState(page);
    expect(state.stackHeight).toBe(0);
  });

  // -----------------------------------------------------------------------
  // Lives & Game Over
  // -----------------------------------------------------------------------

  test("missing an animal costs a life", async ({ page }) => {
    // Speed up game time so miss detection fires faster
    await setGameSpeed(page, 4);

    const stateBefore = await getGameState(page);
    const livesBefore = stateBefore.lives;

    // Move away and spawn an animal that will miss
    await movePlayerTo(page, -7);
    await spawnAnimal(page, 7, "cow");

    // Wait for it to be processed as a miss
    await waitForNoFalling(page, 20000);

    const stateAfter = await getGameState(page);
    expect(stateAfter.lives).toBeLessThan(livesBefore);
  });

  test("game over screen shows when all lives depleted", async ({ page }) => {
    // Speed up game time so miss detection fires faster
    await setGameSpeed(page, 4);
    // Set to 1 life for quick game over
    await setLives(page, 1);

    // Move away and spawn animal to miss
    await movePlayerTo(page, -7);
    await spawnAnimal(page, 7, "pig");

    // Wait for game over screen
    await expect(page.getByText(/WOBBLED OUT!/i)).toBeVisible({ timeout: 20000 });
  });

  test("game over screen shows final score", async ({ page }) => {
    // Set a known score before triggering game over
    await setScore(page, 42);
    await triggerGameOver(page);

    await expect(page.getByText(/WOBBLED OUT!/i)).toBeVisible({ timeout: 5000 });
    // The game over screen should display the score
    await expect(page.getByText("42")).toBeVisible({ timeout: 3000 });
  });

  // -----------------------------------------------------------------------
  // Banking
  // -----------------------------------------------------------------------

  test("banking stack clears stacked animals and awards score", async ({ page }) => {
    await movePlayerTo(page, 0);
    await setInvincible(page, true);

    // Stack 5 animals (minStackToBank is 5)
    await stackAnimals(page, 5);

    const scoreBefore = (await getGameState(page)).score;

    // Bank the stack
    await bankStack(page);

    // Wait for banking animation to finish and stack to clear
    await page.waitForFunction(
      () => {
        const result = (window as any).__DEV_API__?.getStackHeight();
        return result?.data === 0;
      },
      undefined,
      { timeout: 10000 }
    );

    const stateAfter = await getGameState(page);
    // Stack should be cleared
    expect(stateAfter.stackHeight).toBe(0);
    // Score should increase
    expect(stateAfter.score).toBeGreaterThan(scoreBefore);
    // Banked animals count should increase
    expect(stateAfter.bankedAnimals).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // Player movement
  // -----------------------------------------------------------------------

  test("ArrowRight moves player to the right", async ({ page }) => {
    const stateBefore = await getGameState(page);
    const xBefore = stateBefore.playerX;

    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(1000);
    await page.keyboard.up("ArrowRight");
    await page.waitForTimeout(300);

    const stateAfter = await getGameState(page);
    expect(stateAfter.playerX).toBeGreaterThan(xBefore);
  });

  test("ArrowLeft moves player to the left", async ({ page }) => {
    // Start from center to have room to move left
    await movePlayerTo(page, 2);
    await page.waitForTimeout(300);

    const stateBefore = await getGameState(page);
    const xBefore = stateBefore.playerX;

    await page.keyboard.down("ArrowLeft");
    await page.waitForTimeout(1000);
    await page.keyboard.up("ArrowLeft");
    await page.waitForTimeout(300);

    const stateAfter = await getGameState(page);
    expect(stateAfter.playerX).toBeLessThan(xBefore);
  });

  // -----------------------------------------------------------------------
  // Entity state validation
  // -----------------------------------------------------------------------

  test("player entity exists with correct tag and position", async ({ page }) => {
    const entities = await getEntities(page);
    const player = entities.find((e) => e.type === "player");

    expect(player).toBeDefined();
    expect(player!.y).toBeCloseTo(-2, 0); // Player rail is at Y=-2
  });

  test("spawned falling entity has falling component", async ({ page }) => {
    await spawnAnimal(page, 0, "cow");
    await page.waitForTimeout(500);

    const falling = await getFallingEntities(page);
    expect(falling.length).toBeGreaterThanOrEqual(1);

    const cow = falling.find((e) => e.subtype === "cow");
    expect(cow).toBeDefined();
    expect(cow!.hasFalling).toBe(true);
    // tag.type is "animal" (the entity type), physicsTag is "falling"
    expect(cow!.type).toBe("animal");
  });

  test("caught entity transitions from falling to stacked", async ({ page }) => {
    await movePlayerTo(page, 0);
    await spawnAnimal(page, 0, "cow");
    await waitForStackHeight(page, 1);

    const stacked = await getStackedEntities(page);
    expect(stacked.length).toBe(1);
    expect(stacked[0].hasStacked).toBe(true);
    expect(stacked[0].hasFalling).toBe(false);
  });

  // -----------------------------------------------------------------------
  // Spawn control
  // -----------------------------------------------------------------------

  test("setSpawnPaused prevents automatic spawning", async ({ page }) => {
    // Spawning was paused in navigateToGameplay. Wait and verify no spawns.
    await page.waitForTimeout(3000);

    const falling = await getFallingEntities(page);
    expect(falling.length).toBe(0);
  });

  test("re-enabling spawns causes animals to appear", async ({ page }) => {
    // Re-enable automatic spawning
    await setSpawnPaused(page, false);

    // Wait for the spawning system to produce entities
    await page.waitForFunction(
      () => {
        const result = (window as any).__DEV_API__?.getFallingEntities();
        return result?.data?.length > 0;
      },
      undefined,
      { timeout: 10000 }
    );

    const falling = await getFallingEntities(page);
    expect(falling.length).toBeGreaterThan(0);
  });
});
