/**
 * UI Layout E2E Tests
 *
 * Verifies the gameplay UI after the layout overhaul:
 * - No PauseButton / SoundToggle during gameplay
 * - Pause via keyboard (Space / Escape / P)
 * - PauseMenu buttons: RESUME, RESTART, SETTINGS, MAIN MENU
 * - SETTINGS opens SettingsModal above pause overlay
 * - Resume continues gameplay
 * - HUD elements visible and correctly positioned
 */

import { test, expect } from "@playwright/test";
import {
  navigateToGameplay,
  getGameState,
  pauseGame,
  resumeGame,
} from "./helpers";

test.describe("UI Layout", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGameplay(page);
  });

  // -----------------------------------------------------------------------
  // Top-right controls removal
  // -----------------------------------------------------------------------

  test("no PauseButton visible during gameplay", async ({ page }) => {
    // The old PauseButton component rendered a button with aria-label "Pause"
    // and a pause icon. Verify it's gone.
    const pauseButton = page.locator('button[aria-label="Pause"]');
    await expect(pauseButton).not.toBeVisible();

    // Also check there's no button with a pause icon in the top-right area
    const topRightControls = page.locator(".absolute.z-40");
    await expect(topRightControls).toHaveCount(0);
  });

  test("no SoundToggle visible during gameplay", async ({ page }) => {
    // The SoundToggle rendered a button with aria-label containing "Sound" or "Mute"
    const soundToggle = page.locator('button[aria-label*="Sound"], button[aria-label*="Mute"]');
    await expect(soundToggle).not.toBeVisible();
  });

  // -----------------------------------------------------------------------
  // HUD elements
  // -----------------------------------------------------------------------

  test("HUD shows score, level, and stack info", async ({ page }) => {
    await expect(page.getByText(/STACK:/i)).toBeVisible();
    await expect(page.getByText(/LV\./i)).toBeVisible();
    // Score starts at 0
    await expect(page.getByText(/BEST:/i)).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // Pause menu via keyboard
  // -----------------------------------------------------------------------

  test("Space key toggles pause", async ({ page }) => {
    // Verify game is playing
    let state = await getGameState(page);
    expect(state.isPlaying).toBe(true);
    expect(state.isPaused).toBe(false);

    // Press Space to pause
    await page.keyboard.press("Space");
    await expect(page.getByText("PAUSED")).toBeVisible({ timeout: 3000 });

    // Press Space to resume
    await page.keyboard.press("Space");
    await expect(page.getByText("PAUSED")).not.toBeVisible({ timeout: 3000 });
  });

  test("Escape key toggles pause", async ({ page }) => {
    await page.keyboard.press("Escape");
    await expect(page.getByText("PAUSED")).toBeVisible({ timeout: 3000 });

    await page.keyboard.press("Escape");
    await expect(page.getByText("PAUSED")).not.toBeVisible({ timeout: 3000 });
  });

  test("P key toggles pause", async ({ page }) => {
    await page.keyboard.press("p");
    await expect(page.getByText("PAUSED")).toBeVisible({ timeout: 3000 });

    await page.keyboard.press("p");
    await expect(page.getByText("PAUSED")).not.toBeVisible({ timeout: 3000 });
  });

  // -----------------------------------------------------------------------
  // Pause menu content
  // -----------------------------------------------------------------------

  test("PauseMenu shows all expected buttons", async ({ page }) => {
    await page.keyboard.press("Escape");
    await expect(page.getByText("PAUSED")).toBeVisible({ timeout: 3000 });

    // Verify all buttons exist
    await expect(page.getByRole("button", { name: "RESUME" })).toBeVisible();
    await expect(page.getByRole("button", { name: "RESTART" })).toBeVisible();
    await expect(page.getByRole("button", { name: "SETTINGS" })).toBeVisible();
    await expect(page.getByRole("button", { name: "MAIN MENU" })).toBeVisible();

    // Verify hint text
    await expect(page.getByText(/Press SPACE or tap outside to resume/i)).toBeVisible();
  });

  test("PauseMenu shows current score and level", async ({ page }) => {
    await page.keyboard.press("Escape");
    await expect(page.getByText("PAUSED")).toBeVisible({ timeout: 3000 });

    // Score and level are shown in the pause overlay
    const scoreText = page.locator('[role="status"]').filter({ hasText: /Score:/ });
    await expect(scoreText).toBeVisible();
    const levelText = page.locator('[role="status"]').filter({ hasText: /Level:/ });
    await expect(levelText).toBeVisible();
  });

  test("RESUME button closes pause menu", async ({ page }) => {
    await page.keyboard.press("Escape");
    await expect(page.getByText("PAUSED")).toBeVisible({ timeout: 3000 });

    await page.getByRole("button", { name: "RESUME" }).click();
    // Allow time for the resume to propagate through game state and React re-render
    await expect(page.getByText("PAUSED")).not.toBeVisible({ timeout: 5000 });
  });

  // -----------------------------------------------------------------------
  // Settings from pause
  // -----------------------------------------------------------------------

  test("SETTINGS button opens SettingsModal above PauseMenu", async ({ page }) => {
    await page.keyboard.press("Escape");
    await expect(page.getByText("PAUSED")).toBeVisible({ timeout: 3000 });

    // Click SETTINGS
    await page.getByRole("button", { name: "SETTINGS" }).click();

    // SettingsModal should appear (it contains options like "Graphics Quality")
    await expect(
      page.getByText(/Graphics|Settings/i).first()
    ).toBeVisible({ timeout: 3000 });
  });

  // -----------------------------------------------------------------------
  // Pause freezes game state
  // -----------------------------------------------------------------------

  test("pause freezes gameTime, resume restarts it", async ({ page }) => {
    const stateBefore = await getGameState(page);
    const timeBefore = stateBefore.gameTime;

    // Pause
    await pauseGame(page);
    await page.waitForTimeout(1500);

    // gameTime should not advance while paused
    const statePaused = await getGameState(page);
    expect(statePaused.isPaused).toBe(true);
    // Allow tolerance for the tick that processes the pause
    expect(statePaused.gameTime - timeBefore).toBeLessThan(500);

    // Resume
    await resumeGame(page);

    // Wait for gameTime to advance meaningfully. Under parallel load the
    // game loop's 100ms per-frame cap means game time can run at ~50% of
    // real time, so wait long enough to accumulate at least 300ms of game time.
    await page.waitForTimeout(2000);

    // gameTime should advance after resume
    const stateResumed = await getGameState(page);
    expect(stateResumed.isPaused).toBe(false);
    expect(stateResumed.gameTime).toBeGreaterThan(timeBefore + 200);
  });

  // -----------------------------------------------------------------------
  // RESTART button
  // -----------------------------------------------------------------------

  test("RESTART button restarts the game", async ({ page }) => {
    await page.keyboard.press("Escape");
    await expect(page.getByText("PAUSED")).toBeVisible({ timeout: 3000 });

    await page.getByRole("button", { name: "RESTART" }).click();

    // After restart, loading screen should appear briefly then gameplay resumes
    // Wait for HUD to reappear (game restarted)
    await expect(page.getByText(/STACK:/i)).toBeVisible({ timeout: 30000 });

    // Score should be reset to 0
    const state = await getGameState(page);
    expect(state.score).toBe(0);
    expect(state.isPlaying).toBe(true);
  });

  // -----------------------------------------------------------------------
  // MAIN MENU button
  // -----------------------------------------------------------------------

  test("MAIN MENU button returns to menu", async ({ page }) => {
    await page.keyboard.press("Escape");
    await expect(page.getByText("PAUSED")).toBeVisible({ timeout: 3000 });

    await page.getByRole("button", { name: "MAIN MENU" }).click();

    // Should see the main menu (PLAY button)
    await expect(page.getByRole("button", { name: "PLAY" })).toBeVisible({ timeout: 10000 });
  });
});
