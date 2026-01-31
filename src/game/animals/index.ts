/**
 * Animals Module - Barrel Export
 *
 * Central export point for all animal submodules in Homestead Headaches.
 * Each animal has its own submodule with variants, components, and systems.
 *
 * ## Architecture
 *
 * Each animal submodule (cow, chicken, pig, duck, sheep) contains:
 * - config.ts: Variant definitions, abilities, visual modifiers
 * - components.ts: ECS components specific to that animal
 * - systems.ts: ECS systems for animal behaviors
 * - variants/: Individual variant implementations
 * - index.ts: Module exports implementing AnimalModule interface
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   CowModule,
 *   ChickenModule,
 *   DuckModule,
 *   PigModule,
 *   SheepModule,
 *   runAllAnimalSystems,
 *   registerAllAnimals,
 * } from "./game/animals";
 *
 * // Register all animals during initialization
 * registerAllAnimals();
 *
 * // In game loop
 * runAllAnimalSystems(deltaTime, gameContext);
 * ```
 */

// ============================================================================
// SHARED TYPES
// ============================================================================

export type {
  AnimalVariantId,
  AnimalBehaviorType,
  AbilityTriggerType,
  ProjectileConfig,
  AoEConfig,
  SpawnConfig,
  AnimalAbilityConfig,
  VisualModifier,
  VariantGameplayModifiers,
  AnimalVariantConfig,
  AnimalVariantComponent,
  PokeResult,
  BushComponent,
  ProjectileComponent,
  AnimalEntity,
  AnimalModule,
  SeededRandom,
} from "./types";

export { createSeededRandom } from "./types";

// ============================================================================
// BASE MODULE
// ============================================================================

export {
  AnimalBase,
  createAnimalVariantComponent,
  createBushComponent,
  createProjectileComponent,
  handleBasePoke,
  applyVisualModifiers,
  calculateSpawnPosition,
  getRandomDirection,
  runBaseAnimalSystems,
  AnimalVariantSystem,
  BushGrowthSystem,
  BushBounceSystem,
  ProjectileMovementSystem,
  ProjectileImpactSystem,
} from "./base/AnimalBase";

// ============================================================================
// COW MODULE
// ============================================================================

export {
  CowModule,
  registerCowAnimals,
  getCowVariant,
  createCowEntity,
  // Components
  createCowVariantComponent,
  createCowPoopProjectileComponent,
  createCowBushComponent,
  isCowEntity,
  isBrownCow,
  isCowBush,
  isCowPoop,
  getBushLeafColor,
  trampleBush,
  // Systems
  handleCowPoke,
  runCowSystems,
  setCowSystemCallbacks,
  CowPoopProjectileSystem,
  CowBushGrowthSystem,
  CowBushBounceSystem,
  getActiveCowBushes,
  getActivePoopProjectiles,
  clearCowSpawnedEntities,
  // Config
  COW_BASE_ID,
  COW_DISPLAY_NAME,
  COW_VARIANTS as COW_VARIANT_CONFIGS,
  COW_BASE_MODIFIERS,
  BROWN_COW_CONFIG,
  HEAVY_COW_CONFIG,
  GOLDEN_COW_CONFIG,
  BROWN_COW_POOP_ABILITY,
  POOP_BUSH_CONFIG,
  type CowEntity,
  type CowSystemCallbacks,
} from "./cow";

// ============================================================================
// CHICKEN MODULE
// ============================================================================

export {
  // Config
  CORN_CHICKEN_CONFIG,
  EGG_CHICKEN_CONFIG,
  ROOSTER_CONFIG,
  CHICKEN_VARIANTS,
  getChickenVariantConfig,
  isChickenVariant,
  getVariantFromId as getChickenVariantFromId,
  type ChickenVariant,
  type ChickenAbilityEffect,
  // Components
  type ChickenEntity,
  type ChickenVariantComponent,
  type ChickenAbilityComponent,
  createChickenVariantComponent,
  createChickenAbilityComponent,
  // Systems
  ChickenVariantSystem,
  triggerChickenAbility,
  // Factory
  createChickenVariant,
  ALL_CHICKEN_DEFINITIONS,
  registerChickenVariants,
  // Variant exports
  createCornChicken,
  createEggChicken,
  createRooster,
} from "./chicken";

