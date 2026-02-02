/**
 * Utility Functions for Random Number Generation
 *
 * Provides a gameRandom singleton for easy migration from Math.random()
 * and utility functions for common random operations.
 */

import { useRandomStore, getRNG } from "./store";
import type { SeededRNG } from "./seedrandom";

/**
 * Game Random Singleton
 *
 * Drop-in replacement for Math.random() that uses the seeded RNG.
 * Use this for gradual migration from Math.random() calls.
 *
 * @example
 * // Before:
 * const value = Math.random();
 *
 * // After:
 * import { gameRandom } from '@/random';
 * const value = gameRandom.next();
 */
export const gameRandom = {
  /**
   * Get next random number [0, 1) - direct replacement for Math.random()
   */
  random(): number {
    return useRandomStore.getState().next();
  },

  /**
   * Alias for random() - matches SeededRNG interface
   */
  next(): number {
    return useRandomStore.getState().next();
  },

  /**
   * Get a random float [0, 1)
   */
  nextFloat(): number {
    return useRandomStore.getState().nextFloat();
  },

  /**
   * Get a random integer in range [min, max] (inclusive)
   */
  nextInt(min: number, max: number): number {
    return useRandomStore.getState().nextInt(min, max);
  },

  /**
   * Get a random boolean
   */
  nextBool(probability = 0.5): boolean {
    return useRandomStore.getState().nextBool(probability);
  },

  /**
   * Shuffle an array in place
   */
  shuffle<T>(array: T[]): T[] {
    return useRandomStore.getState().shuffle(array);
  },

  /**
   * Create a shuffled copy of an array
   */
  shuffled<T>(array: readonly T[]): T[] {
    return useRandomStore.getState().shuffled(array);
  },

  /**
   * Pick a random element from an array
   */
  pick<T>(array: readonly T[]): T | undefined {
    return useRandomStore.getState().pick(array);
  },

  /**
   * Pick a random element (throws if empty)
   */
  pickOrThrow<T>(array: readonly T[]): T {
    return useRandomStore.getState().pickOrThrow(array);
  },

  /**
   * Pick multiple unique elements
   */
  pickMultiple<T>(array: readonly T[], count: number): T[] {
    return useRandomStore.getState().pickMultiple(array, count);
  },

  /**
   * Get a Gaussian distributed random number
   */
  nextGaussian(mean = 0, stdDev = 1): number {
    return useRandomStore.getState().nextGaussian(mean, stdDev);
  },

  /**
   * Get a random number in a range [min, max)
   */
  range(min: number, max: number): number {
    return useRandomStore.getState().range(min, max);
  },

  /**
   * Weighted random pick
   */
  weightedPick<T>(
    items: readonly { item: T; weight: number }[]
  ): T | undefined {
    return useRandomStore.getState().weightedPick(items);
  },

  /**
   * Get the underlying RNG instance
   * Use for performance-critical code that needs many random values
   */
  getRNG(): SeededRNG {
    return getRNG();
  },

  /**
   * Set a new seed
   */
  setSeed(seed: number): void {
    useRandomStore.getState().setSeed(seed);
  },

  /**
   * Set seed by name
   */
  setSeedByName(name: string): void {
    useRandomStore.getState().setSeedByName(name);
  },

  /**
   * Generate a new random seed
   */
  generateNewSeed(): void {
    useRandomStore.getState().generateNewSeed();
  },

  /**
   * Reset to initial seed state
   */
  reset(): void {
    useRandomStore.getState().resetRNG();
  },

  /**
   * Get current seed
   */
  getSeed(): number {
    return useRandomStore.getState().seed;
  },

  /**
   * Get current seed name
   */
  getSeedName(): string {
    return useRandomStore.getState().seedName;
  },

  /**
   * Fork a new RNG
   */
  fork(): SeededRNG {
    return useRandomStore.getState().fork();
  },
};

/**
 * Create a random color in hex format
 */
