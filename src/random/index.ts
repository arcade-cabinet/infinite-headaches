/**
 * Deterministic Random Number Generation System
 *
 * This module provides a complete seeded RNG system with Zustand state management.
 * All game random operations should use this system to ensure reproducible gameplay.
 *
 * @module random
 *
 * @example
 * // In React components - use hooks
 * import { useRandom, useSeedName, useRandomValue } from '@/random';
 *
 * function MyComponent() {
 *   const { next, nextInt, pick } = useRandom();
 *   const seedName = useSeedName();
 *
 *   // Stable random value that changes with level
 *   const position = useRandomValue(
 *     (rng) => ({ x: rng.nextInt(0, 100), y: rng.nextInt(0, 100) }),
 *     [level]
 *   );
 * }
 *
 * @example
 * // Outside React - use gameRandom singleton or store directly
 * import { gameRandom } from '@/random';
 *
 * const value = gameRandom.next();
 * const roll = gameRandom.nextInt(1, 6);
 * const item = gameRandom.pick(['sword', 'shield', 'potion']);
 *
 * @example
 * // Direct store access for game engine code
 * import { randomStore, getRNG } from '@/random';
 *
 * // Get current state
 * const { seed, seedName } = randomStore.getState();
 *
 * // Use RNG directly for performance
 * const rng = getRNG();
 * for (let i = 0; i < 1000; i++) {
 *   values.push(rng.next());
 * }
 */

// Core RNG implementation
export {
  SeededRNG,
  createSeededRNG,
  createSeededRNGFromString,
  hashString,
} from "./seedrandom";

// Word pools for seed names
export {
  adjectives1,
  adjectives2,
  nouns,
  generateSeedName,
  seedFromName,
  isValidSeedName,
  getTotalCombinations,
  generateRandomSeed,
  type Adjective1,
  type Adjective2,
  type Noun,
} from "./wordPools";

// Zustand store
export {
  useRandomStore,
  randomStore,
  getRNG,
  getCurrentSeed,
  getCurrentSeedName,
  type RandomState,
  type RandomActions,
  type RandomStore,
} from "./store";

// React hooks
export {
  useRandom,
  useSeedName,
  useSeed,
  useSeedInfo,
  useSeedNameState,
  useRandomActions,
  useRandomValue,
  useForkedRNG,
  useOnSeedChange,
  useRandomId,
  useRandomGenerator,
  useRandomDebug,
} from "./hooks";

// Utility functions and gameRandom singleton
export {
  gameRandom,
  randomColor,
  randomHSL,
  randomPointInRect,
  randomPointInCircle,
  randomPointOnCircle,
  randomDirection,
  randomDirection3D,
  randomDelay,
  chance,
  oneIn,
  rollDice,
  randomUUID,
  randomId,
  randomClamped,
  weightedSelect,
} from "./utils";