// ============================================================================
// PIG MODULE
// ============================================================================

export {
  // Config
  MUD_PIG_CONFIG,
  TRUFFLE_PIG_CONFIG,
  FLYING_PIG_CONFIG,
  PIG_VARIANTS,
  getPigVariant,
  getSpawnablePigVariants,
  pickRandomPigVariant,
  type PigVariantId,
  // Components
  type PigEntity,
  type PigVariantComponent,
  createPigVariantComponent,
  createPigAbilityComponent,
  // Systems
  runPigSystems,
  activatePigAbility,
  // Factory
  createPigVariant,
  isPigVariant,
  getPigVariantId,
  isPigAbilityReady,
  getPigAbilityCooldownProgress,
  getPigVariantDisplayInfo,
  getAllPigVariantColors,
  // Variant exports
  createMudPig,
  createTrufflePig,
  createFlyingPig,
} from "./pig";

// ============================================================================
// DUCK MODULE
// ============================================================================

export {
  DuckModule,
  // Config
  DUCK_VARIANTS,
  getDuckVariant,
  getSpawnableDuckVariants,
  pickRandomDuckVariant,
  isDucklingType,
  getAnimalSizeCategory,
  type DuckVariantId,
  type DuckVariantConfig,
  // Components
  createDuckVariantComponent,
  createDuckAbilityComponent,
  type DuckEntity,
  type DuckVariantComponent,
  type DuckAbilityComponent,
  // Systems
  DuckVariantSystem,
  triggerDuckAbility,
  isDuckAbilityReady,
  getDuckAbilityCooldownProgress,
  updateDuckSystemContext,
  getGlobalWobbleReduction,
  resetGlobalWobbleReduction,
  getAttractedEntityIds,
  // Factory
  isDuckVariant,
  getDuckVariantDisplayInfo,
  getAllDuckVariantColors,
} from "./duck";

// ============================================================================
// SHEEP MODULE
// ============================================================================

export {
  SheepModule,
  // Config
  SHEEP_VARIANTS,
  ELECTRIC_SHEEP_CONFIG,
  RAINBOW_SHEEP_CONFIG,
  COUNTING_SHEEP_CONFIG,
  // Variant implementations
  ElectricSheepVariant,
  RainbowSheepVariant,
  CountingSheepVariant,
  // Entity creators
  createElectricSheep,
  createRainbowSheep,
  createCountingSheep,
  // Systems
  SheepVariantSystem,
  clearSheepEffects,
  isAnimalStunned,
  hasRainbowTrail,
  getRainbowScoreBonus,
  isSleepWaveActive,
  getSleepSpeedMultiplier,
  // Effect getters
  getStunEffects,
  getRainbowTrailEffects,
  getSleepWaveEffect,
} from "./sheep";

// ============================================================================
// MODULE AGGREGATION
// ============================================================================

import { CowModule } from "./cow";
import { SheepModule } from "./sheep";
import { DuckModule } from "./duck";
import type { AnimalModule, AnimalEntity } from "./types";

// Import chicken and pig modules using their export patterns
import { ChickenVariantSystem, registerChickenVariants } from "./chicken";
import { runPigSystems } from "./pig";
import { runBaseAnimalSystems } from "./base/AnimalBase";

/**
 * All animal modules
 */
export const AnimalModules = {
  cow: CowModule,
  sheep: SheepModule,
  duck: DuckModule,
  // chicken and pig use different patterns, accessed via their exports
} as const;

/**
 * Register all animal variants with the game
 */
export function registerAllAnimals(): void {
  console.log("[AnimalsModule] Registering all animals...");

  // Register cow variants
  CowModule.register();

  // Register sheep variants
  SheepModule.register();

  // Register duck variants
  DuckModule.register();

  // Chicken uses a different registration pattern
  // registerChickenVariants() requires a callback

  console.log("[AnimalsModule] All animals registered");
}

