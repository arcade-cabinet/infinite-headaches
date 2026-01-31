/**
 * Highland Cow Variant
 *
 * A shaggy Scottish Highland cow with long reddish-brown hair covering
 * its eyes and iconic long horns. Extra stable due to its low center
 * of gravity and sturdy build.
 *
 * When poked, shakes its shaggy hair creating a wind gust that pushes
 * all falling animals slightly toward the center of the screen.
 *
 * Visual: Shaggy reddish-brown coat, long horns, hair over eyes
 * Passive: Extra stable on the stack
 * Ability: Wind gust - pushes animals to center (4s cooldown)
 *
 * Gameplay Notes:
 * - Wind gust is brief but useful for herding animals
 * - Very stable on the stack (helps prevent toppling)
 * - Heavier than normal cows
 * - Short cooldown makes it frequently useful
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

export const HIGHLAND_COW_ID = "highland_cow";

/** Wind gust configuration */
export const WIND_GUST_CONFIG = {
  /** Radius of effect in world units */
  radius: 4.0,
  /** Duration of the gust in milliseconds */
  duration: 1500,
  /** Push force strength */
  pushStrength: 3.0,
  /** How much to push toward center vs just generally inward */
  centerBias: 0.7,
  /** Maximum affected height above the cow */
  maxHeight: 10.0,
};

/** Hair shake animation config */
export const HAIR_SHAKE_CONFIG = {
  /** Duration of shake animation */
  shakeDuration: 500,
  /** Intensity of shake */
  shakeIntensity: 0.3,
  /** Number of hair strand particles to spawn */
  particleCount: 15,
};

/** Visual configuration */
export const HIGHLAND_COW_VISUALS = {
  coatColor: new Color3(0.6, 0.35, 0.2), // Reddish-brown
  hairColor: new Color3(0.55, 0.3, 0.15), // Slightly darker
  hornColor: new Color3(0.9, 0.85, 0.75), // Bone/ivory
  windColor: new Color3(0.8, 0.85, 0.9), // Light blue-gray for wind
};

/** Ability configuration */
export const HIGHLAND_COW_ABILITY = {
  id: "hair_shake",
  name: "Hair Shake",
  description: "Shakes shaggy hair creating wind that pushes animals toward center",
  trigger: "poke" as const,
  cooldownMs: 4000,
  effectType: "aoe" as const,
  aoe: {
    radius: WIND_GUST_CONFIG.radius * 100, // Convert to pixels for UI
    duration: WIND_GUST_CONFIG.duration,
    persistent: false, // Instant effect that fades
    strength: WIND_GUST_CONFIG.pushStrength,
    effectId: "wind_gust",
    colors: {
      primary: "#A1887F",
      secondary: "#D7CCC8",
      glow: "#BCAAA4",
    },
  },
  soundEffect: "whoosh",
  animation: "shake",
};

/** Full variant configuration */
export const HIGHLAND_COW_CONFIG: AnimalVariantConfig = {
  id: HIGHLAND_COW_ID,
  name: "Highland Cow",
  baseAnimalId: "cow",
  variantType: "highland",
  spawnWeight: 0.03,
  minLevel: 5,
  visuals: {
    colorTint: HIGHLAND_COW_VISUALS.coatColor,
    emissionColor: undefined,
    emissionIntensity: 0,
    scaleModifier: new Vector3(1.1, 0.95, 1.15), // Wider, slightly shorter
    particleEffect: "hair_strands",
    materialOverride: "shaggy_coat",
  },
  modifiers: {
    weightMultiplier: 1.3, // Heavy
    scoreMultiplier: 1.25,
    fallSpeedMultiplier: 0.9, // Falls slower
    stabilityMultiplier: 1.4, // Very stable!
    bounceMultiplier: 0.7, // Doesn't bounce much
    knockbackResistance: 0.4,
  },
  ability: HIGHLAND_COW_ABILITY,
  tags: ["highland", "wind", "push", "stable", "shaggy"],
};