export function randomColor(): string {
  const r = gameRandom.nextInt(0, 255);
  const g = gameRandom.nextInt(0, 255);
  const b = gameRandom.nextInt(0, 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Create a random HSL color
 */
export function randomHSL(
  saturation = 70,
  lightness = 50
): string {
  const hue = gameRandom.nextInt(0, 360);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Random point within a rectangle
 */
export function randomPointInRect(
  x: number,
  y: number,
  width: number,
  height: number
): { x: number; y: number } {
  return {
    x: gameRandom.range(x, x + width),
    y: gameRandom.range(y, y + height),
  };
}

/**
 * Random point within a circle
 */
export function randomPointInCircle(
  centerX: number,
  centerY: number,
  radius: number
): { x: number; y: number } {
  const angle = gameRandom.range(0, Math.PI * 2);
  const r = radius * Math.sqrt(gameRandom.next());
  return {
    x: centerX + r * Math.cos(angle),
    y: centerY + r * Math.sin(angle),
  };
}

/**
 * Random point on a circle's edge
 */
export function randomPointOnCircle(
  centerX: number,
  centerY: number,
  radius: number
): { x: number; y: number } {
  const angle = gameRandom.range(0, Math.PI * 2);
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

/**
 * Random direction vector (normalized)
 */
export function randomDirection(): { x: number; y: number } {
  const angle = gameRandom.range(0, Math.PI * 2);
  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
}

/**
 * Random 3D direction vector (normalized)
 */
export function randomDirection3D(): { x: number; y: number; z: number } {
  // Use spherical coordinates for uniform distribution
  const theta = gameRandom.range(0, Math.PI * 2);
  const phi = Math.acos(gameRandom.range(-1, 1));
  return {
    x: Math.sin(phi) * Math.cos(theta),
    y: Math.sin(phi) * Math.sin(theta),
    z: Math.cos(phi),
  };
}

/**
 * Random delay within a range (for staggered animations, etc.)
 */
export function randomDelay(minMs: number, maxMs: number): number {
  return gameRandom.nextInt(minMs, maxMs);
}

/**
 * Chance check - returns true with given probability
 */
export function chance(probability: number): boolean {
  return gameRandom.nextBool(probability);
}

/**
 * One-in-N chance (e.g., oneIn(4) has 25% chance of true)
 */
export function oneIn(n: number): boolean {
  return gameRandom.nextInt(1, n) === 1;
}

/**
 * Roll dice (returns sum of N dice with S sides)
 */
export function rollDice(numDice: number, sides: number): number {
  let sum = 0;
  for (let i = 0; i < numDice; i++) {
    sum += gameRandom.nextInt(1, sides);
  }
  return sum;
}

/**
 * Generate a random UUID v4
 * Note: This uses the seeded RNG, so it's deterministic!
 */
export function randomUUID(): string {
  const hex = "0123456789abcdef";
  let uuid = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += "-";
    } else if (i === 14) {
      uuid += "4"; // Version 4
    } else if (i === 19) {
      uuid += hex[gameRandom.nextInt(8, 11)]; // Variant
    } else {
      uuid += hex[gameRandom.nextInt(0, 15)];
    }
  }
  return uuid;
}

/**
 * Generate a short random ID
 */
export function randomId(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < length; i++) {
    id += chars[gameRandom.nextInt(0, chars.length - 1)];
  }
  return id;
}

/**
 * Clamp random value to ensure it stays within bounds
 * Useful for position clamping, etc.
 */
export function randomClamped(min: number, max: number, clampMin: number, clampMax: number): number {
  const value = gameRandom.range(min, max);
  return Math.max(clampMin, Math.min(clampMax, value));
}

/**
 * Weighted random selection from an object map
 */
export function weightedSelect<K extends string>(weights: Record<K, number>): K {
  const entries = Object.entries(weights) as [K, number][];
  const items = entries.map(([key, weight]) => ({ item: key, weight }));
  return gameRandom.weightedPick(items) ?? entries[0][0];
}
