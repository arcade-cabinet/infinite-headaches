/**
 * Progression/Upgrades System Tests
 * Tests for coin calculation, upgrade purchases, and saved state
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  loadUpgradeState,
  saveUpgradeState,
  getUpgrades,
  getUpgradeValue,
  getUpgradeCost,
  purchaseUpgrade,
  addCoins,
  getCoins,
  calculateCoinsFromScore,
  getUpgradeModifiers,
  type UpgradeState,
} from "@/game/progression/Upgrades";

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

describe("Progression/Upgrades System", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe("calculateCoinsFromScore", () => {
    it("calculates 1 coin per 10 points", () => {
      expect(calculateCoinsFromScore(0)).toBe(0);
      expect(calculateCoinsFromScore(10)).toBe(1);
      expect(calculateCoinsFromScore(100)).toBe(10);
      expect(calculateCoinsFromScore(1000)).toBe(100);
      expect(calculateCoinsFromScore(5000)).toBe(500);
    });

    it("rounds down for partial coins", () => {
      expect(calculateCoinsFromScore(5)).toBe(0);
      expect(calculateCoinsFromScore(15)).toBe(1);
      expect(calculateCoinsFromScore(99)).toBe(9);
    });
  });

  describe("loadUpgradeState", () => {
    it("returns default state when no saved state exists", () => {
      const state = loadUpgradeState();

      expect(state.coins).toBe(0);
      expect(state.upgrades).toEqual({});
      expect(state.totalCoinsEarned).toBe(0);
    });

    it("loads saved state from localStorage", () => {
      const savedState: UpgradeState = {
        coins: 500,
        upgrades: { extra_life: 1, coin_boost: 2 },
        totalCoinsEarned: 1000,
      };

      localStorageMock.setItem("animal-upgrades", JSON.stringify(savedState));

      const state = loadUpgradeState();
      expect(state.coins).toBe(500);
      expect(state.upgrades.extra_life).toBe(1);
      expect(state.upgrades.coin_boost).toBe(2);
      expect(state.totalCoinsEarned).toBe(1000);
    });

    it("handles corrupted localStorage data gracefully", () => {
      localStorageMock.setItem("animal-upgrades", "invalid-json");

      const state = loadUpgradeState();
      // Should return defaults on parse error
      expect(state.coins).toBe(0);
      expect(state.upgrades).toEqual({});
    });
  });

  describe("saveUpgradeState", () => {
    it("saves state to localStorage", () => {
      const state: UpgradeState = {
        coins: 250,
        upgrades: { stable_stack: 3 },
        totalCoinsEarned: 750,
      };

      saveUpgradeState(state);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "animal-upgrades",
        JSON.stringify(state)
      );
    });
  });

  describe("addCoins", () => {
    it("adds base coins to balance", () => {
      const earned = addCoins(100);

      expect(earned).toBe(100);
      expect(getCoins()).toBe(100);
    });

    it("accumulates coins across multiple calls", () => {
      addCoins(50);
      addCoins(75);
      addCoins(100);

      expect(getCoins()).toBe(225);
    });

    it("applies coin boost upgrade multiplier", () => {
      // Set up coin_boost upgrade at level 2 (30% bonus)
      const initialState: UpgradeState = {
        coins: 0,
        upgrades: { coin_boost: 2 },
        totalCoinsEarned: 0,
      };
      saveUpgradeState(initialState);

      const earned = addCoins(100);

      // With 30% bonus, 100 base coins = 130 earned
      expect(earned).toBe(130);
    });

    it("tracks total coins earned", () => {
      addCoins(100);
      addCoins(200);

      const state = loadUpgradeState();
      expect(state.totalCoinsEarned).toBe(300);
    });
  });

  describe("getCoins", () => {
    it("returns current coin balance", () => {
      expect(getCoins()).toBe(0);

      addCoins(150);
      expect(getCoins()).toBe(150);
    });
  });

  describe("getUpgrades", () => {
    it("returns all upgrades with current levels", () => {
      const upgrades = getUpgrades();

      expect(upgrades.length).toBeGreaterThan(0);

      // Check structure of upgrade objects
      const firstUpgrade = upgrades[0];
      expect(firstUpgrade).toHaveProperty("id");
      expect(firstUpgrade).toHaveProperty("name");
      expect(firstUpgrade).toHaveProperty("description");
      expect(firstUpgrade).toHaveProperty("icon");
      expect(firstUpgrade).toHaveProperty("maxLevel");
      expect(firstUpgrade).toHaveProperty("currentLevel");
      expect(firstUpgrade).toHaveProperty("baseCost");
      expect(firstUpgrade).toHaveProperty("costMultiplier");
    });

    it("reflects purchased upgrade levels", () => {
      const state: UpgradeState = {
        coins: 1000,
        upgrades: { extra_life: 2, stable_stack: 1 },
        totalCoinsEarned: 1000,
      };
      saveUpgradeState(state);

      const upgrades = getUpgrades();

      const extraLife = upgrades.find((u) => u.id === "extra_life");
      const stableStack = upgrades.find((u) => u.id === "stable_stack");

      expect(extraLife?.currentLevel).toBe(2);
      expect(stableStack?.currentLevel).toBe(1);
    });

    it("includes all expected upgrades", () => {
      const upgrades = getUpgrades();
      const upgradeIds = upgrades.map((u) => u.id);

      expect(upgradeIds).toContain("extra_life");
      expect(upgradeIds).toContain("stable_stack");
      expect(upgradeIds).toContain("coin_boost");
      expect(upgradeIds).toContain("power_up_magnet");
      expect(upgradeIds).toContain("combo_keeper");
      expect(upgradeIds).toContain("ability_master");
      expect(upgradeIds).toContain("lucky_drops");
      expect(upgradeIds).toContain("special_affinity");
    });
  });

  describe("getUpgradeValue", () => {
    it("returns 0 for upgrades at level 0", () => {
      expect(getUpgradeValue("extra_life")).toBe(0);
    });

    it("returns correct value for extra_life upgrade", () => {
      // extra_life: +1 life per level
      const state: UpgradeState = {
        coins: 0,
        upgrades: { extra_life: 2 },
        totalCoinsEarned: 0,
      };
      saveUpgradeState(state);

      expect(getUpgradeValue("extra_life")).toBe(2);
    });

    it("returns correct value for stable_stack upgrade", () => {
      // stable_stack: 8% reduction per level
      const state: UpgradeState = {
        coins: 0,
        upgrades: { stable_stack: 3 },
        totalCoinsEarned: 0,
      };
      saveUpgradeState(state);

      expect(getUpgradeValue("stable_stack")).toBeCloseTo(0.24); // 3 * 0.08
    });

    it("returns correct value for coin_boost upgrade", () => {
      // coin_boost: 1 + 15% per level multiplier
      const state: UpgradeState = {
        coins: 0,
        upgrades: { coin_boost: 4 },
        totalCoinsEarned: 0,
      };
      saveUpgradeState(state);

      expect(getUpgradeValue("coin_boost")).toBeCloseTo(1.6); // 1 + 4 * 0.15
    });

    it("returns 0 for unknown upgrade id", () => {
      expect(getUpgradeValue("nonexistent_upgrade")).toBe(0);
    });
  });

  describe("getUpgradeCost", () => {
    it("returns base cost at level 0", () => {
      const upgrades = getUpgrades();
      const extraLife = upgrades.find((u) => u.id === "extra_life");

      expect(extraLife).toBeDefined();
      expect(extraLife?.currentLevel).toBe(0);
      expect(getUpgradeCost(extraLife!)).toBe(500); // base cost
    });

    it("applies cost multiplier for higher levels", () => {
      const state: UpgradeState = {
        coins: 0,
        upgrades: { extra_life: 1 },
        totalCoinsEarned: 0,
      };
      saveUpgradeState(state);

      const upgrades = getUpgrades();
      const extraLife = upgrades.find((u) => u.id === "extra_life");

      // extra_life: baseCost 500, costMultiplier 2
      // Level 1 cost = 500 * 2^1 = 1000
      expect(getUpgradeCost(extraLife!)).toBe(1000);
    });

    it("returns Infinity for maxed out upgrades", () => {
      const state: UpgradeState = {
        coins: 0,
        upgrades: { extra_life: 3 }, // maxLevel is 3
        totalCoinsEarned: 0,
      };
      saveUpgradeState(state);

      const upgrades = getUpgrades();
      const extraLife = upgrades.find((u) => u.id === "extra_life");

      expect(getUpgradeCost(extraLife!)).toBe(Infinity);
    });

    it("calculates cost correctly for different upgrades", () => {
      const upgrades = getUpgrades();
      const stableStack = upgrades.find((u) => u.id === "stable_stack");

      // stable_stack: baseCost 300, costMultiplier 1.5, level 0
      expect(stableStack).toBeDefined();
      expect(getUpgradeCost(stableStack!)).toBe(300);
    });
  });

  describe("purchaseUpgrade", () => {
    it("successfully purchases upgrade when enough coins", () => {
      // Add coins first
      const state: UpgradeState = {
        coins: 600,
        upgrades: {},
        totalCoinsEarned: 600,
      };
      saveUpgradeState(state);

      const result = purchaseUpgrade("extra_life");

      expect(result).toBe(true);

      const newState = loadUpgradeState();
      expect(newState.upgrades.extra_life).toBe(1);
      expect(newState.coins).toBe(100); // 600 - 500
    });

    it("fails when not enough coins", () => {
      const state: UpgradeState = {
        coins: 100,
        upgrades: {},
        totalCoinsEarned: 100,
      };
      saveUpgradeState(state);

      const result = purchaseUpgrade("extra_life");

      expect(result).toBe(false);

      const newState = loadUpgradeState();
      expect(newState.upgrades.extra_life).toBeUndefined();
      expect(newState.coins).toBe(100); // Unchanged
    });

    it("fails when upgrade is at max level", () => {
      const state: UpgradeState = {
        coins: 10000,
        upgrades: { extra_life: 3 }, // maxLevel
        totalCoinsEarned: 10000,
      };
      saveUpgradeState(state);

      const result = purchaseUpgrade("extra_life");

      expect(result).toBe(false);

      const newState = loadUpgradeState();
      expect(newState.upgrades.extra_life).toBe(3); // Unchanged
      expect(newState.coins).toBe(10000); // Unchanged
    });

    it("fails for non-existent upgrade id", () => {
      const state: UpgradeState = {
        coins: 10000,
        upgrades: {},
        totalCoinsEarned: 10000,
      };
      saveUpgradeState(state);

      const result = purchaseUpgrade("fake_upgrade");

      expect(result).toBe(false);
    });

    it("deducts correct amount for subsequent levels", () => {
      // Purchase first level
      const state: UpgradeState = {
        coins: 2000,
        upgrades: { extra_life: 1 },
        totalCoinsEarned: 2000,
      };
      saveUpgradeState(state);

      const result = purchaseUpgrade("extra_life");

      expect(result).toBe(true);

      const newState = loadUpgradeState();
      expect(newState.upgrades.extra_life).toBe(2);
      expect(newState.coins).toBe(1000); // 2000 - 1000 (level 2 cost)
    });
  });

  describe("getUpgradeModifiers", () => {
    it("returns default modifiers when no upgrades purchased", () => {
      const modifiers = getUpgradeModifiers();

      expect(modifiers.extraLives).toBe(0);
      expect(modifiers.wobbleReduction).toBe(0);
      expect(modifiers.coinMultiplier).toBe(1); // Base multiplier is 1
      expect(modifiers.powerUpRadius).toBe(1); // Base multiplier is 1
      expect(modifiers.comboDecayMultiplier).toBe(1); // Base multiplier is 1
      expect(modifiers.abilityCooldownReduction).toBe(0);
      expect(modifiers.powerUpSpawnBonus).toBe(1); // Base multiplier is 1
      expect(modifiers.specialDuckBonus).toBe(0);
    });

    it("returns correct modifiers for purchased upgrades", () => {
      const state: UpgradeState = {
        coins: 0,
        upgrades: {
          extra_life: 2,
          stable_stack: 3,
          coin_boost: 2,
          power_up_magnet: 1,
          combo_keeper: 2,
          ability_master: 3,
          lucky_drops: 1,
          special_affinity: 2,
        },
        totalCoinsEarned: 0,
      };
      saveUpgradeState(state);

      const modifiers = getUpgradeModifiers();

      expect(modifiers.extraLives).toBe(2);
      expect(modifiers.wobbleReduction).toBeCloseTo(0.24); // 3 * 0.08
      expect(modifiers.coinMultiplier).toBeCloseTo(1.3); // 1 + 2 * 0.15
      expect(modifiers.powerUpRadius).toBeCloseTo(1.2); // 1 + 1 * 0.2
      expect(modifiers.comboDecayMultiplier).toBeCloseTo(1.5); // 1 + 2 * 0.25
      expect(modifiers.abilityCooldownReduction).toBeCloseTo(0.3); // 3 * 0.1
      expect(modifiers.powerUpSpawnBonus).toBeCloseTo(1.2); // 1 + 1 * 0.2
      expect(modifiers.specialDuckBonus).toBeCloseTo(0.1); // 2 * 0.05
    });
  });
});
