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

export interface TagComponent {
  type: "animal" | "player" | "powerup" | "platform";
  subtype?: AnimalType | "farmer" | PowerUpType;
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

// Union type of all possible components
export type Entity = {
  id?: string;
  position?: Vector3;
  velocity?: Vector3;
  scale?: Vector3;
  model?: string;
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
};
