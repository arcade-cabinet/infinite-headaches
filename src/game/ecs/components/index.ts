import { Vector3, Color3 } from "@babylonjs/core";
import { AnimalType, PowerUpType } from "../../config";

export interface PositionComponent {
  position: Vector3;
}

export interface VelocityComponent {
  velocity: Vector3;
}

export interface ScaleComponent {
  scale: Vector3;
}

export interface ModelComponent {
  model: string; // Path to GLTF/GLB
  skinTexture?: string; // Path to skin texture
  offset?: Vector3; // Visual offset
  rotation?: Vector3;
}

export interface ColorOverlayComponent {
  color: Color3;
  intensity: number;
}

export interface PhysicsComponent {
  mass: number;
  restitution: number; // Bounciness
  friction: number;
  isStatic?: boolean;
}

export type CharacterId = "farmer_john" | "farmer_mary" | "farmer_ben" | "farmhand_sue";

export interface TagComponent {
  type: "animal" | "player" | "powerup" | "platform";
  subtype?: AnimalType | CharacterId | PowerUpType;
}

export interface MergeableComponent {
  level: number;
  mergeRadius: number;
}

export interface TraitsComponent {
  name: string;
  positiveTraits: string[];
  negativeTraits: string[];
}

export interface InputControllableComponent {
  speed: number;
  smoothness: number;
}

export interface LifetimeComponent {
  createdAt: number;
  duration?: number; // ms
}

export interface WobbleComponent {
  offset: number;
  velocity: number;
  damping: number;
  springiness: number;
}

export interface AnimationComponent {
  currentAnimation: string;
  animationSpeed: number;
  isPlaying: boolean;
  availableAnimations: string[];
  // Internal state managed by AnimationSystem
  _lastAnimation?: string;
  _blendWeight?: number;
  _transitionDuration?: number;
}

// ============================================================
// NEW ECS COMPONENTS FOR PROPER ARCHITECTURE
// ============================================================

/**
 * FrozenComponent - Entity is frozen in ice
 */
export interface FrozenComponent {
  freezeTimer: number; // Time remaining frozen (ms)
  thawProgress: number; // 0-1, progress toward thawing
  crackStage: number; // Current crack stage (0 to max)
  maxCrackStages: number; // Total crack stages before shatter
  bobOffset: number; // Vertical bob animation offset
  bobTime: number; // Animation time accumulator
  iceRotation: number; // Rotation of ice block
  cracks: { x1: number; y1: number; x2: number; y2: number }[]; // Crack line positions
}

/**
 * GameProjectileComponent - Entity is a game-spawned projectile (fireball, corn, poop, etc.)
 * Note: Named differently from ProjectileComponent in animals/types.ts which is for animal abilities
 */
export interface GameProjectileComponent {
  type: "fireball" | "corn" | "poop";
  direction: Vector3; // Normalized direction vector
  speed: number; // Movement speed
  lifetime: number; // Remaining lifetime (ms)
  maxLifetime: number; // Max lifetime for effects
  size: number; // Collision/visual size
  rotation: number; // Visual rotation
  trailParticles: { x: number; y: number; size: number; life: number }[];
}

/**
 * BounceZoneComponent - Temporary zone that bounces entities
 */
export interface BounceZoneComponent {
  bounceForce: number; // Force applied to bouncing entities
  expiresAt: number; // Timestamp when zone expires
  radius: number; // Zone radius
  triggeredBy: string[]; // Entity IDs that have been bounced (prevent double-bounce)
}

/**
 * AbilityComponent - Entity has a special ability
 */
export interface AbilityComponent {
  abilityId: string; // Type of ability (fireball, freeze, shockwave, etc.)
  cooldownMs: number; // Total cooldown time
  lastUsed: number; // Timestamp of last use
  isActive: boolean; // Whether ability is currently active
  charges?: number; // Optional: number of charges remaining
  maxCharges?: number; // Optional: max charges
}

