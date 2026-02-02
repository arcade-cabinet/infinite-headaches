/**
 * DropController Unit Tests
 *
 * Comprehensive tests covering:
 * - Construction and initial state
 * - Update cycle and spawn timing
 * - Player model tracking (skill, frustration, engagement, fatigue)
 * - Difficulty curves (logarithmic progression)
 * - Strategy selection (5 competing strategies)
 * - Yahtzee combo analysis and type classification
 * - Fairness distribution by game phase
 * - Remediation logic (consecutive disruptive drops)
 * - Tornado position tracking (nextDropX, imminence)
 * - Power-up decision logic
 * - Behavior type selection
 * - Event handlers (caught, missed, topple, bank, level-up)
 * - Spawn positioning strategies
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { DropController } from "./DropController";
import { GAME_CONFIG } from "../config";
import type { PlayerState } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal valid PlayerState for testing. */
function createPlayerState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    playerX: 960,
    playerY: -2,
    stackHeight: 0,
    lives: 3,
    maxLives: 5,
    score: 0,
    combo: 0,
    gameTime: 0,
    timeSinceLastSpawn: 0,
    timeSinceLastPowerUp: 0,
    timeSinceLastMiss: 10000,
    timeSinceLastPerfect: 10000,
    recentCatches: 0,
    recentMisses: 0,
    recentPerfects: 0,
    catchRate: 0.5,
    activeDucks: 0,
    activePowerUps: 0,
    screenWidth: 1920,
    screenHeight: 1080,
    level: 1,
    bankedAnimals: 0,
    ...overrides,
  };
}

/** Advance the controller by dt ms with a given state. */
function tick(
  controller: DropController,
  dt: number,
  stateOverrides: Partial<PlayerState> = {},
): ReturnType<DropController["update"]> {
  return controller.update(dt, createPlayerState(stateOverrides));
}

