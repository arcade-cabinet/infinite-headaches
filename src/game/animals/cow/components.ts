/**
 * Cow-Specific ECS Components
 *
 * Components specific to cow entities and their abilities.
 */

import { Vector3, Color3 } from "@babylonjs/core";
import type { Entity } from "../../ecs/components";
import type {
  AnimalEntity,
  AnimalVariantComponent,
  BushComponent,
  ProjectileComponent,
} from "../types";
import {
  createAnimalVariantComponent,
  createBushComponent,
  createProjectileComponent,
} from "../base/AnimalBase";
import { POOP_BUSH_CONFIG, COW_VARIANTS } from "./config";
import { createSeededRandom } from "../types";

/**
 * Cow Poop Projectile Component
 *
 * Extended projectile component specific to cow poop,
 * which spawns bushes on impact.
 */
export interface CowPoopProjectileComponent extends ProjectileComponent {
  /** Seed for deterministic bush generation */
  bushSeed: string;
  /** Has the poop landed and spawned a bush? */
  hasSpawnedBush: boolean;
  /** Trail particles for visual effect */
  trailIntensity: number;
}

/**
 * Cow Bush Component
 *
 * Extended bush component specific to cow-spawned bushes.
 */
export interface CowBushComponent extends BushComponent {
  /** ID of the cow that created this bush */
  sourceCowId: string;
  /** Color variation seed */
  colorSeed: string;
  /** Procedural branch data */
  branches: BranchData[];
  /** Is this bush being trampled? */
  isTrampled: boolean;
  /** Remaining tramples before destruction */
  tramplesRemaining: number;
}

/**
 * Branch data for procedural bush generation
 */
export interface BranchData {
  /** Starting position relative to bush center */
  startOffset: Vector3;
  /** Direction the branch grows */
  direction: Vector3;
  /** Length of the branch */
  length: number;
  /** Thickness of the branch */
  thickness: number;
  /** Leaf cluster positions along the branch */
  leafClusters: LeafClusterData[];
}

/**
 * Leaf cluster data for procedural bush
 */
export interface LeafClusterData {
  /** Position along the branch (0-1) */
  position: number;
  /** Offset from branch */
  offset: Vector3;
  /** Cluster size */
  size: number;
  /** Color index */
  colorIndex: number;
}

/**
 * Create a cow variant component
 */
export function createCowVariantComponent(
  variantId: string
): AnimalVariantComponent {
  const config = COW_VARIANTS[variantId as keyof typeof COW_VARIANTS];
  const variantType = config?.variantType || "base";

  const initialState: Record<string, unknown> = {
    variantType,
    bushesSpawned: 0,
    lastPoopTime: 0,
  };

  // Brown cow tracks bush positions for strategic play
  if (variantId === "brown_cow") {
    initialState.spawnedBushIds = [];
    initialState.maxBushes = 3; // Limit active bushes
  }

  return createAnimalVariantComponent(variantId, "cow", initialState);
}

/**
 * Create a cow poop projectile component
 */
export function createCowPoopProjectileComponent(
  sourceEntityId: string,
  direction: Vector3,
  seed: string
): CowPoopProjectileComponent {
  const baseProjectile = createProjectileComponent(
    "cow_poop",
    sourceEntityId,
    direction,
    8, // speed
    3000, // duration
    1.0 // strength
  );

  return {
    ...baseProjectile,
    bushSeed: seed,
    hasSpawnedBush: false,
    trailIntensity: 1.0,
  };
}

/**
 * Create a cow bush component with procedural generation
 */
export function createCowBushComponent(
  seed: string,
  sourceCowId: string,
  position: Vector3
): CowBushComponent {
  const rng = createSeededRandom(seed);
  const config = POOP_BUSH_CONFIG;

  // Calculate size with variation
  const sizeVariation = rng.range(-config.sizeVariation, config.sizeVariation);
  const size = config.baseSize.scale(1 + sizeVariation);

  // Generate branches procedurally
  const branchCount = rng.int(
    config.procedural.branchCount.min,
    config.procedural.branchCount.max
  );

  const branches: BranchData[] = [];
  for (let i = 0; i < branchCount; i++) {
    branches.push(generateBranch(rng, i, branchCount, config));
  }

  const baseBush = createBushComponent(
    size,
    config.bounceForce,
    seed,
    config.duration
  );

  return {
    ...baseBush,
    sourceCowId,
    colorSeed: seed + "_color",
    branches,
    isTrampled: false,
    tramplesRemaining: 5, // Can handle 5 bounces before shrinking
  };
}