// ============================================================================
// WIND GUST ENTITY
// ============================================================================

export interface WindGustComponent {
  /** Time remaining in ms */
  duration: number;
  /** Maximum duration */
  maxDuration: number;
  /** Push force strength */
  strength: number;
  /** Center position to push toward */
  targetCenter: Vector3;
  /** Origin of the gust */
  origin: Vector3;
  /** Radius of effect */
  radius: number;
  /** Maximum height */
  maxHeight: number;
  /** Visual intensity (fades over time) */
  intensity: number;
  /** Wind line particles for visualization */
  windLines: WindLine[];
  /** Source cow ID */
  sourceCowId: string;
}

export interface WindLine {
  start: Vector3;
  end: Vector3;
  progress: number; // 0-1 animation progress
  opacity: number;
  width: number;
}

export interface HighlandCowEntity extends AnimalEntity {
  windGust?: WindGustComponent;
  /** Is currently shaking hair (animation state) */
  isShaking?: boolean;
  /** Shake progress (0-1) */
  shakeProgress?: number;
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/** Active wind gusts in the world */
const activeWindGusts: Map<string, HighlandCowEntity> = new Map();

/**
 * Create Highland Cow variant component
 */
export function createHighlandCowVariantComponent(): AnimalEntity["animalVariant"] {
  return createAnimalVariantComponent(HIGHLAND_COW_ID, "cow", {
    gustsCreated: 0,
    lastShakeTime: 0,
    hairLength: 1.0, // For visual variation
  });
}

/**
 * Create a wind gust entity
 */
function createWindGustEntity(
  cowEntity: HighlandCowEntity,
  screenCenterX: number,
  seed: string
): HighlandCowEntity {
  const cowPos = cowEntity.position || new Vector3(0, 0, 0);
  const rng = createSeededRandom(seed);

  // Target center is the screen center at the same depth
  const targetCenter = new Vector3(screenCenterX, cowPos.y + 2, cowPos.z);

  // Generate wind line particles
  const windLines: WindLine[] = [];
  for (let i = 0; i < 20; i++) {
    const angle = rng.random() * Math.PI * 2;
    const dist = rng.range(0.5, WIND_GUST_CONFIG.radius);
    const height = rng.range(0, WIND_GUST_CONFIG.maxHeight);

    const start = new Vector3(
      cowPos.x + Math.cos(angle) * dist,
      cowPos.y + height,
      cowPos.z + Math.sin(angle) * dist
    );

    // End point is closer to center
    const toCenter = targetCenter.subtract(start).normalize();
    const pushDist = rng.range(0.5, 1.5);

    windLines.push({
      start,
      end: start.add(toCenter.scale(pushDist)),
      progress: rng.random(),
      opacity: rng.range(0.3, 0.7),
      width: rng.range(0.02, 0.05),
    });
  }

  const gustEntity: HighlandCowEntity = {
    id: `wind_gust_${seed}`,
    position: cowPos.clone(),
    scale: new Vector3(
      WIND_GUST_CONFIG.radius * 2,
      WIND_GUST_CONFIG.maxHeight,
      WIND_GUST_CONFIG.radius * 2
    ),
    tag: { type: "powerup" }, // Non-colliding marker
    windGust: {
      duration: WIND_GUST_CONFIG.duration,
      maxDuration: WIND_GUST_CONFIG.duration,
      strength: WIND_GUST_CONFIG.pushStrength,
      targetCenter,
      origin: cowPos.clone(),
      radius: WIND_GUST_CONFIG.radius,
      maxHeight: WIND_GUST_CONFIG.maxHeight,
      intensity: 1.0,
      windLines,
      sourceCowId: cowEntity.id!,
    },
  };

  return gustEntity;
}

// ============================================================================
// ABILITY HANDLING
// ============================================================================

/**
 * Handle poke for Highland Cow - creates wind gust
 */
export function handleHighlandCowPoke(
  entity: HighlandCowEntity,
  screenCenterX: number = 0
): PokeResult {
  const { canTrigger, wobbleForce } = handleBasePoke(entity, HIGHLAND_COW_CONFIG);

  if (!canTrigger) {
    return { poked: true, wobbleForce };
  }

  const variant = entity.animalVariant!;
  const seed = `wind_${entity.id}_${Date.now()}_${variant.abilityUseCount}`;

  // Start hair shake animation
  entity.isShaking = true;
  entity.shakeProgress = 0;

  // Create the wind gust
  const gustEntity = createWindGustEntity(entity, screenCenterX, seed);
  world.add(gustEntity);
  activeWindGusts.set(gustEntity.id!, gustEntity);

  // Update cow state
  variant.variantState.gustsCreated =
    ((variant.variantState.gustsCreated as number) || 0) + 1;
  variant.variantState.lastShakeTime = Date.now();

  return {
    poked: true,
    ability: "hair_shake",
    wobbleForce: wobbleForce * 0.7, // Less wobble (stable cow)
    data: {
      gustId: gustEntity.id,
      origin: entity.position?.clone(),
      targetCenter: gustEntity.windGust?.targetCenter.clone(),
      duration: WIND_GUST_CONFIG.duration,
    },
  };
}

// ============================================================================
// SYSTEM
// ============================================================================

/**
 * Wind Gust System - updates gusts and applies push to falling animals
 */
export function WindGustSystem(
  deltaTime: number,
  fallingAnimals: { id: string; position: Vector3; velocity: Vector3 }[],
  screenCenterX: number
): void {
  // Update active wind gusts
  for (const [gustId, gustEntity] of activeWindGusts) {
    const gust = gustEntity.windGust;
    if (!gust) continue;

    // Update duration and intensity
    gust.duration -= deltaTime;
    gust.intensity = Math.max(0, gust.duration / gust.maxDuration);

    // Update wind line animations
    for (const line of gust.windLines) {
      line.progress += deltaTime * 0.002;
      if (line.progress > 1) {
        line.progress = 0; // Loop the animation
      }
      line.opacity = gust.intensity * 0.5;
    }

    // Check for expiration
    if (gust.duration <= 0) {
      activeWindGusts.delete(gustId);
      if (world.has(gustEntity as Entity)) {
        world.remove(gustEntity as Entity);
      }
      continue;
    }

    // Apply wind push to falling animals
    for (const animal of fallingAnimals) {
      // Check if animal is in range
      const toAnimal = animal.position.subtract(gust.origin);
      const horizontalDist = Math.sqrt(
        toAnimal.x * toAnimal.x + toAnimal.z * toAnimal.z
      );
      const verticalDist = toAnimal.y;

      if (
        horizontalDist < gust.radius &&
        verticalDist > 0 &&
        verticalDist < gust.maxHeight
      ) {
        // Calculate push direction toward screen center
        const toCenter = new Vector3(
          screenCenterX - animal.position.x,
          0,
          0 // Only push horizontally toward center X
        );

        if (toCenter.length() > 0.1) {
          toCenter.normalize();

          // Apply push force (stronger closer to the cow, weaker at edges)
          const distanceFactor = 1 - horizontalDist / gust.radius;
          const timeFactor = gust.intensity; // Stronger at start
          const pushForce =
            gust.strength * distanceFactor * timeFactor * WIND_GUST_CONFIG.centerBias;

          animal.velocity.x += toCenter.x * pushForce * (deltaTime / 1000);
          animal.velocity.z += toCenter.z * pushForce * (deltaTime / 1000);

          // Also add slight upward lift (wind effect)
          animal.velocity.y -= 0.5 * timeFactor * (deltaTime / 1000);
        }
      }
    }
  }

  // Update highland cow shake animations
  const entities = world.with("position");
  for (const entity of entities) {
    const highland = entity as HighlandCowEntity;
    if (highland.isShaking && highland.shakeProgress !== undefined) {
      highland.shakeProgress += deltaTime / HAIR_SHAKE_CONFIG.shakeDuration;
      if (highland.shakeProgress >= 1) {
        highland.isShaking = false;
        highland.shakeProgress = 0;
      }
    }
  }
}

/**
 * Calculate wind push at a specific position
 */
export function getWindPushAtPosition(
  position: Vector3,
  screenCenterX: number
): Vector3 {
  const totalPush = new Vector3(0, 0, 0);

  for (const [_, gustEntity] of activeWindGusts) {
    const gust = gustEntity.windGust;
    if (!gust) continue;

    const toPosition = position.subtract(gust.origin);
    const horizontalDist = Math.sqrt(
      toPosition.x * toPosition.x + toPosition.z * toPosition.z
    );
    const verticalDist = toPosition.y;

    if (
      horizontalDist < gust.radius &&
      verticalDist > 0 &&
      verticalDist < gust.maxHeight
    ) {
      const toCenter = new Vector3(screenCenterX - position.x, 0, 0);
      if (toCenter.length() > 0.1) {
        toCenter.normalize();

        const distanceFactor = 1 - horizontalDist / gust.radius;
        const timeFactor = gust.intensity;
        const pushForce =
          gust.strength * distanceFactor * timeFactor * WIND_GUST_CONFIG.centerBias;

        totalPush.addInPlace(toCenter.scale(pushForce));
      }
    }
  }

  return totalPush;
}

/**
 * Check if wind is active at a position
 */
export function isInWindZone(position: Vector3): boolean {
  for (const [_, gustEntity] of activeWindGusts) {
    const gust = gustEntity.windGust;
    if (!gust) continue;

    const toPosition = position.subtract(gust.origin);
    const horizontalDist = Math.sqrt(
      toPosition.x * toPosition.x + toPosition.z * toPosition.z
    );
    const verticalDist = toPosition.y;

    if (
      horizontalDist < gust.radius &&
      verticalDist > 0 &&
      verticalDist < gust.maxHeight
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Get all active wind gusts for rendering
 */
export function getActiveWindGusts(): HighlandCowEntity[] {
  return Array.from(activeWindGusts.values());
}

/**
 * Clear all wind gusts (on game reset)
 */
export function clearWindGusts(): void {
  for (const [_, gustEntity] of activeWindGusts) {
    if (world.has(gustEntity as Entity)) {
      world.remove(gustEntity as Entity);
    }
  }
  activeWindGusts.clear();
}

/**
 * Get shake visual offset for a highland cow
 */
export function getShakeOffset(entity: HighlandCowEntity): Vector3 {
  if (!entity.isShaking || entity.shakeProgress === undefined) {
    return new Vector3(0, 0, 0);
  }

  const t = entity.shakeProgress;
  // Damped oscillation
  const decay = Math.exp(-t * 5);
  const oscillation = Math.sin(t * Math.PI * 8);

  return new Vector3(
    oscillation * decay * HAIR_SHAKE_CONFIG.shakeIntensity,
    0,
    oscillation * decay * HAIR_SHAKE_CONFIG.shakeIntensity * 0.5
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export const HighlandCowVariant = {
  config: HIGHLAND_COW_CONFIG,
  ability: HIGHLAND_COW_ABILITY,
  windConfig: WIND_GUST_CONFIG,
  hairShakeConfig: HAIR_SHAKE_CONFIG,
  visuals: HIGHLAND_COW_VISUALS,
  createVariantComponent: createHighlandCowVariantComponent,
  handlePoke: handleHighlandCowPoke,
  system: WindGustSystem,
  getWindPush: getWindPushAtPosition,
  isInZone: isInWindZone,
  getActiveGusts: getActiveWindGusts,
  clearGusts: clearWindGusts,
  getShakeOffset,
};

export default HighlandCowVariant;
