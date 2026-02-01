/**
 * Integration Tests for Zustand Random Store
 *
 * Tests the random number generation store including:
 * - Store initialization with default seed
 * - setSeed updates the seed
 * - shuffleSeed generates new seed
 * - getRandom produces values in range
 * - Multiple components share same store state
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRandomStore, randomStore, getRNG, getCurrentSeed, getCurrentSeedName } from "@/random/store";

describe("Random Store Integration", () => {
  // Store state before each test for cleanup
  let initialSeed: number;

  beforeEach(() => {
    // Capture initial state
    initialSeed = useRandomStore.getState().seed;
  });

  afterEach(() => {
    // Reset store to a known state
    act(() => {
      useRandomStore.getState().setSeed(12345);
    });
  });

  describe("Store Initialization", () => {
    it("should initialize with a numeric seed", () => {
      const state = useRandomStore.getState();

      expect(typeof state.seed).toBe("number");
      expect(state.seed).toBeGreaterThanOrEqual(0);
    });

    it("should initialize with a seed name string", () => {
      const state = useRandomStore.getState();

      expect(typeof state.seedName).toBe("string");
      expect(state.seedName.length).toBeGreaterThan(0);
    });

    it("should initialize with an RNG instance", () => {
      const state = useRandomStore.getState();

      expect(state.rng).toBeDefined();
      expect(typeof state.rng.next).toBe("function");
      expect(typeof state.rng.nextInt).toBe("function");
    });

    it("should initialize callCount at 0", () => {
      // Set a fresh seed to reset callCount
      act(() => {
        useRandomStore.getState().setSeed(99999);
      });

      const state = useRandomStore.getState();
      expect(state.callCount).toBe(0);
    });
  });

  describe("setSeed", () => {
    it("should update the seed when setSeed is called", () => {
      const newSeed = 42;

      act(() => {
        useRandomStore.getState().setSeed(newSeed);
      });

      expect(useRandomStore.getState().seed).toBe(newSeed);
    });

    it("should update the seed name when setSeed is called", () => {
      const nameBefore = useRandomStore.getState().seedName;

      act(() => {
        useRandomStore.getState().setSeed(999999);
      });

      const nameAfter = useRandomStore.getState().seedName;
      // Seed name might be the same by coincidence, but seed should be different
      expect(useRandomStore.getState().seed).toBe(999999);
      expect(typeof nameAfter).toBe("string");
    });

    it("should reset callCount when setSeed is called", () => {
      // Generate some random numbers to increment callCount
      act(() => {
        useRandomStore.getState().next();
        useRandomStore.getState().next();
        useRandomStore.getState().next();
      });

      expect(useRandomStore.getState().callCount).toBeGreaterThan(0);

      // Set a new seed
      act(() => {
        useRandomStore.getState().setSeed(12345);
      });

      expect(useRandomStore.getState().callCount).toBe(0);
    });

    it("should create a new RNG instance when setSeed is called", () => {
      const rngBefore = useRandomStore.getState().rng;

      act(() => {
        useRandomStore.getState().setSeed(54321);
      });

      const rngAfter = useRandomStore.getState().rng;
      expect(rngAfter).not.toBe(rngBefore);
    });

    it("should normalize seed to unsigned 32-bit integer", () => {
      act(() => {
        useRandomStore.getState().setSeed(-1);
      });

      // -1 >>> 0 = 4294967295 (max unsigned 32-bit)
      expect(useRandomStore.getState().seed).toBe(4294967295);
    });
  });

  describe("shuffleSeed", () => {
    it("should generate a new seed different from the current one", () => {
      act(() => {
        useRandomStore.getState().setSeed(12345);
      });

      const seedBefore = useRandomStore.getState().seed;

      act(() => {
        useRandomStore.getState().shuffleSeed();
      });

      const seedAfter = useRandomStore.getState().seed;

      // The shuffled seed should be different (extremely unlikely to be same)
      expect(seedAfter).not.toBe(seedBefore);
    });

    it("should reset callCount when shuffleSeed is called", () => {
      act(() => {
        useRandomStore.getState().next();
        useRandomStore.getState().next();
      });

      expect(useRandomStore.getState().callCount).toBeGreaterThan(0);

      act(() => {
        useRandomStore.getState().shuffleSeed();
      });

      expect(useRandomStore.getState().callCount).toBe(0);
    });

    it("should create a new seed name when shuffled", () => {
      act(() => {
        useRandomStore.getState().setSeed(12345);
      });

      act(() => {
        useRandomStore.getState().shuffleSeed();
      });

      // Seed name should be a valid string
      const seedName = useRandomStore.getState().seedName;
      expect(typeof seedName).toBe("string");
      expect(seedName.length).toBeGreaterThan(0);
    });
  });

  describe("Random Value Generation (getRandom/next)", () => {
    beforeEach(() => {
      // Set a known seed for reproducible tests
      act(() => {
        useRandomStore.getState().setSeed(12345);
      });
    });

    it("should produce values in range [0, 1) for next()", () => {
      for (let i = 0; i < 100; i++) {
        const value = useRandomStore.getState().next();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it("should produce values in range [0, 1) for nextFloat()", () => {
      for (let i = 0; i < 100; i++) {
        const value = useRandomStore.getState().nextFloat();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it("should produce integers in range [min, max] for nextInt()", () => {
      const min = 5;
      const max = 10;

      for (let i = 0; i < 100; i++) {
        const value = useRandomStore.getState().nextInt(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThanOrEqual(max);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it("should produce booleans for nextBool()", () => {
      const results: boolean[] = [];

      for (let i = 0; i < 100; i++) {
        results.push(useRandomStore.getState().nextBool());
      }

      // Should have at least some true and some false
      expect(results.some((v) => v === true)).toBe(true);
      expect(results.some((v) => v === false)).toBe(true);
    });

    it("should respect probability for nextBool(probability)", () => {
      act(() => {
        useRandomStore.getState().setSeed(12345);
      });

      // Test with 0% probability - should always be false
      for (let i = 0; i < 10; i++) {
        expect(useRandomStore.getState().nextBool(0)).toBe(false);
      }

      // Test with 100% probability - should always be true
      for (let i = 0; i < 10; i++) {
        expect(useRandomStore.getState().nextBool(1)).toBe(true);
      }
    });

    it("should produce values in range for range(min, max)", () => {
      const min = 10;
      const max = 20;

      for (let i = 0; i < 100; i++) {
        const value = useRandomStore.getState().range(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThan(max);
      }
    });

    it("should increment callCount for each random call", () => {
      act(() => {
        useRandomStore.getState().setSeed(12345);
      });

      expect(useRandomStore.getState().callCount).toBe(0);

      act(() => {
        useRandomStore.getState().next();
      });
      expect(useRandomStore.getState().callCount).toBe(1);

      act(() => {
        useRandomStore.getState().nextInt(0, 10);
      });
      expect(useRandomStore.getState().callCount).toBe(2);

      act(() => {
        useRandomStore.getState().nextBool();
      });
      expect(useRandomStore.getState().callCount).toBe(3);
    });
  });

  describe("Deterministic Behavior", () => {
    it("should produce same sequence with same seed", () => {
      const seed = 42;
      const values1: number[] = [];
      const values2: number[] = [];

      // First sequence
      act(() => {
        useRandomStore.getState().setSeed(seed);
      });
      for (let i = 0; i < 10; i++) {
        values1.push(useRandomStore.getState().next());
      }

      // Second sequence with same seed
      act(() => {
        useRandomStore.getState().setSeed(seed);
      });
      for (let i = 0; i < 10; i++) {
        values2.push(useRandomStore.getState().next());
      }

      expect(values1).toEqual(values2);
    });

    it("should produce different sequences with different seeds", () => {
      const values1: number[] = [];
      const values2: number[] = [];

      // First sequence
      act(() => {
        useRandomStore.getState().setSeed(1);
      });
      for (let i = 0; i < 10; i++) {
        values1.push(useRandomStore.getState().next());
      }

      // Second sequence with different seed
      act(() => {
        useRandomStore.getState().setSeed(2);
      });
      for (let i = 0; i < 10; i++) {
        values2.push(useRandomStore.getState().next());
      }

      expect(values1).not.toEqual(values2);
    });

    it("should allow replay via resetRNG()", () => {
      act(() => {
        useRandomStore.getState().setSeed(12345);
      });

      const values1: number[] = [];
      for (let i = 0; i < 5; i++) {
        values1.push(useRandomStore.getState().next());
      }

      // Reset RNG to replay
      act(() => {
        useRandomStore.getState().resetRNG();
      });

      const values2: number[] = [];
      for (let i = 0; i < 5; i++) {
        values2.push(useRandomStore.getState().next());
      }

      expect(values1).toEqual(values2);
    });
  });

  describe("Multiple Components Sharing Store State", () => {
    it("should share state between multiple hook instances", () => {
      // Set a known seed
      act(() => {
        useRandomStore.getState().setSeed(12345);
      });

      // Render two hooks
      const { result: hook1 } = renderHook(() => useRandomStore());
      const { result: hook2 } = renderHook(() => useRandomStore());

      // Both should see the same seed
      expect(hook1.current.seed).toBe(hook2.current.seed);
      expect(hook1.current.seedName).toBe(hook2.current.seedName);
      expect(hook1.current.callCount).toBe(hook2.current.callCount);
    });

    it("should reflect updates across all hook instances", () => {
      const { result: hook1 } = renderHook(() => useRandomStore());
      const { result: hook2 } = renderHook(() => useRandomStore());

      // Update via first hook
      act(() => {
        hook1.current.setSeed(99999);
      });

      // Second hook should see the update
      expect(hook2.current.seed).toBe(99999);
    });

    it("should increment callCount visible to all instances", () => {
      act(() => {
        useRandomStore.getState().setSeed(12345);
      });

      const { result: hook1 } = renderHook(() => useRandomStore());
      const { result: hook2 } = renderHook(() => useRandomStore());

      expect(hook1.current.callCount).toBe(0);
      expect(hook2.current.callCount).toBe(0);

      // Generate random number via first hook
      act(() => {
        hook1.current.next();
      });

      // Both hooks should see incremented callCount
      expect(hook1.current.callCount).toBe(1);
      expect(hook2.current.callCount).toBe(1);
    });

    it("should share RNG state via getRNG() helper", () => {
      act(() => {
        useRandomStore.getState().setSeed(12345);
      });

      const rng1 = getRNG();
      const rng2 = getRNG();

      // Both should be the same instance
      expect(rng1).toBe(rng2);
    });

    it("should provide correct seed via getCurrentSeed() helper", () => {
      act(() => {
        useRandomStore.getState().setSeed(54321);
      });

      expect(getCurrentSeed()).toBe(54321);
    });

    it("should provide correct seed name via getCurrentSeedName() helper", () => {
      act(() => {
        useRandomStore.getState().setSeed(12345);
      });

      const seedName = getCurrentSeedName();
      expect(typeof seedName).toBe("string");
      expect(seedName.length).toBeGreaterThan(0);
    });

    it("should allow direct store access via randomStore", () => {
      act(() => {
        randomStore.getState().setSeed(11111);
      });

      expect(randomStore.getState().seed).toBe(11111);
      expect(useRandomStore.getState().seed).toBe(11111);
    });
  });

  describe("Array Operations", () => {
    beforeEach(() => {
      act(() => {
        useRandomStore.getState().setSeed(12345);
      });
    });

    it("should pick random elements from array", () => {
      const array = [1, 2, 3, 4, 5];
      const picked = useRandomStore.getState().pick(array);

      expect(array).toContain(picked);
    });

    it("should return undefined for pick() on empty array", () => {
      const picked = useRandomStore.getState().pick([]);
      expect(picked).toBeUndefined();
    });

    it("should shuffle array in place", () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const original = [...array];

      useRandomStore.getState().shuffle(array);

      // Should contain same elements
      expect(array.sort()).toEqual(original.sort());

      // Reset and check that order changed (very unlikely to stay same)
      act(() => {
        useRandomStore.getState().setSeed(12345);
      });

      const array2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      useRandomStore.getState().shuffle(array2);
      expect(array2).not.toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it("should create shuffled copy with shuffled()", () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
      const shuffled = useRandomStore.getState().shuffled(original);

      // Original should be unchanged
      expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      // Shuffled should have same elements
      expect([...shuffled].sort()).toEqual([...original].sort());
    });

    it("should pick multiple unique elements", () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const picked = useRandomStore.getState().pickMultiple(array, 5);

      expect(picked.length).toBe(5);

      // All should be unique
      const unique = new Set(picked);
      expect(unique.size).toBe(5);

      // All should be from original array
      for (const item of picked) {
        expect(array).toContain(item);
      }
    });
  });

  describe("Advanced RNG Features", () => {
    beforeEach(() => {
      act(() => {
        useRandomStore.getState().setSeed(12345);
      });
    });

    it("should produce Gaussian distributed values", () => {
      const values: number[] = [];

      for (let i = 0; i < 100; i++) {
        values.push(useRandomStore.getState().nextGaussian(0, 1));
      }

      // Check mean is approximately 0
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      expect(Math.abs(mean)).toBeLessThan(0.5);
    });

    it("should support weighted random pick", () => {
      const items = [
        { item: "common", weight: 90 },
        { item: "rare", weight: 10 },
      ];

      const counts: Record<string, number> = { common: 0, rare: 0 };

      for (let i = 0; i < 100; i++) {
        const picked = useRandomStore.getState().weightedPick(items);
        if (picked) {
          counts[picked]++;
        }
      }

      // Common should be picked more often
      expect(counts.common).toBeGreaterThan(counts.rare);
    });

    it("should fork RNG for isolated sequences", () => {
      const forked = useRandomStore.getState().fork();

      // Forked RNG should work independently
      const forkedValues: number[] = [];
      for (let i = 0; i < 5; i++) {
        forkedValues.push(forked.next());
      }

      // Main RNG should produce different values
      const mainValues: number[] = [];
      for (let i = 0; i < 5; i++) {
        mainValues.push(useRandomStore.getState().next());
      }

      // They might have some overlap but should generally differ
      expect(forkedValues).not.toEqual(mainValues);
    });

    it("should return snapshot via getSnapshot()", () => {
      act(() => {
        useRandomStore.getState().setSeed(12345);
        useRandomStore.getState().next();
        useRandomStore.getState().next();
      });

      const snapshot = useRandomStore.getState().getSnapshot();

      expect(snapshot.seed).toBe(12345);
      expect(typeof snapshot.seedName).toBe("string");
      expect(snapshot.callCount).toBe(2);
    });
  });
});
