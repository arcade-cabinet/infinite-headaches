/**
 * Game Engine
 * Core game logic with power-ups, special animals, and advanced physics
 */

import { applyDuckAI } from "../ai/DuckBehavior";
import { GameDirector, type GameState } from "../ai/GameDirector";
import { WobbleGovernor } from "../ai/WobbleGovernor";
import {
  createAutoPlayerIntegration,
  isAutoPlayerEnabled,
  type AutoPlayerIntegration,
  type AutoPlayerGameState,
} from "../ai/AutoPlayer";
import { feedback } from "@/platform";
import { ANIMAL_TYPES, GAME_CONFIG, POWER_UPS, type PowerUpType } from "../config";
import { Animal } from "../entities/Animal";
import { Fireball } from "../entities/Fireball";
import { FrozenDuck } from "../entities/FrozenAnimal";
import { Particle } from "../entities/Particle";
import { PowerUp } from "../entities/PowerUp";
import { drawBackground } from "../renderer/background";
import { world } from "../ecs/world";
import {
  createAnimal,
  createPlayer,
  createFallingAnimal,
  createFireballEntity,
  convertToStacked,
  convertToBanking,
  convertToScattering,
  freezeEntityArchetype,
} from "../ecs/archetypes";
import { Entity } from "../ecs/components";
import {
  // Systems
  runAllSystems,
  FreezeSystem,
  ProjectileSystem,
  AbilitySystem,
  StackingSystem,
  // Helpers
  getStackedEntitiesSorted,
  getStackHeight,
  getTopOfStack,
  getFallingEntities,
  getFrozenEntities,
  getActiveProjectiles,
  getAbilityStateForUI,
  propagateWobbleFromBase,
  scatterStack,
  squishEntity,
  spawnFireballsFrom,
  freezeEntity,
  thawEntity,
  // Types
  type TippingState,
} from "../ecs/systems";
import { Vector3 } from "@babylonjs/core";

const {
  collision,
  layout,
  physics,
  effects,
  scoring,
  spawning,
  banking,
  difficulty,
  lives: livesConfig,
  powerUps: powerUpConfig,
} = GAME_CONFIG;

// YUKA-style AI wobble tracking
interface AIWobbleState {
  activeThreats: number;
  accumulatedTension: number;
  lastTensionUpdate: number;
}

export interface GameCallbacks {
  onScoreChange: (score: number, multiplier: number, combo: number) => void;
  onStackChange: (height: number, canBank: boolean) => void;
  onLivesChange: (lives: number, maxLives: number) => void;
  onGameOver: (finalScore: number, bankedAnimals: number) => void;
  onPerfectCatch: (x: number, y: number) => void;
  onGoodCatch: (x: number, y: number) => void;
  onMiss: () => void;
  onBankComplete: (animalsBanked: number) => void;
  onLevelUp: (level: number) => void;
  onLifeEarned: () => void;
  onDangerState: (inDanger: boolean) => void;
  onStackTopple: () => void;
  onPowerUpCollected: (type: PowerUpType) => void;
  onMerge: (animalCount: number) => void;
  onFireballShot: () => void;
  onDuckFrozen: () => void; // Keeping event name generic for compatibility
  onAbilityStateChange?: (
    fireReady: number,
    iceReady: number,
    hasFire: boolean,
    hasIce: boolean
  ) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Game objects
  // TODO: LEGACY - basePlayer Animal class should be replaced with ECS entity
  private basePlayer: Animal | null = null;
  private selectedCharacterId: "farmer_john" | "farmer_mary" = "farmer_john";
  // TODO: LEGACY - these arrays should be replaced with ECS queries
  // Use world.with("stacked"), world.with("falling"), etc.
  private stackedAnimals: Animal[] = [];
  private fallingAnimals: Animal[] = [];
  private bankingAnimals: Animal[] = [];
  private scatteringAnimals: Animal[] = [];
  private particles: Particle[] = [];

  // TODO: LEGACY - PowerUp and Fireball classes should be ECS entities
  // PowerUps can remain as-is for now (simpler entity)
  // Fireballs should use ProjectileSystem
  private powerUps: PowerUp[] = [];
  private fireballs: Fireball[] = [];
  // TODO: LEGACY - FrozenDuck should use FreezeSystem
  private frozenAnimals: FrozenDuck[] = [];

  // ECS player entity reference
  private playerEntity: Entity | null = null;

  // Game state
  private score = 0;
  private level = 1;
  private lives = livesConfig.starting;
  private maxLives = livesConfig.max;
  private bankedAnimals = 0;
  private currentMultiplier = 1;
  private combo = 0;
  private lastCatchTime = 0;
  private perfectStreak = 0;
  private lastScoreForLifeBonus = 0;

  // Invincibility
  private invincibleUntil = 0;

  // Active power-up effects
  private magnetActive = false;
  private magnetUntil = 0;
  private xAttackActive = false;
  private xAttackUntil = 0;
  private xAttackMultiplier = 1;

  // Danger tracking
  private inDangerState = false;

  // Timing
  private lastSpawnTime = 0;
  private lastPowerUpCheck = 0;
  private spawnInterval = spawning.initialInterval;
  private animationId: number | null = null;
  private lastFrameTime = 0;

  // Input state
  private isDragging = false;
  private lastDragX = 0;
  private smoothedVelocity = 0;

  // Background
  private bgRotation = 0;
  private screenShake = 0;

  // YUKA-style AI wobble state (legacy tracking)
  private aiWobbleState: AIWobbleState = {
    activeThreats: 0,
    accumulatedTension: 0,
    lastTensionUpdate: 0,
  };

  // YUKA Wobble Governor - goal-driven AI controlling wobble
  private wobbleGovernor: WobbleGovernor;

  // YUKA Game Director - AI orchestrating spawning, difficulty, power-ups
  private gameDirector: GameDirector;

  // YUKA AutoPlayer - AI for automated playtesting (E2E tests)
  private autoPlayerIntegration: AutoPlayerIntegration | null = null;

  // Track recent misses for governor input
  private recentMisses: number = 0;
  private missDecayTimer: number = 0;

  // Performance tracking for director
  private recentCatches: number = 0;
  private recentPerfects: number = 0;
  private timeSinceLastPerfect: number = 10000;
  private timeSinceLastMiss: number = 10000;
  private timeSinceLastPowerUp: number = 10000;
  private gameStartTime: number = 0;

  // Callbacks
  private callbacks: GameCallbacks;

  // Bank animation
  private bankTargetX = 0;
  private bankTargetY = 0;

  isPlaying = false;
  isPaused = false;

