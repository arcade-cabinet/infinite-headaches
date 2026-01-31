/**
 * React Hooks for Deterministic Random Number Generation
 *
 * Provides convenient React hooks for accessing the random store
 * and generating stable random values in components.
 */

import { useMemo, useRef } from "react";
import { useShallow } from "zustand/shallow";
import { useRandomStore, randomStore, type RandomStore } from "./store";
import { SeededRNG, createSeededRNG } from "./seedrandom";

/**
 * Hook to access the full random store
 * Returns all state and actions
 */
export function useRandom(): RandomStore {
  return useRandomStore();
}

/**
 * Hook to get just the seed name (for display)
 * Optimized to only re-render when seed name changes
 */
export function useSeedName(): string {
  return useRandomStore((state) => state.seedName);
}

/**
 * Hook to get the numeric seed
 * Optimized to only re-render when seed changes
 */
export function useSeed(): number {
  return useRandomStore((state) => state.seed);
}

/**
 * Hook to get seed info for display
 * Returns both seed and seedName, updates when either changes
 */
export function useSeedInfo(): { seed: number; seedName: string } {
  const seed = useRandomStore((state) => state.seed);
  const seedName = useRandomStore((state) => state.seedName);
  return { seed, seedName };
}

/**
 * Hook to get/set the seed name
 * Returns tuple of [seedName, setSeedByName]
 */
export function useSeedNameState(): [string, (name: string) => void] {
  const seedName = useRandomStore((state) => state.seedName);
  const setSeedByName = useRandomStore((state) => state.setSeedByName);
  return [seedName, setSeedByName];
}

/**
 * Hook to get RNG actions only (no state that causes re-renders)
 * Use this when you need to generate random values but don't need to
 * display seed info
 *
 * Note: Uses useShallow to prevent infinite re-renders when returning
 * an object from the selector. Without shallow comparison, the new object
 * created on each render would cause React to see it as "changed" even
 * though the function references inside are stable.
 */
export function useRandomActions() {
  return useRandomStore(
    useShallow((state) => ({
      setSeed: state.setSeed,
      setSeedByName: state.setSeedByName,
      generateNewSeed: state.generateNewSeed,
      shuffleSeed: state.shuffleSeed,
      resetRNG: state.resetRNG,
      next: state.next,
      nextFloat: state.nextFloat,
      nextInt: state.nextInt,
      nextBool: state.nextBool,
      shuffle: state.shuffle,
      shuffled: state.shuffled,
      pick: state.pick,
      pickOrThrow: state.pickOrThrow,
      pickMultiple: state.pickMultiple,
      nextGaussian: state.nextGaussian,
      range: state.range,
      weightedPick: state.weightedPick,
      fork: state.fork,
    }))
  );
}

/**
 * Hook to get a stable random value that only changes when dependencies change
 *
 * This is useful for generating random values that should remain stable
 * during re-renders but should change when certain conditions change.
 *
 * @param generator - Function that uses the RNG to generate a value
 * @param deps - Dependency array (like useMemo)
 * @returns The generated value (stable until deps change)
 *
 * @example
 * // Random position that only changes when level changes
 * const position = useRandomValue(
 *   (rng) => ({ x: rng.nextInt(0, 100), y: rng.nextInt(0, 100) }),
 *   [level]
 * );
 */
export function useRandomValue<T>(
  generator: (rng: SeededRNG) => T,
  deps: React.DependencyList
): T {
  // Fork the RNG on first call or when deps change
  // This ensures we get the same value for the same deps
  const forkedRng = useMemo(() => {
    return randomStore.getState().rng.clone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Generate the value using the forked RNG
  // Reset and generate each time to ensure consistency
  return useMemo(() => {
    forkedRng.reset();
    return generator(forkedRng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forkedRng, ...deps]);
}

/**
 * Hook to create a local forked RNG for a component
 *
 * This creates a separate RNG sequence that doesn't affect the global state.
 * Useful for components that need lots of random values without affecting
 * the game's main RNG sequence.
 *
 * @returns A forked SeededRNG instance (stable across re-renders)
 */
export function useForkedRNG(): SeededRNG {
  const forkedRef = useRef<SeededRNG | null>(null);

  if (!forkedRef.current) {
    forkedRef.current = randomStore.getState().rng.fork();
  }

  return forkedRef.current;
}

/**
 * Hook to create a local RNG with a specific seed
 *
 * @param seed - The seed for the local RNG
 * @returns A SeededRNG instance with the given seed
 */
export function useLocalRNG(seed: number): SeededRNG {
  return useMemo(() => {
    return createSeededRNG(seed);
  }, [seed]);
}

/**
 * Hook to subscribe to seed changes
 * Calls the callback whenever the seed changes
 *
 * @param callback - Function to call when seed changes
 */
export function useOnSeedChange(callback: (seed: number, seedName: string) => void): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useMemo(() => {
    return randomStore.subscribe(
      (state) => state.seed,
      (seed) => {
        const seedName = randomStore.getState().seedName;
        callbackRef.current(seed, seedName);
      }
    );
    // Only subscribe once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Hook to get a stable random ID
 * Useful for generating unique IDs that persist across re-renders
 *
 * @param prefix - Optional prefix for the ID
 * @returns A stable random ID string
 */
export function useRandomId(prefix = "id"): string {
  const idRef = useRef<string | null>(null);

  if (!idRef.current) {
    const rng = randomStore.getState().rng;
    idRef.current = `${prefix}_${Math.floor(rng.next() * 0xffffffff).toString(36)}`;
  }

  return idRef.current;
}

/**
 * Hook that returns a random generator function
 * The function is stable but generates new values each call
 *
 * @returns Object with random generation methods
 */
export function useRandomGenerator() {
  const next = useRandomStore((state) => state.next);
  const nextInt = useRandomStore((state) => state.nextInt);
  const nextBool = useRandomStore((state) => state.nextBool);
  const pick = useRandomStore((state) => state.pick);

  return useMemo(
    () => ({
      next,
      nextInt,
      nextBool,
      pick,
    }),
    [next, nextInt, nextBool, pick]
  );
}

/**
 * Hook for debugging - shows current RNG state
 * Only use in development
 */
export function useRandomDebug() {
  const seed = useRandomStore((state) => state.seed);
  const seedName = useRandomStore((state) => state.seedName);
  const callCount = useRandomStore((state) => state.callCount);

  return useMemo(
    () => ({
      seed,
      seedName,
      callCount,
      seedHex: `0x${seed.toString(16).padStart(8, "0")}`,
    }),
    [seed, seedName, callCount]
  );
}
