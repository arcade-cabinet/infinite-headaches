/**
 * Achievement System Tests
 * Tests for checking achievement conditions and stat saving
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  checkAchievements,
  loadAchievements,
  loadStats,
  saveStats,
  getAchievementStats,
  type GameStats,
} from "@/game/achievements";

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

describe("Achievement System", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe("loadStats", () => {
    it("returns default stats when no saved stats exist", () => {
      const stats = loadStats();

      expect(stats.totalScore).toBe(0);
      expect(stats.highScore).toBe(0);
      expect(stats.totalCatches).toBe(0);
      expect(stats.perfectCatches).toBe(0);
      expect(stats.totalGames).toBe(0);
      expect(stats.maxStack).toBe(0);
      expect(stats.maxCombo).toBe(0);
      expect(stats.totalBanked).toBe(0);
      expect(stats.fireballsShot).toBe(0);
      expect(stats.animalsFrozen).toBe(0);
      expect(stats.powerUpsCollected).toBe(0);
      expect(stats.livesEarned).toBe(0);
      expect(stats.totalPlayTime).toBe(0);
      expect(stats.consecutivePerfects).toBe(0);
    });

    it("loads saved stats from localStorage", () => {
      const savedStats: GameStats = {
        totalScore: 5000,
        highScore: 2500,
        totalCatches: 100,
        perfectCatches: 25,
        totalGames: 10,
        maxStack: 8,
        maxCombo: 12,
        totalBanked: 50,
        fireballsShot: 15,
        animalsFrozen: 20,
        powerUpsCollected: 30,
        livesEarned: 5,
        totalPlayTime: 3600,
        consecutivePerfects: 3,
      };

      localStorageMock.setItem("animal-stats", JSON.stringify(savedStats));

      const stats = loadStats();
      expect(stats.totalScore).toBe(5000);
      expect(stats.highScore).toBe(2500);
      expect(stats.totalGames).toBe(10);
      expect(stats.maxStack).toBe(8);
    });

    it("handles corrupted localStorage data gracefully", () => {
      localStorageMock.setItem("animal-stats", "invalid-json");

      const stats = loadStats();
      // Should return defaults on parse error
      expect(stats.totalScore).toBe(0);
    });
  });

  describe("saveStats", () => {
    it("saves stats to localStorage", () => {
      const stats: GameStats = {
        totalScore: 1000,
        highScore: 500,
        totalCatches: 50,
        perfectCatches: 10,
        totalGames: 5,
        maxStack: 6,
        maxCombo: 8,
        totalBanked: 20,
        fireballsShot: 5,
        animalsFrozen: 3,
        powerUpsCollected: 10,
        livesEarned: 2,
        totalPlayTime: 1800,
        consecutivePerfects: 2,
      };

      saveStats(stats);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "animal-stats",
        JSON.stringify(stats)
      );
    });
  });

  describe("checkAchievements", () => {
    it("returns newly unlocked achievements", () => {
      const stats: GameStats = {
        totalScore: 100,
        highScore: 100,
        totalCatches: 1,
        perfectCatches: 0,
        totalGames: 1,
        maxStack: 0,
        maxCombo: 0,
        totalBanked: 0,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 0,
        consecutivePerfects: 0,
      };

      const newlyUnlocked = checkAchievements(stats);

      // Should unlock "first_catch" and "century"
      const firstCatch = newlyUnlocked.find((a) => a.id === "first_catch");
      const century = newlyUnlocked.find((a) => a.id === "century");

      expect(firstCatch).toBeDefined();
      expect(firstCatch?.name).toBe("First Catch");
      expect(century).toBeDefined();
      expect(century?.name).toBe("Century");
    });

    it("unlocks first_catch achievement on first catch", () => {
      const stats: GameStats = {
        totalScore: 0,
        highScore: 0,
        totalCatches: 1,
        perfectCatches: 0,
        totalGames: 0,
        maxStack: 0,
        maxCombo: 0,
        totalBanked: 0,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 0,
        consecutivePerfects: 0,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "first_catch")).toBe(true);
    });

    it("unlocks high_roller achievement at 1000 score", () => {
      const stats: GameStats = {
        totalScore: 1000,
        highScore: 1000,
        totalCatches: 50,
        perfectCatches: 10,
        totalGames: 3,
        maxStack: 5,
        maxCombo: 5,
        totalBanked: 10,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 600,
        consecutivePerfects: 0,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "high_roller")).toBe(true);
    });

    it("unlocks animal_master achievement at 5000 score", () => {
      const stats: GameStats = {
        totalScore: 5000,
        highScore: 5000,
        totalCatches: 200,
        perfectCatches: 50,
        totalGames: 10,
        maxStack: 10,
        maxCombo: 10,
        totalBanked: 50,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 3000,
        consecutivePerfects: 0,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "animal_master")).toBe(true);
    });

    it("unlocks legendary achievement at 10000 score", () => {
      const stats: GameStats = {
        totalScore: 10000,
        highScore: 10000,
        totalCatches: 400,
        perfectCatches: 100,
        totalGames: 20,
        maxStack: 15,
        maxCombo: 15,
        totalBanked: 100,
        fireballsShot: 20,
        animalsFrozen: 20,
        powerUpsCollected: 50,
        livesEarned: 10,
        totalPlayTime: 6000,
        consecutivePerfects: 5,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "legendary")).toBe(true);
    });

    it("unlocks tower_of_five achievement at 5 stack", () => {
      const stats: GameStats = {
        totalScore: 0,
        highScore: 0,
        totalCatches: 5,
        perfectCatches: 0,
        totalGames: 1,
        maxStack: 5,
        maxCombo: 0,
        totalBanked: 0,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 0,
        consecutivePerfects: 0,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "tower_of_five")).toBe(true);
    });

    it("unlocks tower_of_ten achievement at 10 stack", () => {
      const stats: GameStats = {
        totalScore: 0,
        highScore: 0,
        totalCatches: 10,
        perfectCatches: 0,
        totalGames: 1,
        maxStack: 10,
        maxCombo: 0,
        totalBanked: 0,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 0,
        consecutivePerfects: 0,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "tower_of_ten")).toBe(true);
    });

    it("unlocks skyscraper achievement at 15 stack", () => {
      const stats: GameStats = {
        totalScore: 0,
        highScore: 0,
        totalCatches: 15,
        perfectCatches: 0,
        totalGames: 1,
        maxStack: 15,
        maxCombo: 0,
        totalBanked: 0,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 0,
        consecutivePerfects: 0,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "skyscraper")).toBe(true);
    });

    it("unlocks sharp_eye achievement at 10 perfect catches", () => {
      const stats: GameStats = {
        totalScore: 0,
        highScore: 0,
        totalCatches: 20,
        perfectCatches: 10,
        totalGames: 1,
        maxStack: 0,
        maxCombo: 0,
        totalBanked: 0,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 0,
        consecutivePerfects: 0,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "sharp_eye")).toBe(true);
    });

    it("unlocks precision achievement at 5 consecutive perfects", () => {
      const stats: GameStats = {
        totalScore: 0,
        highScore: 0,
        totalCatches: 5,
        perfectCatches: 5,
        totalGames: 1,
        maxStack: 5,
        maxCombo: 5,
        totalBanked: 0,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 0,
        consecutivePerfects: 5,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "precision")).toBe(true);
    });

    it("unlocks perfectionist achievement at 100 perfect catches", () => {
      const stats: GameStats = {
        totalScore: 0,
        highScore: 0,
        totalCatches: 200,
        perfectCatches: 100,
        totalGames: 20,
        maxStack: 0,
        maxCombo: 0,
        totalBanked: 0,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 0,
        consecutivePerfects: 0,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "perfectionist")).toBe(true);
    });

    it("unlocks combo_starter achievement at 5x combo", () => {
      const stats: GameStats = {
        totalScore: 0,
        highScore: 0,
        totalCatches: 10,
        perfectCatches: 0,
        totalGames: 1,
        maxStack: 5,
        maxCombo: 5,
        totalBanked: 0,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 0,
        consecutivePerfects: 0,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "combo_starter")).toBe(true);
    });

    it("unlocks combo_king achievement at 10x combo", () => {
      const stats: GameStats = {
        totalScore: 0,
        highScore: 0,
        totalCatches: 20,
        perfectCatches: 0,
        totalGames: 1,
        maxStack: 10,
        maxCombo: 10,
        totalBanked: 0,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 0,
        consecutivePerfects: 0,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "combo_king")).toBe(true);
    });

    it("unlocks safe_keeper achievement at 10 animals banked", () => {
      const stats: GameStats = {
        totalScore: 0,
        highScore: 0,
        totalCatches: 10,
        perfectCatches: 0,
        totalGames: 1,
        maxStack: 0,
        maxCombo: 0,
        totalBanked: 10,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 0,
        consecutivePerfects: 0,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "safe_keeper")).toBe(true);
    });

    it("unlocks banker achievement at 50 animals banked", () => {
      const stats: GameStats = {
        totalScore: 0,
        highScore: 0,
        totalCatches: 50,
        perfectCatches: 0,
        totalGames: 5,
        maxStack: 0,
        maxCombo: 0,
        totalBanked: 50,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 0,
        consecutivePerfects: 0,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "banker")).toBe(true);
    });

    it("unlocks pyromaniac achievement at 10 fireballs shot", () => {
      const stats: GameStats = {
        totalScore: 0,
        highScore: 0,
        totalCatches: 0,
        perfectCatches: 0,
        totalGames: 1,
        maxStack: 0,
        maxCombo: 0,
        totalBanked: 0,
        fireballsShot: 10,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 0,
        consecutivePerfects: 0,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "pyromaniac")).toBe(true);
    });

    it("unlocks ice_age achievement at 10 animals frozen", () => {
      const stats: GameStats = {
        totalScore: 0,
        highScore: 0,
        totalCatches: 0,
        perfectCatches: 0,
        totalGames: 1,
        maxStack: 0,
        maxCombo: 0,
        totalBanked: 0,
        fireballsShot: 0,
        animalsFrozen: 10,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 0,
        consecutivePerfects: 0,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "ice_age")).toBe(true);
    });

    it("unlocks collector achievement at 20 power-ups collected", () => {
      const stats: GameStats = {
        totalScore: 0,
        highScore: 0,
        totalCatches: 0,
        perfectCatches: 0,
        totalGames: 5,
        maxStack: 0,
        maxCombo: 0,
        totalBanked: 0,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 20,
        livesEarned: 0,
        totalPlayTime: 0,
        consecutivePerfects: 0,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "collector")).toBe(true);
    });

    it("unlocks dedicated achievement at 30 minutes playtime", () => {
      const stats: GameStats = {
        totalScore: 0,
        highScore: 0,
        totalCatches: 0,
        perfectCatches: 0,
        totalGames: 10,
        maxStack: 0,
        maxCombo: 0,
        totalBanked: 0,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 1800, // 30 minutes in seconds
        consecutivePerfects: 0,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "dedicated")).toBe(true);
    });

    it("unlocks persistent achievement at 10 games played", () => {
      const stats: GameStats = {
        totalScore: 0,
        highScore: 0,
        totalCatches: 0,
        perfectCatches: 0,
        totalGames: 10,
        maxStack: 0,
        maxCombo: 0,
        totalBanked: 0,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 0,
        consecutivePerfects: 0,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "persistent")).toBe(true);
    });

    it("unlocks veteran achievement at 50 games played", () => {
      const stats: GameStats = {
        totalScore: 0,
        highScore: 0,
        totalCatches: 0,
        perfectCatches: 0,
        totalGames: 50,
        maxStack: 0,
        maxCombo: 0,
        totalBanked: 0,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 0,
        consecutivePerfects: 0,
      };

      const unlocked = checkAchievements(stats);
      expect(unlocked.some((a) => a.id === "veteran")).toBe(true);
    });

    it("does not return already unlocked achievements", () => {
      const stats: GameStats = {
        totalScore: 100,
        highScore: 100,
        totalCatches: 1,
        perfectCatches: 0,
        totalGames: 1,
        maxStack: 0,
        maxCombo: 0,
        totalBanked: 0,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 0,
        consecutivePerfects: 0,
      };

      // First check unlocks achievements
      const firstUnlock = checkAchievements(stats);
      expect(firstUnlock.length).toBeGreaterThan(0);

      // Second check with same stats should not return already unlocked
      const secondUnlock = checkAchievements(stats);
      expect(secondUnlock.length).toBe(0);
    });
  });

  describe("loadAchievements", () => {
    it("returns all achievements with unlocked status", () => {
      const achievements = loadAchievements();

      expect(achievements.length).toBeGreaterThan(0);
      expect(achievements[0]).toHaveProperty("id");
      expect(achievements[0]).toHaveProperty("name");
      expect(achievements[0]).toHaveProperty("description");
      expect(achievements[0]).toHaveProperty("icon");
      expect(achievements[0]).toHaveProperty("tier");
      expect(achievements[0]).toHaveProperty("unlocked");
    });

    it("marks achievements as unlocked based on current stats", () => {
      const stats: GameStats = {
        totalScore: 1000,
        highScore: 1000,
        totalCatches: 50,
        perfectCatches: 10,
        totalGames: 5,
        maxStack: 6,
        maxCombo: 6,
        totalBanked: 15,
        fireballsShot: 0,
        animalsFrozen: 0,
        powerUpsCollected: 0,
        livesEarned: 0,
        totalPlayTime: 600,
        consecutivePerfects: 0,
      };

      saveStats(stats);
      const achievements = loadAchievements();

      const highRoller = achievements.find((a) => a.id === "high_roller");
      expect(highRoller?.unlocked).toBe(true);
    });
  });

  describe("getAchievementStats", () => {
    it("returns achievement statistics by tier", () => {
      const achievementStats = getAchievementStats();

      expect(achievementStats).toHaveProperty("total");
      expect(achievementStats).toHaveProperty("unlocked");
      expect(achievementStats).toHaveProperty("byTier");
      expect(achievementStats.byTier).toHaveProperty("bronze");
      expect(achievementStats.byTier).toHaveProperty("silver");
      expect(achievementStats.byTier).toHaveProperty("gold");
      expect(achievementStats.byTier).toHaveProperty("platinum");
    });

    it("counts total achievements correctly", () => {
      const achievementStats = getAchievementStats();

      // Should have achievements defined
      expect(achievementStats.total).toBeGreaterThan(0);
      expect(achievementStats.unlocked).toBeGreaterThanOrEqual(0);
    });
  });
});
