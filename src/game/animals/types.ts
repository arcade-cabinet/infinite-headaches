/**
 * Animal Module Types
 *
 * Shared type definitions for the animal submodule system.
 * All animal-specific modules extend these base types.
 */

import { Vector3, Color3 } from "@babylonjs/core";
import type { Entity } from "../ecs/components";
import type { QualityLevel, AnimalDefinition } from "../registry/AnimalRegistry";

/**
 * Animal variant identifier - combines base animal with variant type
 * Format: "base" or "base_variant" (e.g., "cow", "cow_brown")
 */
export type AnimalVariantId = string;

/**
 * Animal behavior types for falling/movement patterns
 */
export type AnimalBehaviorType =
  | "normal"
  | "floater"
  | "seeker"
  | "zigzag"
  | "dive"
  | "bounce"
  | "spiral";

/**
 * Ability trigger types - when abilities can be activated
 */
export type AbilityTriggerType =
  | "poke" // Player taps/pokes the animal
  | "stack" // When animal is added to stack
  | "unstack" // When animal is removed from stack
  | "timer" // Automatic activation on cooldown
  | "passive" // Always active effect
  | "collision"; // On collision with specific entities

/**
 * Projectile configuration for projectile-based abilities
 */
export interface ProjectileConfig {
  /** Speed in units per second */
  speed: number;
  /** Size/radius of the projectile */
  size: number;
  /** Duration in milliseconds before despawn */
  duration: number;
  /** Number of projectiles to spawn */
  count: number;
  /** Spread angle in radians (for multiple projectiles) */
  spread: number;
  /** Does gravity affect this projectile? */
  affectedByGravity: boolean;
  /** Damage/effect strength */
  strength: number;
  /** Visual effect ID */
  effectId: string;
  /** Colors for rendering */
  colors: {
    primary: string;
    secondary: string;
    glow?: string;
  };
}

/**
 * Area of Effect configuration
 */
export interface AoEConfig {
  /** Radius of effect */
  radius: number;
  /** Duration of effect in milliseconds */
  duration: number;
  /** Does the effect persist or is it instant? */
  persistent: boolean;
  /** Effect strength/intensity */
  strength: number;
  /** Visual effect ID */
  effectId: string;
  /** Colors for rendering */
  colors: {
    primary: string;
    secondary: string;
    glow?: string;
  };
}

/**
 * Spawn configuration for abilities that create entities
 */
export interface SpawnConfig {
  /** Entity type to spawn */
  entityType: "bush" | "platform" | "obstacle" | "powerup" | "animal";
  /** Size of spawned entity */
  size: Vector3;
  /** Duration before despawn (0 = permanent) */
  duration: number;
  /** Additional properties for the spawned entity */
  properties: Record<string, unknown>;
}

/**
 * Complete ability definition for an animal variant
 */
export interface AnimalAbilityConfig {
  /** Unique ability ID */
  id: string;
  /** Display name */
  name: string;
  /** Description for UI */
  description: string;
  /** How the ability is triggered */
  trigger: AbilityTriggerType;
  /** Cooldown in milliseconds */
  cooldownMs: number;
  /** Effect type determines which config to use */
  effectType: "projectile" | "aoe" | "spawn" | "buff" | "transform";
  /** Projectile config (if effectType is "projectile") */
  projectile?: ProjectileConfig;
  /** AoE config (if effectType is "aoe") */
  aoe?: AoEConfig;
  /** Spawn config (if effectType is "spawn") */
  spawn?: SpawnConfig;
  /** Sound effect ID */
  soundEffect?: string;
  /** Animation to play */
  animation?: string;
}

/**
 * Visual modifier for variant appearance
 */
export interface VisualModifier {
  /** Color overlay (multiplied with base texture) */
  colorTint?: Color3;
  /** Emission/glow color */
  emissionColor?: Color3;
  /** Emission intensity (0-1) */
  emissionIntensity?: number;
  /** Scale modifier */
  scaleModifier?: Vector3;
  /** Additional particle effect ID */
  particleEffect?: string;
  /** Shader/material override ID */
  materialOverride?: string;
}

/**
 * Gameplay modifiers specific to a variant
 */
export interface VariantGameplayModifiers {
  /** Weight multiplier affects wobble physics */
  weightMultiplier: number;
  /** Points earned when caught */
  scoreMultiplier: number;
  /** Fall speed modifier */
  fallSpeedMultiplier: number;
  /** Stack stability modifier */
  stabilityMultiplier: number;
  /** Bounce factor when hitting bounce pads */
  bounceMultiplier?: number;
  /** Resistance to being knocked off stack */
  knockbackResistance?: number;
}

/**
 * Complete variant definition
 */
