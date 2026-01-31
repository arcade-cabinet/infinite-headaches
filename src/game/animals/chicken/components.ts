/**
 * Chicken Variant ECS Components
 *
 * Defines ECS components specific to chicken variants and their abilities.
 * These components are added to entities to enable chicken-specific behaviors.
 */

import { Vector3 } from "@babylonjs/core";
import type { ChickenVariant, ChickenAbilityEffect } from "./config";

// ============================================================================
// CORE CHICKEN COMPONENTS
// ============================================================================

/**
 * Identifies an entity as a chicken variant
 */
export interface ChickenVariantComponent {
  /** The specific variant type */
  variant: ChickenVariant;
  /** ID referencing the variant config */
  configId: string;
}

/**
 * Tracks chicken ability state
 */
export interface ChickenAbilityComponent {
  /** Time remaining on cooldown (ms) */
  cooldownRemaining: number;
  /** Total cooldown duration (ms) */
  cooldownDuration: number;
  /** Whether ability is ready to use */
  isReady: boolean;
  /** Whether ability is currently active/animating */
  isActivating: boolean;
  /** Timestamp when ability was last used */
  lastUsedAt: number;
}

// ============================================================================
// CORN CHICKEN COMPONENTS
// ============================================================================

/**
 * Component for corn kernel projectiles
 */
export interface CornKernelComponent {
  /** Velocity of the kernel */
  velocity: Vector3;
  /** Target entity ID (falling animal to pull) */
  targetEntityId: string | null;
  /** Whether the kernel has attached to a target */
  isAttached: boolean;
  /** Remaining lifetime (ms) */
  lifetime: number;
  /** Magnet pull strength */
  magnetStrength: number;
  /** Duration of magnet effect once attached (ms) */
  magnetDuration: number;
  /** Time remaining on magnet effect (ms) */
  magnetTimeRemaining: number;
}

/**
 * Component for entities being pulled by corn magnet
 */
export interface CornMagnetTargetComponent {
  /** Entity ID of the kernel pulling this target */
  kernelEntityId: string;
  /** Original fall speed before being affected */
  originalFallSpeed: number;
  /** Target position to pull toward (stack top) */
  pullTarget: Vector3;
  /** Remaining time for magnet effect (ms) */
  effectTimeRemaining: number;
}

// ============================================================================
// EGG CHICKEN COMPONENTS
// ============================================================================

/**
 * Component for eggs laid by egg chickens
 */
export interface EggComponent {
  /** Parent chicken entity ID */
  parentChickenId: string;
  /** Rolling velocity */
  rollVelocity: number;
  /** Time until hatching (ms) */
  hatchTimeRemaining: number;
  /** Whether the egg is hatching (playing animation) */
  isHatching: boolean;
  /** Whether the egg has hatched */
  hasHatched: boolean;
  /** Which direction the egg rolled off */
  rollDirection: 1 | -1;
}

/**
 * Component for baby chicks hatched from eggs
 */
export interface BabyChickComponent {
  /** Parent egg entity ID */
  parentEggId: string;
  /** Remaining lifetime (ms) - disappears after catching or timeout */
  lifetime: number;
  /** Target falling animal entity ID */
  targetEntityId: string | null;
  /** Movement speed */
  moveSpeed: number;
  /** Catch radius */
  catchRadius: number;
  /** Whether the chick has caught an animal */
  hasCaught: boolean;
  /** Animation state */
  animationState: "idle" | "chasing" | "catching" | "celebrating";
}

// ============================================================================
// ROOSTER COMPONENTS
// ============================================================================

/**
 * Component for rooster crow ability state
 */
export interface RoosterCrowComponent {
  /** Whether currently crowing */
  isCrowing: boolean;
  /** Animation progress (0-1) */
  crowProgress: number;
  /** Sound wave entities spawned */
  soundWaveIds: string[];
}

/**
 * Component for visual sound wave effects from rooster crow
 */
export interface SoundWaveComponent {
  /** Origin position of the wave */
  origin: Vector3;
  /** Current radius of the wave */
  currentRadius: number;
  /** Maximum radius before despawning */
  maxRadius: number;
  /** Expansion speed (units per second) */
  expandSpeed: number;
  /** Opacity (fades as it expands) */
  opacity: number;
  /** Wave index for staggered spawning */
  waveIndex: number;
}

/**
 * Component for entities affected by rooster crow slow
 */
export interface CrowSlowedComponent {
  /** Original fall speed multiplier */
  originalSpeedMultiplier: number;
  /** Current slow factor being applied */
  slowFactor: number;
  /** Time remaining on slow effect (ms) */
  slowTimeRemaining: number;
  /** ID of the rooster that caused the slow */
  sourceRoosterId: string;
}

