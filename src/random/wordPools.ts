/**
 * Nebraska Homestead-Themed Word Pools for Seed Name Generation
 *
 * Generates memorable, shareable seed names like "Dusty Barnyard Chicken"
 * or "Stormy Harvest Tornado" that players can use to share and reproduce runs.
 */

import { hashString } from "./seedrandom";

/**
 * First adjectives - farm/weather themed descriptors
 */
export const adjectives1 = [
  "Dusty",
  "Golden",
  "Stormy",
  "Rustic",
  "Prairie",
  "Windy",
  "Sunny",
  "Muddy",
  "Frosty",
  "Misty",
  "Hazy",
  "Blazing",
  "Gentle",
  "Wild",
  "Quiet",
  "Roaring",
  "Calm",
  "Fierce",
  "Lazy",
  "Restless",
  "Ancient",
  "Young",
  "Proud",
  "Humble",
  "Mighty",
  "Tiny",
  "Grand",
  "Simple",
  "Hidden",
  "Open",
  "Northern",
  "Southern",
] as const;

/**
 * Second adjectives - homestead/location themed descriptors
 */
export const adjectives2 = [
  "Barnyard",
  "Harvest",
  "Country",
  "Homestead",
  "Pasture",
  "Meadow",
  "Orchard",
  "Fieldside",
  "Hillside",
  "Creekside",
  "Riverside",
  "Woodland",
  "Farmland",
  "Ranching",
  "Pioneer",
  "Settler",
  "Frontier",
  "Heartland",
  "Midland",
  "Plainsman",
  "Cornfield",
  "Wheatfield",
  "Hayfield",
  "Grazing",
  "Plowing",
  "Tilling",
  "Growing",
  "Blooming",
  "Resting",
  "Working",
  "Morning",
  "Evening",
] as const;

/**
 * Nouns - farm animals, crops, farm equipment, and natural elements
 */
export const nouns = [
  // Farm animals
  "Chicken",
  "Rooster",
  "Turkey",
  "Goose",
  "Duck",
  "Pig",
  "Hog",
  "Cow",
  "Bull",
  "Calf",
  "Horse",
  "Pony",
  "Donkey",
  "Mule",
  "Sheep",
  "Lamb",
  "Goat",
  "Ram",
  // Weather/nature
  "Tornado",
  "Twister",
  "Thunder",
  "Lightning",
  "Rainstorm",
  "Blizzard",
  "Hailstorm",
  "Sunrise",
  "Sunset",
  "Rainbow",
  // Farm structures/equipment
  "Haystack",
  "Windmill",
  "Scarecrow",
  "Tractor",
  "Silo",
  "Barn",
  "Fence",
  "Plow",
  "Wagon",
  "Wheelbarrow",
  // Crops and plants
  "Cornstalk",
  "Sunflower",
  "Pumpkin",
  "Squash",
  "Potato",
  "Wheat",
  "Barley",
  "Oats",
  // Wildlife
  "Crow",
  "Hawk",
  "Owl",
  "Coyote",
  "Rabbit",
  "Groundhog",
  "Raccoon",
  "Deer",
  // Misc farm life
  "Horseshoe",
  "Lantern",
  "Pitchfork",
  "Anvil",
  "Bellows",
  "Harness",
] as const;

export type Adjective1 = (typeof adjectives1)[number];
export type Adjective2 = (typeof adjectives2)[number];
export type Noun = (typeof nouns)[number];

/**
 * Generate a seed name from a numeric seed
 * The name is deterministically derived from the seed value
 *
 * @param seed - Numeric seed value
 * @returns A three-word name like "Dusty Barnyard Chicken"
 */
export function generateSeedName(seed: number): string {
  // Ensure we're working with a positive integer
  const s = Math.abs(seed >>> 0);

  // Use different bits of the seed for each word to ensure good distribution
  const index1 = s % adjectives1.length;
  const index2 = Math.floor(s / adjectives1.length) % adjectives2.length;
  const index3 =
    Math.floor(s / (adjectives1.length * adjectives2.length)) % nouns.length;

  return `${adjectives1[index1]} ${adjectives2[index2]} ${nouns[index3]}`;
}

/**
 * Convert a seed name back to a numeric seed
 * This allows players to share and enter seed names
 *
 * @param name - Seed name (case-insensitive)
 * @returns Numeric seed, or a hash if the name doesn't match the pattern
 */
export function seedFromName(name: string): number {
  const normalizedName = name.trim();
  const parts = normalizedName.split(/\s+/);

  if (parts.length === 3) {
    // Try to match exact words from our pools (case-insensitive)
    const adj1Lower = parts[0].toLowerCase();
    const adj2Lower = parts[1].toLowerCase();
    const nounLower = parts[2].toLowerCase();

    const index1 = adjectives1.findIndex((a) => a.toLowerCase() === adj1Lower);
    const index2 = adjectives2.findIndex((a) => a.toLowerCase() === adj2Lower);
    const index3 = nouns.findIndex((n) => n.toLowerCase() === nounLower);

    // If all three words are found in our pools, calculate the exact seed
    if (index1 !== -1 && index2 !== -1 && index3 !== -1) {
      return (
        index1 +
        index2 * adjectives1.length +
        index3 * adjectives1.length * adjectives2.length
      );
    }
  }

  // Fallback: hash the entire name string
  // This allows arbitrary strings as seeds while still being deterministic
  return hashString(normalizedName);
}

/**
 * Validate if a name matches our word pool pattern exactly
 *
 * @param name - Name to validate
 * @returns True if all three words are from our pools
 */
export function isValidSeedName(name: string): boolean {
  const parts = name.trim().split(/\s+/);
  if (parts.length !== 3) return false;

  const adj1Lower = parts[0].toLowerCase();
  const adj2Lower = parts[1].toLowerCase();
  const nounLower = parts[2].toLowerCase();

  return (
    adjectives1.some((a) => a.toLowerCase() === adj1Lower) &&
    adjectives2.some((a) => a.toLowerCase() === adj2Lower) &&
    nouns.some((n) => n.toLowerCase() === nounLower)
  );
}

/**
 * Get the total number of possible seed name combinations
 */
export function getTotalCombinations(): number {
  return adjectives1.length * adjectives2.length * nouns.length;
}

/**
 * Generate a random seed appropriate for seed names
 * Returns a value in the valid range for all combinations
 */
export function generateRandomSeed(): number {
  // Use crypto.getRandomValues if available, otherwise Math.random
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0];
  }
  return Math.floor(Math.random() * 0xffffffff);
}
