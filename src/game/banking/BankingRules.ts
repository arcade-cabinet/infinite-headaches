/**
 * Banking Rules - Poker/Yahtzee style scoring for animal stacks
 *
 * Players must bank valid combinations of animals:
 * - Pair: 2 of the same animal
 * - Three of a Kind: 3 of the same animal
 * - Full House: 3 of one + 2 of another
 * - Four of a Kind: 4 of the same animal
 * - Five of a Kind (Yahtzee): 5 of the same animal
 * - Straight: One of each animal type (any 5 different)
 * - Two Pair: 2 of one + 2 of another + 1 any
 *
 * Heavier animals are worth more points in combinations
 */

import { AnimalType, ANIMAL_TYPES } from "../config";

export type CombinationType =
  | "none"
  | "pair"
  | "two_pair"
  | "three_of_a_kind"
  | "straight"
  | "full_house"
  | "four_of_a_kind"
  | "five_of_a_kind";

export interface BankingResult {
  combination: CombinationType;
  score: number;
  animals: AnimalType[];
  displayName: string;
  glowColor: string;
}

// Base point values for each combination type
const COMBINATION_SCORES: Record<CombinationType, number> = {
  none: 0,
  pair: 50,
  two_pair: 100,
  three_of_a_kind: 150,
  straight: 200,
  full_house: 250,
  four_of_a_kind: 400,
  five_of_a_kind: 1000, // YAHTZEE!
};

// Display names for combinations
const COMBINATION_NAMES: Record<CombinationType, string> = {
  none: "No Combo",
  pair: "Pair",
  two_pair: "Two Pair",
  three_of_a_kind: "Three of a Kind",
  straight: "Barnyard Straight",
  full_house: "Full House",
  four_of_a_kind: "Four of a Kind",
  five_of_a_kind: "YAHTZEE!",
};

// Glow colors for each combination
const COMBINATION_COLORS: Record<CombinationType, string> = {
  none: "transparent",
  pair: "rgba(255, 193, 7, 0.6)", // Amber
  two_pair: "rgba(255, 152, 0, 0.7)", // Orange
  three_of_a_kind: "rgba(76, 175, 80, 0.7)", // Green
  straight: "rgba(33, 150, 243, 0.7)", // Blue
  full_house: "rgba(156, 39, 176, 0.7)", // Purple
  four_of_a_kind: "rgba(244, 67, 54, 0.8)", // Red
  five_of_a_kind: "rgba(255, 215, 0, 1.0)", // Gold - YAHTZEE!
};

/**
 * Counts animals by type in a stack
 */
function countAnimals(animals: AnimalType[]): Map<AnimalType, number> {
  const counts = new Map<AnimalType, number>();
  for (const animal of animals) {
    counts.set(animal, (counts.get(animal) || 0) + 1);
  }
  return counts;
}

/**
 * Gets the weight bonus multiplier based on animals in the combination
 * Heavier animals give higher multiplier
 */
function getWeightBonus(animals: AnimalType[]): number {
  let totalWeight = 0;
  for (const animal of animals) {
    totalWeight += ANIMAL_TYPES[animal]?.weight || 1;
  }
  // Average weight, then scale to multiplier (1.0 - 2.0 range)
  const avgWeight = totalWeight / animals.length;
  return 0.5 + avgWeight * 0.5;
}

/**
 * Detects the best combination in a stack of animals
 */
export function detectCombination(animals: AnimalType[]): BankingResult {
  if (animals.length < 2) {
    return {
      combination: "none",
      score: 0,
      animals: [],
      displayName: COMBINATION_NAMES.none,
      glowColor: COMBINATION_COLORS.none,
    };
  }

  const counts = countAnimals(animals);
  const countsArray = Array.from(counts.values()).sort((a, b) => b - a);
  const uniqueTypes = counts.size;

  let combination: CombinationType = "none";

  // Check combinations from best to worst
  if (countsArray[0] >= 5) {
    combination = "five_of_a_kind";
  } else if (countsArray[0] >= 4) {
    combination = "four_of_a_kind";
  } else if (countsArray[0] >= 3 && countsArray[1] >= 2) {
    combination = "full_house";
  } else if (uniqueTypes >= 5 && animals.length >= 5) {
    // Straight - 5 different animal types
    combination = "straight";
  } else if (countsArray[0] >= 3) {
    combination = "three_of_a_kind";
  } else if (countsArray[0] >= 2 && countsArray[1] >= 2) {
    combination = "two_pair";
  } else if (countsArray[0] >= 2) {
    combination = "pair";
  }

  // Calculate score with weight bonus
  const baseScore = COMBINATION_SCORES[combination];
  const weightBonus = getWeightBonus(animals);
  const score = Math.round(baseScore * weightBonus);

  return {
    combination,
    score,
    animals,
    displayName: COMBINATION_NAMES[combination],
    glowColor: COMBINATION_COLORS[combination],
  };
}

/**
 * Checks if a stack has a valid bankable combination
 */
export function canBank(animals: AnimalType[]): boolean {
  const result = detectCombination(animals);
  return result.combination !== "none";
}

/**
 * Gets the minimum stack size required for banking
 */
export function getMinStackForBanking(): number {
  return 2; // Minimum is a pair
}

/**
 * Formats a combination for display
 */
export function formatCombination(result: BankingResult): string {
  if (result.combination === "none") {
    return "Need a combo!";
  }
  return `${result.displayName} (+${result.score})`;
}

/**
 * Gets particle effect settings for a combination
 */
export function getCombinationParticles(combination: CombinationType): {
  count: number;
  speed: number;
  color: string;
  size: number;
} {
  switch (combination) {
    case "five_of_a_kind":
      return { count: 50, speed: 4, color: "#FFD700", size: 8 };
    case "four_of_a_kind":
      return { count: 35, speed: 3, color: "#F44336", size: 6 };
    case "full_house":
      return { count: 30, speed: 2.5, color: "#9C27B0", size: 5 };
    case "straight":
      return { count: 25, speed: 2.5, color: "#2196F3", size: 5 };
    case "three_of_a_kind":
      return { count: 20, speed: 2, color: "#4CAF50", size: 4 };
    case "two_pair":
      return { count: 15, speed: 1.5, color: "#FF9800", size: 4 };
    case "pair":
      return { count: 10, speed: 1, color: "#FFC107", size: 3 };
    default:
      return { count: 0, speed: 0, color: "transparent", size: 0 };
  }
}