  // ============================================================
  // ECS HELPER METHODS
  // These methods provide ECS-based queries as an alternative
  // to the legacy arrays. Use these during the migration.
  // ============================================================

  /**
   * Gets the count of falling entities from ECS
   */
  private getECSFallingCount(): number {
    return world.with("falling").size;
  }

  /**
   * Gets the count of stacked entities from ECS
   */
  private getECSStackHeight(): number {
    return world.with("stacked").size;
  }

  /**
   * Gets the count of frozen entities from ECS
   */
  private getECSFrozenCount(): number {
    return world.with("frozen").size;
  }

  /**
   * Gets the count of projectiles from ECS
   */
  private getECSProjectileCount(): number {
    return world.with("gameProjectile").size;
  }

  /**
   * Runs ECS systems for the current frame
   * This integrates with the legacy update loop
   */
  private runECSSystems(deltaTime: number): void {
    runAllSystems(
      deltaTime,
      this.playerEntity,
      this.canvas.width,
      this.canvas.height,
      {
        onTipping: (dangerLevel, _centerOfMass) => {
          if (dangerLevel >= physics.tipping.dangerThreshold) {
            this.screenShake = Math.max(this.screenShake, effects.dangerShake * dangerLevel);
            if (Math.random() < 0.1) {
              feedback.dangerPulse();
            }
          }
        },
        onTopple: () => {
          // Handled separately to sync with legacy logic
        },
        onDangerStateChange: (inDanger) => {
          if (this.inDangerState !== inDanger) {
            this.inDangerState = inDanger;
            this.callbacks.onDangerState(inDanger);
            if (inDanger) {
              feedback.warning();
            }
          }
        },
        onProjectileHit: (projectile, target) => {
          // Remove target from falling
          if (target.id) {
            world.remove(target);
          }
          // Score bonus
          this.score += Math.floor(scoring.fireKillBonus * this.currentMultiplier);
          this.callbacks.onScoreChange(this.score, this.currentMultiplier, this.combo);
          feedback.play("land");
        },
        onShatter: (_entity) => {
          // Play shatter sound effect
          feedback.play("land");
        },
        onThawComplete: (_entity) => {
          // Entity transitions back to falling automatically
        },
      }
    );
  }

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Failed to get canvas context");
    this.ctx = ctx;
    this.callbacks = callbacks;

    this.handleResize();
    window.addEventListener("resize", this.handleResize);
    this.setupInputHandlers();

    // Initialize YUKA Wobble Governor
    this.wobbleGovernor = new WobbleGovernor();

    // Initialize YUKA Game Director
    this.gameDirector = new GameDirector();

