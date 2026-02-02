import { AnimationGroup, Scene, AbstractMesh, Nullable } from "@babylonjs/core";
import { world } from "../world";
import { Entity, AnimationComponent } from "../components";

/**
 * Animation registry that maps entity IDs to their loaded AnimationGroups.
 * This is populated by the EntityRenderer when loading GLB models.
 */
export const animationRegistry = new Map<
  string,
  {
    groups: Map<string, AnimationGroup>;
    rootMesh: Nullable<AbstractMesh>;
    scene: Scene;
  }
>();

/**
 * Configuration for animation blending
 */
export interface AnimationBlendConfig {
  transitionDuration: number; // Duration in seconds for blending between animations
  velocityThreshold: number; // Velocity magnitude threshold for idle/walk switching
}

const DEFAULT_BLEND_CONFIG: AnimationBlendConfig = {
  transitionDuration: 0.2,
  velocityThreshold: 0.1,
};

/**
 * Registers animation groups for an entity.
 * Called by EntityRenderer after loading a GLB model with animations.
 */
export function registerEntityAnimations(
  entityId: string,
  animationGroups: AnimationGroup[],
  rootMesh: Nullable<AbstractMesh>,
  scene: Scene
): string[] {
  const groups = new Map<string, AnimationGroup>();
  const availableAnimations: string[] = [];

  for (const group of animationGroups) {
    // Normalize animation names (remove prefixes, lowercase)
    const normalizedName = normalizeAnimationName(group.name);
    groups.set(normalizedName, group);
    availableAnimations.push(normalizedName);

    // Stop all animations initially
    group.stop();
  }

  animationRegistry.set(entityId, { groups, rootMesh, scene });

  return availableAnimations;
}

/**
 * Unregisters animation groups for an entity.
 * Called when an entity is removed from the world.
 */
export function unregisterEntityAnimations(entityId: string): void {
  const entry = animationRegistry.get(entityId);
  if (entry) {
    // Stop and dispose all animation groups
    for (const group of entry.groups.values()) {
      group.stop();
    }
    animationRegistry.delete(entityId);
  }
}

/**
 * Normalizes animation names for consistent lookup.
 * Handles common naming conventions like "Armature|Idle", "mixamo.com|Walk", etc.
 */
function normalizeAnimationName(name: string): string {
  // Remove common prefixes
  const stripped = name
    .replace(/^(Armature|mixamo\.com|Character)\|/i, "")
    .replace(/^(Anim_|Animation_)/i, "");

  // Lowercase for consistent matching
  return stripped.toLowerCase();
}

/**
 * Determines the appropriate animation based on entity velocity.
 * Uses X velocity for side-scroller movement: idle / walk / run.
 */
function determineAnimationFromVelocity(
  entity: Entity,
  config: AnimationBlendConfig
): string {
  if (!entity.velocity) {
    return "idle";
  }

  const speed = Math.abs(entity.velocity.x);

  if (speed > 5) {
    return "run";
  }
  if (speed > config.velocityThreshold) {
    return "walk";
  }

  return "idle";
}

/**
 * Plays an animation with optional blending from the current animation.
 */
function playAnimation(
  entityId: string,
  animationName: string,
  speed: number,
  loop: boolean,
  blendDuration: number
): boolean {
  const entry = animationRegistry.get(entityId);
  if (!entry) {
    return false;
  }

  const targetGroup = entry.groups.get(animationName);
  if (!targetGroup) {
    // Try to find a similar animation
    const similar = findSimilarAnimation(animationName, entry.groups);
    if (!similar) {
      console.warn(
        `Animation "${animationName}" not found for entity ${entityId}. Available: ${Array.from(entry.groups.keys()).join(", ")}`
      );
      return false;
    }
    return playAnimation(entityId, similar, speed, loop, blendDuration);
  }

  // Stop all other animations with blend-out
  for (const [name, group] of entry.groups) {
    if (name !== animationName && group.isPlaying) {
      if (blendDuration > 0) {
        // Blend out over transition duration
        blendOutAnimation(group, blendDuration, entry.scene);
      } else {
        group.stop();
      }
    }
  }

  // Configure and play the target animation
  targetGroup.speedRatio = speed;

  if (blendDuration > 0 && !targetGroup.isPlaying) {
    // Blend in the new animation
    blendInAnimation(targetGroup, blendDuration, loop, entry.scene);
  } else if (!targetGroup.isPlaying) {
    targetGroup.start(loop);
  }

  return true;
}

