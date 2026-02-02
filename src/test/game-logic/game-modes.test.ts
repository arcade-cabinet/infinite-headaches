/**
 * Game Mode System Tests
 * Tests for mode unlocks, conditions, and mode-specific settings
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  GAME_MODES,
  checkModeUnlocks,
  saveUnlockedModes,
  loadUnlockedModes,
  type GameModeType,
} from "@/game/modes/GameMode";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("Game Mode System", () => {
  // Reset GAME_MODES unlocked state before each test
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();

    // Reset all modes to their default unlocked state
    GAME_MODES.endless.unlocked = true;
    GAME_MODES.time_attack.unlocked = false;
    GAME_MODES.zen.unlocked = false;
    GAME_MODES.boss_rush.unlocked = false;
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe("GAME_MODES configuration", () => {
    it("defines endless mode as always unlocked", () => {
      expect(GAME_MODES.endless.unlocked).toBe(true);
      expect(GAME_MODES.endless.id).toBe("endless");
      expect(GAME_MODES.endless.name).toBe("Endless");
    });

    it("defines time_attack mode with correct settings", () => {
      expect(GAME_MODES.time_attack.id).toBe("time_attack");
      expect(GAME_MODES.time_attack.hasLives).toBe(false);
      expect(GAME_MODES.time_attack.hasTimer).toBe(true);
      expect(GAME_MODES.time_attack.timerSeconds).toBe(90);
      expect(GAME_MODES.time_attack.scoreMultiplier).toBe(1.5);
      expect(GAME_MODES.time_attack.spawnRateMultiplier).toBe(1.3);
    });

    it("defines zen mode with correct settings", () => {
      expect(GAME_MODES.zen.id).toBe("zen");
      expect(GAME_MODES.zen.hasLives).toBe(false);
      expect(GAME_MODES.zen.hasBanking).toBe(false);
      expect(GAME_MODES.zen.hasTimer).toBe(false);
      expect(GAME_MODES.zen.scoreMultiplier).toBe(0.5);
      expect(GAME_MODES.zen.spawnRateMultiplier).toBe(0.7);
    });

    it("defines boss_rush mode with correct settings", () => {
      expect(GAME_MODES.boss_rush.id).toBe("boss_rush");
      expect(GAME_MODES.boss_rush.hasLives).toBe(true);
      expect(GAME_MODES.boss_rush.hasBanking).toBe(true);
      expect(GAME_MODES.boss_rush.scoreMultiplier).toBe(2);
      expect(GAME_MODES.boss_rush.spawnRateMultiplier).toBe(0.5);
    });

    it("all modes have required properties", () => {
      const modeIds: GameModeType[] = ["endless", "time_attack", "zen", "boss_rush"];

      for (const modeId of modeIds) {
        const mode = GAME_MODES[modeId];

        expect(mode).toHaveProperty("id");
        expect(mode).toHaveProperty("name");
        expect(mode).toHaveProperty("description");
        expect(mode).toHaveProperty("icon");
        expect(mode).toHaveProperty("color");
        expect(mode).toHaveProperty("unlocked");
        expect(mode).toHaveProperty("hasLives");
        expect(mode).toHaveProperty("hasBanking");
        expect(mode).toHaveProperty("hasTimer");
        expect(mode).toHaveProperty("spawnRateMultiplier");
        expect(mode).toHaveProperty("scoreMultiplier");
      }
    });
  });

  describe("checkModeUnlocks", () => {
    it("returns empty array when no modes are newly unlocked", () => {
      const stats = { highScore: 0, totalGames: 0 };

      const unlocked = checkModeUnlocks(stats);

      expect(unlocked).toEqual([]);
    });

    it("unlocks time_attack at 1000 high score", () => {
      const stats = { highScore: 1000, totalGames: 5 };

      const unlocked = checkModeUnlocks(stats);

      expect(unlocked).toContain("time_attack");
      expect(GAME_MODES.time_attack.unlocked).toBe(true);
    });

    it("unlocks time_attack above 1000 high score", () => {
      const stats = { highScore: 1500, totalGames: 3 };

      const unlocked = checkModeUnlocks(stats);

      expect(unlocked).toContain("time_attack");
    });

    it("does not unlock time_attack below 1000 high score", () => {
      const stats = { highScore: 999, totalGames: 5 };

      const unlocked = checkModeUnlocks(stats);

      expect(unlocked).not.toContain("time_attack");
      expect(GAME_MODES.time_attack.unlocked).toBe(false);
    });

    it("unlocks zen mode at 10 games played", () => {
      const stats = { highScore: 100, totalGames: 10 };

      const unlocked = checkModeUnlocks(stats);

      expect(unlocked).toContain("zen");
      expect(GAME_MODES.zen.unlocked).toBe(true);
    });

    it("unlocks zen mode above 10 games played", () => {
      const stats = { highScore: 100, totalGames: 15 };

      const unlocked = checkModeUnlocks(stats);

      expect(unlocked).toContain("zen");
    });

    it("does not unlock zen mode below 10 games", () => {
      const stats = { highScore: 100, totalGames: 9 };

      const unlocked = checkModeUnlocks(stats);

      expect(unlocked).not.toContain("zen");
      expect(GAME_MODES.zen.unlocked).toBe(false);
    });

    it("unlocks boss_rush at 5000 high score", () => {
      const stats = { highScore: 5000, totalGames: 20 };

      const unlocked = checkModeUnlocks(stats);

      expect(unlocked).toContain("boss_rush");
      expect(GAME_MODES.boss_rush.unlocked).toBe(true);
    });

    it("unlocks boss_rush above 5000 high score", () => {
      const stats = { highScore: 7500, totalGames: 15 };

      const unlocked = checkModeUnlocks(stats);

      expect(unlocked).toContain("boss_rush");
    });

    it("does not unlock boss_rush below 5000 high score", () => {
      const stats = { highScore: 4999, totalGames: 50 };

      const unlocked = checkModeUnlocks(stats);

      expect(unlocked).not.toContain("boss_rush");
      expect(GAME_MODES.boss_rush.unlocked).toBe(false);
    });

    it("can unlock multiple modes at once", () => {
      const stats = { highScore: 5000, totalGames: 10 };

      const unlocked = checkModeUnlocks(stats);

      expect(unlocked).toContain("time_attack");
      expect(unlocked).toContain("zen");
      expect(unlocked).toContain("boss_rush");
      expect(unlocked.length).toBe(3);
    });

    it("does not return already unlocked modes", () => {
      GAME_MODES.time_attack.unlocked = true;

      const stats = { highScore: 5000, totalGames: 10 };

      const unlocked = checkModeUnlocks(stats);

      // time_attack was already unlocked, so should not be in newly unlocked list
      expect(unlocked).not.toContain("time_attack");
      expect(unlocked).toContain("zen");
      expect(unlocked).toContain("boss_rush");
    });

    it("does not include endless mode in unlocks (always unlocked)", () => {
      const stats = { highScore: 10000, totalGames: 100 };

      const unlocked = checkModeUnlocks(stats);

      expect(unlocked).not.toContain("endless");
    });
  });

  describe("saveUnlockedModes", () => {
    it("saves unlocked modes to localStorage", () => {
      GAME_MODES.time_attack.unlocked = true;
      GAME_MODES.zen.unlocked = true;
      GAME_MODES.boss_rush.unlocked = false;

      saveUnlockedModes();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "animal-modes-unlocked",
        expect.any(String)
      );

      const savedValue = localStorageMock.setItem.mock.calls[0][1];
      const parsed = JSON.parse(savedValue);

      expect(parsed).toContain("endless");
      expect(parsed).toContain("time_attack");
      expect(parsed).toContain("zen");
      expect(parsed).not.toContain("boss_rush");
    });

    it("only saves currently unlocked modes", () => {
      // All modes locked except endless
      GAME_MODES.time_attack.unlocked = false;
      GAME_MODES.zen.unlocked = false;
      GAME_MODES.boss_rush.unlocked = false;

      saveUnlockedModes();

      const savedValue = localStorageMock.setItem.mock.calls[0][1];
      const parsed = JSON.parse(savedValue);

      expect(parsed).toEqual(["endless"]);
    });
  });

  describe("loadUnlockedModes", () => {
    it("loads unlocked modes from localStorage", () => {
      // Reset all to locked
      GAME_MODES.time_attack.unlocked = false;
      GAME_MODES.zen.unlocked = false;

      // Save unlocked modes
      localStorageMock.setItem(
        "animal-modes-unlocked",
        JSON.stringify(["endless", "time_attack", "zen"])
      );

      loadUnlockedModes();

      expect(GAME_MODES.time_attack.unlocked).toBe(true);
      expect(GAME_MODES.zen.unlocked).toBe(true);
      expect(GAME_MODES.boss_rush.unlocked).toBe(false);
    });

    it("handles missing localStorage data gracefully", () => {
      // Ensure nothing is stored
      localStorageMock.clear();

      // Should not throw
      expect(() => loadUnlockedModes()).not.toThrow();
    });

    it("handles corrupted localStorage data gracefully", () => {
      localStorageMock.setItem("animal-modes-unlocked", "invalid-json");

      // Should not throw
      expect(() => loadUnlockedModes()).not.toThrow();
    });

    it("ignores invalid mode IDs in saved data", () => {
      localStorageMock.setItem(
        "animal-modes-unlocked",
        JSON.stringify(["endless", "invalid_mode", "time_attack"])
      );

      // Should not throw
      expect(() => loadUnlockedModes()).not.toThrow();

      expect(GAME_MODES.time_attack.unlocked).toBe(true);
    });
  });

  describe("Zen mode special rules", () => {
    it("zen mode has no lives", () => {
      expect(GAME_MODES.zen.hasLives).toBe(false);
    });

    it("zen mode has no banking", () => {
      expect(GAME_MODES.zen.hasBanking).toBe(false);
    });

    it("zen mode has reduced score multiplier", () => {
      expect(GAME_MODES.zen.scoreMultiplier).toBe(0.5);
    });

    it("zen mode has slower spawn rate", () => {
      expect(GAME_MODES.zen.spawnRateMultiplier).toBeLessThan(1);
    });

    it("zen mode has special rules defined", () => {
      expect(GAME_MODES.zen.specialRules).toBeDefined();
      expect(GAME_MODES.zen.specialRules?.length).toBeGreaterThan(0);
    });
  });

  describe("Time Attack mode special rules", () => {
    it("time_attack has no lives", () => {
      expect(GAME_MODES.time_attack.hasLives).toBe(false);
    });

    it("time_attack has a timer", () => {
      expect(GAME_MODES.time_attack.hasTimer).toBe(true);
      expect(GAME_MODES.time_attack.timerSeconds).toBe(90);
    });

    it("time_attack has faster spawns", () => {
      expect(GAME_MODES.time_attack.spawnRateMultiplier).toBeGreaterThan(1);
    });

    it("time_attack has 1.5x score multiplier", () => {
      expect(GAME_MODES.time_attack.scoreMultiplier).toBe(1.5);
    });
  });

  describe("Boss Rush mode special rules", () => {
    it("boss_rush has lives", () => {
      expect(GAME_MODES.boss_rush.hasLives).toBe(true);
    });

    it("boss_rush has banking", () => {
      expect(GAME_MODES.boss_rush.hasBanking).toBe(true);
    });

    it("boss_rush has 2x score multiplier", () => {
      expect(GAME_MODES.boss_rush.scoreMultiplier).toBe(2);
    });

    it("boss_rush has fewer regular spawns", () => {
      expect(GAME_MODES.boss_rush.spawnRateMultiplier).toBeLessThan(1);
    });
  });
});