/**
 * Generate a single branch with leaf clusters
 */
function generateBranch(
  rng: ReturnType<typeof createSeededRandom>,
  index: number,
  total: number,
  config: typeof POOP_BUSH_CONFIG
): BranchData {
  // Distribute branches evenly around the center
  const angle = (index / total) * Math.PI * 2;
  const spread = config.procedural.spreadFactor;

  // Start from center with slight offset
  const startOffset = new Vector3(
    Math.cos(angle) * 0.2 * spread,
    rng.range(0, 0.3),
    Math.sin(angle) * 0.2 * spread
  );

  // Branch grows outward and up
  const direction = new Vector3(
    Math.cos(angle) * spread + rng.range(-0.2, 0.2),
    rng.range(0.3, 0.8),
    Math.sin(angle) * spread + rng.range(-0.2, 0.2)
  ).normalize();

  const length = rng.range(0.4, config.procedural.maxHeight);
  const thickness = rng.range(0.05, 0.1);

  // Generate leaf clusters along the branch
  const leafDensity = rng.range(
    config.procedural.leafDensity.min,
    config.procedural.leafDensity.max
  );
  const numClusters = Math.floor(3 + leafDensity * 5);

  const leafClusters: LeafClusterData[] = [];
  for (let i = 0; i < numClusters; i++) {
    leafClusters.push({
      position: rng.range(0.3, 1.0), // Along branch length
      offset: new Vector3(
        rng.range(-0.15, 0.15),
        rng.range(-0.1, 0.2),
        rng.range(-0.15, 0.15)
      ),
      size: rng.range(0.15, 0.35),
      colorIndex: rng.int(0, config.colors.leaves.length - 1),
    });
  }

  return {
    startOffset,
    direction,
    length,
    thickness,
    leafClusters,
  };
}

/**
 * Extended entity type for cow entities
 */
export interface CowEntity extends AnimalEntity {
  cowPoop?: CowPoopProjectileComponent;
  cowBush?: CowBushComponent;
}

/**
 * Check if an entity is a cow variant
 */
export function isCowEntity(entity: Entity): entity is CowEntity {
  const variant = (entity as AnimalEntity).animalVariant;
  return variant?.baseType === "cow";
}

/**
 * Check if an entity is a brown cow
 */
export function isBrownCow(entity: Entity): boolean {
  const variant = (entity as AnimalEntity).animalVariant;
  return variant?.variantId === "brown_cow";
}

/**
 * Check if an entity is a cow bush
 */
export function isCowBush(entity: Entity): entity is CowEntity {
  return (entity as CowEntity).cowBush !== undefined;
}

/**
 * Check if an entity is a cow poop projectile
 */
export function isCowPoop(entity: Entity): entity is CowEntity {
  return (entity as CowEntity).cowPoop !== undefined;
}

/**
 * Get the color for a bush leaf cluster
 */
export function getBushLeafColor(
  bush: CowBushComponent,
  clusterIndex: number
): Color3 {
  const colorRng = createSeededRandom(bush.colorSeed + "_" + clusterIndex);
  const colors = POOP_BUSH_CONFIG.colors.leaves;

  // Mix between two colors for variety
  const baseColor = colors[clusterIndex % colors.length];
  const variation = colorRng.range(-0.1, 0.1);

  return new Color3(
    Math.max(0, Math.min(1, baseColor.r + variation)),
    Math.max(0, Math.min(1, baseColor.g + variation)),
    Math.max(0, Math.min(1, baseColor.b + variation))
  );
}

/**
 * Apply trample damage to a bush
 */
export function trampleBush(bush: CowBushComponent): boolean {
  bush.tramplesRemaining--;
  bush.isTrampled = bush.tramplesRemaining <= 0;

  // Reduce size slightly on each trample
  if (!bush.isTrampled) {
    const shrinkFactor = 0.9;
    bush.size.scaleInPlace(shrinkFactor);
    bush.bounceForce *= 0.95; // Slightly less bouncy
  }

  return bush.isTrampled;
}

export default {
  createCowVariantComponent,
  createCowPoopProjectileComponent,
  createCowBushComponent,
  isCowEntity,
  isBrownCow,
  isCowBush,
  isCowPoop,
  getBushLeafColor,
  trampleBush,
};