/**
 * Blends out an animation over the specified duration.
 */
function blendOutAnimation(
  group: AnimationGroup,
  duration: number,
  scene: Scene
): void {
  const startWeight = group.weight;
  const startTime = performance.now();
  const durationMs = duration * 1000;

  const observer = scene.onBeforeRenderObservable.add(() => {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / durationMs, 1);

    group.weight = startWeight * (1 - progress);

    if (progress >= 1) {
      group.stop();
      group.weight = 1; // Reset weight for next play
      scene.onBeforeRenderObservable.remove(observer);
    }
  });
}

/**
 * Blends in an animation over the specified duration.
 */
function blendInAnimation(
  group: AnimationGroup,
  duration: number,
  loop: boolean,
  scene: Scene
): void {
  group.weight = 0;
  group.start(loop);

  const startTime = performance.now();
  const durationMs = duration * 1000;

  const observer = scene.onBeforeRenderObservable.add(() => {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / durationMs, 1);

    group.weight = progress;

    if (progress >= 1) {
      scene.onBeforeRenderObservable.remove(observer);
    }
  });
}

/**
 * Finds a similar animation name using fuzzy matching.
 */
function findSimilarAnimation(
  target: string,
  groups: Map<string, AnimationGroup>
): string | null {
  const targetLower = target.toLowerCase();
  const keys = Array.from(groups.keys());

  // Exact match (case-insensitive)
  const exact = keys.find((k) => k.toLowerCase() === targetLower);
  if (exact) return exact;

  // Contains match
  const contains = keys.find(
    (k) =>
      k.toLowerCase().includes(targetLower) ||
      targetLower.includes(k.toLowerCase())
  );
  if (contains) return contains;

  // Common animation name mappings
  const mappings: Record<string, string[]> = {
    idle: ["idle", "stand", "rest", "breathe", "wait"],
    walk: ["walk", "run", "move", "locomotion", "forward"],
    run: ["run", "sprint", "fast_walk", "jog"],
    jump: ["jump", "leap", "hop"],
    attack: ["attack", "hit", "strike", "punch", "swing"],
    die: ["die", "death", "dead", "fall"],
  };

  const targetMappings = mappings[targetLower];
  if (targetMappings) {
    for (const mapping of targetMappings) {
      const found = keys.find((k) => k.toLowerCase().includes(mapping));
      if (found) return found;
    }
  }

  return null;
}

/**
 * Stops an animation for an entity.
 */
function stopAnimation(entityId: string, animationName?: string): void {
  const entry = animationRegistry.get(entityId);
  if (!entry) return;

  if (animationName) {
    const group = entry.groups.get(animationName);
    if (group) {
      group.stop();
    }
  } else {
    // Stop all animations
    for (const group of entry.groups.values()) {
      group.stop();
    }
  }
}

/**
 * Creates a default AnimationComponent with sensible defaults.
 */
export function createAnimationComponent(
  options: Partial<AnimationComponent> = {}
): AnimationComponent {
  return {
    currentAnimation: options.currentAnimation ?? "idle",
    animationSpeed: options.animationSpeed ?? 1.0,
    isPlaying: options.isPlaying ?? true,
    availableAnimations: options.availableAnimations ?? [],
    _lastAnimation: undefined,
    _blendWeight: 1,
    _transitionDuration: options._transitionDuration ?? DEFAULT_BLEND_CONFIG.transitionDuration,
  };
}

