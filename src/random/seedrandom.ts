/**
 * Deterministic Seeded Random Number Generator
 *
 * Uses the Mulberry32 algorithm - a fast, high-quality 32-bit PRNG
 * that produces reproducible sequences from a given seed.
 */

/**
 * Internal state type for the PRNG
 */
interface PRNGState {
  seed: number;
  state: number;
}

/**
 * Mulberry32 PRNG algorithm
 * A simple, fast 32-bit generator with good statistical properties
 *
 * @param state - Current state value
 * @returns Tuple of [next random value 0-1, new state]
 */
function mulberry32(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const result = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [result, (state + 0x6d2b79f5) | 0];
}

/**
 * Seeded Random Number Generator class
 * Provides deterministic random number generation with various utility methods
 */
export class SeededRNG {
  private state: PRNGState;

  /**
   * Create a new SeededRNG instance
   * @param seed - The seed value (defaults to current timestamp)
   */
  constructor(seed: number = Date.now()) {
    this.state = {
      seed: seed >>> 0, // Ensure unsigned 32-bit
      state: seed >>> 0,
    };
  }

  /**
   * Get the current seed
   */
  getSeed(): number {
    return this.state.seed;
  }

  /**
   * Reset the generator to its initial seed state
   */
  reset(): void {
    this.state.state = this.state.seed;
  }

  /**
   * Set a new seed and reset the generator
   * @param seed - New seed value
   */
  setSeed(seed: number): void {
    this.state.seed = seed >>> 0;
    this.state.state = seed >>> 0;
  }

  /**
   * Get the next random number in range [0, 1)
   * This is the core method - all other methods use this
   */
  next(): number {
    const [result, newState] = mulberry32(this.state.state);
    this.state.state = newState;
    return result;
  }

  /**
   * Alias for next() - returns a float in range [0, 1)
   */
  nextFloat(): number {
    return this.next();
  }

  /**
   * Get a random integer in range [min, max] (inclusive)
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (inclusive)
   */
  nextInt(min: number, max: number): number {
    const minInt = Math.ceil(min);
    const maxInt = Math.floor(max);
    return Math.floor(this.next() * (maxInt - minInt + 1)) + minInt;
  }

  /**
   * Get a random boolean value
   * @param probability - Probability of returning true (default 0.5)
   */
  nextBool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Shuffle an array in place using Fisher-Yates algorithm
   * @param array - Array to shuffle
   * @returns The same array, shuffled
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Create a shuffled copy of an array
   * @param array - Array to shuffle (not modified)
   * @returns New shuffled array
   */
  shuffled<T>(array: readonly T[]): T[] {
    return this.shuffle([...array]);
  }

  /**
   * Pick a random element from an array
   * @param array - Array to pick from
   * @returns Random element or undefined if array is empty
   */
  pick<T>(array: readonly T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Pick a random element from an array (throws if empty)
   * @param array - Array to pick from
   * @returns Random element
   * @throws Error if array is empty
   */
  pickOrThrow<T>(array: readonly T[]): T {
    if (array.length === 0) {
      throw new Error("Cannot pick from empty array");
    }
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Pick multiple unique random elements from an array
   * @param array - Array to pick from
   * @param count - Number of elements to pick
   * @returns Array of picked elements
   */
  pickMultiple<T>(array: readonly T[], count: number): T[] {
    if (count >= array.length) {
      return this.shuffled(array);
    }
    const result: T[] = [];
    const indices = new Set<number>();
    while (result.length < count) {
      const index = this.nextInt(0, array.length - 1);
      if (!indices.has(index)) {
        indices.add(index);
        result.push(array[index]);
      }
    }
    return result;
  }

  /**
   * Generate a random number with Gaussian (normal) distribution
   * Uses Box-Muller transform
   * @param mean - Mean of the distribution (default 0)
   * @param stdDev - Standard deviation (default 1)
   */
  nextGaussian(mean = 0, stdDev = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Generate a random number in range [min, max)
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (exclusive)
   */
  range(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Pick a weighted random element from an array
   * @param items - Array of items with weights
   * @returns The picked item or undefined if array is empty
   */
  weightedPick<T>(items: readonly { item: T; weight: number }[]): T | undefined {
    if (items.length === 0) return undefined;

    const totalWeight = items.reduce((sum, { weight }) => sum + weight, 0);
    if (totalWeight <= 0) return undefined;

    let random = this.next() * totalWeight;

    for (const { item, weight } of items) {
      random -= weight;
      if (random <= 0) {
        return item;
      }
    }

    // Fallback (shouldn't happen with correct weights)
    return items[items.length - 1].item;
  }

  /**
   * Clone this RNG with the same current state
   * Useful for branching random sequences
   */
  clone(): SeededRNG {
    const cloned = new SeededRNG(this.state.seed);
    cloned.state.state = this.state.state;
    return cloned;
  }

  /**
   * Create a child RNG seeded from this one
   * The child will have a deterministic but different sequence
   */
  fork(): SeededRNG {
    const childSeed = Math.floor(this.next() * 0xffffffff);
    return new SeededRNG(childSeed);
  }
}

/**
 * Create a new SeededRNG instance
 * @param seed - Optional seed value
 */
export function createSeededRNG(seed?: number): SeededRNG {
  return new SeededRNG(seed);
}

/**
 * Hash a string to a numeric seed
 * Uses djb2 algorithm
 * @param str - String to hash
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/**
 * Create a SeededRNG from a string seed
 * @param str - String to use as seed
 */
export function createSeededRNGFromString(str: string): SeededRNG {
  return new SeededRNG(hashString(str));
}