export interface AnimalVariantConfig {
  /** Unique variant ID (e.g., "brown_cow") */
  id: string;
  /** Display name */
  name: string;
  /** Base animal ID this is a variant of */
  baseAnimalId: string;
  /** Variant type classification */
  variantType: string;
  /** Spawn weight (0 = not naturally spawned) */
  spawnWeight: number;
  /** Minimum game level before this variant can spawn */
  minLevel?: number;
  /** Visual modifications */
  visuals: VisualModifier;
  /** Gameplay modifications */
  modifiers: VariantGameplayModifiers;
  /** Ability configuration (null if no special ability) */
  ability: AnimalAbilityConfig | null;
  /** Custom behavior type override */
  behaviorOverride?: AnimalBehaviorType;
  /** Tags for filtering/grouping */
  tags: string[];
}

/**
 * Animal-specific ECS component for variant data
 */
export interface AnimalVariantComponent {
  /** Variant ID */
  variantId: string;
  /** Base animal type */
  baseType: string;
  /** Current ability cooldown (ms remaining) */
  abilityCooldown: number;
  /** Is ability ready to use? */
  abilityReady: boolean;
  /** Number of times ability has been used */
  abilityUseCount: number;
  /** Custom variant state data */
  variantState: Record<string, unknown>;
}

/**
 * Poke result from animal interaction
 */
export interface PokeResult {
  /** Was the poke registered? */
  poked: boolean;
  /** Ability ID if one was triggered */
  ability?: string;
  /** Wobble force to apply */
  wobbleForce?: number;
  /** Additional data from the poke */
  data?: Record<string, unknown>;
}

/**
 * Bush entity component (for Brown Cow ability)
 */
export interface BushComponent {
  /** Size of the bush */
  size: Vector3;
  /** Bounce force when animals hit it */
  bounceForce: number;
  /** Duration remaining (ms), 0 = permanent */
  duration: number;
  /** Seed used for procedural generation */
  seed: string;
  /** Growth stage (0-1, for animation) */
  growthStage: number;
  /** Is the bush fully grown? */
  isFullyGrown: boolean;
}

/**
 * Projectile entity component
 */
export interface ProjectileComponent {
  /** Projectile type/source */
  sourceAbilityId: string;
  /** Entity that created this projectile */
  sourceEntityId: string;
  /** Direction of travel */
  direction: Vector3;
  /** Current speed */
  speed: number;
  /** Time remaining (ms) */
  timeRemaining: number;
  /** Effect strength */
  strength: number;
  /** Has this projectile hit something? */
  hasHit: boolean;
}

/**
 * Extended Entity type with animal-specific components
 */
export interface AnimalEntity extends Entity {
  animalVariant?: AnimalVariantComponent;
  bush?: BushComponent;
  projectile?: ProjectileComponent;
}

/**
 * Animal module interface - each animal submodule must export this
 */
export interface AnimalModule {
  /** Base animal ID */
  baseAnimalId: string;
  /** All variants including base */
  variants: Map<string, AnimalVariantConfig>;
  /** Register this animal's variants with the registry */
  register: () => void;
  /** Get variant config by ID */
  getVariant: (variantId: string) => AnimalVariantConfig | undefined;
  /** Create entity for this animal */
  createEntity: (
    variantId: string,
    position: Vector3,
    quality: QualityLevel
  ) => AnimalEntity;
  /** Handle poke interaction */
  handlePoke: (entity: AnimalEntity) => PokeResult;
  /** Update animal-specific systems (called each frame) */
  updateSystems: (deltaTime: number, entities: AnimalEntity[]) => void;
}

/**
 * Seeded random number generator interface
 * Uses seedrandom for deterministic procedural generation
 */
export interface SeededRandom {
  /** Generate random float 0-1 */
  random: () => number;
  /** Generate random float in range */
  range: (min: number, max: number) => number;
  /** Generate random integer in range (inclusive) */
  int: (min: number, max: number) => number;
  /** Generate random vector3 */
  vector3: (minScale: number, maxScale: number) => Vector3;
  /** Pick random item from array */
  pick: <T>(items: T[]) => T;
  /** Shuffle array in place */
  shuffle: <T>(items: T[]) => T[];
}

/**
 * Create a seeded random generator
 */
export function createSeededRandom(seed: string): SeededRandom {
  // Simple seedable PRNG (xorshift128+)
  let s0 = hashString(seed);
  let s1 = hashString(seed + "_1");

  function next(): number {
    let x = s0;
    const y = s1;
    s0 = y;
    x ^= x << 23;
    x ^= x >> 17;
    x ^= y ^ (y >> 26);
    s1 = x;
    return (x + y) >>> 0;
  }

  function random(): number {
    return next() / 4294967296;
  }

  return {
    random,
    range: (min: number, max: number) => min + random() * (max - min),
    int: (min: number, max: number) => Math.floor(min + random() * (max - min + 1)),
    vector3: (minScale: number, maxScale: number) => {
      const scale = minScale + random() * (maxScale - minScale);
      return new Vector3(
        (random() - 0.5) * 2 * scale,
        (random() - 0.5) * 2 * scale,
        (random() - 0.5) * 2 * scale
      );
    },
    pick: <T>(items: T[]): T => items[Math.floor(random() * items.length)],
    shuffle: <T>(items: T[]): T[] => {
      const result = [...items];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    },
  };
}

/**
 * Simple string hash for seeding
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) || 1;
}