/**
 * AnimationSystem - ECS system that manages 3D model animations.
 *
 * This system:
 * 1. Queries entities with animation components
 * 2. Uses Babylon.js AnimationGroups API to play animations
 * 3. Switches between idle/walk based on entity velocity
 * 4. Supports animation blending for smooth transitions
 *
 * @param deltaTime - Time elapsed since last frame in seconds
 * @param config - Optional configuration for animation blending
 */
export function AnimationSystem(
  deltaTime: number,
  config: AnimationBlendConfig = DEFAULT_BLEND_CONFIG
): void {
  const entities = world.with("animation");

  for (const entity of entities) {
    const { animation } = entity;
    const entityId = entity.id;

    if (!entityId) continue;

    // Check if this entity has registered animations
    const hasRegisteredAnimations = animationRegistry.has(entityId);
    if (!hasRegisteredAnimations) continue;

    // Auto-determine animation based on velocity if entity has velocity component
    let targetAnimation = animation.currentAnimation;

    if (entity.velocity) {
      const autoAnimation = determineAnimationFromVelocity(entity, config);

      // Only auto-switch if the current animation is idle or walk
      const isLocomotionAnimation = ["idle", "walk", "run"].includes(
        animation.currentAnimation.toLowerCase()
      );
      if (isLocomotionAnimation) {
        targetAnimation = autoAnimation;
        animation.currentAnimation = targetAnimation;
      }
    }

    // Handle animation state changes
    if (animation.isPlaying) {
      // Check if animation changed
      if (targetAnimation !== animation._lastAnimation) {
        const transitionDuration =
          animation._transitionDuration ?? config.transitionDuration;

        const success = playAnimation(
          entityId,
          targetAnimation,
          animation.animationSpeed,
          true, // loop
          transitionDuration
        );

        // Only mark as last animation if playback actually succeeded.
        // Before the model loads, playAnimation fails because no animations
        // are registered yet — we must NOT mark it as played or the system
        // will never retry once the model finishes loading.
        if (success) {
          animation._lastAnimation = targetAnimation;
        }
      }
    } else {
      // Stop animations if not playing
      if (animation._lastAnimation) {
        stopAnimation(entityId);
        animation._lastAnimation = undefined;
      }
    }
  }
}

/**
 * Helper to manually trigger a specific animation on an entity.
 * Useful for one-shot animations like attacks, jumps, etc.
 */
export function triggerAnimation(
  entity: Entity,
  animationName: string,
  options: {
    speed?: number;
    loop?: boolean;
    blendDuration?: number;
    onComplete?: () => void;
  } = {}
): boolean {
  if (!entity.id || !entity.animation) return false;

  const entry = animationRegistry.get(entity.id);
  if (!entry) return false;

  const {
    speed = entity.animation.animationSpeed,
    loop = false,
    blendDuration = entity.animation._transitionDuration ?? 0.2,
    onComplete,
  } = options;

  // Update the animation component
  entity.animation.currentAnimation = animationName;

  const success = playAnimation(
    entity.id,
    animationName,
    speed,
    loop,
    blendDuration
  );

  if (success && onComplete && !loop) {
    // Set up completion callback
    const group = entry.groups.get(animationName);
    if (group) {
      const observer = group.onAnimationGroupEndObservable.addOnce(() => {
        onComplete();
      });
    }
  }

  return success;
}

/**
 * Gets the list of available animations for an entity.
 */
export function getAvailableAnimations(entityId: string): string[] {
  const entry = animationRegistry.get(entityId);
  if (!entry) return [];
  return Array.from(entry.groups.keys());
}

/**
 * Checks if an entity has a specific animation.
 */
export function hasAnimation(entityId: string, animationName: string): boolean {
  const entry = animationRegistry.get(entityId);
  if (!entry) return false;
  return (
    entry.groups.has(animationName) ||
    findSimilarAnimation(animationName, entry.groups) !== null
  );
}
