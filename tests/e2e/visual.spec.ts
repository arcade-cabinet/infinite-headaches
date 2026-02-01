import { test, expect } from '@playwright/test';

test.describe('Visual Regression & Gameplay Logic', () => {
  test.beforeEach(async ({ page }) => {
    // Debug Console, filtering noise
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('GL Driver Message') || text.includes('GPU stall')) return;
        console.log(`BROWSER: ${text}`);
    });
    
    // 1. Launch Game
    await page.goto('/');

    // Skip Tutorial & Unlocks
    await page.evaluate(() => {
      localStorage.setItem('animal-tutorial-complete', 'true');
      localStorage.setItem('animal-modes-unlocked', JSON.stringify(['endless', 'time_attack', 'zen', 'boss_rush']));
    });

    // 2. Skip Splash
    // Wait for 3D Splash Canvas
    const canvas = page.locator('canvas#splash-canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });
    
    // Verify Canvas Size (Must fill viewport)
    const viewport = page.viewportSize() || { width: 1280, height: 720 };
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    if (canvasBox) {
        expect(canvasBox.width).toBeGreaterThan(viewport.width * 0.9);
        expect(canvasBox.height).toBeGreaterThan(viewport.height * 0.9);
    }
    
    await page.waitForTimeout(1000); 
    
    const { width, height } = page.viewportSize() || { width: 1280, height: 720 };
    await page.mouse.click(width / 2, height / 2);

    // 3. Start Game (3D Menu)
    // Wait for GAME_MENU to be exposed
    await page.waitForFunction(() => (window as any).GAME_MENU, undefined, { timeout: 20000 });
    
    // Click New Game via exposed API (since it's 3D GUI)
    await page.evaluate(() => (window as any).GAME_MENU.clickPlay());

    await page.getByText('Endless', { exact: true }).click();
    await page.getByText('SELECT').click();

    // 4. Wait for Gameplay
    await expect(page.getByText(/STACK:/i)).toBeVisible({ timeout: 30000 });
    
    // Wait for GAME_CONTROL to be available
    await page.waitForFunction(() => (window as any).GAME_CONTROL);
  });

  test('Stacking Mechanics', async ({ page }) => {
    // Move player to center
    await page.evaluate(() => (window as any).GAME_CONTROL.movePlayerTo(0));

    // Spawn a Cow at center
    await page.evaluate(() => (window as any).GAME_CONTROL.spawnAnimalAt(0, 'cow'));

    // Wait for it to land (check stack height)
    await page.waitForFunction(() => (window as any).GAME_CONTROL.getStackHeight() === 1, undefined, { timeout: 8000 });

    // Verify HUD updates
    await expect(page.getByText('STACK: 1')).toBeVisible();

    // Take screenshot of first stack
    await page.waitForTimeout(500); // Let animation settle
    await page.screenshot({ path: 'test-results/visual-stack-1.png' });
  });

  test('Miss and Game Over', async ({ page }) => {
    // Set Lives to 1 for quick game over
    await page.evaluate(() => (window as any).GAME_CONTROL.setLives(1));
    await expect(page.locator('.heart')).toHaveCount(5); // UI shows max hearts but filled ones differ?
    // Actually visual hearts might not update instantly if we cheat-set logic state without UI callback firing? 
    // Logic calls callbacks.onLivesChange, so it should update.

    // Move player away
    await page.evaluate(() => (window as any).GAME_CONTROL.movePlayerTo(-5));

    // Spawn animal far away
    await page.evaluate(() => (window as any).GAME_CONTROL.spawnAnimalAt(5, 'pig'));

    // Wait for Game Over screen
    await expect(page.getByText(/WOBBLED OUT!/i)).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/visual-gameover.png' });
  });
});
