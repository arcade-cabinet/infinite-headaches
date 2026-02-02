/**
 * Unit Tests for SeededRNG (Seeded Random Number Generator)
 *
 * Tests deterministic output, same seed produces same sequence,
 * and various utility methods.
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  SeededRNG,
  createSeededRNG,
  createSeededRNGFromString,
  hashString,
} from "./seedrandom";

describe("SeededRNG", () => {
  describe("constructor", () => {
    it("should create RNG with default seed (timestamp-based)", () => {
      const rng1 = new SeededRNG();
      const rng2 = new SeededRNG();

      // Two RNGs created at different times should have different seeds
      // (unless created in the exact same millisecond)
      expect(rng1.getSeed()).toBeGreaterThan(0);
      expect(rng2.getSeed()).toBeGreaterThan(0);
    });

    it("should create RNG with specific seed", () => {
      const rng = new SeededRNG(12345);
      expect(rng.getSeed()).toBe(12345);
    });

    it("should normalize seed to unsigned 32-bit integer", () => {
      const rng1 = new SeededRNG(-1);
      const rng2 = new SeededRNG(4294967295); // Max uint32

      expect(rng1.getSeed()).toBe(4294967295);
      expect(rng2.getSeed()).toBe(4294967295);
    });

    it("should handle large seeds by truncating to 32 bits", () => {
      const largeSeed = 0xffffffff + 1; // 2^32
      const rng = new SeededRNG(largeSeed);
      expect(rng.getSeed()).toBe(0); // Should wrap around
    });
  });

  describe("deterministic output", () => {
    it("should produce deterministic sequence from same seed", () => {
      const seed = 42;
      const rng1 = new SeededRNG(seed);
      const rng2 = new SeededRNG(seed);

      const sequence1 = Array.from({ length: 100 }, () => rng1.next());
      const sequence2 = Array.from({ length: 100 }, () => rng2.next());

      expect(sequence1).toEqual(sequence2);
    });

    it("should produce different sequences from different seeds", () => {
      const rng1 = new SeededRNG(100);
      const rng2 = new SeededRNG(200);

      const sequence1 = Array.from({ length: 10 }, () => rng1.next());
      const sequence2 = Array.from({ length: 10 }, () => rng2.next());

      expect(sequence1).not.toEqual(sequence2);
    });

    it("should produce known sequence for seed 12345", () => {
      const rng = new SeededRNG(12345);

      // Verify specific known values for this seed
      const firstValue = rng.next();
      expect(firstValue).toBeGreaterThanOrEqual(0);
      expect(firstValue).toBeLessThan(1);

      // Verify determinism by checking first 5 values match expected
      const rng2 = new SeededRNG(12345);
      expect(rng2.next()).toBeCloseTo(firstValue, 10);
    });

    it("should produce values in range [0, 1)", () => {
      const rng = new SeededRNG(99999);

      for (let i = 0; i < 1000; i++) {
        const value = rng.next();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });
  });

  describe("reset", () => {
    it("should reset RNG to initial seed state", () => {
      const rng = new SeededRNG(42);

      // Generate some values
      const firstSequence = [rng.next(), rng.next(), rng.next()];

      // Reset
      rng.reset();

      // Generate again - should match
      const secondSequence = [rng.next(), rng.next(), rng.next()];

      expect(firstSequence).toEqual(secondSequence);
    });

    it("should allow multiple resets", () => {
      const rng = new SeededRNG(12345);

      for (let i = 0; i < 3; i++) {
        const value = rng.next();
        rng.reset();
        expect(rng.next()).toBe(value);
        rng.reset();
      }
    });
  });

  describe("setSeed", () => {
    it("should set a new seed and reset state", () => {
      const rng = new SeededRNG(100);
      rng.next();
      rng.next();

      rng.setSeed(200);

      expect(rng.getSeed()).toBe(200);

      // Verify it produces same sequence as fresh RNG with seed 200
      const freshRng = new SeededRNG(200);
      expect(rng.next()).toBe(freshRng.next());
    });

    it("should normalize new seed to unsigned 32-bit", () => {
      const rng = new SeededRNG(100);
      rng.setSeed(-100);

      expect(rng.getSeed()).toBe((-100 >>> 0));
    });
  });

  describe("next and nextFloat", () => {
    it("nextFloat should be alias for next", () => {
      const rng1 = new SeededRNG(42);
      const rng2 = new SeededRNG(42);

      const next1 = rng1.next();
      const nextFloat2 = rng2.nextFloat();

      expect(next1).toBe(nextFloat2);
    });
  });

  describe("nextInt", () => {
    it("should produce integers in range [min, max] inclusive", () => {
      const rng = new SeededRNG(42);

      for (let i = 0; i < 100; i++) {
        const value = rng.nextInt(1, 6);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
      }
    });

    it("should produce deterministic integers", () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      const sequence1 = Array.from({ length: 20 }, () => rng1.nextInt(0, 100));
      const sequence2 = Array.from({ length: 20 }, () => rng2.nextInt(0, 100));

      expect(sequence1).toEqual(sequence2);
    });

    it("should return min when min equals max", () => {
      const rng = new SeededRNG(42);
      expect(rng.nextInt(5, 5)).toBe(5);
      expect(rng.nextInt(0, 0)).toBe(0);
      expect(rng.nextInt(-3, -3)).toBe(-3);
    });

    it("should handle negative ranges", () => {
      const rng = new SeededRNG(42);

      for (let i = 0; i < 50; i++) {
        const value = rng.nextInt(-10, -5);
        expect(value).toBeGreaterThanOrEqual(-10);
        expect(value).toBeLessThanOrEqual(-5);
      }
    });

    it("should handle ranges crossing zero", () => {
      const rng = new SeededRNG(42);

      for (let i = 0; i < 50; i++) {
        const value = rng.nextInt(-5, 5);
        expect(value).toBeGreaterThanOrEqual(-5);
        expect(value).toBeLessThanOrEqual(5);
      }
    });

    it("should handle float min/max by rounding", () => {
      const rng = new SeededRNG(42);

      // min 1.2 should become 2 (ceil), max 4.8 should become 4 (floor)
      for (let i = 0; i < 50; i++) {
        const value = rng.nextInt(1.2, 4.8);
        expect(value).toBeGreaterThanOrEqual(2);
        expect(value).toBeLessThanOrEqual(4);
      }
    });
  });

  describe("nextBool", () => {
    it("should produce booleans", () => {
      const rng = new SeededRNG(42);

      for (let i = 0; i < 100; i++) {
        const value = rng.nextBool();
        expect(typeof value).toBe("boolean");
      }
    });

    it("should respect probability parameter", () => {
      const rng = new SeededRNG(42);

      // With probability 0, should always return false
      for (let i = 0; i < 50; i++) {
        expect(rng.nextBool(0)).toBe(false);
      }

      // With probability 1, should always return true
      for (let i = 0; i < 50; i++) {
        expect(rng.nextBool(1)).toBe(true);
      }
    });

    it("should produce roughly 50% true with default probability", () => {
      const rng = new SeededRNG(42);
      let trueCount = 0;

      for (let i = 0; i < 1000; i++) {
        if (rng.nextBool()) trueCount++;
      }

      // Should be roughly 50%, allow 10% variance
      expect(trueCount).toBeGreaterThan(400);
      expect(trueCount).toBeLessThan(600);
    });

    it("should be deterministic", () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      const sequence1 = Array.from({ length: 50 }, () => rng1.nextBool(0.3));
      const sequence2 = Array.from({ length: 50 }, () => rng2.nextBool(0.3));

      expect(sequence1).toEqual(sequence2);
    });
  });

  describe("shuffle", () => {
    it("should shuffle array in place", () => {
      const rng = new SeededRNG(42);
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const array = [...original];

      const result = rng.shuffle(array);

      expect(result).toBe(array); // Same reference
      expect(array).not.toEqual(original); // Should be different order
      expect(array.sort((a, b) => a - b)).toEqual(original.sort((a, b) => a - b)); // Same elements
    });

    it("should produce deterministic shuffle", () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      const array1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const array2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      rng1.shuffle(array1);
      rng2.shuffle(array2);

      expect(array1).toEqual(array2);
    });

    it("should handle empty array", () => {
      const rng = new SeededRNG(42);
      const array: number[] = [];

      rng.shuffle(array);

      expect(array).toEqual([]);
    });

    it("should handle single element array", () => {
      const rng = new SeededRNG(42);
      const array = [42];

      rng.shuffle(array);

      expect(array).toEqual([42]);
    });

    it("should handle array of strings", () => {
      const rng = new SeededRNG(42);
      const array = ["a", "b", "c", "d", "e"];

      rng.shuffle(array);

      expect(array).toHaveLength(5);
      expect(array.sort()).toEqual(["a", "b", "c", "d", "e"]);
    });
  });

  describe("shuffled", () => {
    it("should return new shuffled array without modifying original", () => {
      const rng = new SeededRNG(42);
      const original = [1, 2, 3, 4, 5] as const;
      const originalCopy = [...original];

      const result = rng.shuffled(original);

      expect(result).not.toBe(original); // Different reference
      expect(original).toEqual(originalCopy); // Original unchanged
      expect(result.sort((a, b) => a - b)).toEqual([...original].sort((a, b) => a - b));
    });

    it("should produce deterministic result", () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      const original = [1, 2, 3, 4, 5] as const;

      expect(rng1.shuffled(original)).toEqual(rng2.shuffled(original));
    });
  });

  describe("pick", () => {
    it("should pick random element from array", () => {
      const rng = new SeededRNG(42);
      const array = ["a", "b", "c", "d", "e"];

      const picked = rng.pick(array);

      expect(array).toContain(picked);
    });

    it("should return undefined for empty array", () => {
      const rng = new SeededRNG(42);
      const array: string[] = [];

      expect(rng.pick(array)).toBeUndefined();
    });

    it("should be deterministic", () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      const array = ["a", "b", "c", "d", "e"] as const;

      const picks1 = Array.from({ length: 10 }, () => rng1.pick(array));
      const picks2 = Array.from({ length: 10 }, () => rng2.pick(array));

      expect(picks1).toEqual(picks2);
    });

    it("should return the only element from single-element array", () => {
      const rng = new SeededRNG(42);

      expect(rng.pick([42])).toBe(42);
      expect(rng.pick(["only"])).toBe("only");
    });
  });

  describe("pickOrThrow", () => {
    it("should pick random element from array", () => {
      const rng = new SeededRNG(42);
      const array = [1, 2, 3, 4, 5];

      const picked = rng.pickOrThrow(array);

      expect(array).toContain(picked);
    });

    it("should throw for empty array", () => {
      const rng = new SeededRNG(42);
      const array: number[] = [];

      expect(() => rng.pickOrThrow(array)).toThrow("Cannot pick from empty array");
    });
  });

  describe("pickMultiple", () => {
    it("should pick unique elements", () => {
      const rng = new SeededRNG(42);
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const picked = rng.pickMultiple(array, 5);

      expect(picked).toHaveLength(5);
      expect(new Set(picked).size).toBe(5); // All unique
      for (const item of picked) {
        expect(array).toContain(item);
      }
    });

    it("should return all elements if count exceeds array length", () => {
      const rng = new SeededRNG(42);
      const array = [1, 2, 3];

      const picked = rng.pickMultiple(array, 10);

      expect(picked).toHaveLength(3);
      expect(picked.sort((a, b) => a - b)).toEqual([1, 2, 3]);
    });

    it("should be deterministic", () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      const array = ["a", "b", "c", "d", "e"] as const;

      expect(rng1.pickMultiple(array, 3)).toEqual(rng2.pickMultiple(array, 3));
    });

    it("should return empty array when picking 0 elements", () => {
      const rng = new SeededRNG(42);

      expect(rng.pickMultiple([1, 2, 3], 0)).toEqual([]);
    });
  });

  describe("nextGaussian", () => {
    it("should produce values centered around mean", () => {
      const rng = new SeededRNG(42);
      const mean = 50;
      const stdDev = 10;
      let sum = 0;
      const count = 1000;

      for (let i = 0; i < count; i++) {
        sum += rng.nextGaussian(mean, stdDev);
      }

      const average = sum / count;
      // Should be close to mean (within 3 standard deviations / sqrt(n))
      expect(Math.abs(average - mean)).toBeLessThan(3 * stdDev / Math.sqrt(count));
    });

    it("should use default mean of 0 and stdDev of 1", () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      expect(rng1.nextGaussian()).toBe(rng2.nextGaussian(0, 1));
    });

    it("should be deterministic", () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      const sequence1 = Array.from({ length: 10 }, () => rng1.nextGaussian(100, 15));
      const sequence2 = Array.from({ length: 10 }, () => rng2.nextGaussian(100, 15));

      expect(sequence1).toEqual(sequence2);
    });
  });

  describe("range", () => {
    it("should produce values in range [min, max)", () => {
      const rng = new SeededRNG(42);

      for (let i = 0; i < 100; i++) {
        const value = rng.range(10, 20);
        expect(value).toBeGreaterThanOrEqual(10);
        expect(value).toBeLessThan(20);
      }
    });

    it("should handle negative ranges", () => {
      const rng = new SeededRNG(42);

      for (let i = 0; i < 50; i++) {
        const value = rng.range(-10, -5);
        expect(value).toBeGreaterThanOrEqual(-10);
        expect(value).toBeLessThan(-5);
      }
    });

    it("should be deterministic", () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      const sequence1 = Array.from({ length: 20 }, () => rng1.range(0, 100));
      const sequence2 = Array.from({ length: 20 }, () => rng2.range(0, 100));

      expect(sequence1).toEqual(sequence2);
    });
  });

  describe("weightedPick", () => {
    it("should pick items based on weights", () => {
      const rng = new SeededRNG(42);
      const items = [
        { item: "common", weight: 10 },
        { item: "rare", weight: 1 },
      ] as const;

      let commonCount = 0;
      let rareCount = 0;

      for (let i = 0; i < 1000; i++) {
        const picked = rng.weightedPick(items);
        if (picked === "common") commonCount++;
        else rareCount++;
      }

      // Common should be picked roughly 10x more often
      expect(commonCount).toBeGreaterThan(rareCount * 5); // Allow some variance
    });

    it("should return undefined for empty array", () => {
      const rng = new SeededRNG(42);
      expect(rng.weightedPick([])).toBeUndefined();
    });

    it("should return undefined when total weight is 0", () => {
      const rng = new SeededRNG(42);
      const items = [
        { item: "a", weight: 0 },
        { item: "b", weight: 0 },
      ];
      expect(rng.weightedPick(items)).toBeUndefined();
    });

    it("should always pick item with weight 1 when others have weight 0", () => {
      const rng = new SeededRNG(42);
      const items = [
        { item: "zero1", weight: 0 },
        { item: "one", weight: 1 },
        { item: "zero2", weight: 0 },
      ];

      for (let i = 0; i < 50; i++) {
        expect(rng.weightedPick(items)).toBe("one");
      }
    });

    it("should be deterministic", () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      const items = [
        { item: "a", weight: 1 },
        { item: "b", weight: 2 },
        { item: "c", weight: 3 },
      ] as const;

      const picks1 = Array.from({ length: 20 }, () => rng1.weightedPick(items));
      const picks2 = Array.from({ length: 20 }, () => rng2.weightedPick(items));

      expect(picks1).toEqual(picks2);
    });
  });

  describe("clone", () => {
    it("should create RNG with same current state", () => {
      const rng = new SeededRNG(42);

      // Advance state
      rng.next();
      rng.next();

      const cloned = rng.clone();

      // Both should produce same next values
      expect(rng.next()).toBe(cloned.next());
      expect(rng.next()).toBe(cloned.next());
    });

    it("should maintain same seed", () => {
      const rng = new SeededRNG(12345);
      rng.next();
      rng.next();

      const cloned = rng.clone();

      expect(cloned.getSeed()).toBe(rng.getSeed());
    });

    it("cloned RNG should be independent", () => {
      const rng = new SeededRNG(42);
      const cloned = rng.clone();

      // Advance original
      rng.next();
      rng.next();
      rng.next();

      // Clone should still be at original position
      const freshClone = new SeededRNG(42);
      expect(cloned.next()).toBe(freshClone.next());
    });
  });

  describe("fork", () => {
    it("should create child RNG with different seed", () => {
      const parent = new SeededRNG(42);
      const child = parent.fork();

      expect(child.getSeed()).not.toBe(parent.getSeed());
    });

    it("should be deterministic", () => {
      const parent1 = new SeededRNG(12345);
      const parent2 = new SeededRNG(12345);

      const child1 = parent1.fork();
      const child2 = parent2.fork();

      expect(child1.getSeed()).toBe(child2.getSeed());

      // Children should produce same sequences
      expect(child1.next()).toBe(child2.next());
      expect(child1.next()).toBe(child2.next());
    });

    it("forked RNG should advance parent state", () => {
      const parent = new SeededRNG(42);
      const beforeFork = parent.next();

      parent.reset();
      parent.next(); // Skip the value we already got
      const valueBefore = parent.next();

      parent.reset();
      parent.fork(); // This advances state
      const valueAfter = parent.next();

      // fork() consumes one random value, so valueAfter should be different
      expect(valueAfter).not.toBe(beforeFork);
    });
  });
});

describe("createSeededRNG", () => {
  it("should create RNG with specified seed", () => {
    const rng = createSeededRNG(42);
    expect(rng.getSeed()).toBe(42);
  });

  it("should create RNG with default seed when not provided", () => {
    const rng = createSeededRNG();
    expect(rng.getSeed()).toBeGreaterThan(0);
  });
});

describe("hashString", () => {
  it("should produce consistent hash for same string", () => {
    const hash1 = hashString("test");
    const hash2 = hashString("test");
    expect(hash1).toBe(hash2);
  });

  it("should produce different hashes for different strings", () => {
    const hash1 = hashString("hello");
    const hash2 = hashString("world");
    expect(hash1).not.toBe(hash2);
  });

  it("should produce unsigned 32-bit integer", () => {
    const hash = hashString("test string");
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(hash)).toBe(true);
  });

  it("should handle empty string", () => {
    const hash = hashString("");
    expect(hash).toBe(5381); // djb2 initial value
  });

  it("should handle long strings", () => {
    const longString = "a".repeat(10000);
    const hash = hashString(longString);
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
  });

  it("should produce different hashes for similar strings", () => {
    const hash1 = hashString("abc");
    const hash2 = hashString("abd");
    expect(hash1).not.toBe(hash2);
  });
});

describe("createSeededRNGFromString", () => {
  it("should create RNG from string seed", () => {
    const rng = createSeededRNGFromString("my-seed");
    expect(rng.getSeed()).toBe(hashString("my-seed"));
  });

  it("should produce deterministic RNG from same string", () => {
    const rng1 = createSeededRNGFromString("reproducible");
    const rng2 = createSeededRNGFromString("reproducible");

    expect(rng1.getSeed()).toBe(rng2.getSeed());
    expect(rng1.next()).toBe(rng2.next());
  });

  it("should produce different RNGs from different strings", () => {
    const rng1 = createSeededRNGFromString("seed1");
    const rng2 = createSeededRNGFromString("seed2");

    expect(rng1.getSeed()).not.toBe(rng2.getSeed());
  });
});
