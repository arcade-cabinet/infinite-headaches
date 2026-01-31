/**
 * Pig Variant ECS Components
 * Miniplex components for pig variant entities
 */

import type { PigVariantId, PigAbilityType } from "./config";

/**
 * Component marking an entity as a pig variant
 */
export interface PigVariantComponent {
  /** Which pig variant this is */
  variantId: PigVariantId;
  /** Whether this pig has been activated (poked) */
  activated: boolean;
  /** Time when pig was last activated */
  lastActivationTime: number;
}

/**
 * Component for pig ability state
 */
export interface PigAbilityComponent {
  /** Ability type */
  abilityType: PigAbilityType;
  /** Current cooldown remaining (ms) */
  cooldownRemaining: number;
  /** Whether ability is currently active */
  isActive: boolean;
  /** Time when ability was activated */
  activatedAt: number;
  /** Duration remaining for active ability (ms) */
  durationRemaining: number;
}

/**
 * Component for Mud Pig's sticky zone effect
 */
export interface MudStickyZoneComponent {
  /** Center X position of mud zone */
  centerX: number;
  /** Center Y position of mud zone */
  centerY: number;
  /** Radius of the sticky zone */
  radius: number;
  /** Time remaining before zone disappears (ms) */
  timeRemaining: number;
  /** Whether zone is active */
  isActive: boolean;
  /** Entities currently stuck in this zone */
  stuckEntityIds: string[];
}

/**
 * Component for entities stuck in mud
 */
export interface MudStuckComponent {
  /** Time remaining stuck (ms) */
  stuckTimeRemaining: number;
  /** Original velocity before getting stuck */
  originalVelocityY: number;
  /** Zone entity ID that caused the stick */
  zoneEntityId: string;
}

/**
 * Component for Truffle Pig's radar effect
 */
export interface TruffleRadarComponent {
  /** Center X position of radar */
  centerX: number;
  /** Center Y position of radar */
  centerY: number;
  /** Current radar radius (animated) */
  currentRadius: number;
  /** Maximum radar radius */
  maxRadius: number;
  /** Time remaining for radar (ms) */
  timeRemaining: number;
  /** Pulse animation phase */
  pulsePhase: number;
  /** Power-ups revealed by this radar */
  revealedPowerUpIds: string[];
}

/**
 * Component for revealed power-ups (shown before they spawn)
 */
export interface RevealedPowerUpComponent {
  /** Type of power-up that will spawn */
  powerUpType: string;
  /** Spawn position X */
  spawnX: number;
  /** Spawn position Y (off-screen) */
  spawnY: number;
  /** Time until actual spawn (ms) */
  timeUntilSpawn: number;
  /** Radar entity that revealed this */
  radarEntityId: string;
  /** Visual opacity for preview */
  previewOpacity: number;
}

/**
 * Component for Flying Pig's float and stabilize effect
 */
export interface FloatStabilizeComponent {
  /** Whether currently floating upward */
  isFloating: boolean;
  /** Target Y position for float */
  floatTargetY: number;
  /** Original Y position before float */
  originalY: number;
  /** Float animation progress (0-1) */
  floatProgress: number;
  /** Wobble reduction factor being applied */
  wobbleReductionFactor: number;
  /** Time remaining for stabilization effect (ms) */
  stabilizeDurationRemaining: number;
}

/**
 * Component for stack-wide wobble reduction buff
 */
export interface WobbleReductionBuffComponent {
  /** Reduction factor (0.3 = 30% reduction) */
  reductionFactor: number;
  /** Time remaining (ms) */
  timeRemaining: number;
  /** Source entity ID (the flying pig) */
  sourceEntityId: string;
}

/**
 * Visual effect component for pig abilities
 */
export interface PigAbilityVisualComponent {
  /** Effect type for rendering */
  effectType: "mud_splatter" | "truffle_radar" | "float_sparkles" | "wing_flap";
  /** Position X */
  x: number;
  /** Position Y */
  y: number;
  /** Effect scale */
  scale: number;
  /** Effect rotation */
  rotation: number;
  /** Effect opacity */
  opacity: number;
  /** Time remaining for effect (ms) */
  timeRemaining: number;
  /** Custom effect parameters */
  params: Record<string, number | string>;
}

/**
 * Particle configuration for pig effects
 */
export interface PigParticleConfig {
  /** Particle type */
  type: "mud_drop" | "truffle_sparkle" | "feather" | "sparkle";
  /** Start position */
  startX: number;
  startY: number;
  /** Velocity */
  velocityX: number;
  velocityY: number;
  /** Lifetime (ms) */
  lifetime: number;
  /** Color */
  color: string;
  /** Size */
  size: number;
  /** Gravity applied */
  gravity: number;
  /** Rotation speed */
  rotationSpeed: number;
}

/**
 * Component for pig-specific particle emitters
 */
export interface PigParticleEmitterComponent {
  /** Particles to emit */
  particles: PigParticleConfig[];
  /** Emitter position X */
  x: number;
  /** Emitter position Y */
  y: number;
  /** Whether emitter is active */
  isActive: boolean;
  /** Emission rate (particles per second) */
  emissionRate: number;
  /** Time since last emission */
  timeSinceEmission: number;
}

/**
 * Extended Entity type with pig components
 * Use this when querying for pig-specific entities
 */
export interface PigEntity {
  id?: string;
  pigVariant?: PigVariantComponent;
  pigAbility?: PigAbilityComponent;
  mudStickyZone?: MudStickyZoneComponent;
  mudStuck?: MudStuckComponent;
  truffleRadar?: TruffleRadarComponent;
  revealedPowerUp?: RevealedPowerUpComponent;
  floatStabilize?: FloatStabilizeComponent;
  wobbleReductionBuff?: WobbleReductionBuffComponent;
  pigAbilityVisual?: PigAbilityVisualComponent;
  pigParticleEmitter?: PigParticleEmitterComponent;
}

/**
 * Create a new pig variant component
 */
export function createPigVariantComponent(variantId: PigVariantId): PigVariantComponent {
  return {
    variantId,
    activated: false,
    lastActivationTime: 0,
  };
}

/**
 * Create a pig ability component based on variant config
 */
export function createPigAbilityComponent(
  abilityType: PigAbilityType,
  cooldownMs: number
): PigAbilityComponent {
  return {
    abilityType,
    cooldownRemaining: 0, // Ready to use initially
    isActive: false,
    activatedAt: 0,
    durationRemaining: 0,
  };
}

/**
 * Create a mud sticky zone component
 */
export function createMudStickyZoneComponent(
  centerX: number,
  centerY: number,
  radius: number,
  duration: number
): MudStickyZoneComponent {
  return {
    centerX,
    centerY,
    radius,
    timeRemaining: duration,
    isActive: true,
    stuckEntityIds: [],
  };
}

/**
 * Create a truffle radar component
 */
export function createTruffleRadarComponent(
  centerX: number,
  centerY: number,
  maxRadius: number,
  duration: number
): TruffleRadarComponent {
  return {
    centerX,
    centerY,
    currentRadius: 0,
    maxRadius,
    timeRemaining: duration,
    pulsePhase: 0,
    revealedPowerUpIds: [],
  };
}

/**
 * Create a float stabilize component
 */
export function createFloatStabilizeComponent(
  originalY: number,
  floatHeight: number,
  wobbleReduction: number,
  stabilizeDuration: number
): FloatStabilizeComponent {
  return {
    isFloating: true,
    floatTargetY: originalY - floatHeight,
    originalY,
    floatProgress: 0,
    wobbleReductionFactor: wobbleReduction,
    stabilizeDurationRemaining: stabilizeDuration,
  };
}
