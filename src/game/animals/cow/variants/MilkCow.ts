/**
 * Milk Cow Variant
 *
 * A classic black and white Holstein cow with visible udders.
 * When poked, sprays milk upward creating a temporary "slippery zone"
 * in the air. Animals passing through the zone fall 30% faster but
 * in a straighter line (more predictable trajectories).
 *
 * Visual: White with black spots, prominent udders
 * Ability: Milk spray - creates slippery zone (5s cooldown)
 *
 * Gameplay Notes:
 * - Slippery zone lasts 4 seconds
 * - Useful for controlling where animals fall
 * - Faster fall = harder to catch but more predictable
 * - Strategic use can funnel animals to desired positions
 */

import { Vector3, Color3 } from "@babylonjs/core";
import { world } from "../../../ecs/world";
import type { Entity } from "../../../ecs/components";
import type { AnimalEntity, PokeResult, AnimalVariantConfig, AoEConfig } from "../../types";
import { createSeededRandom } from "../../types";
import { createAnimalVariantComponent, handleBasePoke } from "../../base/AnimalBase";

// ============================================================================
// CONFIGURATION
// ============================================================================

export const MILK_COW_ID = "milk_cow";

/** Slippery zone configuration */
export const MILK_ZONE_CONFIG = {
  /** Radius of the slippery zone in world units */
  radius: 1.5,
  /** Duration in milliseconds */
  duration: 4000,
  /** Speed multiplier (1.3 = 30% faster) */
  speedMultiplier: 1.3,
  /** Drift reduction (0 = no horizontal drift allowed, 1 = normal drift) */
  driftReduction: 0.2,
  /** Height above the cow where zone forms */
  spawnHeight: 3.0,
  /** Vertical extent of the zone */
  zoneHeight: 4.0,
};

/** Visual configuration */
export const MILK_COW_VISUALS = {
  colorTint: new Color3(1.0, 1.0, 1.0), // White base
  spotColor: new Color3(0.1, 0.1, 0.1), // Black spots
  milkColor: new Color3(1.0, 1.0, 1.0), // Pure white milk
  zoneColor: new Color3(0.9, 0.95, 1.0), // Slightly blue-white
  zoneGlow: new Color3(0.8, 0.9, 1.0),
};

/** Ability configuration */
export const MILK_COW_ABILITY = {
  id: "milk_spray",
  name: "Milk Spray",
  description: "Sprays milk creating a slippery zone - animals fall faster but straighter",
  trigger: "poke" as const,
  cooldownMs: 5000,
  effectType: "aoe" as const,
  aoe: {
    radius: MILK_ZONE_CONFIG.radius * 100, // Convert to pixels for UI
    duration: MILK_ZONE_CONFIG.duration,
    persistent: true,
    strength: MILK_ZONE_CONFIG.speedMultiplier,
    effectId: "milk_zone",
    colors: {
      primary: "#FFFFFF",
      secondary: "#E3F2FD",
      glow: "#BBDEFB",
    },
  },
  soundEffect: "spray",
  animation: "spray",
};

/** Full variant configuration */
export const MILK_COW_CONFIG: AnimalVariantConfig = {
  id: MILK_COW_ID,
  name: "Milk Cow",
  baseAnimalId: "cow",
  variantType: "milk",
  spawnWeight: 0.035,
  minLevel: 4,
  visuals: {
    colorTint: MILK_COW_VISUALS.colorTint,
    emissionColor: MILK_COW_VISUALS.zoneGlow,
    emissionIntensity: 0.1,
    particleEffect: "milk_drops",
    materialOverride: "holstein_pattern",
  },
  modifiers: {
    weightMultiplier: 1.1, // Slightly heavier (full of milk)
    scoreMultiplier: 1.15,
    fallSpeedMultiplier: 0.95, // Falls slightly slower
    stabilityMultiplier: 1.1,
    bounceMultiplier: 0.9,
  },
  ability: MILK_COW_ABILITY,
  tags: ["milk", "zone", "speed", "control"],
};

// ============================================================================
// SLIPPERY ZONE ENTITY
// ============================================================================

export interface MilkZoneComponent {
  /** Time remaining in ms */
  duration: number;
  /** Maximum duration for progress calculation */
  maxDuration: number;
  /** Speed multiplier to apply */
  speedMultiplier: number;
  /** How much to reduce horizontal drift (0-1) */
  driftReduction: number;
  /** Visual opacity */
  opacity: number;
  /** Zone center position */
  centerY: number;
  /** Vertical extent */
  height: number;
  /** Source cow ID */
  sourceCowId: string;
  /** Milk drop particles */
  particles: MilkParticle[];
}

