/**
 * Shared E2E test helpers for Homestead Headaches.
 *
 * Provides reusable setup routines that navigate from splash screen
 * through to active gameplay, plus typed wrappers around the DevAPI.
 */

import { type Page, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// DevAPI type stubs (mirrors src/game/debug/DevAPI.ts)
// ---------------------------------------------------------------------------

export interface GameStateSnapshot {
  score: number;
  level: number;
  lives: number;
  maxLives: number;
  combo: number;
  multiplier: number;
  bankedAnimals: number;
  isPlaying: boolean;
  isPaused: boolean;
  gameTime: number;
  stackHeight: number;
  fallingCount: number;
  entityCount: number;
  playerX: number;
  playerY: number;
  inDanger: boolean;
  spawnPaused: boolean;
  invincible: boolean;
  gameSpeedMultiplier: number;
}

export interface EntitySnapshot {
  id: string;
  type: string;
  subtype: string;
  x: number;
  y: number;
  z: number;
  hasFalling: boolean;
  hasStacked: boolean;
  hasFrozen: boolean;
  hasBoss: boolean;
  hasAbility: boolean;
  stackIndex?: number;
  bossType?: string;
  bossHealth?: number;
}

interface DevAPIResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

/**
 * Navigates from a fresh page load all the way to active gameplay.
 *
 * Steps: Load page → Skip splash → Menu → PLAY → Endless → SELECT → Loading → HUD visible
 *
 * After this resolves the page is in gameplay state with GAME_WORLD,
 * GAME_CONTROL, and __DEV_API__ all available.
 */
export async function navigateToGameplay(page: Page): Promise<void> {
  // Suppress noisy GPU/WebGL console messages
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("GL Driver Message") || text.includes("GPU stall")) return;
    if (text.includes("[DevAPI]")) return;
  });

  // 1. Load page & pre-set localStorage to skip tutorial
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("animal-tutorial-complete", "true");
    localStorage.setItem(
      "animal-modes-unlocked",
      JSON.stringify(["endless", "time_attack", "zen", "boss_rush"])
    );
  });

  // 2. Skip splash screen
  await expect(page.locator("canvas#splash-canvas")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1000);
  const { width, height } = page.viewportSize() || { width: 1280, height: 720 };
  await page.mouse.click(width / 2, height / 2);

  // 3. Wait for menu API
  await page.waitForFunction(() => (window as any).GAME_MENU, undefined, { timeout: 20000 });

  // 4. Start game: PLAY → Endless (goes directly to loading)
  await page.evaluate(() => (window as any).GAME_MENU.clickPlay());
  await page.getByText("Endless", { exact: true }).click();

  // 5. Wait for loading to complete
  await expect(page.getByText("LOADING...")).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("LOADING...")).not.toBeVisible({ timeout: 15000 });

  // 6. Wait for HUD + DevAPI
  await expect(page.getByText(/STACK:/i)).toBeVisible({ timeout: 30000 });
  await page.waitForFunction(() => (window as any).__DEV_API__, undefined, { timeout: 10000 });

  // 7. Pause spawning so tests control what falls
  await page.evaluate(() => (window as any).__DEV_API__.setSpawnPaused(true));

  // 8. Wait for scene/physics to initialize
  await page.waitForTimeout(2000);
}

// ---------------------------------------------------------------------------
// DevAPI wrappers
// ---------------------------------------------------------------------------

/** Returns the full game state snapshot. */
export async function getGameState(page: Page): Promise<GameStateSnapshot> {
  return page.evaluate(() => {
    const result = (window as any).__DEV_API__.getGameState();
    return result.data;
  });
}

/** Returns all entity snapshots. */
export async function getEntities(page: Page): Promise<EntitySnapshot[]> {
  return page.evaluate(() => {
    const result = (window as any).__DEV_API__.getEntities();
    return result.data;
  });
}

/** Returns stacked entity snapshots. */
export async function getStackedEntities(page: Page): Promise<EntitySnapshot[]> {
  return page.evaluate(() => {
    const result = (window as any).__DEV_API__.getStackedEntities();
    return result.data;
  });
}

/** Returns falling entity snapshots. */
export async function getFallingEntities(page: Page): Promise<EntitySnapshot[]> {
  return page.evaluate(() => {
    const result = (window as any).__DEV_API__.getFallingEntities();
    return result.data;
  });
}

