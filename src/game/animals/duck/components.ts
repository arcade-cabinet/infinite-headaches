/**
 * Duck Variant ECS Components
 * Miniplex components for duck variant entities
 */

import type { DuckVariantId, DuckAbilityType } from "./config";

/**
 * Component marking an entity as a duck variant
 */
export interface DuckVariantComponent {
  /** Which duck variant this is */
  variantId: DuckVariantId;
  /** Whether this duck has been activated (poked) */
  activated: boolean;
  /** Time when duck was last activated */
  lastActivationTime: number;
}

/**
 * Component for duck ability state
 */
export interface DuckAbilityComponent {
  /** Ability type */
  abilityType: DuckAbilityType;
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
 * Component for Rubber Duck's squeak bounce effect
 */
export interface SqueakBounceComponent {
  /** Center X position of the bounce */
  centerX: number;
  /** Center Y position of the bounce */
  centerY: number;
  /** Current bounce phase (0-1) */
  bouncePhase: number;
  /** Boop radius for attracting falling animals */
  boopRadius: number;
  /** Time remaining for boop effect (ms) */
  boopTimeRemaining: number;
  /** Entities currently being booped */
  boopedEntityIds: string[];
  /** Whether squeak sound has played */
  squeakPlayed: boolean;
}

/**
 * Component for entities being booped toward the stack
 */
export interface BoopedComponent {
  /** Target X position to move toward */
  targetX: number;
  /** Boop force strength */
  boopStrength: number;
  /** Time remaining for boop effect (ms) */
  timeRemaining: number;
  /** Original velocity X before boop */
  originalVelocityX: number;
}

/**
 * Component for Diving Duck's dive and stabilize effect
 */
export interface DiveStabilizeComponent {
  /** Whether currently in dive phase */
  isDiving: boolean;
  /** Dive start Y position */
  startY: number;
  /** Dive target Y position (bottom of stack) */
  targetY: number;
  /** Current dive progress (0-1) */
  diveProgress: number;
  /** Whether dive has completed */
  diveComplete: boolean;
  /** Wobble reduction factor being applied */
  wobbleReductionFactor: number;
  /** Time remaining for stabilization (ms) */
  stabilizeDurationRemaining: number;
  /** Whether phasing through stack */
  isPhasing: boolean;
}

/**
 * Component for Mama Duck's duckling attraction
 */
export interface DucklingAttractionComponent {
  /** Center X position of mama duck */
  centerX: number;
  /** Center Y position of mama duck */
  centerY: number;
  /** Active attraction radius */
  activeRadius: number;
  /** Passive attraction radius (always on) */
  passiveRadius: number;
  /** Active attraction strength */
  activeStrength: number;
  /** Passive attraction strength */
  passiveStrength: number;
  /** Time remaining for active ability (ms) */
  activeTimeRemaining: number;
  /** Entities currently being attracted */
  attractedEntityIds: string[];
  /** Whether call animation is playing */
  isCallingAnimation: boolean;
}

/**
 * Component for entities being attracted to mama duck
 */
export interface AttractedToDuckComponent {
  /** Target X position (mama duck location) */
  targetX: number;
  /** Target Y position */
  targetY: number;
  /** Attraction strength */
  attractionStrength: number;
  /** Whether this is passive or active attraction */
  isPassiveAttraction: boolean;
  /** Mama duck entity ID */
  mamaDuckEntityId: string;
}

/**
 * Visual effect component for duck abilities
 */
export interface DuckAbilityVisualComponent {
  /** Effect type for rendering */
  effectType: "squeak_rings" | "dive_trail" | "call_notes" | "boop_arrow" | "attraction_line";
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
 * Particle configuration for duck effects
 */
export interface DuckParticleConfig {
  /** Particle type */
  type: "bubble" | "splash" | "note" | "heart" | "sparkle" | "ripple";
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
 * Component for duck-specific particle emitters
 */
export interface DuckParticleEmitterComponent {
  /** Particles to emit */
  particles: DuckParticleConfig[];
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
 * Extended Entity type with duck components
 */
export interface DuckEntity {
  id?: string;
  duckVariant?: DuckVariantComponent;
  duckAbility?: DuckAbilityComponent;
  squeakBounce?: SqueakBounceComponent;
  booped?: BoopedComponent;
  diveStabilize?: DiveStabilizeComponent;
  ducklingAttraction?: DucklingAttractionComponent;
  attractedToDuck?: AttractedToDuckComponent;
  duckAbilityVisual?: DuckAbilityVisualComponent;
  duckParticleEmitter?: DuckParticleEmitterComponent;
}

/**
 * Create a new duck variant component
 */
export function createDuckVariantComponent(variantId: DuckVariantId): DuckVariantComponent {
  return {
    variantId,
    activated: false,
    lastActivationTime: 0,
  };
}

/**
 * Create a duck ability component based on variant config
 */
export function createDuckAbilityComponent(
  abilityType: DuckAbilityType,
  cooldownMs: number
): DuckAbilityComponent {
  return {
    abilityType,
    cooldownRemaining: 0, // Ready to use initially
    isActive: false,
    activatedAt: 0,
    durationRemaining: 0,
  };
}

/**
 * Create a squeak bounce component
 */
export function createSqueakBounceComponent(
  centerX: number,
  centerY: number,
  boopRadius: number,
  boopDuration: number
): SqueakBounceComponent {
  return {
    centerX,
    centerY,
    bouncePhase: 0,
    boopRadius,
    boopTimeRemaining: boopDuration,
    boopedEntityIds: [],
    squeakPlayed: false,
  };
}

/**
 * Create a dive stabilize component
 */
export function createDiveStabilizeComponent(
  startY: number,
  targetY: number,
  wobbleReduction: number,
  stabilizeDuration: number
): DiveStabilizeComponent {
  return {
    isDiving: true,
    startY,
    targetY,
    diveProgress: 0,
    diveComplete: false,
    wobbleReductionFactor: wobbleReduction,
    stabilizeDurationRemaining: stabilizeDuration,
    isPhasing: true,
  };
}

/**
 * Create a duckling attraction component
 */
export function createDucklingAttractionComponent(
  centerX: number,
  centerY: number,
  activeRadius: number,
  passiveRadius: number,
  activeStrength: number,
  passiveStrength: number,
  activeDuration: number
): DucklingAttractionComponent {
  return {
    centerX,
    centerY,
    activeRadius,
    passiveRadius,
    activeStrength,
    passiveStrength,
    activeTimeRemaining: activeDuration,
    attractedEntityIds: [],
    isCallingAnimation: true,
  };
}
