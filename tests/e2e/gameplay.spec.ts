import { test, expect } from '@playwright/test';

test('Full Game Flow: Menu -> Start -> Gameplay', async ({ page }) => {
  // Capture console logs
  page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
  page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));

  // 1. Launch Game
  await page.goto('/');

  // Skip Tutorial in LocalStorage
  await page.evaluate(() => {
    localStorage.setItem('animal-tutorial-complete', 'true');
    localStorage.setItem('animal-modes-unlocked', JSON.stringify(['endless', 'time_attack', 'zen', 'boss_rush']));
  });

  // 2. Skip Splash Screen (Wait for listener to be active)
  await page.waitForTimeout(2000);
  const { width, height } = page.viewportSize() || { width: 1280, height: 720 };
  await page.mouse.click(width / 2, height / 2);

  // 3. Verify Menu
  // Use regex because of potential line breaks on mobile/different screen sizes
  await expect(page.getByText(/HOMESTEAD\s+HEADACHES/i)).toBeVisible({ timeout: 20000 });

  // 4. Start New Game
  await page.getByText('NEW GAME').click();

  // 5. Mode Select
  await expect(page.getByText(/SELECT MODE/i)).toBeVisible();
  await page.getByText('Endless', { exact: true }).click();

  // 6. Character Select
  await expect(page.getByText(/CHOOSE YOUR HAND/i)).toBeVisible();
  await page.getByText('SELECT').click();

  // 7. Wait for Loading Screen
  console.log('Waiting for Loading Screen...');
  await expect(page.getByText('LOADING...')).toBeVisible({ timeout: 5000 });
  
  // Wait for Loading to finish (text disappears)
  console.log('Waiting for Loading to finish...');
  await expect(page.getByText('LOADING...')).not.toBeVisible({ timeout: 15000 });

  // 8. Wait for Game Start (Wait for HUD element like 'STACK:')
  console.log('Waiting for HUD...');
  await expect(page.getByText(/STACK:/i)).toBeVisible({ timeout: 30000 });

  // 9. Verify Gameplay (Player Movement)
  // We need to wait a bit for the scene to fully initialize entities
  await page.waitForTimeout(3000);

  // Get initial player position from the exposed GAME_WORLD
  const initialX = await page.evaluate(() => {
    const world = (window as any).GAME_WORLD;
    if (!world) return null;
    const entities = world.entities;
    const player = entities.find((e: any) => e.tag?.type === 'player');
    return player?.position?.x;
  });

  expect(initialX).not.toBeNull();
  console.log(`Initial Player X: ${initialX}`);

  // Move Right
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1000); // Hold for 1s
  await page.keyboard.up('ArrowRight');

  // Wait for physics/interpolation
  await page.waitForTimeout(500);

  // Get new position
  const newX = await page.evaluate(() => {
    const world = (window as any).GAME_WORLD;
    const entities = world.entities;
    const player = entities.find((e: any) => e.tag?.type === 'player');
    return player?.position?.x;
  });

  console.log(`New Player X: ${newX}`);

  // Expect movement to the right (positive X)
  expect(newX).toBeGreaterThan(initialX!);

  // Take a screenshot of gameplay
  await page.screenshot({ path: 'gameplay-screenshot.png' });
});
