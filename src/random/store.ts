/**
 * Zustand Store for Deterministic Random Number Generation
 *
 * Provides centralized, reproducible RNG state management for the game.
 * All random operations should go through this store to ensure deterministic,
 * reproducible gameplay when using the same seed.
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { SeededRNG, createSeededRNG } from "./seedrandom";
import { generateSeedName, seedFromName, generateRandomSeed } from "./wordPools";

/**
 * Random store state interface
 */
export interface RandomState {
  /** The current numeric seed */
  seed: number;
  /** Human-readable seed name */
  seedName: string;
  /** The seeded RNG instance */
  rng: SeededRNG;
  /** Counter tracking how many random values have been generated */
  callCount: number;
}

/**
 * Random store actions interface
 */
export interface RandomActions {
  /**
   * Set a new seed by numeric value
   * Resets the RNG and updates the seed name
   */
  setSeed: (seed: number) => void;

  /**
   * Set a new seed by name string
   * Parses the name to get a seed value
   */
  setSeedByName: (name: string) => void;

  /**
   * Generate a completely new random seed
   */
  generateNewSeed: () => void;

  /**
   * Shuffle the current seed using the system's random source
   * Different from generateNewSeed in that it mixes the current seed
   */
  shuffleSeed: () => void;

  /**
   * Reset the RNG back to its initial seed state
   * Useful for replaying with the same seed
   */
  resetRNG: () => void;

  // RNG proxy methods - these advance the RNG state

  /**
   * Get the next random number [0, 1)
   */
  next: () => number;

  /**
   * Get a random float [0, 1) - alias for next()
   */
  nextFloat: () => number;

  /**
   * Get a random integer in range [min, max] (inclusive)
   */
  nextInt: (min: number, max: number) => number;

  /**
   * Get a random boolean
   */
  nextBool: (probability?: number) => boolean;

  /**
   * Shuffle an array in place
   */
  shuffle: <T>(array: T[]) => T[];

  /**
   * Create a shuffled copy of an array
   */
  shuffled: <T>(array: readonly T[]) => T[];

  /**
   * Pick a random element from an array
   */
  pick: <T>(array: readonly T[]) => T | undefined;

  /**
   * Pick a random element (throws if empty)
   */
  pickOrThrow: <T>(array: readonly T[]) => T;

  /**
   * Pick multiple unique elements
   */
  pickMultiple: <T>(array: readonly T[], count: number) => T[];

  /**
   * Get a Gaussian distributed random number
   */
  nextGaussian: (mean?: number, stdDev?: number) => number;

  /**
   * Get a random number in a range [min, max)
   */
  range: (min: number, max: number) => number;

  /**
   * Weighted random pick
   */
  weightedPick: <T>(
    items: readonly { item: T; weight: number }[]
  ) => T | undefined;

  /**
   * Fork a new RNG from the current state
   * Useful for subsystems that need their own RNG sequence
   */
  fork: () => SeededRNG;

  /**
   * Get a snapshot of current state for debugging/replay
   */
  getSnapshot: () => { seed: number; seedName: string; callCount: number };
}

export type RandomStore = RandomState & RandomActions;

/**
 * Create the initial seed - use a random seed on first load
 */
const initialSeed = generateRandomSeed();

/**
 * The Zustand store for random number generation
 *
 * Uses subscribeWithSelector middleware to allow subscribing to
 * specific state changes (like seed changes for UI updates)
 */
