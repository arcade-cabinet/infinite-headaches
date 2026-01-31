/**
 * Cow Variants Index
 *
 * Exports all cow variant definitions.
 *
 * Variants:
 * - Brown Cow: Spawns bouncy bushes via cow patty projectiles
 * - Milk Cow: Creates slippery zones that speed up falling animals
 * - Highland Cow: Wind gust pushes animals toward center
 */

// Individual variant implementations
export * from "./BrownCow";
export * from "./MilkCow";
export * from "./HighlandCow";

// Re-export variant configs from parent config
export { COW_VARIANTS, HEAVY_COW_CONFIG, GOLDEN_COW_CONFIG } from "../config";

// Convenience imports
import { BrownCowConfig, BROWN_COW_ID } from "./BrownCow";
import { MilkCowVariant, MILK_COW_ID, MILK_COW_CONFIG } from "./MilkCow";
import { HighlandCowVariant, HIGHLAND_COW_ID, HIGHLAND_COW_CONFIG } from "./HighlandCow";

/** All cow variant IDs */
export const COW_VARIANT_IDS = [
  BROWN_COW_ID,
  MILK_COW_ID,
  HIGHLAND_COW_ID,
] as const;

/** Map of variant ID to configuration */
export const COW_VARIANT_CONFIGS = {
  [BROWN_COW_ID]: BrownCowConfig,
  [MILK_COW_ID]: MILK_COW_CONFIG,
  [HIGHLAND_COW_ID]: HIGHLAND_COW_CONFIG,
} as const;

/** Variant implementations for easy access */
export const CowVariants = {
  brown: { id: BROWN_COW_ID, config: BrownCowConfig },
  milk: MilkCowVariant,
  highland: HighlandCowVariant,
};