// ============================================================================
// SHARED EFFECT COMPONENTS
// ============================================================================

/**
 * Visual effect component for ability activation
 */
export interface ChickenAbilityEffectComponent {
  /** Type of effect being displayed */
  effectType: ChickenAbilityEffect;
  /** Effect lifetime remaining (ms) */
  lifetime: number;
  /** Effect intensity/scale */
  intensity: number;
  /** Effect color (hex string) */
  color: string;
}

/**
 * Particle emitter for chicken abilities
 */
export interface ChickenParticleEmitterComponent {
  /** Particle type */
  particleType: "corn_burst" | "egg_shell" | "chick_sparkle" | "sound_ring";
  /** Emission rate (particles per second) */
  emissionRate: number;
  /** Particle lifetime (ms) */
  particleLifetime: number;
  /** Emission duration remaining (ms), -1 for infinite */
  emissionDuration: number;
  /** Base color for particles */
  baseColor: string;
}

// ============================================================================
// COMPOSITE ENTITY TYPE FOR CHICKEN VARIANTS
// ============================================================================

/**
 * Extended Entity type including chicken-specific components
 */
export interface ChickenEntity {
  // Standard entity fields
  id?: string;
  position?: Vector3;
  velocity?: Vector3;
  scale?: Vector3;
  model?: string;

  // Chicken-specific components
  chickenVariant?: ChickenVariantComponent;
  chickenAbility?: ChickenAbilityComponent;

  // Corn chicken
  cornKernel?: CornKernelComponent;
  cornMagnetTarget?: CornMagnetTargetComponent;

  // Egg chicken
  egg?: EggComponent;
  babyChick?: BabyChickComponent;

  // Rooster
  roosterCrow?: RoosterCrowComponent;
  soundWave?: SoundWaveComponent;
  crowSlowed?: CrowSlowedComponent;

  // Effects
  chickenAbilityEffect?: ChickenAbilityEffectComponent;
  chickenParticleEmitter?: ChickenParticleEmitterComponent;
}

// ============================================================================
// COMPONENT FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a ChickenVariantComponent
 */
export function createChickenVariantComponent(
  variant: ChickenVariant,
  configId: string
): ChickenVariantComponent {
  return { variant, configId };
}

/**
 * Create a ChickenAbilityComponent
 */
export function createChickenAbilityComponent(
  cooldownDuration: number
): ChickenAbilityComponent {
  return {
    cooldownRemaining: 0,
    cooldownDuration,
    isReady: true,
    isActivating: false,
    lastUsedAt: 0,
  };
}

/**
 * Create a CornKernelComponent
 */
export function createCornKernelComponent(
  velocity: Vector3,
  magnetStrength: number,
  magnetDuration: number,
  lifetime: number = 3000
): CornKernelComponent {
  return {
    velocity: velocity.clone(),
    targetEntityId: null,
    isAttached: false,
    lifetime,
    magnetStrength,
    magnetDuration,
    magnetTimeRemaining: 0,
  };
}

/**
 * Create an EggComponent
 */
export function createEggComponent(
  parentChickenId: string,
  hatchTime: number,
  rollVelocity: number,
  rollDirection: 1 | -1
): EggComponent {
  return {
    parentChickenId,
    rollVelocity,
    hatchTimeRemaining: hatchTime,
    isHatching: false,
    hasHatched: false,
    rollDirection,
  };
}

/**
 * Create a BabyChickComponent
 */
export function createBabyChickComponent(
  parentEggId: string,
  lifetime: number,
  moveSpeed: number,
  catchRadius: number
): BabyChickComponent {
  return {
    parentEggId,
    lifetime,
    targetEntityId: null,
    moveSpeed,
    catchRadius,
    hasCaught: false,
    animationState: "idle",
  };
}

/**
 * Create a SoundWaveComponent
 */
export function createSoundWaveComponent(
  origin: Vector3,
  maxRadius: number,
  expandSpeed: number,
  waveIndex: number
): SoundWaveComponent {
  return {
    origin: origin.clone(),
    currentRadius: 0,
    maxRadius,
    expandSpeed,
    opacity: 1,
    waveIndex,
  };
}

/**
 * Create a CrowSlowedComponent
 */
export function createCrowSlowedComponent(
  originalSpeedMultiplier: number,
  slowFactor: number,
  slowDuration: number,
  sourceRoosterId: string
): CrowSlowedComponent {
  return {
    originalSpeedMultiplier,
    slowFactor,
    slowTimeRemaining: slowDuration,
    sourceRoosterId,
  };
}