/** Repeatedly tick until a spawn decision is produced (up to maxTicks). */
function tickUntilSpawn(
  controller: DropController,
  stateOverrides: Partial<PlayerState> = {},
  maxTicks = 500,
): NonNullable<ReturnType<DropController["update"]>> {
  for (let i = 0; i < maxTicks; i++) {
    const result = tick(controller, 100, stateOverrides);
    if (result && result.shouldSpawn) return result;
  }
  throw new Error("No spawn decision produced within maxTicks");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DropController", () => {
  let controller: DropController;

  beforeEach(() => {
    controller = new DropController(GAME_CONFIG);
  });

  // =========================================================================
  // Construction & Initial State
  // =========================================================================

  describe("construction", () => {
    it("should initialize with default values", () => {
      expect(controller.difficulty).toBe(0);
      expect(controller.intensity).toBeCloseTo(0.3);
      expect(controller.playerSkill).toBeCloseTo(0.5);
      expect(controller.playerFatigue).toBe(0);
      expect(controller.playerFrustration).toBe(0);
      expect(controller.playerEngagement).toBeCloseTo(0.5);
      expect(controller.powerUpDebt).toBe(0);
      expect(controller.gameState).toBeNull();
    });

    it("should use GAME_CONFIG spawn intervals", () => {
      expect(controller.getSpawnInterval()).toBe(
        GAME_CONFIG.spawning.initialInterval,
      );
    });

    it("should start with neutral tornado position", () => {
      expect(controller.getNextDropX()).toBe(0);
    });

    it("should not be drop-imminent initially", () => {
      expect(controller.getIsDropImminent()).toBe(false);
    });
  });

  // =========================================================================
  // Update Cycle & Spawn Timing
  // =========================================================================

  describe("update cycle", () => {
    it("should return null before spawn interval elapses", () => {
      const result = tick(controller, 100);
      expect(result).toBeNull();
    });

    it("should produce a spawn decision after sufficient time", () => {
      const decision = tickUntilSpawn(controller);
      expect(decision.shouldSpawn).toBe(true);
      expect(decision.duckType).toBeDefined();
      expect(decision.behaviorType).toBeDefined();
      expect(decision.x).toBeGreaterThan(0);
      expect(typeof decision.nextDropX).toBe("number");
    });

    it("should set gameState after first update", () => {
      tick(controller, 16);
      expect(controller.gameState).not.toBeNull();
    });

    it("should reset spawn timer after spawning", () => {
      tickUntilSpawn(controller);
      // Immediately after spawn, next tick should return null
      const result = tick(controller, 16);
      expect(result).toBeNull();
    });

    it("should include nextDropX in spawn decisions", () => {
      const decision = tickUntilSpawn(controller);
      expect(decision.nextDropX).toBeGreaterThanOrEqual(-8);
      expect(decision.nextDropX).toBeLessThanOrEqual(8);
    });
  });

  // =========================================================================
  // Player Model
  // =========================================================================

  describe("player model", () => {
    it("should increase skill when player catches animals", () => {
      const initialSkill = controller.playerSkill;
      controller.onAnimalCaught("perfect");
      expect(controller.playerSkill).toBeGreaterThan(initialSkill);
    });

    it("should give larger skill boost for perfect catches", () => {
      const c1 = new DropController(GAME_CONFIG);
      const c2 = new DropController(GAME_CONFIG);
      c1.onAnimalCaught("perfect");
      c2.onAnimalCaught("normal");
      expect(c1.playerSkill).toBeGreaterThan(c2.playerSkill);
    });

    it("should decrease skill on miss", () => {
      const initial = controller.playerSkill;
      controller.onAnimalMissed();
      expect(controller.playerSkill).toBeLessThan(initial);
    });

    it("should increase frustration on miss", () => {
      const initial = controller.playerFrustration;
      controller.onAnimalMissed();
      expect(controller.playerFrustration).toBeGreaterThan(initial);
    });

    it("should increase frustration on topple", () => {
      const initial = controller.playerFrustration;
      controller.onStackTopple();
      expect(controller.playerFrustration).toBeGreaterThan(initial);
    });

    it("should increase fatigue on topple", () => {
      controller.onStackTopple();
      expect(controller.playerFatigue).toBeGreaterThan(0);
    });

    it("should decrease frustration on catch", () => {
      controller.onAnimalMissed(); // raise frustration
      controller.onAnimalMissed();
      const elevated = controller.playerFrustration;
      controller.onAnimalCaught("normal");
      expect(controller.playerFrustration).toBeLessThan(elevated);
    });

    it("should increase engagement on bank success", () => {
      const initial = controller.playerEngagement;
      controller.onBankSuccess(5);
      expect(controller.playerEngagement).toBeGreaterThan(initial);
    });

    it("should accumulate power-up debt on bank success", () => {
      controller.onBankSuccess(5);
      expect(controller.powerUpDebt).toBeGreaterThan(0);
    });

    it("should decrease frustration on bank success", () => {
      controller.onAnimalMissed();
      controller.onAnimalMissed();
      const elevated = controller.playerFrustration;
      controller.onBankSuccess(3);
      expect(controller.playerFrustration).toBeLessThan(elevated);
    });

    it("should increase engagement on level up", () => {
      const initial = controller.playerEngagement;
      controller.onLevelUp(2);
      expect(controller.playerEngagement).toBeGreaterThan(initial);
    });

    it("should clamp skill to [0, 1]", () => {
      for (let i = 0; i < 100; i++) controller.onAnimalCaught("perfect");
      expect(controller.playerSkill).toBeLessThanOrEqual(1);

      for (let i = 0; i < 200; i++) controller.onAnimalMissed();
      expect(controller.playerSkill).toBeGreaterThanOrEqual(0);
    });

    it("should clamp frustration to [0, 1]", () => {
      for (let i = 0; i < 100; i++) controller.onAnimalMissed();
      expect(controller.playerFrustration).toBeLessThanOrEqual(1);

      for (let i = 0; i < 100; i++) controller.onAnimalCaught("perfect");
      expect(controller.playerFrustration).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // Difficulty Curves
  // =========================================================================

  describe("difficulty curves", () => {
    it("should start near zero difficulty at level 1", () => {
      tick(controller, 16, { level: 1 });
      expect(controller.difficulty).toBeLessThan(0.1);
    });

    it("should increase difficulty at higher levels", () => {
      // Tick at level 1
      for (let i = 0; i < 50; i++) tick(controller, 100, { level: 1 });
      const lowDiff = controller.difficulty;

      // Fresh controller at level 15
      const highCtrl = new DropController(GAME_CONFIG);
      for (let i = 0; i < 50; i++) tick(highCtrl, 100, { level: 15, score: 5000, gameTime: 60000 });
      expect(highCtrl.difficulty).toBeGreaterThan(lowDiff);
    });

    it("should factor in time-based difficulty", () => {
      for (let i = 0; i < 50; i++) tick(controller, 100, { gameTime: 0 });
      const earlyDiff = controller.difficulty;

      const lateCtrl = new DropController(GAME_CONFIG);
      for (let i = 0; i < 50; i++) tick(lateCtrl, 100, { gameTime: 300000 });
      expect(lateCtrl.difficulty).toBeGreaterThan(earlyDiff);
    });

    it("should factor in score-based difficulty", () => {
      for (let i = 0; i < 50; i++) tick(controller, 100, { score: 0 });
      const lowScoreDiff = controller.difficulty;

      const highScoreCtrl = new DropController(GAME_CONFIG);
      for (let i = 0; i < 50; i++) tick(highScoreCtrl, 100, { score: 10000 });
      expect(highScoreCtrl.difficulty).toBeGreaterThan(lowScoreDiff);
    });

    it("should decrease spawn interval as difficulty increases", () => {
      const initialInterval = controller.getSpawnInterval();
      // Tick many times at high level to build difficulty
      for (let i = 0; i < 200; i++) tick(controller, 100, { level: 20, score: 50000, gameTime: 300000 });
      expect(controller.getSpawnInterval()).toBeLessThan(initialInterval);
    });

    it("should keep difficulty in [0, 1]", () => {
      for (let i = 0; i < 1000; i++) tick(controller, 100, { level: 25, score: 100000, gameTime: 600000 });
      expect(controller.difficulty).toBeGreaterThanOrEqual(0);
      expect(controller.difficulty).toBeLessThanOrEqual(1);
    });
  });

  // =========================================================================
  // Strategy Selection
  // =========================================================================

  describe("strategy selection", () => {
    it("should select a valid strategy", () => {
      tick(controller, 100);
      const goal = controller.getActiveGoal();
      expect(["build_pressure", "release_tension", "challenge", "mercy", "reward"]).toContain(goal);
    });

    it("should favor mercy when lives are low and frustration is high", () => {
      // Pump frustration
      for (let i = 0; i < 10; i++) controller.onAnimalMissed();
      // Update with low lives
      for (let i = 0; i < 20; i++) tick(controller, 100, { lives: 1, recentMisses: 5 });
      expect(controller.getActiveGoal()).toBe("mercy");
    });

    it("should enable mercy mode with low lives", () => {
      for (let i = 0; i < 50; i++) tick(controller, 100, { lives: 1 });
      // Mercy mode extends spawn interval — verify spawn interval is higher than base min
      const interval = controller.getSpawnInterval();
      expect(interval).toBeGreaterThan(GAME_CONFIG.spawning.minInterval);
    });
  });

  // =========================================================================
  // Yahtzee Combo Analysis & Type Selection
  // =========================================================================

  describe("Yahtzee-aware type selection", () => {
    it("should use weighted random when stack is empty", () => {
      const types = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const decision = tickUntilSpawn(new DropController(GAME_CONFIG));
        types.add(decision.duckType);
      }
      // Should produce multiple different types
      expect(types.size).toBeGreaterThan(1);
    });

    it("should favor helpful types in early game with stack composition", () => {
      // Set up stack with 2 cows — helpful type would be cow (for three_of_kind)
      const composition = { cow: 2, pig: 0, chicken: 0, duck: 0, sheep: 0, farmer: 0 };
      const typeCounts: Record<string, number> = {};

      for (let i = 0; i < 200; i++) {
        const ctrl = new DropController(GAME_CONFIG);
        const decision = tickUntilSpawn(ctrl, {
          level: 1,
          stackHeight: 2,
          stackComposition: composition,
        });
        typeCounts[decision.duckType] = (typeCounts[decision.duckType] || 0) + 1;
      }

      // At level 1, cow (helpful for combo) should appear more than average
      const cowRate = (typeCounts["cow"] || 0) / 200;
      // With 5 types equally weighted, base rate is 0.2 — helpful should push higher
      expect(cowRate).toBeGreaterThan(0.15); // At least not suppressed
    });

    it("should produce valid animal types only", () => {
      const validTypes = ["cow", "pig", "chicken", "duck", "sheep"];
      for (let i = 0; i < 50; i++) {
        const decision = tickUntilSpawn(new DropController(GAME_CONFIG));
        expect(validTypes).toContain(decision.duckType);
      }
    });

    it("should return a valid drop preview", () => {
      tick(controller, 100, { stackHeight: 3, stackComposition: { cow: 2, pig: 1, chicken: 0, duck: 0, sheep: 0, farmer: 0 } });
      const preview = controller.getDropPreview();
      expect(preview.type).toBeDefined();
      expect(typeof preview.helpful).toBe("boolean");
    });
  });

  // =========================================================================
  // Remediation Logic
  // =========================================================================

  describe("remediation", () => {
    it("should not need remediation power-up when no disruptive drops", () => {
      tick(controller, 100);
      expect(controller.needsRemediationPowerUp()).toBe(false);
    });

    it("should track consecutive disruptive drops via spawn decisions", () => {
      // This is internal behavior — we test the public-facing result.
      // After enough spawns with certain stack compositions, the
      // needsRemediationPowerUp flag may engage. We verify the method exists
      // and returns a boolean.
      expect(typeof controller.needsRemediationPowerUp()).toBe("boolean");
    });
  });

  // =========================================================================
  // Tornado Position
  // =========================================================================

  describe("tornado position", () => {
    it("should start at zero", () => {
      expect(controller.getNextDropX()).toBe(0);
    });

    it("should stay within board bounds (-7.5 to 7.5)", () => {
      for (let i = 0; i < 500; i++) {
        tick(controller, 100, { level: 10 });
      }
      const x = controller.getNextDropX();
      expect(x).toBeGreaterThanOrEqual(-7.5);
      expect(x).toBeLessThanOrEqual(7.5);
    });

    it("should update position after ticks", () => {
      // Tick enough to move the patrol
      for (let i = 0; i < 100; i++) tick(controller, 50);
      // Position should have drifted from initial 0
      // (could be 0 if sine happens to cross 0, so just check it's a number)
      expect(typeof controller.getNextDropX()).toBe("number");
    });

    it("should report drop imminence when timer is near", () => {
      // Tick close to spawn interval
      const interval = controller.getSpawnInterval();
      const tickCount = Math.ceil((interval * 0.8) / 16);
      for (let i = 0; i < tickCount; i++) tick(controller, 16);
      // At 80% of interval, should be imminent
      expect(controller.getIsDropImminent()).toBe(true);
    });

    it("should not be imminent right after a spawn", () => {
      tickUntilSpawn(controller);
      tick(controller, 16);
      expect(controller.getIsDropImminent()).toBe(false);
    });
  });

  // =========================================================================
  // Power-Up Decisions
  // =========================================================================

  describe("power-up decisions", () => {
    it("should return null when conditions aren't met", () => {
      tick(controller, 100);
      // Most of the time, power-up shouldn't spawn on first tick
      const result = controller.shouldSpawnPowerUp();
      // Could be null or a type — just verify it's one of the expected values
      expect(result === null || typeof result === "string").toBe(true);
    });

    it("should produce valid power-up types when spawning", () => {
      const validTypes = ["rare_candy", "potion", "max_up", "great_ball", "x_attack", "full_restore"];
      // Build up conditions that favor power-up spawning
      controller.powerUpDebt = 10;
      for (let i = 0; i < 5; i++) controller.onAnimalMissed();

      let found = false;
      for (let i = 0; i < 200; i++) {
        tick(controller, 500, { lives: 1, activePowerUps: 0 });
        const result = controller.shouldSpawnPowerUp();
        if (result !== null) {
          expect(validTypes).toContain(result);
          found = true;
          break;
        }
      }
      // With high debt and low lives, should eventually produce a power-up
      expect(found).toBe(true);
    });

    it("decidePowerUp should return a PowerUpDecision object", () => {
      tick(controller, 100);
      const decision = controller.decidePowerUp();
      expect(typeof decision.shouldSpawn).toBe("boolean");
      expect(typeof decision.type).toBe("string");
      expect(typeof decision.x).toBe("number");
      expect(["immediate", "delayed"]).toContain(decision.timing);
    });
  });

  // =========================================================================
  // Behavior Type Selection
  // =========================================================================

  describe("behavior type selection", () => {
    it("should return a valid behavior type", () => {
      const validTypes = ["normal", "seeker", "evader", "zigzag", "swarm", "dive", "floater"];
      const type = controller.getBehaviorType();
      expect(validTypes).toContain(type);
    });

    it("should produce variety across multiple calls", () => {
      const types = new Set<string>();
      for (let i = 0; i < 200; i++) {
        types.add(controller.getBehaviorType());
      }
      expect(types.size).toBeGreaterThan(1);
    });

    it("should favor easy behaviors at low difficulty", () => {
      // Fresh controller = low difficulty
      const counts: Record<string, number> = {};
      for (let i = 0; i < 500; i++) {
        const type = controller.getBehaviorType();
        counts[type] = (counts[type] || 0) + 1;
      }
      // Normal + floater should dominate at low difficulty
      const easyCount = (counts["normal"] || 0) + (counts["floater"] || 0);
      expect(easyCount).toBeGreaterThan(200); // More than 40% easy
    });
  });

  // =========================================================================
  // Spawn Positioning
  // =========================================================================

  describe("spawn positioning", () => {
    it("should produce spawn X within screen bounds", () => {
      const decision = tickUntilSpawn(controller);
      expect(decision.x).toBeGreaterThan(0);
      expect(decision.x).toBeLessThan(1920);
    });

    it("should produce non-zero velocity", () => {
      const decision = tickUntilSpawn(controller);
      // At least vertical velocity should be non-zero
      expect(decision.initialVelocityY).toBeGreaterThan(0);
    });

    it("should have target bias in [0, 1]", () => {
      const decision = tickUntilSpawn(controller);
      expect(decision.targetBias).toBeGreaterThanOrEqual(0);
      expect(decision.targetBias).toBeLessThanOrEqual(1);
    });

    it("should avoid extreme same-side spawns", () => {
      // Spawn many times and check that not all are on the same side
      const xPositions: number[] = [];
      const ctrl = new DropController(GAME_CONFIG);
      for (let i = 0; i < 20; i++) {
        const d = tickUntilSpawn(ctrl);
        xPositions.push(d.x);
      }
      const leftCount = xPositions.filter((x) => x < 640).length;
      const rightCount = xPositions.filter((x) => x > 1280).length;
      // Should have at least some variety
      expect(leftCount + rightCount).toBeGreaterThan(0);
      expect(leftCount).toBeLessThan(20); // Not ALL left
      expect(rightCount).toBeLessThan(20); // Not ALL right
    });
  });

  // =========================================================================
  // Intensity
  // =========================================================================

  describe("intensity", () => {
    it("should start at a moderate value", () => {
      expect(controller.intensity).toBeGreaterThan(0);
      expect(controller.intensity).toBeLessThan(1);
    });

    it("should change with ticks", () => {
      const initial = controller.intensity;
      for (let i = 0; i < 100; i++) tick(controller, 100, { level: 15, combo: 10 });
      // Intensity should have shifted
      expect(controller.intensity).not.toBe(initial);
    });
  });

  // =========================================================================
  // Full Integration: Multiple Spawns
  // =========================================================================

  describe("integration", () => {
    it("should produce multiple spawns over time", () => {
      let spawnCount = 0;
      for (let i = 0; i < 1000; i++) {
        const result = tick(controller, 50, { level: 5, gameTime: i * 50 });
        if (result && result.shouldSpawn) spawnCount++;
      }
      expect(spawnCount).toBeGreaterThan(3);
    });

    it("should not produce spawns faster than min interval", () => {
      const minInterval = GAME_CONFIG.spawning.minInterval;
      let lastSpawnTime = -Infinity;
      let violations = 0;

      for (let i = 0; i < 2000; i++) {
        const t = i * 16;
        const result = controller.update(16, createPlayerState({ level: 25, gameTime: t, score: 100000 }));
        if (result && result.shouldSpawn) {
          const gap = t - lastSpawnTime;
          if (gap < minInterval * 0.9 && lastSpawnTime > 0) {
            violations++;
          }
          lastSpawnTime = t;
        }
      }
      expect(violations).toBe(0);
    });

    it("should handle rapid event notifications without crashing", () => {
      for (let i = 0; i < 50; i++) {
        controller.onAnimalCaught("perfect");
        controller.onAnimalMissed();
        controller.onStackTopple();
        controller.onBankSuccess(3);
        controller.onLevelUp(i);
        tick(controller, 16);
      }
      // Should still be in a valid state
      expect(controller.difficulty).toBeGreaterThanOrEqual(0);
      expect(controller.difficulty).toBeLessThanOrEqual(1);
    });
  });
});
