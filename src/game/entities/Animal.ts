/**
 * Animal Entity
 * Represents an Animal in the game - can be falling, stacked, or the base
 */

import { ANIMAL_TYPES, type AnimalType, GAME_CONFIG } from "../config";
import { Entity } from "../ecs/components";

const { animal, physics, effects } = GAME_CONFIG;

export type AnimalState = "falling" | "stacked" | "base" | "banking" | "merged";

export type { AnimalType };

export class Animal {
  x: number;
  y: number;
  width: number;
  height: number;
  state: AnimalState;
  type: AnimalType;

  // Physics
  velocityY: number = 0;
  velocityX: number = 0;
  wobbleOffset: number = 0;
  wobbleVelocity: number = 0;

  // Visual state
  scaleX: number = 1;
  scaleY: number = 1;
  rotation: number = 0;

  // Stacking
  stackIndex: number = 0;
  stackOffset: number = 0;

  // Merged animal properties
  mergeLevel: number = 1; // How many animals merged into this one
  mergeScale: number = 1; // Visual scale from merging

  // Emotion state
  isHeadache: boolean = false;
  isConfused: boolean = false;
  confusedTimer: number = 0;
  lastPokeTime: number = 0;

  // Ability state
  abilityCooldown: number = 0;
  abilityActive: boolean = false;

  // For falling animals
  spawnX: number = 0;

  // AI behavior (for smart animals) - YUKA-controlled
  behaviorType: "normal" | "seeker" | "evader" | "zigzag" | "swarm" | "dive" | "floater" = "normal";
  targetX: number = 0;
  targetY: number = 0;

  ecsEntity?: Entity;

  constructor(x: number, y: number, state: AnimalState = "falling", type: AnimalType = "cow") {
    this.x = x;
    this.y = y;
    this.width = animal.width;
    this.height = animal.height;
    this.state = state;
    this.type = type;
    this.spawnX = x;
  }

  /**
   * Get effective dimensions (accounting for merge scale)
   */
  get effectiveWidth(): number {
    return this.width * this.mergeScale;
  }

  get effectiveHeight(): number {
    return this.height * this.mergeScale;
  }

  /**
   * Update animal physics and state
   */
  update(deltaTime: number = 16): void {
    // Animate squish recovery
    this.scaleX += (1 - this.scaleX) * 0.12;
    this.scaleY += (1 - this.scaleY) * 0.12;

    // Handle confusion timer
    if (this.isConfused) {
      this.confusedTimer -= deltaTime;
      if (this.confusedTimer <= 0) {
        this.isConfused = false;
      }
    }

    // Update ability cooldown
    if (this.abilityCooldown > 0) {
      this.abilityCooldown -= deltaTime;
    }

    // Update based on state
    switch (this.state) {
      case "falling":
        this.updateFalling();
        break;
      case "stacked":
      case "merged":
        this.updateStacked();
        break;
      case "banking":
        // Banking animation handled externally
        break;
      case "base":
        this.updateBase();
        break;
    }
  }

  private updateFalling(): void {
    // Apply gravity
    this.velocityY = Math.min(this.velocityY + physics.gravity, physics.maxFallSpeed);
    this.y += this.velocityY;

    // Horizontal drift
    this.x += this.velocityX;

    // Gentle rotation while falling
    this.rotation = Math.sin(Date.now() / 200) * 0.1;
  }

  private updateStacked(): void {
    // Apply wobble physics with merge stability bonus
    const stabilityBonus = 1 - (this.mergeLevel - 1) * physics.mergedStabilityBonus;
    const effectiveSpringiness = physics.wobbleSpringiness * stabilityBonus;

    this.wobbleVelocity += -this.wobbleOffset * effectiveSpringiness;
    this.wobbleVelocity *= physics.wobbleDamping;
    this.wobbleOffset += this.wobbleVelocity;

    // Check if wobbling enough for headache
    this.isHeadache = Math.abs(this.wobbleOffset) > effects.headacheThreshold * 50;

    // Rotation follows wobble
    this.rotation = this.wobbleOffset * 0.02;
  }

  private updateBase(): void {
    // Base animal wobbles less but still responds
    this.wobbleVelocity += -this.wobbleOffset * physics.wobbleSpringiness * 2;
    this.wobbleVelocity *= physics.wobbleDamping;
    this.wobbleOffset += this.wobbleVelocity;
    this.rotation = this.wobbleOffset * 0.01;
  }