    // Initialize YUKA AutoPlayer for E2E testing
    this.autoPlayerIntegration = createAutoPlayerIntegration(() => this.bankStack());
  }

  private handleResize = (): void => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.bankTargetX = this.canvas.width - layout.bankWidth / 2;
    this.bankTargetY = this.canvas.height / 2;
  };

  private mapToWorld(x: number, y: number): Vector3 {
    // Map canvas coordinates to 3D world coordinates
    // Visible height at Z=0 with camera at Z=-10 is approx 10 units (FOV dependent)
    const visibleHeight = 10;
    const scale = visibleHeight / this.canvas.height;
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    return new Vector3(
        (x - centerX) * scale,
        -(y - centerY) * scale + 5, // Offset Y to match camera height
        0
    );
  }

  private setupInputHandlers(): void {
    this.canvas.addEventListener("mousedown", this.handlePointerDown);
    this.canvas.addEventListener("mousemove", this.handlePointerMove);
    this.canvas.addEventListener("mouseup", this.handlePointerUp);
    this.canvas.addEventListener("mouseleave", this.handlePointerUp);
    this.canvas.addEventListener("touchstart", this.handleTouchStart, { passive: false });
    this.canvas.addEventListener("touchmove", this.handleTouchMove, { passive: false });
    this.canvas.addEventListener("touchend", this.handleTouchEnd);
  }

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.handlePointerDown({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.handlePointerMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }
  };

  private handleTouchEnd = (): void => {
    this.handlePointerUp();
  };

  private handlePointerDown = (e: MouseEvent): void => {
    if (!this.isPlaying) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on the stack (for poking/abilities)
    const pokedAnimal = this.findAnimalAtPoint(x, y);
    if (pokedAnimal && pokedAnimal !== this.basePlayer) {
      const result = pokedAnimal.poke();
      if (result.poked) {
        this.propagateWobble(GAME_CONFIG.poke.wobbleAmount);

        // Handle special abilities
        if (result.ability === "fireball") {
          this.shootFireball(pokedAnimal);
        } else if (result.ability === "freeze") {
          this.activateFreeze(pokedAnimal);
        }

        feedback.play("drop");
      }
      return;
    }

    // Start dragging
    this.isDragging = true;
    this.lastDragX = x;
  };

  private handlePointerMove = (e: MouseEvent): void => {
    if (!this.isPlaying || !this.isDragging || !this.basePlayer) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const deltaX = x - this.lastDragX;
    this.lastDragX = x;

    this.smoothedVelocity = this.smoothedVelocity * 0.7 + deltaX * 0.3;

    const newX = Math.max(
      GAME_CONFIG.animal.width / 2 + 10,
      Math.min(
        this.canvas.width - GAME_CONFIG.animal.width / 2 - layout.bankWidth - 10,
        this.basePlayer.x + deltaX
      )
    );

    const actualDelta = newX - this.basePlayer.x;
    this.basePlayer.x = newX;

    if (Math.abs(actualDelta) > 0.5) {
      const wobbleForce = this.smoothedVelocity * physics.wobbleStrength;
      this.propagateWobble(wobbleForce);
    }
  };

  private handlePointerUp = (): void => {
    this.isDragging = false;
    this.smoothedVelocity = 0;
  };

  private findAnimalAtPoint(x: number, y: number): Animal | null {
    for (let i = this.stackedAnimals.length - 1; i >= 0; i--) {
      if (this.stackedAnimals[i].containsPoint(x, y)) {
        return this.stackedAnimals[i];
      }
    }
    if (this.basePlayer?.containsPoint(x, y)) {
      return this.basePlayer;
    }
    return null;
  }

  private propagateWobble(force: number): void {
    if (!this.basePlayer) return;

    this.basePlayer.applyWobble(force * 0.5);

    let propagatedForce = force;
    for (let i = 0; i < this.stackedAnimals.length; i++) {
      const heightFactor = 1 + i * 0.1;
      propagatedForce *= physics.stackStability;
      this.stackedAnimals[i].applyWobble(propagatedForce * heightFactor);
    }
  }

  private updateAIWobble(deltaTime: number): void {
    if (!this.basePlayer) {
      this.aiWobbleState.accumulatedTension = 0;
      return;
    }

    const now = performance.now();

    this.missDecayTimer += deltaTime;
    if (this.missDecayTimer > 3000) {
      this.recentMisses = Math.max(0, this.recentMisses - 1);
      this.missDecayTimer = 0;
    }

    const fallingAnimalData = this.fallingAnimals.map((animal) => ({
      behaviorType: animal.behaviorType,
      y: animal.y,
      targetY: this.basePlayer?.y ?? this.canvas.height * 0.8,
    }));

    this.wobbleGovernor.updateGameState(
      this.stackedAnimals.length,
      fallingAnimalData,
      this.recentMisses,
      this.level,
      this.inDangerState
    );

    this.wobbleGovernor.update(deltaTime / 1000);

    const governorWobble = this.wobbleGovernor.getWobbleForce();
    const pulseIntensity = this.wobbleGovernor.getPulseIntensity();

    this.aiWobbleState.accumulatedTension = this.wobbleGovernor.tension;
    this.aiWobbleState.activeThreats = fallingAnimalData.filter(
      (d) => d.behaviorType !== "normal" && d.behaviorType !== "floater"
    ).length;

    if (this.stackedAnimals.length > 0 && Math.abs(governorWobble) > 0.0001) {
      const oscillation = Math.sin(now * 0.006) * (1 + Math.sin(now * 0.017) * 0.4);
      const wobbleForce = governorWobble * oscillation;

      const startIndex = Math.max(0, this.stackedAnimals.length - 3);
      for (let i = startIndex; i < this.stackedAnimals.length; i++) {
        const heightFactor = (i - startIndex + 1) / 3;
        this.stackedAnimals[i].wobbleVelocity += wobbleForce * heightFactor;
      }

      if (pulseIntensity > 0.3) {
        const topAnimal = this.stackedAnimals[this.stackedAnimals.length - 1];
        topAnimal.wobbleVelocity += pulseIntensity * 0.02 * (Math.random() > 0.5 ? 1 : -1);
      }
    }
  }

  private shootFireball(animal: Animal): void {
    this.fireballs.push(new Fireball(animal.getRenderX(), animal.y, -1));
    this.fireballs.push(new Fireball(animal.getRenderX(), animal.y, 1));
    this.callbacks.onFireballShot();
    feedback.play("fireball");
  }

  private activateFreeze(animal: Animal): void {
    let nearestAnimal: Animal | null = null;
    let nearestDist = Infinity;

    for (const falling of this.fallingAnimals) {
      const dx = falling.x - animal.getRenderX();
      const dy = falling.y - animal.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < nearestDist && falling.y < animal.y) {
        nearestDist = dist;
        nearestAnimal = falling;
      }
    }

    if (nearestAnimal && nearestDist < this.canvas.height * 0.5) {
      const idx = this.fallingAnimals.indexOf(nearestAnimal);
      if (idx !== -1) {
        this.fallingAnimals.splice(idx, 1);
        
        // Cleanup ECS entity if moving to frozen
        if(nearestAnimal.ecsEntity) {
             world.remove(nearestAnimal.ecsEntity);
             nearestAnimal.ecsEntity = undefined;
        }

        this.frozenAnimals.push(
          new FrozenDuck(
            nearestAnimal as any, 
            3000 + Math.random() * 3000
          )
        );

        this.callbacks.onDuckFrozen();
        feedback.play("freeze");
      }
    }
  }

  private calculateTippingState(): {
    isTipping: boolean;
    dangerLevel: number;
    centerOfMass: number;
  } {
    if (this.stackedAnimals.length === 0) {
      return { isTipping: false, dangerLevel: 0, centerOfMass: 0 };
    }

    const { tipping } = physics;
    const stackHeight = this.stackedAnimals.length;

    let totalMass = 1;
    let weightedOffset = 0;

    for (let i = 0; i < stackHeight; i++) {
      const animal = this.stackedAnimals[i];
      const massFactor = animal.mergeLevel * (1 + i * tipping.massDistribution * 0.2);
      totalMass += massFactor;
      weightedOffset += (animal.wobbleOffset + animal.stackOffset) * massFactor;
    }

    const centerOfMass = weightedOffset / totalMass;

    const criticalAngle = Math.max(
      tipping.minCriticalAngle,
      tipping.criticalAngleBase - stackHeight * tipping.heightPenalty
    );

    const effectiveAngle = Math.abs(centerOfMass) / (GAME_CONFIG.animal.width * 0.5);
    const dangerLevel = effectiveAngle / criticalAngle;

    let maxIndividualDanger = 0;
    for (const animal of this.stackedAnimals) {
      const individualDanger = Math.abs(animal.wobbleOffset) / (GAME_CONFIG.animal.width * 0.6);
      maxIndividualDanger = Math.max(maxIndividualDanger, individualDanger);
    }

    const combinedDanger = Math.max(dangerLevel, maxIndividualDanger * 0.8);

    return {
      isTipping: combinedDanger >= 1,
      dangerLevel: Math.min(1, combinedDanger),
      centerOfMass,
    };
  }

  start(characterId: "farmer_john" | "farmer_mary" = "farmer_john"): void {
    feedback.init();
    this.selectedCharacterId = characterId;

    // Clear ECS world
    world.clear();

    this.score = 0;
    this.level = 1;
    this.lives = livesConfig.starting;
    this.maxLives = livesConfig.max;
    this.bankedAnimals = 0;
    this.currentMultiplier = 1;
    this.combo = 0;
    this.perfectStreak = 0;
    this.lastScoreForLifeBonus = 0;
    this.invincibleUntil = 0;
    this.magnetActive = false;
    this.magnetUntil = 0;
    this.xAttackActive = false;
    this.xAttackUntil = 0;
    this.xAttackMultiplier = 1;
    this.inDangerState = false;
    this.stackedAnimals = [];
    this.fallingAnimals = [];
    this.bankingAnimals = [];
    this.scatteringAnimals = [];
    this.particles = [];
    this.powerUps = [];
    this.fireballs = [];
    this.frozenAnimals = [];
    this.lastSpawnTime = 0;
    this.lastPowerUpCheck = 0;
    this.spawnInterval = spawning.initialInterval;
    this.screenShake = 0;
    this.aiWobbleState = {
      activeThreats: 0,
      accumulatedTension: 0,
      lastTensionUpdate: 0,
    };
    this.recentMisses = 0;
    this.missDecayTimer = 0;
    this.recentCatches = 0;
    this.recentPerfects = 0;
    this.timeSinceLastPerfect = 10000;
    this.timeSinceLastMiss = 10000;
    this.timeSinceLastPowerUp = 10000;
    this.gameStartTime = performance.now();

    this.wobbleGovernor = new WobbleGovernor();
    this.gameDirector = new GameDirector();

    this.isPlaying = true;

    const floorY = this.canvas.height * layout.floorY;
    this.basePlayer = new Animal(this.canvas.width / 2, floorY, "base", "farmer");

    // Create ECS entity for player and store reference
    const playerEcsEntity = createPlayer(this.selectedCharacterId || "farmer_john", this.mapToWorld(this.basePlayer.x, this.basePlayer.y));
    world.add(playerEcsEntity);
    this.basePlayer.ecsEntity = playerEcsEntity;
    this.playerEntity = playerEcsEntity;

    this.callbacks.onScoreChange(0, 1, 0);
    this.callbacks.onStackChange(0, false);
    this.callbacks.onLivesChange(this.lives, this.maxLives);

    feedback.startMusic();
    feedback.setIntensity(0);

    if (!this.animationId) {
      this.lastFrameTime = performance.now();
      this.loop();
    }
  }

  private loop = (): void => {
    if (!this.isPlaying) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    if (!this.isPaused) {
      this.update(deltaTime);
      this.render();
    }

    this.animationId = requestAnimationFrame(this.loop);
  };

  bankStack(): void {
    if (this.stackedAnimals.length < banking.minStackToBank) return;

    const animalCount = this.stackedAnimals.length;

    if (animalCount >= livesConfig.earnThresholds.bankingBonus) {
      this.earnLife();
    }

    const bankBonus = animalCount * scoring.bankingBonusPerDuck * this.currentMultiplier;
    this.score += Math.floor(bankBonus);

    for (const animal of this.stackedAnimals) {
      animal.state = "banking";
      this.bankingAnimals.push(animal);
    }

    this.bankedAnimals += animalCount;
    this.stackedAnimals = [];

    this.currentMultiplier = Math.max(1, this.currentMultiplier * scoring.bankingPenalty);

    feedback.play("perfect");
    this.callbacks.onStackChange(0, false);
    this.callbacks.onScoreChange(this.score, this.currentMultiplier, this.combo);
    this.callbacks.onBankComplete(this.bankedAnimals);
  }

  private mergeStack(): void {
    if (this.stackedAnimals.length < POWER_UPS.rare_candy.minStackToUse) return;

    const animalCount = this.stackedAnimals.length;
    let totalMergeLevel = 0;
    for (const animal of this.stackedAnimals) {
      totalMergeLevel += animal.mergeLevel;
    }

    const mergedAnimal = this.stackedAnimals[0];
    mergedAnimal.merge(totalMergeLevel);
    
    // Clean up ECS entities of merged animals
    for (let i = 1; i < this.stackedAnimals.length; i++) {
        const animal = this.stackedAnimals[i];
        if (animal.ecsEntity) {
            world.remove(animal.ecsEntity);
            animal.ecsEntity = undefined;
        }
    }

    for (let i = 1; i < this.stackedAnimals.length; i++) {
      const animal = this.stackedAnimals[i];
      for (let j = 0; j < effects.mergeParticles / animalCount; j++) {
        this.particles.push(new Particle(animal.getRenderX(), animal.y));
      }
    }

    this.stackedAnimals = [mergedAnimal];

    const mergeBonus = scoring.mergeBonus + animalCount * scoring.mergeBonusPerDuck;
    this.score += Math.floor(mergeBonus * this.currentMultiplier);

    this.callbacks.onMerge(totalMergeLevel);
    this.callbacks.onScoreChange(this.score, this.currentMultiplier, this.combo);
    this.callbacks.onStackChange(this.stackedAnimals.length, false);

    feedback.play("perfect");
  }

  private collectPowerUp(powerUp: PowerUp): void {
    powerUp.collect();
    this.callbacks.onPowerUpCollected(powerUp.type);

    switch (powerUp.type) {
      case "rare_candy":
        if (this.stackedAnimals.length >= POWER_UPS.rare_candy.minStackToUse) {
          this.mergeStack();
        }
        break;

      case "potion":
        if (this.lives < this.maxLives) {
          this.lives++;
          this.callbacks.onLivesChange(this.lives, this.maxLives);
        }
        break;

      case "max_up":
        if (this.maxLives < livesConfig.absoluteMax) {
          this.maxLives++;
          this.lives++;
          this.callbacks.onLivesChange(this.lives, this.maxLives);
        }
        break;

      case "great_ball":
        this.magnetActive = true;
        this.magnetUntil = performance.now() + POWER_UPS.great_ball.duration;
        break;

      case "x_attack":
        this.xAttackActive = true;
        this.xAttackUntil = performance.now() + POWER_UPS.x_attack.duration;
        this.xAttackMultiplier = POWER_UPS.x_attack.multiplier;
        break;

      case "full_restore":
        this.lives = this.maxLives;
        this.invincibleUntil = performance.now() + POWER_UPS.full_restore.invincibilityDuration;
        this.callbacks.onLivesChange(this.lives, this.maxLives);
        break;
    }

    feedback.play("powerup");
  }

  private loseLife(reason: "miss" | "topple"): void {
    if (performance.now() < this.invincibleUntil) return;

    this.lives--;
    this.callbacks.onLivesChange(this.lives, this.maxLives);

    this.combo = 0;
    this.perfectStreak = 0;

    this.recentMisses++;
    this.timeSinceLastMiss = 0;
    this.wobbleGovernor.addTension(reason === "topple" ? 0.4 : 0.2);

    if (reason === "topple") {
      this.triggerTopple();
    } else {
      this.callbacks.onMiss();
      feedback.play("drop");
    }

    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.invincibleUntil = performance.now() + livesConfig.invincibilityDuration;
      this.screenShake = 0.5;
    }
  }

  private earnLife(): void {
    if (this.lives < this.maxLives) {
      this.lives++;
      this.callbacks.onLivesChange(this.lives, this.maxLives);
      this.callbacks.onLifeEarned();
      feedback.play("lifeup");
    }
  }

  private triggerTopple(): void {
    this.callbacks.onStackTopple();
    feedback.play("fail");

    for (const animal of this.stackedAnimals) {
      animal.state = "falling";
      animal.velocityX = (Math.random() - 0.5) * 15;
      animal.velocityY = -Math.random() * 8 - 5;
      animal.isHeadache = true;
      this.scatteringAnimals.push(animal);
      
      // Cleanup ECS (maybe let them scatter visually first?)
      // For now, removing them from ECS to keep it simple, 
      // ideally we'd let physics handle scattering in ECS
      if (animal.ecsEntity) {
          world.remove(animal.ecsEntity);
          animal.ecsEntity = undefined;
      }
    }
    this.stackedAnimals = [];
    this.callbacks.onStackChange(0, false);

    if (this.basePlayer) {
      for (let i = 0; i < 30; i++) {
        this.particles.push(new Particle(this.basePlayer.x, this.basePlayer.y - 50));
      }
    }
  }

  stop(): void {
    this.isPlaying = false;
  }

  pause(): void {
    this.isPaused = true;
    feedback.stopMusic();
  }

  resume(): void {
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    feedback.startMusic();
  }

  destroy(): void {
    window.removeEventListener("resize", this.handleResize);
    this.canvas.removeEventListener("mousedown", this.handlePointerDown);
    this.canvas.removeEventListener("mousemove", this.handlePointerMove);
    this.canvas.removeEventListener("mouseup", this.handlePointerUp);
    this.canvas.removeEventListener("mouseleave", this.handlePointerUp);
    this.canvas.removeEventListener("touchstart", this.handleTouchStart);
    this.canvas.removeEventListener("touchmove", this.handleTouchMove);
    this.canvas.removeEventListener("touchend", this.handleTouchEnd);
    
    // Clear ECS world
    world.clear();

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private spawnAnimalWithDirector(decision: import("../ai/GameDirector").SpawnDecision): void {
    const animal = new Animal(decision.x, -GAME_CONFIG.animal.height, "falling", decision.duckType);

    animal.velocityX = decision.initialVelocityX;
    animal.velocityY = decision.initialVelocityY;
    animal.behaviorType = decision.behaviorType;

    if (this.basePlayer) {
      const biasedTargetX =
        this.basePlayer.x * decision.targetBias + decision.x * (1 - decision.targetBias);
      animal.targetX = biasedTargetX;
      animal.targetY = this.basePlayer.y - this.stackedAnimals.length * GAME_CONFIG.animal.height * 0.5;
    } else {
      animal.targetX = this.canvas.width / 2;
      animal.targetY = this.canvas.height * 0.8;
    }
    
    // Create ECS entity and add to world for 3D rendering
    const ecsEntity = createAnimal(animal.type, this.mapToWorld(animal.x, animal.y));
    world.add(ecsEntity);
    animal.ecsEntity = ecsEntity;

    this.fallingAnimals.push(animal);
  }

  private spawnPowerUpWithDirector(decision: import("../ai/GameDirector").PowerUpDecision): void {
    this.powerUps.push(new PowerUp(decision.x, -50, decision.type));
  }

  private updateGameDirector(deltaTime: number): void {
    const now = performance.now();
    const gameTime = now - this.gameStartTime;

    const totalAttempts = this.recentCatches + this.recentMisses;
    const catchRate = totalAttempts > 0 ? this.recentCatches / totalAttempts : 0.5;

    const state: GameState = {
      playerX: this.basePlayer?.x ?? this.canvas.width / 2,
      playerY: this.basePlayer?.y ?? this.canvas.height * 0.8,
      stackHeight: this.stackedAnimals.length,
      lives: this.lives,
      maxLives: this.maxLives,
      score: this.score,
      combo: this.combo,

      gameTime,
      timeSinceLastSpawn: now - this.lastSpawnTime,
      timeSinceLastPowerUp: this.timeSinceLastPowerUp,
      timeSinceLastMiss: this.timeSinceLastMiss,
      timeSinceLastPerfect: this.timeSinceLastPerfect,

      recentCatches: this.recentCatches,
      recentMisses: this.recentMisses,
      recentPerfects: this.recentPerfects,
      catchRate,

      activeDucks: this.fallingAnimals.length,
      activePowerUps: this.powerUps.length,
      screenWidth: this.canvas.width,
      screenHeight: this.canvas.height,

      level: this.level,
      bankedDucks: this.bankedAnimals,
    };

    this.gameDirector.updateGameState(state);
    this.gameDirector.update(deltaTime / 1000);

    if (gameTime > 0 && Math.floor(gameTime / 10000) > Math.floor((gameTime - deltaTime) / 10000)) {
      this.recentCatches = Math.floor(this.recentCatches * 0.7);
      this.recentMisses = Math.floor(this.recentMisses * 0.7);
      this.recentPerfects = Math.floor(this.recentPerfects * 0.7);
    }
  }

  private checkCatches(): void {
    if (!this.basePlayer) return;

    const topAnimal =
      this.stackedAnimals.length > 0
        ? this.stackedAnimals[this.stackedAnimals.length - 1]
        : this.basePlayer;

    const floorY = this.canvas.height * layout.floorY;
    const catchTop = topAnimal.y - GAME_CONFIG.animal.height * collision.catchWindowTop;
    const catchBottom = topAnimal.y + GAME_CONFIG.animal.height * collision.catchWindowBottom;

    const catchWidthBonus = GAME_CONFIG.animal.width * 0.15;

    for (let i = this.fallingAnimals.length - 1; i >= 0; i--) {
      const falling = this.fallingAnimals[i];
      const prevY = falling.y - falling.velocityY;

      if (falling.y >= floorY) {
        this.fallingAnimals.splice(i, 1);
        if (falling.ecsEntity) {
            world.remove(falling.ecsEntity);
        }
        this.loseLife("miss");
        this.currentMultiplier = Math.max(1, this.currentMultiplier * 0.8);
        this.callbacks.onScoreChange(this.score, this.currentMultiplier, this.combo);
        continue;
      }

      const passedThrough = prevY < catchTop && falling.y > catchBottom;
      const inCatchZone = falling.y >= catchTop && falling.y <= catchBottom;

      if (inCatchZone || passedThrough) {
        const targetX = topAnimal.getRenderX();
        const checkY = passedThrough ? (catchTop + catchBottom) / 2 : falling.y;
        const checkX = passedThrough
          ? falling.x - (falling.velocityX * (falling.y - checkY)) / falling.velocityY
          : falling.x;

        const dx = checkX - targetX;
        const absDx = Math.abs(dx);

        const effectiveWidth = GAME_CONFIG.animal.width + catchWidthBonus;
        const isPerfect = absDx < collision.perfectTolerance;
        const isGood = absDx < effectiveWidth * collision.goodTolerance;
        const isHit = absDx < effectiveWidth * collision.hitTolerance;

        if (isHit) {
          const landY = topAnimal.y - GAME_CONFIG.animal.height * collision.landingOffset;
          const offsetX = isPerfect ? 0 : dx * collision.imperfectOffsetScale;

          falling.land(landY, this.stackedAnimals.length + 1, offsetX);
          this.stackedAnimals.push(falling);
          this.fallingAnimals.splice(i, 1);

          const now = performance.now();
          if (now - this.lastCatchTime < scoring.comboDecayTime) {
            this.combo++;
          } else {
            this.combo = 1;
          }
          this.lastCatchTime = now;

          const stackBonus = scoring.stackMultiplier ** (this.stackedAnimals.length - 1);
          const catchBonus = isPerfect ? scoring.perfectBonus : isGood ? scoring.goodBonus : 1;
          const comboBonus = 1 + this.combo * scoring.comboMultiplier;
          const xAttackBonus = this.xAttackActive ? this.xAttackMultiplier : 1;
          const points = Math.floor(
            scoring.basePoints *
              stackBonus *
              catchBonus *
              this.currentMultiplier *
              comboBonus *
              xAttackBonus
          );

          this.score += points;
          this.currentMultiplier = Math.min(scoring.maxMultiplier, this.currentMultiplier + 0.1);

          if (isPerfect) {
            this.perfectStreak++;
            if (this.perfectStreak >= livesConfig.earnThresholds.perfectStreak) {
              this.earnLife();
              this.perfectStreak = 0;
            }
          } else {
            this.perfectStreak = 0;
          }

          if (this.score - this.lastScoreForLifeBonus >= livesConfig.earnThresholds.scoreBonus) {
            this.earnLife();
            this.lastScoreForLifeBonus = this.score;
          }

          topAnimal.squish();

          let impactForce = falling.velocityY * physics.impactWobble + Math.abs(offsetX) * 0.01;

          const { aiWobble } = physics;
          switch (falling.behaviorType) {
            case "dive":
              impactForce += aiWobble.diveImpact * 2;
              break;
            case "seeker":
              impactForce += aiWobble.seekerImpact * 1.5;
              break;
            case "zigzag":
              impactForce += aiWobble.seekerImpact * 0.8;
              break;
          }

          this.propagateWobble(impactForce);

          if (isPerfect) {
            this.triggerPerfectEffect(falling.getRenderX(), falling.y);
            this.recentPerfects++;
            this.timeSinceLastPerfect = 0;
          } else if (isGood) {
            this.callbacks.onGoodCatch(falling.getRenderX(), falling.y);
          }

          this.recentCatches++;
          feedback.play("land");

          const canBank = this.stackedAnimals.length >= banking.minStackToBank;
          this.callbacks.onScoreChange(this.score, this.currentMultiplier, this.combo);
          this.callbacks.onStackChange(this.stackedAnimals.length, canBank);

          this.checkLevelUp();
        }
      }

      if (falling.y > this.canvas.height + 100) {
        this.fallingAnimals.splice(i, 1);
        if (falling.ecsEntity) {
            world.remove(falling.ecsEntity);
        }
      }
    }
  }

  private checkFireballHits(): void {
    for (let fi = this.fireballs.length - 1; fi >= 0; fi--) {
      const fireball = this.fireballs[fi];

      if (!fireball.active || fireball.isOffScreen(this.canvas.width)) {
        if (!fireball.active && fireball.trailParticles.length === 0) {
          this.fireballs.splice(fi, 1);
        }
        continue;
      }

      for (let di = this.fallingAnimals.length - 1; di >= 0; di--) {
        const animal = this.fallingAnimals[di];

        if (fireball.checkHit(animal.x, animal.y, GAME_CONFIG.animal.width * 0.4)) {
          fireball.destroy();

          for (let i = 0; i < 12; i++) {
            this.particles.push(new Particle(animal.x, animal.y));
          }

          this.fallingAnimals.splice(di, 1);
          if (animal.ecsEntity) {
              world.remove(animal.ecsEntity);
          }

          this.score += Math.floor(scoring.fireKillBonus * this.currentMultiplier);
          this.callbacks.onScoreChange(this.score, this.currentMultiplier, this.combo);

          feedback.play("land");
          break;
        }
      }
    }
  }

  private checkPowerUpCollection(): void {
    if (!this.basePlayer) return;

    const collectX = this.basePlayer.x;
    let collectY = this.basePlayer.y;

    if (this.stackedAnimals.length > 0) {
      collectY = this.stackedAnimals[this.stackedAnimals.length - 1].y;
    }

    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];

      if (powerUp.collected) {
        if (powerUp.scale < 0.1) {
          this.powerUps.splice(i, 1);
        }
        continue;
      }

      if (
        powerUp.y > collectY - GAME_CONFIG.animal.height &&
        powerUp.y < this.basePlayer.y + GAME_CONFIG.animal.height &&
        Math.abs(powerUp.x - collectX) < powerUpConfig.collectRadius
      ) {
        this.collectPowerUp(powerUp);
      }

      if (powerUp.isOffScreen(this.canvas.height)) {
        this.powerUps.splice(i, 1);
      }
    }
  }

  private checkStackStability(): void {
    const { isTipping, dangerLevel } = this.calculateTippingState();
    const { tipping } = physics;

    const wasInDanger = this.inDangerState;
    this.inDangerState = dangerLevel >= tipping.warningThreshold;

    if (this.inDangerState !== wasInDanger) {
      this.callbacks.onDangerState(this.inDangerState);
      if (this.inDangerState) {
        feedback.warning();
      }
    }

    if (dangerLevel >= tipping.dangerThreshold) {
      this.screenShake = Math.max(this.screenShake, effects.dangerShake * dangerLevel);
      if (Math.random() < 0.1) {
        feedback.dangerPulse();
      }
    }

    if (isTipping && this.stackedAnimals.length > 0) {
      this.loseLife("topple");
    }
  }

  private checkLevelUp(): void {
    const newLevel = Math.min(
      difficulty.maxLevel,
      Math.floor((this.score / difficulty.levelUpThreshold) ** difficulty.spawnRateCurve) + 1
    );

    if (newLevel > this.level) {
      this.level = newLevel;
      this.spawnInterval = Math.max(
        spawning.minInterval,
        spawning.initialInterval - (this.level - 1) * spawning.intervalDecreasePerLevel
      );
      this.callbacks.onLevelUp(this.level);
      feedback.play("levelup");
    }
  }

  private triggerPerfectEffect(x: number, y: number): void {
    feedback.play("perfect");
    this.callbacks.onPerfectCatch(x, y);

    for (let i = 0; i < effects.particleCount; i++) {
      this.particles.push(new Particle(x, y));
    }
  }

  private gameOver(): void {
    this.isPlaying = false;
    feedback.stopMusic();
    feedback.play("fail");
    this.callbacks.onGameOver(this.score, this.bankedAnimals);
  }

  private update(deltaTime: number): void {
    if (!this.isPlaying || this.isPaused) return;

    this.screenShake *= 0.9;

    const now = performance.now();

    this.timeSinceLastPerfect += deltaTime;
    this.timeSinceLastMiss += deltaTime;
    this.timeSinceLastPowerUp += deltaTime;

    // Run ECS systems for entities managed purely by ECS
    // This handles frozen entities, projectiles, and provides danger state
    this.runECSSystems(deltaTime);

    this.updateGameDirector(deltaTime);

    const spawnDecision = this.gameDirector.decideSpawn();
    if (spawnDecision.shouldSpawn) {
      this.spawnAnimalWithDirector(spawnDecision);
      this.lastSpawnTime = now;
    }

    const powerUpDecision = this.gameDirector.decidePowerUp();
    if (powerUpDecision.shouldSpawn) {
      this.spawnPowerUpWithDirector(powerUpDecision);
      this.timeSinceLastPowerUp = 0;
    }

    // Update AutoPlayer for E2E testing (when enabled)
    if (this.autoPlayerIntegration && this.basePlayer) {
      const autoPlayerState: AutoPlayerGameState = {
        playerX: this.basePlayer.x,
        playerY: this.basePlayer.y,
        stackHeight: this.stackedAnimals.length,
        stackWobble: this.stackedAnimals.reduce(
          (max, a) => Math.max(max, Math.abs(a.wobbleOffset)),
          0
        ),
        canBank: this.stackedAnimals.length >= banking.minStackToBank,
        fallingAnimals: this.fallingAnimals,
        stackedAnimals: this.stackedAnimals,
        screenWidth: this.canvas.width,
        screenHeight: this.canvas.height,
        inDanger: this.inDangerState,
      };

      const desiredX = this.autoPlayerIntegration.update(deltaTime, autoPlayerState);
      if (desiredX !== null) {
        // AutoPlayer controls the base player position
        const clampedX = Math.max(
          GAME_CONFIG.animal.width / 2 + 10,
          Math.min(
            this.canvas.width - GAME_CONFIG.animal.width / 2 - layout.bankWidth - 10,
            desiredX
          )
        );

        // Apply movement with wobble effect
        const actualDelta = clampedX - this.basePlayer.x;
        this.basePlayer.x = clampedX;

        if (Math.abs(actualDelta) > 0.5) {
          const wobbleForce = actualDelta * physics.wobbleStrength * 0.5;
          this.propagateWobble(wobbleForce);
        }
      }
    }

    if (this.basePlayer) {
        this.basePlayer.update(deltaTime);
        // Sync ECS position
        if (this.basePlayer.ecsEntity && this.basePlayer.ecsEntity.position) {
            const worldPos = this.mapToWorld(this.basePlayer.x, this.basePlayer.y);
            this.basePlayer.ecsEntity.position.x = worldPos.x;
            this.basePlayer.ecsEntity.position.y = worldPos.y;
            
            // Apply rotation from wobble (mapped to Z rotation)
            if (!this.basePlayer.ecsEntity.modelRotation) {
                this.basePlayer.ecsEntity.modelRotation = new Vector3(0, 0, 0);
            }
            this.basePlayer.ecsEntity.modelRotation.z = this.basePlayer.rotation;
        }
    }

    for (const animal of this.stackedAnimals) {
      animal.x = this.basePlayer!.x;
      animal.update(deltaTime);
      
      // Sync ECS position
      if (animal.ecsEntity && animal.ecsEntity.position) {
          const worldPos = this.mapToWorld(animal.getRenderX(), animal.y);
          animal.ecsEntity.position.x = worldPos.x;
          animal.ecsEntity.position.y = worldPos.y;
          
          if (!animal.ecsEntity.modelRotation) {
              animal.ecsEntity.modelRotation = new Vector3(0, 0, 0);
          }
          animal.ecsEntity.modelRotation.z = animal.rotation;
      }
    }

    if (this.magnetActive && now > this.magnetUntil) {
      this.magnetActive = false;
    }
    if (this.xAttackActive && now > this.xAttackUntil) {
      this.xAttackActive = false;
      this.xAttackMultiplier = 1;
    }

    for (const animal of this.fallingAnimals) {
      if (this.basePlayer) {
        animal.targetX = this.basePlayer.x;
        animal.targetY = this.basePlayer.y - this.stackedAnimals.length * GAME_CONFIG.animal.height * 0.5;
      }

      if (animal.behaviorType !== "normal") {
        const aiResult = applyDuckAI(
          {
            x: animal.x,
            y: animal.y,
            vx: animal.velocityX,
            vy: animal.velocityY,
            targetX: animal.targetX,
            targetY: animal.targetY,
            behaviorType: animal.behaviorType as import("../ai/DuckBehavior").DuckBehaviorType,
          },
          deltaTime,
          this.canvas.width - layout.bankWidth
        );

        animal.x = aiResult.x;
        animal.velocityX = aiResult.vx;
        animal.velocityY = Math.max(animal.velocityY, aiResult.vy * 0.3);
      }

      animal.update(deltaTime);
      
      // Sync ECS
      if (animal.ecsEntity && animal.ecsEntity.position) {
          const worldPos = this.mapToWorld(animal.x, animal.y);
          animal.ecsEntity.position.x = worldPos.x;
          animal.ecsEntity.position.y = worldPos.y;
          
          if (!animal.ecsEntity.modelRotation) {
              animal.ecsEntity.modelRotation = new Vector3(0, 0, 0);
          }
          animal.ecsEntity.modelRotation.z = animal.rotation;
      }

      if (this.magnetActive && this.basePlayer) {
        const dx = this.basePlayer.x - animal.x;
        const pullStrength = 0.08;
        animal.x += dx * pullStrength;
      }
    }

    for (let i = this.frozenAnimals.length - 1; i >= 0; i--) {
      const frozen = this.frozenAnimals[i];
      frozen.update(deltaTime);

      if (frozen.isDone()) {
        this.fallingAnimals.push(frozen.duck);
        this.frozenAnimals.splice(i, 1);
        
        // Re-create ECS entity (since it was removed or we can just hide/unhide if we managed state)
        // For simplicity, let's create a new one to match the "falling" state
        const thawedEntity = createAnimal(frozen.duck.type, this.mapToWorld(frozen.duck.x, frozen.duck.y));
        world.add(thawedEntity);
        frozen.duck.ecsEntity = thawedEntity;
      }
    }

    for (let i = this.scatteringAnimals.length - 1; i >= 0; i--) {
      const animal = this.scatteringAnimals[i];
      animal.velocityY += physics.gravity;
      animal.x += animal.velocityX;
      animal.y += animal.velocityY;
      animal.rotation += animal.velocityX * 0.05;
      
      // We removed their ECS entities on topple, but could add "flying" ones back if we want visual chaos
      // For now, they are just canvas particles or ignored in 3D

      if (animal.y > this.canvas.height + 100) {
        this.scatteringAnimals.splice(i, 1);
      }
    }

    for (let i = this.bankingAnimals.length - 1; i >= 0; i--) {
      const animal = this.bankingAnimals[i];
      const dx = this.bankTargetX - animal.x;
      const dy = this.bankTargetY - animal.y;
      animal.x += dx * 0.12;
      animal.y += dy * 0.12;
      animal.scaleX *= 0.96;
      animal.scaleY *= 0.96;
      
      // Update ECS if we want to see them fly to bank
      if (animal.ecsEntity) {
          const worldPos = this.mapToWorld(animal.x, animal.y);
          if (animal.ecsEntity.position) {
              animal.ecsEntity.position.x = worldPos.x;
              animal.ecsEntity.position.y = worldPos.y;
          }
          if (animal.ecsEntity.scale) {
             animal.ecsEntity.scale.x = animal.scaleX;
             animal.ecsEntity.scale.y = animal.scaleY;
          }
      }

      if (animal.scaleX < 0.08) {
        this.bankingAnimals.splice(i, 1);
        if (animal.ecsEntity) {
            world.remove(animal.ecsEntity);
        }
      }
    }

    for (const powerUp of this.powerUps) {
      powerUp.update(deltaTime);
    }

    for (const fireball of this.fireballs) {
      fireball.update(deltaTime);
    }

    this.checkCatches();
    this.checkFireballHits();
    this.checkPowerUpCollection();
    this.checkStackStability();
    this.updateAbilityState();
    this.updateAIWobble(deltaTime);
    this.updateMusicIntensity();

    if (this.combo > 0 && now - this.lastCatchTime > scoring.comboDecayTime) {
      this.combo = 0;
      this.callbacks.onScoreChange(this.score, this.currentMultiplier, this.combo);
    }
  }

  private updateMusicIntensity(): void {
    const stackFactor = Math.min(1, this.stackedAnimals.length / 10);
    const levelFactor = Math.min(1, this.level / difficulty.maxLevel);
    const dangerFactor = this.inDangerState ? 0.3 : 0;
    const comboFactor = Math.min(0.2, this.combo / 20);
    
    const intensity = Math.min(1, stackFactor * 0.4 + levelFactor * 0.3 + dangerFactor + comboFactor);
    feedback.setIntensity(intensity);
  }

  private updateAbilityState(): void {
    if (!this.callbacks.onAbilityStateChange) return;

    // Try ECS-based ability state first
    const ecsAbilityState = getAbilityStateForUI();

    // Fall back to legacy if ECS has no abilities tracked
    if (ecsAbilityState.hasFire || ecsAbilityState.hasIce) {
      this.callbacks.onAbilityStateChange(
        ecsAbilityState.fireReady,
        ecsAbilityState.iceReady,
        ecsAbilityState.hasFire,
        ecsAbilityState.hasIce
      );
      return;
    }

    // Legacy fallback: check Animal class instances
    let fireReady = 0;
    let iceReady = 0;
    let hasFire = false;
    let hasIce = false;

    const allAnimals = this.basePlayer ? [this.basePlayer, ...this.stackedAnimals] : this.stackedAnimals;

    for (const animal of allAnimals) {
      // Check for abilities from the animal type config
      const typeConfig = ANIMAL_TYPES[animal.type];
      if (typeConfig?.ability === "fireball") {
        hasFire = true;
        const cooldownLeft = Math.max(0, animal.abilityCooldown);
        const fireCooldownMax = typeConfig.abilityCooldown ?? 3000;
        fireReady = Math.max(fireReady, 1 - cooldownLeft / fireCooldownMax);
      } else if (typeConfig?.ability === "freeze") {
        hasIce = true;
        const cooldownLeft = Math.max(0, animal.abilityCooldown);
        const iceCooldownMax = typeConfig.abilityCooldown ?? 5000;
        iceReady = Math.max(iceReady, 1 - cooldownLeft / iceCooldownMax);
      }
    }

    this.callbacks.onAbilityStateChange(fireReady, iceReady, hasFire, hasIce);
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].isDead()) {
        this.particles.splice(i, 1);
      }
    }
  }

  private drawBankZone(): void {
    // Bank zone is now rendered in 3D scene - stub for compatibility
  }

  private drawFloorZone(): void {
    // Floor zone is now rendered in 3D scene - stub for compatibility
  }

  private drawSpawnZone(): void {
    // Spawn zone visualization - stub for compatibility
  }

  private drawActivePowerUpEffects(): void {
    // Power-up effects are rendered in 3D scene - stub for compatibility
  }

  private drawAITensionIndicator(): void {
    // AI tension indicator - stub for compatibility
  }

  private drawDangerIndicator(): void {
    // Danger indicator - renders warning when stack is unstable
    if (!this.inDangerState) return;

    const { width, height } = this.canvas;
    this.ctx.save();
    this.ctx.fillStyle = `rgba(255, 0, 0, ${0.1 + Math.sin(Date.now() / 200) * 0.05})`;
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.restore();
  }

  private render(): void {
    const { width, height } = this.canvas;

    this.ctx.save();
    if (this.screenShake > 0.01) {
      const shakeX = (Math.random() - 0.5) * this.screenShake * 20;
      const shakeY = (Math.random() - 0.5) * this.screenShake * 20;
      this.ctx.translate(shakeX, shakeY);
    }

    this.ctx.clearRect(-10, -10, width + 20, height + 20);
    this.bgRotation += 0.001 + this.level * 0.0001;
    // drawBackground(this.ctx, width, height, this.bgRotation); // Moved to separate component

    this.drawBankZone();
    this.drawFloorZone();
    
    // We render 2D UI elements like particles and indicators on the canvas
    // The 3D entities are rendered by GameScene via ECS
    // But we still render some 2D fallbacks or UI effects here if needed

    // Draw power-ups (2D for now)
    for (const powerUp of this.powerUps) {
      powerUp.draw(this.ctx);
    }

    // Draw fireballs (2D for now)
    for (const fireball of this.fireballs) {
      fireball.draw(this.ctx);
    }

    this.drawActivePowerUpEffects();
    this.drawAITensionIndicator();

    for (const p of this.particles) {
      p.draw(this.ctx);
    }

    this.drawSpawnZone();

    if (this.inDangerState) {
      this.drawDangerIndicator();
    }

    this.ctx.restore();
  }
}