/**
 * Context for running animal systems
 */
export interface AnimalSystemContext {
  /** Time since last frame in ms */
  deltaTime: number;
  /** Stack center X position */
  stackCenterX: number;
  /** Stack top Y position */
  stackTopY: number;
  /** Stack bottom Y position */
  stackBottomY: number;
  /** All falling animal entities */
  fallingAnimals: AnimalEntity[];
  /** All stacked animal entities */
  stackedAnimals: AnimalEntity[];
  /** Random number generator */
  rng?: () => number;
  /** Screen/canvas width */
  screenWidth?: number;
  /** Screen/canvas height */
  screenHeight?: number;
  /** Current game time in ms */
  gameTime?: number;
}

/**
 * Run all animal-specific systems
 */
export function runAllAnimalSystems(context: AnimalSystemContext): void {
  const { deltaTime, fallingAnimals, stackedAnimals, rng } = context;

  // Run base systems (projectiles, bushes, etc.)
  runBaseAnimalSystems(deltaTime);

  // Run cow systems
  CowModule.updateSystems(deltaTime, [...fallingAnimals, ...stackedAnimals]);

  // Run sheep systems - uses the AnimalModule interface which takes (deltaTime, entities)
  // The internal implementation handles the additional parameters
  SheepModule.updateSystems(deltaTime, stackedAnimals);

  // Run duck systems
  DuckModule.updateSystems(deltaTime, stackedAnimals);

  // Run chicken systems (uses different interface)
  // ChickenVariantSystem is called internally by the chicken module

  // Note: Pig systems require a full PigSystemContext which includes world reference
  // For simplified integration, pig systems should be called directly in the game engine
  // with full context: runPigSystems(world, deltaTime, pigContext)
}

/**
 * Handle poke for any animal entity
 * Routes to the appropriate module based on animal type
 */
export function handleAnimalPoke(
  entity: AnimalEntity,
  _context?: {
    stackCenterX?: number;
    stackTopY?: number;
    stackBottomY?: number;
    fallingAnimals?: AnimalEntity[];
  }
): import("./types").PokeResult {
  const baseType = entity.animalVariant?.baseType || entity.tag?.subtype;

  switch (baseType) {
    case "cow":
      return CowModule.handlePoke(entity);
    case "sheep":
      return SheepModule.handlePoke(entity);
    case "duck":
      return DuckModule.handlePoke(entity);
    default:
      return { poked: true, wobbleForce: 0.25 };
  }
}

/**
 * Get all spawnable variants across all animals
 */
export function getAllSpawnableVariants(): Array<{
  animalType: string;
  variantId: string;
  spawnWeight: number;
  minLevel: number;
}> {
  const variants: Array<{
    animalType: string;
    variantId: string;
    spawnWeight: number;
    minLevel: number;
  }> = [];

  // Cow variants
  for (const [id, config] of CowModule.variants) {
    if (config.spawnWeight > 0) {
      variants.push({
        animalType: "cow",
        variantId: id,
        spawnWeight: config.spawnWeight,
        minLevel: config.minLevel || 0,
      });
    }
  }

  // Sheep variants
  for (const [id, config] of SheepModule.variants) {
    if (config.spawnWeight > 0) {
      variants.push({
        animalType: "sheep",
        variantId: id,
        spawnWeight: config.spawnWeight,
        minLevel: config.minLevel || 0,
      });
    }
  }

  // Duck variants
  for (const [id, config] of DuckModule.variants) {
    if (config.spawnWeight > 0) {
      variants.push({
        animalType: "duck",
        variantId: id,
        spawnWeight: config.spawnWeight,
        minLevel: config.minLevel || 0,
      });
    }
  }

  return variants;
}

export default {
  modules: AnimalModules,
  registerAll: registerAllAnimals,
  runSystems: runAllAnimalSystems,
  handlePoke: handleAnimalPoke,
  getSpawnableVariants: getAllSpawnableVariants,
};