  /**
   * Apply wobble force
   */
  applyWobble(force: number, propagationFactor: number = 1): void {
    // Merged animals are more stable
    const stabilityFactor = 1 / Math.sqrt(this.mergeLevel);
    this.wobbleVelocity += force * propagationFactor * stabilityFactor;
  }

  /**
   * Check if ability can be used
   */
  canUseAbility(): boolean {
    const typeConfig = ANIMAL_TYPES[this.type];
    if (!typeConfig.ability) return false;
    
    if (this.abilityCooldown > 0) return false;
    if (this.state !== "stacked" && this.state !== "merged" && this.state !== "base") return false;
    return true;
  }

  /**
   * Use the animal's special ability
   * Returns ability type or null if can't use
   */
  useAbility(): string | null {
    if (!this.canUseAbility()) return null;

    const typeConfig = ANIMAL_TYPES[this.type];
    if (!typeConfig.ability) return null;

    this.abilityCooldown = typeConfig.abilityCooldown || 3000;
    return typeConfig.ability;
  }

  /**
   * Handle being poked - can trigger abilities for special animals
   */
  poke(): { poked: boolean; ability: string | null } {
    const now = Date.now();
    if (now - this.lastPokeTime < GAME_CONFIG.poke.cooldown) {
      return { poked: false, ability: null };
    }

    this.lastPokeTime = now;

    // Check for ability use
    const ability = this.useAbility();

    // Apply wobble
    this.applyWobble(GAME_CONFIG.poke.wobbleAmount * (Math.random() > 0.5 ? 1 : -1));

    // Chance to trigger confusion (only for normal animals if configured)
    if (!ability && Math.random() < GAME_CONFIG.poke.confusionChance) {
      this.isConfused = true;
      this.confusedTimer = 1500;
    }

    // Squish reaction
    this.scaleX = 1.15;
    this.scaleY = 0.85;

    return { poked: true, ability };
  }

  /**
   * Apply squish effect on landing
   */
  squish(): void {
    this.scaleY = 1 - effects.squishFactor;
    this.scaleX = 1 + effects.squishFactor;
  }

  /**
   * Land on the stack
   */
  land(targetY: number, stackIndex: number, offsetX: number = 0): void {
    this.y = targetY;
    this.state = "stacked";
    this.stackIndex = stackIndex;
    this.stackOffset = offsetX;
    this.velocityY = 0;
    this.velocityX = 0;
    this.squish();
  }

  /**
   * Merge multiple animals into this one (Rare Candy effect)
   */
  merge(animalCount: number): void {
    this.mergeLevel = animalCount;
    this.mergeScale = Math.min(
      animal.maxMergeScale,
      animal.mergeScaleBase + (animalCount - 1) * animal.mergeScalePerDuck
    );
    this.state = "merged";

    // Visual feedback
    this.scaleX = 1.5;
    this.scaleY = 0.7;
  }

  /**
   * Get the actual render position (with wobble applied)
   */
  getRenderX(): number {
    return this.x + this.wobbleOffset + this.stackOffset;
  }

  /**
   * Check if a point is inside this animal
   */
  containsPoint(px: number, py: number): boolean {
    const rx = this.getRenderX();
    const hw = this.effectiveWidth / 2;
    const hh = this.effectiveHeight / 2;
    return px >= rx - hw && px <= rx + hw && py >= this.y - hh && py <= this.y + hh;
  }
}

/**
 * Get a random animal type based on spawn weights and level
 */
export function getRandomAnimalType(level: number): AnimalType {
  const rand = Math.random();
  let cumulative = 0;

  // Increase special animal chance with level
  const levelBonus = level * GAME_CONFIG.difficulty.specialDuckLevelBonus;

  // Calculate total weight to normalize
  let totalWeight = 0;
  for (const [_, config] of Object.entries(ANIMAL_TYPES)) {
    let weight = config.spawnWeight;
    if (config.ability) {
      weight += levelBonus;
    }
    totalWeight += weight;
  }

  const normalizedRand = rand * totalWeight;

  for (const [type, config] of Object.entries(ANIMAL_TYPES)) {
    let weight = config.spawnWeight;
    if (config.ability) {
      weight += levelBonus;
    }
    cumulative += weight;
    if (normalizedRand < cumulative) {
      return type as AnimalType;
    }
  }

  return "cow";
}