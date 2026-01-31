/**
 * Sheep Variant Configuration
 *
 * Defines all sheep variants and their configurations:
 * - Electric Sheep: Chain stun ability
 * - Rainbow Sheep: Score multiplier with trail effect
 * - Counting Sheep: Global slow ability
 */

import { Color3 } from "@babylonjs/core";
import type {
  AnimalVariantConfig,
  AnimalAbilityConfig,
  VisualModifier,
  VariantGameplayModifiers,
} from "../types";

// ============================================================================
// ABILITY CONFIGURATIONS
// ============================================================================

export const ELECTRIC_SHEEP_ABILITY: AnimalAbilityConfig = {
  id: "electric_pulse",
  name: "Electric Pulse",
  description: "Releases an electric pulse that chains between nearby falling animals, stunning them briefly",
  trigger: "poke",
  cooldownMs: 7000,
  effectType: "aoe",
  aoe: {
    radius: 150, // Pixels for chain search
    duration: 1000, // 1 second stun
    persistent: false,
    strength: 3, // Max chain count
    effectId: "electric_chain",
    colors: {
      primary: "#00BFFF",
      secondary: "#FFFFFF",
      glow: "#00FFFF",
    },
  },
  soundEffect: "electric_zap",
  animation: "shock",
};

export const RAINBOW_SHEEP_ABILITY: AnimalAbilityConfig = {
  id: "rainbow_trail",
  name: "Rainbow Blessing",
  description: "Creates rainbow trails behind falling animals, making them worth bonus points",
  trigger: "poke",
  cooldownMs: 10000,
  effectType: "buff",
  aoe: {
    radius: 300, // Affects all animals in range
    duration: 5000, // Trail lasts 5 seconds
    persistent: true,
    strength: 1.5, // 50% bonus points
    effectId: "rainbow_trail",
    colors: {
      primary: "#FF0000",
      secondary: "#FFFF00",
      glow: "#00FF00",
    },
  },
  soundEffect: "rainbow_sparkle",
  animation: "shine",
};

export const COUNTING_SHEEP_ABILITY: AnimalAbilityConfig = {
  id: "sleep_wave",
  name: "Sleep Wave",
  description: "Puts all falling animals to sleep, making them fall at 50% speed for 4 seconds",
  trigger: "poke",
  cooldownMs: 20000, // Long cooldown - powerful ability
  effectType: "aoe",
  aoe: {
    radius: 9999, // Affects entire screen
    duration: 4000, // 4 seconds
    persistent: true,
    strength: 0.5, // 50% speed
    effectId: "sleep_zone",
    colors: {
      primary: "#9370DB",
      secondary: "#E6E6FA",
      glow: "#DDA0DD",
    },
  },
  soundEffect: "sleep_wave",
  animation: "yawn",
};

// ============================================================================
// VISUAL CONFIGURATIONS
// ============================================================================

export const ELECTRIC_SHEEP_VISUALS: VisualModifier = {
  colorTint: new Color3(0.9, 0.95, 1.0),
  emissionColor: new Color3(0, 0.75, 1.0),
  emissionIntensity: 0.4,
  particleEffect: "electric_sparks",
  materialOverride: "electric_wool",
};

export const RAINBOW_SHEEP_VISUALS: VisualModifier = {
  colorTint: new Color3(1.0, 1.0, 1.0),
  emissionColor: new Color3(1.0, 0.5, 0.5),
  emissionIntensity: 0.3,
  particleEffect: "rainbow_shimmer",
  materialOverride: "rainbow_wool",
};

export const COUNTING_SHEEP_VISUALS: VisualModifier = {
  colorTint: new Color3(0.95, 0.95, 1.0),
  emissionColor: new Color3(0.7, 0.5, 0.9),
  emissionIntensity: 0.2,
  particleEffect: "floating_z",
  materialOverride: "sleepy_wool",
};

// ============================================================================
// GAMEPLAY MODIFIERS
// ============================================================================

export const ELECTRIC_SHEEP_MODIFIERS: VariantGameplayModifiers = {
  weightMultiplier: 0.95,
  scoreMultiplier: 1.3,
  fallSpeedMultiplier: 1.0,
  stabilityMultiplier: 0.9, // Slightly less stable (energetic)
  bounceMultiplier: 1.2, // Bounces a bit more
};

export const RAINBOW_SHEEP_MODIFIERS: VariantGameplayModifiers = {
  weightMultiplier: 0.9,
  scoreMultiplier: 2.0, // Worth double points passively!
  fallSpeedMultiplier: 0.95,
  stabilityMultiplier: 1.0,
};

export const COUNTING_SHEEP_MODIFIERS: VariantGameplayModifiers = {
  weightMultiplier: 1.1,
  scoreMultiplier: 1.2,
  fallSpeedMultiplier: 0.85, // Falls slower naturally
  stabilityMultiplier: 1.3, // Very stable (sleepy = calm)
  knockbackResistance: 0.3,
};

// ============================================================================
// COMPLETE VARIANT CONFIGURATIONS
// ============================================================================

export const ELECTRIC_SHEEP_CONFIG: AnimalVariantConfig = {
  id: "electric_sheep",
  name: "Electric Sheep",
  baseAnimalId: "sheep",
  variantType: "electric",
  spawnWeight: 0.04,
  minLevel: 3,
  visuals: ELECTRIC_SHEEP_VISUALS,
  modifiers: ELECTRIC_SHEEP_MODIFIERS,
  ability: ELECTRIC_SHEEP_ABILITY,
  tags: ["electric", "chain", "stun", "support"],
};

export const RAINBOW_SHEEP_CONFIG: AnimalVariantConfig = {
  id: "rainbow_sheep",
  name: "Rainbow Sheep",
  baseAnimalId: "sheep",
  variantType: "rainbow",
  spawnWeight: 0.03,
  minLevel: 5,
  visuals: RAINBOW_SHEEP_VISUALS,
  modifiers: RAINBOW_SHEEP_MODIFIERS,
  ability: RAINBOW_SHEEP_ABILITY,
  tags: ["rainbow", "score", "buff", "visual"],
};

export const COUNTING_SHEEP_CONFIG: AnimalVariantConfig = {
  id: "counting_sheep",
  name: "Counting Sheep",
  baseAnimalId: "sheep",
  variantType: "sleepy",
  spawnWeight: 0.02, // Rare due to powerful ability
  minLevel: 7,
  visuals: COUNTING_SHEEP_VISUALS,
  modifiers: COUNTING_SHEEP_MODIFIERS,
  ability: COUNTING_SHEEP_ABILITY,
  behaviorOverride: "floater",
  tags: ["sleepy", "slow", "global", "powerful"],
};

// ============================================================================
// ALL SHEEP VARIANTS
// ============================================================================

export const SHEEP_VARIANTS: AnimalVariantConfig[] = [
  ELECTRIC_SHEEP_CONFIG,
  RAINBOW_SHEEP_CONFIG,
  COUNTING_SHEEP_CONFIG,
];

// Export map for quick lookup
export const SHEEP_VARIANT_MAP = new Map<string, AnimalVariantConfig>(
  SHEEP_VARIANTS.map((v) => [v.id, v])
);
