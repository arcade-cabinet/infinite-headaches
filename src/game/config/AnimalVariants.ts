/**
 * Animal Variant System
 * Rare/Golden/Shadow variants reuse existing GLB models
 * with BabylonJS material color overrides.
 */

export type VariantType = "normal" | "rare" | "golden" | "shadow";

export interface VariantConfig {
  colorOverlay: { r: number; g: number; b: number };
  emissiveIntensity: number;
  scoreMultiplier: number;
  spawnWeight: number;
  minLevel: number;
}

export const VARIANT_CONFIGS: Record<Exclude<VariantType, "normal">, VariantConfig> = {
  rare: {
    colorOverlay: { r: 0.3, g: 0.5, b: 1.0 },
    emissiveIntensity: 0.3,
    scoreMultiplier: 1.5,
    spawnWeight: 10,
    minLevel: 3,
  },
  golden: {
    colorOverlay: { r: 1.0, g: 0.85, b: 0.2 },
    emissiveIntensity: 0.5,
    scoreMultiplier: 3.0,
    spawnWeight: 4,
    minLevel: 8,
  },
  shadow: {
    colorOverlay: { r: 0.6, g: 0.2, b: 0.9 },
    emissiveIntensity: 0.4,
    scoreMultiplier: 2.0,
    spawnWeight: 1,
    minLevel: 15,
  },
};

/**
 * Roll for a variant type based on current level.
 * Returns "normal" most of the time.
 */
export function rollVariant(level: number, rng: () => number): VariantType {
  const eligible = (Object.entries(VARIANT_CONFIGS) as [Exclude<VariantType, "normal">, VariantConfig][])
    .filter(([, config]) => level >= config.minLevel);

  if (eligible.length === 0) return "normal";

  const totalVariantWeight = eligible.reduce((sum, [, c]) => sum + c.spawnWeight, 0);
  // Normal animals fill the remaining weight out of 100
  const normalWeight = 100 - totalVariantWeight;
  const totalWeight = normalWeight + totalVariantWeight;

  const roll = rng() * totalWeight;

  if (roll < normalWeight) return "normal";

  let accumulated = normalWeight;
  for (const [variant, config] of eligible) {
    accumulated += config.spawnWeight;
    if (roll < accumulated) return variant;
  }

  return "normal";
}
