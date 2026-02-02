/**
 * Core Game Flow E2E Test
 *
 * Tests the full navigation path from launch to gameplay:
 * Menu → Mode Select → Character Select → Loading → Gameplay → Player Movement
 *
 * This test does NOT use the shared helper's navigateToGameplay because
 * it explicitly tests each navigation step.
 */

import { test, expect } from "@playwright/test";

test("Full Game Flow: Menu -> Start -> Gameplay", async ({ page }) => {
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("GL Driver Message") || text.includes("GPU stall")) return;
  });

  // 1. Launch Game
  await page.goto("/");

  // Skip Tutorial in LocalStorage
  await page.evaluate(() => {
    localStorage.setItem("animal-tutorial-complete", "true");
    localStorage.setItem(
      "animal-modes-unlocked",
      JSON.stringify(["endless", "time_attack", "zen", "boss_rush"])
    );
  });

  // 2. Skip Splash Screen
  await expect(page.locator("canvas#splash-canvas")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1000);

  const { width, height } = page.viewportSize() || { width: 1280, height: 720 };
  await page.mouse.click(width / 2, height / 2);

  // 3. Verify Menu
  await page.waitForFunction(() => (window as any).GAME_MENU, undefined, { timeout: 20000 });

  // 4. Start New Game
  await page.evaluate(() => (window as any).GAME_MENU.clickPlay());

  // 5. Mode Select → Loading (no separate character select screen)
  await expect(page.getByText(/SELECT MODE/i)).toBeVisible();
  await page.getByText("Endless", { exact: true }).click();

  // 6. Loading Screen
  await expect(page.getByText("LOADING...")).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("LOADING...")).not.toBeVisible({ timeout: 15000 });

  // 7. HUD visible (gameplay started)
  await expect(page.getByText(/STACK:/i)).toBeVisible({ timeout: 30000 });

  // 8. Verify player entity exists
  await page.waitForTimeout(3000);

  const initialX = await page.evaluate(() => {
    const world = (window as any).GAME_WORLD;
    if (!world) return null;
    const entities = world.entities;
    const player = entities.find((e: any) => e.tag?.type === "player");
    return player?.position?.x;
  });

  expect(initialX).not.toBeNull();

  // 9. Move Right
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(1000);
  await page.keyboard.up("ArrowRight");
  await page.waitForTimeout(500);

  const newX = await page.evaluate(() => {
    const world = (window as any).GAME_WORLD;
    const entities = world.entities;
    const player = entities.find((e: any) => e.tag?.type === "player");
    return player?.position?.x;
  });

  expect(newX).toBeGreaterThan(initialX!);
});