/** Moves the player to a specific X position. */
export async function movePlayerTo(page: Page, x: number): Promise<void> {
  await page.evaluate((px) => (window as any).__DEV_API__.movePlayerTo(px), x);
}

/** Spawns an animal at a given X. Returns the entity ID. */
export async function spawnAnimal(
  page: Page,
  x: number,
  type: string = "cow"
): Promise<string> {
  return page.evaluate(
    ({ px, pt }) => {
      const result = (window as any).__DEV_API__.spawnAnimal(pt, px);
      return result.data?.entityId ?? "";
    },
    { px: x, pt: type }
  );
}

/** Sets lives to a specific value. */
export async function setLives(page: Page, n: number): Promise<void> {
  await page.evaluate((lives) => (window as any).__DEV_API__.setLives(lives), n);
}

/** Sets score to a specific value. */
export async function setScore(page: Page, n: number): Promise<void> {
  await page.evaluate((score) => (window as any).__DEV_API__.setScore(score), n);
}

/** Pauses the game via DevAPI. */
export async function pauseGame(page: Page): Promise<void> {
  await page.evaluate(() => (window as any).__DEV_API__.pause());
}

/** Resumes the game via DevAPI. */
export async function resumeGame(page: Page): Promise<void> {
  await page.evaluate(() => (window as any).__DEV_API__.resume());
}

/** Banks the current stack. */
export async function bankStack(page: Page): Promise<void> {
  await page.evaluate(() => (window as any).__DEV_API__.bankStack());
}

/** Enables invincibility (no life loss). */
export async function setInvincible(page: Page, enabled: boolean): Promise<void> {
  await page.evaluate((e) => (window as any).__DEV_API__.setInvincible(e), enabled);
}

/** Enables or disables spawn pausing. */
export async function setSpawnPaused(page: Page, paused: boolean): Promise<void> {
  await page.evaluate((p) => (window as any).__DEV_API__.setSpawnPaused(p), paused);
}

/** Triggers game over directly. */
export async function triggerGameOver(page: Page): Promise<void> {
  await page.evaluate(() => (window as any).__DEV_API__.triggerGameOver());
}

/** Sets the game speed multiplier. Useful for accelerating time-based tests. */
export async function setGameSpeed(page: Page, multiplier: number): Promise<void> {
  await page.evaluate((m) => (window as any).__DEV_API__.setGameSpeed(m), multiplier);
}

// ---------------------------------------------------------------------------
// ECS / Animation helpers
// ---------------------------------------------------------------------------

/** Gets the player entity's animation state from GAME_WORLD. */
export async function getPlayerAnimationState(page: Page): Promise<{
  currentAnimation: string;
  isPlaying: boolean;
  lastAnimation: string | undefined;
  availableAnimations: string[];
  blendWeight: number;
} | null> {
  return page.evaluate(() => {
    const world = (window as any).GAME_WORLD;
    if (!world) return null;
    const player = world.entities.find((e: any) => e.tag?.type === "player");
    if (!player?.animation) return null;
    return {
      currentAnimation: player.animation.currentAnimation,
      isPlaying: player.animation.isPlaying,
      lastAnimation: player.animation._lastAnimation,
      availableAnimations: player.animation.availableAnimations,
      blendWeight: player.animation._blendWeight,
    };
  });
}

/**
 * Spawns and catches multiple animals sequentially, waiting for each to land.
 * Requires player to already be positioned (e.g., at x=0).
 */
export async function stackAnimals(
  page: Page,
  count: number,
  x: number = 0
): Promise<void> {
  const types = ["cow", "pig", "chicken"];
  for (let i = 0; i < count; i++) {
    await spawnAnimal(page, x, types[i % types.length]);
    await waitForStackHeight(page, i + 1);
  }
}

/**
 * Waits for the stack height to reach a target value.
 * Uses polling via page.waitForFunction.
 */
export async function waitForStackHeight(
  page: Page,
  target: number,
  timeout = 10000
): Promise<void> {
  await page.waitForFunction(
    (t) => {
      const result = (window as any).__DEV_API__?.getStackHeight();
      return result?.data === t;
    },
    target,
    { timeout }
  );
}

/**
 * Waits for no falling entities to remain (all caught or cleaned up).
 */
export async function waitForNoFalling(page: Page, timeout = 12000): Promise<void> {
  await page.waitForFunction(
    () => {
      const result = (window as any).__DEV_API__?.getFallingEntities();
      return result?.data?.length === 0;
    },
    undefined,
    { timeout }
  );
}