/**
 * StackableComponent - Entity can be stacked
 */
export interface StackableComponent {
  stackIndex: number; // Position in the stack (0 = base)
  stackOffset: number; // Horizontal offset from center
  landedAt: number; // Timestamp when landed
  parentEntityId?: string; // ID of entity below in stack
}

/**
 * FallingComponent - Entity is falling from the sky
 */
export interface FallingComponent {
  targetX: number; // Target X position (for AI tracking)
  targetY: number; // Target Y position (for AI tracking)
  behaviorType: "normal" | "seeker" | "evader" | "zigzag" | "swarm" | "dive" | "floater";
  spawnX: number; // Original spawn X position
  spawnTime: number; // Timestamp when spawned
}

/**
 * StackedComponent - Entity is currently in the stack
 */
export interface StackedComponent {
  stackIndex: number; // Position in the stack (0 = first on top of player)
  stackOffset: number; // Horizontal offset from stack center
  baseEntityId: string; // ID of the base player entity
}

/**
 * BankingComponent - Entity is being banked (flying to bank zone)
 */
export interface BankingComponent {
  targetX: number; // Bank target X
  targetY: number; // Bank target Y
  startedAt: number; // Timestamp when banking started
}

/**
 * ScatteringComponent - Entity is scattering after topple
 */
export interface ScatteringComponent {
  rotationVelocity: number; // Angular velocity
  startedAt: number; // Timestamp when scattering started
}

/**
 * PlayerComponent - Entity is the player-controlled base
 */
export interface PlayerComponent {
  characterId: CharacterId;
  isDragging: boolean;
  lastDragX: number;
  smoothedVelocity: number;
}

/**
 * BossComponent - Entity is a boss animal
 */
export interface BossComponent {
  bossType: "mega" | "shadow" | "golden";
  health: number;
  maxHealth: number;
  isPhasing: boolean; // Shadow boss phase ability
  hitFlashTime: number;
  pulsePhase: number;
  reward: number; // Points awarded on defeat
}

/**
 * MergedComponent - Entity is the result of merging multiple animals
 */
export interface MergedComponent {
  mergeLevel: number; // Number of animals merged
  mergeScale: number; // Visual scale multiplier
  originalTypes: string[]; // Types of merged animals
}

/**
 * EmotionComponent - Entity emotional state for visual feedback
 */
export interface EmotionComponent {
  isHeadache: boolean;
  isConfused: boolean;
  confusedTimer: number;
}

/**
 * SquishComponent - Entity squish animation state
 */
export interface SquishComponent {
  scaleX: number;
  scaleY: number;
  targetScaleX: number;
  targetScaleY: number;
  recoverySpeed: number;
}

// Union type of all possible components
export type Entity = {
  id?: string;
  position?: Vector3;
  velocity?: Vector3;
  scale?: Vector3;
  model?: string;
  skinTexture?: string; // Added for skin support
  modelOffset?: Vector3;
  modelRotation?: Vector3;
  colorOverlay?: ColorOverlayComponent;
  physics?: PhysicsComponent;
  tag?: TagComponent;
  mergeable?: MergeableComponent;
  traits?: TraitsComponent;
  input?: InputControllableComponent;
  lifetime?: LifetimeComponent;
  wobble?: WobbleComponent;
  animation?: AnimationComponent;
  // New ECS components
  frozen?: FrozenComponent;
  gameProjectile?: GameProjectileComponent; // Renamed to avoid conflict with animals/types.ts
  bounceZone?: BounceZoneComponent;
  ability?: AbilityComponent;
  stackable?: StackableComponent;
  falling?: FallingComponent;
  stacked?: StackedComponent;
  banking?: BankingComponent;
  scattering?: ScatteringComponent;
  player?: PlayerComponent;
  boss?: BossComponent;
  merged?: MergedComponent;
  emotion?: EmotionComponent;
  squish?: SquishComponent;
};