export const useRandomStore = create<RandomStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    seed: initialSeed,
    seedName: generateSeedName(initialSeed),
    rng: createSeededRNG(initialSeed),
    callCount: 0,

    // Actions
    setSeed: (seed: number) => {
      const normalizedSeed = seed >>> 0;
      set({
        seed: normalizedSeed,
        seedName: generateSeedName(normalizedSeed),
        rng: createSeededRNG(normalizedSeed),
        callCount: 0,
      });
    },

    setSeedByName: (name: string) => {
      const seed = seedFromName(name);
      set({
        seed,
        seedName: generateSeedName(seed),
        rng: createSeededRNG(seed),
        callCount: 0,
      });
    },

    generateNewSeed: () => {
      const newSeed = generateRandomSeed();
      set({
        seed: newSeed,
        seedName: generateSeedName(newSeed),
        rng: createSeededRNG(newSeed),
        callCount: 0,
      });
    },

    shuffleSeed: () => {
      const { seed } = get();
      // Mix current seed with random value
      const random = generateRandomSeed();
      const newSeed = (seed ^ random) >>> 0;
      set({
        seed: newSeed,
        seedName: generateSeedName(newSeed),
        rng: createSeededRNG(newSeed),
        callCount: 0,
      });
    },

    resetRNG: () => {
      const { seed } = get();
      set({
        rng: createSeededRNG(seed),
        callCount: 0,
      });
    },

    // RNG proxy methods
    next: () => {
      const { rng, callCount } = get();
      const result = rng.next();
      set({ callCount: callCount + 1 });
      return result;
    },

    nextFloat: () => {
      const { rng, callCount } = get();
      const result = rng.nextFloat();
      set({ callCount: callCount + 1 });
      return result;
    },

    nextInt: (min: number, max: number) => {
      const { rng, callCount } = get();
      const result = rng.nextInt(min, max);
      set({ callCount: callCount + 1 });
      return result;
    },

    nextBool: (probability = 0.5) => {
      const { rng, callCount } = get();
      const result = rng.nextBool(probability);
      set({ callCount: callCount + 1 });
      return result;
    },

    shuffle: <T>(array: T[]) => {
      const { rng, callCount } = get();
      const result = rng.shuffle(array);
      // Fisher-Yates uses n-1 random calls
      set({ callCount: callCount + Math.max(0, array.length - 1) });
      return result;
    },

    shuffled: <T>(array: readonly T[]) => {
      const { rng, callCount } = get();
      const result = rng.shuffled(array);
      set({ callCount: callCount + Math.max(0, array.length - 1) });
      return result;
    },

    pick: <T>(array: readonly T[]) => {
      const { rng, callCount } = get();
      const result = rng.pick(array);
      set({ callCount: callCount + 1 });
      return result;
    },

    pickOrThrow: <T>(array: readonly T[]) => {
      const { rng, callCount } = get();
      const result = rng.pickOrThrow(array);
      set({ callCount: callCount + 1 });
      return result;
    },

    pickMultiple: <T>(array: readonly T[], count: number) => {
      const { rng, callCount } = get();
      const result = rng.pickMultiple(array, count);
      // Approximate call count - actual may vary due to collision retries
      set({ callCount: callCount + Math.min(count, array.length) });
      return result;
    },

    nextGaussian: (mean = 0, stdDev = 1) => {
      const { rng, callCount } = get();
      const result = rng.nextGaussian(mean, stdDev);
      // Box-Muller uses 2 random calls
      set({ callCount: callCount + 2 });
      return result;
    },

    range: (min: number, max: number) => {
      const { rng, callCount } = get();
      const result = rng.range(min, max);
      set({ callCount: callCount + 1 });
      return result;
    },

    weightedPick: <T>(items: readonly { item: T; weight: number }[]) => {
      const { rng, callCount } = get();
      const result = rng.weightedPick(items);
      set({ callCount: callCount + 1 });
      return result;
    },

    fork: () => {
      const { rng, callCount } = get();
      const forked = rng.fork();
      set({ callCount: callCount + 1 });
      return forked;
    },

    getSnapshot: () => {
      const { seed, seedName, callCount } = get();
      return { seed, seedName, callCount };
    },
  }))
);

/**
 * Non-hook access to the store for use outside React components
 * Use this in game engine code, utilities, etc.
 */
export const randomStore = useRandomStore;

/**
 * Get the current RNG instance directly
 * Useful for performance-critical code that needs direct RNG access
 */
export function getRNG(): SeededRNG {
  return useRandomStore.getState().rng;
}

/**
 * Get the current seed
 */
export function getCurrentSeed(): number {
  return useRandomStore.getState().seed;
}

/**
 * Get the current seed name
 */
export function getCurrentSeedName(): string {
  return useRandomStore.getState().seedName;
}