export interface MilkParticle {
  position: Vector3;
  velocity: Vector3;
  size: number;
  opacity: number;
  lifetime: number;
}

export interface MilkCowEntity extends AnimalEntity {
  milkZone?: MilkZoneComponent;
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/** Active milk zones in the world */
const activeMilkZones: Map<string, MilkCowEntity> = new Map();

/**
 * Create Milk Cow variant component
 */
export function createMilkCowVariantComponent(): AnimalEntity["animalVariant"] {
  return createAnimalVariantComponent(MILK_COW_ID, "cow", {
    zonesCreated: 0,
    lastSprayTime: 0,
    milkLevel: 1.0, // Full of milk
  });
}

/**
 * Create a milk zone entity
 */
function createMilkZoneEntity(
  cowEntity: MilkCowEntity,
  seed: string
): MilkCowEntity {
  const cowPos = cowEntity.position || new Vector3(0, 0, 0);
  const rng = createSeededRandom(seed);

  // Position zone above the cow
  const zonePos = new Vector3(
    cowPos.x,
    cowPos.y + MILK_ZONE_CONFIG.spawnHeight,
    cowPos.z
  );

  // Generate initial milk particles
  const particles: MilkParticle[] = [];
  for (let i = 0; i < 20; i++) {
    particles.push({
      position: new Vector3(
        zonePos.x + rng.range(-MILK_ZONE_CONFIG.radius, MILK_ZONE_CONFIG.radius),
        zonePos.y + rng.range(0, MILK_ZONE_CONFIG.zoneHeight),
        zonePos.z + rng.range(-MILK_ZONE_CONFIG.radius, MILK_ZONE_CONFIG.radius)
      ),
      velocity: new Vector3(
        rng.range(-0.1, 0.1),
        rng.range(-0.5, 0),
        rng.range(-0.1, 0.1)
      ),
      size: rng.range(0.05, 0.15),
      opacity: rng.range(0.5, 1.0),
      lifetime: rng.range(500, 2000),
    });
  }

  const zoneEntity: MilkCowEntity = {
    id: `milk_zone_${seed}`,
    position: zonePos,
    scale: new Vector3(
      MILK_ZONE_CONFIG.radius * 2,
      MILK_ZONE_CONFIG.zoneHeight,
      MILK_ZONE_CONFIG.radius * 2
    ),
    tag: { type: "powerup" }, // Non-colliding marker
    milkZone: {
      duration: MILK_ZONE_CONFIG.duration,
      maxDuration: MILK_ZONE_CONFIG.duration,
      speedMultiplier: MILK_ZONE_CONFIG.speedMultiplier,
      driftReduction: MILK_ZONE_CONFIG.driftReduction,
      opacity: 1.0,
      centerY: zonePos.y,
      height: MILK_ZONE_CONFIG.zoneHeight,
      sourceCowId: cowEntity.id!,
      particles,
    },
  };

  return zoneEntity;
}

// ============================================================================
// ABILITY HANDLING
// ============================================================================

/**
 * Handle poke for Milk Cow - creates slippery zone
 */
export function handleMilkCowPoke(entity: MilkCowEntity): PokeResult {
  const { canTrigger, wobbleForce } = handleBasePoke(entity, MILK_COW_CONFIG);

  if (!canTrigger) {
    return { poked: true, wobbleForce };
  }

  const variant = entity.animalVariant!;
  const seed = `milk_${entity.id}_${Date.now()}_${variant.abilityUseCount}`;

  // Create the milk zone
  const zoneEntity = createMilkZoneEntity(entity, seed);
  world.add(zoneEntity);
  activeMilkZones.set(zoneEntity.id!, zoneEntity);

  // Update cow state
  variant.variantState.zonesCreated =
    ((variant.variantState.zonesCreated as number) || 0) + 1;
  variant.variantState.lastSprayTime = Date.now();
  variant.variantState.milkLevel = Math.max(
    0,
    ((variant.variantState.milkLevel as number) || 1) - 0.2
  );

  return {
    poked: true,
    ability: "milk_spray",
    wobbleForce,
    data: {
      zoneId: zoneEntity.id,
      position: zoneEntity.position?.clone(),
      duration: MILK_ZONE_CONFIG.duration,
    },
  };
}

// ============================================================================
// SYSTEM
// ============================================================================

/**
 * Milk Zone System - updates zones and applies effects to falling animals
 */
export function MilkZoneSystem(
  deltaTime: number,
  fallingAnimals: { id: string; position: Vector3; velocity: Vector3 }[]
): void {
  // Update active milk zones
  for (const [zoneId, zoneEntity] of activeMilkZones) {
    const zone = zoneEntity.milkZone;
    if (!zone) continue;

    // Update duration
    zone.duration -= deltaTime;
    zone.opacity = Math.min(1, zone.duration / 1000); // Fade out in last second

    // Update particles
    for (let i = zone.particles.length - 1; i >= 0; i--) {
      const particle = zone.particles[i];
      particle.lifetime -= deltaTime;
      particle.position.addInPlace(particle.velocity.scale(deltaTime * 0.001));
      particle.opacity *= 0.995;

      if (particle.lifetime <= 0 || particle.opacity < 0.1) {
        zone.particles.splice(i, 1);
      }
    }

    // Check for zone expiration
    if (zone.duration <= 0) {
      activeMilkZones.delete(zoneId);
      if (world.has(zoneEntity as Entity)) {
        world.remove(zoneEntity as Entity);
      }
      continue;
    }

    // Apply effects to falling animals in the zone
    const zonePos = zoneEntity.position!;
    const zoneRadius = MILK_ZONE_CONFIG.radius;
    const zoneBottom = zone.centerY - zone.height * 0.5;
    const zoneTop = zone.centerY + zone.height * 0.5;

    for (const animal of fallingAnimals) {
      // Check if animal is in zone
      const dx = animal.position.x - zonePos.x;
      const dz = animal.position.z - zonePos.z;
      const horizontalDist = Math.sqrt(dx * dx + dz * dz);

      if (
        horizontalDist < zoneRadius &&
        animal.position.y >= zoneBottom &&
        animal.position.y <= zoneTop
      ) {
        // Apply slippery effect:
        // 1. Increase fall speed
        if (animal.velocity.y > 0) {
          animal.velocity.y *= zone.speedMultiplier;
        }

        // 2. Reduce horizontal drift (straighten trajectory)
        animal.velocity.x *= 1 - zone.driftReduction;
        animal.velocity.z *= 1 - zone.driftReduction;
      }
    }
  }
}

/**
 * Check if position is inside any milk zone
 */
export function isInMilkZone(position: Vector3): boolean {
  for (const [_, zoneEntity] of activeMilkZones) {
    const zone = zoneEntity.milkZone;
    const zonePos = zoneEntity.position;
    if (!zone || !zonePos) continue;

    const dx = position.x - zonePos.x;
    const dz = position.z - zonePos.z;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);

    const zoneBottom = zone.centerY - zone.height * 0.5;
    const zoneTop = zone.centerY + zone.height * 0.5;

    if (
      horizontalDist < MILK_ZONE_CONFIG.radius &&
      position.y >= zoneBottom &&
      position.y <= zoneTop
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Get the speed multiplier at a position (for animals in milk zones)
 */
export function getMilkZoneSpeedMultiplier(position: Vector3): number {
  for (const [_, zoneEntity] of activeMilkZones) {
    const zone = zoneEntity.milkZone;
    const zonePos = zoneEntity.position;
    if (!zone || !zonePos) continue;

    const dx = position.x - zonePos.x;
    const dz = position.z - zonePos.z;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);

    const zoneBottom = zone.centerY - zone.height * 0.5;
    const zoneTop = zone.centerY + zone.height * 0.5;

    if (
      horizontalDist < MILK_ZONE_CONFIG.radius &&
      position.y >= zoneBottom &&
      position.y <= zoneTop
    ) {
      return zone.speedMultiplier;
    }
  }
  return 1.0;
}

/**
 * Get all active milk zones for rendering
 */
export function getActiveMilkZones(): MilkCowEntity[] {
  return Array.from(activeMilkZones.values());
}

/**
 * Clear all milk zones (on game reset)
 */
export function clearMilkZones(): void {
  for (const [_, zoneEntity] of activeMilkZones) {
    if (world.has(zoneEntity as Entity)) {
      world.remove(zoneEntity as Entity);
    }
  }
  activeMilkZones.clear();
}

// ============================================================================
// EXPORTS
// ============================================================================

export const MilkCowVariant = {
  config: MILK_COW_CONFIG,
  ability: MILK_COW_ABILITY,
  zoneConfig: MILK_ZONE_CONFIG,
  visuals: MILK_COW_VISUALS,
  createVariantComponent: createMilkCowVariantComponent,
  handlePoke: handleMilkCowPoke,
  system: MilkZoneSystem,
  isInZone: isInMilkZone,
  getSpeedMultiplier: getMilkZoneSpeedMultiplier,
  getActiveZones: getActiveMilkZones,
  clearZones: clearMilkZones,
};

export default MilkCowVariant;
