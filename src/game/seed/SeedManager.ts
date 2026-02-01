/**
 * SeedManager - Deterministic random number generation for gameplay
 *
 * Uses seedrandom for reproducible random sequences based on
 * adjective-adjective-noun seed patterns aligned to game theme.
 *
 * All random decisions in gameplay (spawning, AI behavior, physics jitter)
 * should use this seeded RNG for reproducibility.
 */

import seedrandom from "seedrandom";

/**
 * Word pools aligned to Homestead Headaches theme
 * Nebraska, farms, tornadoes, chaos, animals
 */

// First adjective: Weather/atmosphere related
const ADJECTIVES_1 = [
  "stormy",
  "dusty",
  "windy",
  "cloudy",
  "golden",
  "rusty",
  "hazy",
  "misty",
  "muddy",
  "sunny",
  "frosty",
  "humid",
  "breezy",
  "foggy",
  "sweltering",
  "crisp",
  "muggy",
  "balmy",
  "gusty",
  "sultry",
] as const;

// Second adjective: Character/mood related
const ADJECTIVES_2 = [
  "chaotic",
  "wobbly",
  "frantic",
  "dizzy",
  "grumpy",
  "stubborn",
  "sleepy",
  "bouncy",
  "clumsy",
  "plucky",
  "rowdy",
  "jittery",
  "cranky",
  "feisty",
  "goofy",
  "scrappy",
  "zany",
  "quirky",
  "spunky",
  "wacky",
] as const;

// Nouns: Nebraska/farm themed
const NOUNS = [
  "homestead",
  "barnyard",
  "prairie",
  "haystack",
  "windmill",
  "cornfield",
  "pasture",
  "silo",
  "tractor",
  "fencepost",
  "sunrise",
  "stampede",
  "rodeo",
  "harvest",
  "meadow",
  "hayloft",
  "corral",
  "sunset",
  "chickens",
] as const;

export type SeedPhrase = `${string}-${string}-${string}`;

// Default seed for menu/non-gameplay contexts
export const DEFAULT_SEED: SeedPhrase = "golden-wobbly-barnyard";

/**
 * Global seeded RNG instance
 * Reset this when starting a new game with a new seed
 */
let currentSeed: SeedPhrase = DEFAULT_SEED;
let rng: seedrandom.PRNG = seedrandom(DEFAULT_SEED);

/**
 * Initialize or reset the RNG with a new seed
 */
export function setSeed(seed: SeedPhrase): void {
  currentSeed = seed;
  rng = seedrandom(seed);
  console.log(`[SeedManager] Initialized with seed: ${seed}`);
}

/**
 * Get the current seed phrase
 */
export function getCurrentSeed(): SeedPhrase {
  return currentSeed;
}

/**
 * Get a seeded random number [0, 1)
 * Use this instead of Math.random() for all gameplay decisions
 */
export function random(): number {
  return rng();
}

/**
 * Get a seeded random integer in range [min, max] (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Get a seeded random float in range [min, max)
 */
export function randomFloat(min: number, max: number): number {
  return rng() * (max - min) + min;
}

/**
 * Pick a random element from an array (seeded)
 */
export function randomPick<T>(array: readonly T[]): T {
  return array[Math.floor(rng() * array.length)];
}

/**
 * Shuffle an array (seeded, returns new array)
 */
export function randomShuffle<T>(array: readonly T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate a random seed phrase using TRUE randomness (Math.random)
 * Used only for generating new seeds, not for gameplay
 */
export function generateRandomSeed(): SeedPhrase {
  const adj1 = ADJECTIVES_1[Math.floor(Math.random() * ADJECTIVES_1.length)];
  const adj2 = ADJECTIVES_2[Math.floor(Math.random() * ADJECTIVES_2.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj1}-${adj2}-${noun}`;
}

/**
 * Validate a seed phrase format
 */
export function isValidSeed(seed: string): seed is SeedPhrase {
  const parts = seed.toLowerCase().split("-");
  if (parts.length !== 3) return false;

  // For custom seeds, we allow any adjective-adjective-noun pattern
  // The word pools are just for generation, not validation
  return parts.every((part) => /^[a-z]+$/.test(part));
}

/**
 * Normalize a seed (lowercase, trim)
 */
export function normalizeSeed(seed: string): SeedPhrase {
  return seed.toLowerCase().trim() as SeedPhrase;
}

/**
 * Create a forked RNG for isolated sequences
 * Useful for subsystems that need their own deterministic sequence
 * without affecting the main RNG state
 */
export function forkRng(suffix: string): seedrandom.PRNG {
  return seedrandom(`${currentSeed}-${suffix}`);
}

/**
 * Get word pools for UI display
 */
export function getWordPools() {
  return {
    adjectives1: [...ADJECTIVES_1],
    adjectives2: [...ADJECTIVES_2],
    nouns: [...NOUNS],
  };
}
