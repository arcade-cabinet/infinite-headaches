/**
 * Sheep Variant ECS Components
 *
 * Defines component types for sheep-specific state and effects.
 */

import { Vector3, Color3 } from "@babylonjs/core";

/**
 * Electric Sheep specific state
 */
export interface ElectricSheepState {
  /** Is currently discharging electricity */
  isDischarging: boolean;
  /** Chain targets (entity IDs currently being stunned) */
  chainTargets: string[];
  /** Visual arc positions for rendering */
  arcPositions: Vector3[];
  /** Time since last spark particle */
  lastSparkTime: number;
  /** Accumulated charge (builds up over time) */
  chargeLevel: number;
}

/**
 * Rainbow Sheep specific state
 */
export interface RainbowSheepState {
  /** Current hue rotation (0-360) for color cycling */
  hueRotation: number;
  /** Animals currently affected by rainbow trail */
  trailedAnimals: Set<string>;
  /** Trail effect intensity */
  trailIntensity: number;
  /** Time since ability was activated */
  timeSinceActivation: number;
}

/**
 * Counting Sheep specific state
 */
export interface CountingSheepState {
  /** Is sleep effect currently active */
  sleepActive: boolean;
  /** Z particles floating around */
  zParticles: ZParticle[];
  /** Current sleep intensity (affects nearby animals passively) */
  sleepAura: number;
  /** Time until passive effect ticks */
  passiveTickTimer: number;
}

/**
 * Floating Z particle for counting sheep visual
 */
export interface ZParticle {
  position: Vector3;
  velocity: Vector3;
  size: number;
  opacity: number;
  rotation: number;
  lifetime: number;
}

/**
 * Stun effect applied to animals
 */
export interface StunEffect {
  /** Entity ID of stunned animal */
  targetId: string;
  /** Duration remaining */
  duration: number;
  /** Source of stun (for tracking chains) */
  sourceId: string;
  /** Is this part of a chain reaction */
  isChained: boolean;
  /** Chain depth (0 = direct hit) */
  chainDepth: number;
  /** Visual position for arc rendering */
  position: Vector3;
}

/**
 * Rainbow trail effect on an animal
 */
export interface RainbowTrailEffect {
  /** Entity ID of affected animal */
  targetId: string;
  /** Duration remaining */
  duration: number;
  /** Score multiplier bonus */
  scoreBonus: number;
  /** Trail color positions */
  trailPositions: Vector3[];
  /** Trail colors (cycling rainbow) */
  trailColors: Color3[];
}

/**
 * Global sleep effect state
 */
export interface SleepWaveEffect {
  /** Is currently active */
  active: boolean;
  /** Duration remaining */
  duration: number;
  /** Speed multiplier to apply */
  speedMultiplier: number;
  /** Visual wave position (expanding circle) */
  waveRadius: number;
  /** Wave opacity */
  waveOpacity: number;
}

/**
 * Sheep variant component - extends base animal component
 */
export interface SheepVariantComponent {
  /** Which variant type */
  variantType: "electric" | "rainbow" | "counting";
  /** Variant-specific state */
  state: ElectricSheepState | RainbowSheepState | CountingSheepState;
}

// ============================================================================
// COMPONENT FACTORIES
// ============================================================================

/**
 * Create initial Electric Sheep state
 */
export function createElectricSheepState(): ElectricSheepState {
  return {
    isDischarging: false,
    chainTargets: [],
    arcPositions: [],
    lastSparkTime: 0,
    chargeLevel: 0,
  };
}

/**
 * Create initial Rainbow Sheep state
 */
export function createRainbowSheepState(): RainbowSheepState {
  return {
    hueRotation: 0,
    trailedAnimals: new Set(),
    trailIntensity: 0,
    timeSinceActivation: 0,
  };
}

/**
 * Create initial Counting Sheep state
 */
export function createCountingSheepState(): CountingSheepState {
  return {
    sleepActive: false,
    zParticles: [],
    sleepAura: 0,
    passiveTickTimer: 0,
  };
}

/**
 * Create a Z particle for counting sheep
 */
export function createZParticle(origin: Vector3, rng: () => number): ZParticle {
  return {
    position: origin.clone(),
    velocity: new Vector3(
      (rng() - 0.5) * 0.5,
      0.5 + rng() * 0.5, // Float upward
      (rng() - 0.5) * 0.2
    ),
    size: 8 + rng() * 8,
    opacity: 0.8 + rng() * 0.2,
    rotation: rng() * Math.PI * 2,
    lifetime: 2000 + rng() * 1000,
  };
}

/**
 * Create stun effect
 */
export function createStunEffect(
  targetId: string,
  sourceId: string,
  position: Vector3,
  duration: number,
  isChained: boolean = false,
  chainDepth: number = 0
): StunEffect {
  return {
    targetId,
    duration,
    sourceId,
    isChained,
    chainDepth,
    position: position.clone(),
  };
}

/**
 * Create rainbow trail effect
 */
export function createRainbowTrailEffect(
  targetId: string,
  duration: number,
  scoreBonus: number
): RainbowTrailEffect {
  return {
    targetId,
    duration,
    scoreBonus,
    trailPositions: [],
    trailColors: [
      new Color3(1, 0, 0),       // Red
      new Color3(1, 0.5, 0),     // Orange
      new Color3(1, 1, 0),       // Yellow
      new Color3(0, 1, 0),       // Green
      new Color3(0, 0, 1),       // Blue
      new Color3(0.5, 0, 0.5),   // Indigo
      new Color3(0.9, 0.5, 0.9), // Violet
    ],
  };
}

/**
 * Create sleep wave effect
 */
export function createSleepWaveEffect(
  duration: number,
  speedMultiplier: number
): SleepWaveEffect {
  return {
    active: true,
    duration,
    speedMultiplier,
    waveRadius: 0,
    waveOpacity: 1,
  };
}
