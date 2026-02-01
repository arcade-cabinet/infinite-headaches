/**
 * GameLogic - Pure game logic engine with NO rendering dependencies
 *
 * This is a complete rewrite that separates game logic from rendering.
 * All visual output happens via ECS entities that Babylon.js renders.
 * Input is received via public methods, not canvas events.
 */

import { Vector3 } from "@babylonjs/core";
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
import { ANIMAL_TYPES, GAME_CONFIG, POWER_UPS, type AnimalType, type PowerUpType } from "../config";
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
  runAllSystems,
  FreezeSystem,
  ProjectileSystem,
  AbilitySystem,
  StackingSystem,
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
  type TippingState,
} from "../ecs/systems";

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

// ============================================================
// TYPES
// ============================================================

export interface GameCallbacks {
  onScoreChange: (score: number, multiplier: number, combo: number) => void;
  onStackChange: (height: number, canBank: boolean) => void;
  onLivesChange: (lives: number, maxLives: number) => void;
  onGameOver: (finalScore: number, bankedAnimals: number) => void;
  onPerfectCatch: (worldPos: Vector3) => void;
  onGoodCatch: (worldPos: Vector3) => void;
  onMiss: () => void;
  onBankComplete: (animalsBanked: number) => void;
  onLevelUp: (level: number) => void;
  onLifeEarned: () => void;
  onDangerState: (inDanger: boolean) => void;
  onStackTopple: () => void;
  onPowerUpCollected: (type: PowerUpType) => void;
  onMerge: (animalCount: number) => void;
  onFireballShot: () => void;
  onAnimalFrozen: () => void;
  onScreenShake: (intensity: number) => void;
  onParticleEffect: (type: string, position: Vector3) => void;
}

export interface ScreenDimensions {
  width: number;
  height: number;
}

export interface GameLogicState {
  score: number;
  multiplier: number;
  combo: number;
  level: number;
  lives: number;
  maxLives: number;
  stackHeight: number;
  bankedAnimals: number;
  canBank: boolean;
  inDanger: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  playerWorldX: number;
  playerWorldY: number;
  screenShake: number;
}

// ============================================================
// COORDINATE MAPPING
// ============================================================

/**
 * Maps screen coordinates to 3D world coordinates
 * Visible area is approximately 20 units wide (-10 to +10) and 10 units tall
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  screenWidth: number,
  screenHeight: number
): Vector3 {
  const visibleWidth = 20;
  const visibleHeight = 10;

  const normalizedX = (screenX / screenWidth) - 0.5;
  const normalizedY = (screenY / screenHeight) - 0.5;

  return new Vector3(
    normalizedX * visibleWidth,
    -normalizedY * visibleHeight + 3, // Offset to match camera view
    0
  );
}

/**
 * Maps world coordinates back to screen coordinates
 */
export function worldToScreen(
  worldPos: Vector3,
  screenWidth: number,
  screenHeight: number
): { x: number; y: number } {
  const visibleWidth = 20;
  const visibleHeight = 10;

  const normalizedX = worldPos.x / visibleWidth + 0.5;
  const normalizedY = -(worldPos.y - 3) / visibleHeight + 0.5;

  return {
    x: normalizedX * screenWidth,
    y: normalizedY * screenHeight,
  };
}

// ============================================================
// GAME LOGIC ENGINE
// ============================================================

export class GameLogic {
  // Screen dimensions (updated via setScreenDimensions)
  private screenWidth = 1920;
  private screenHeight = 1080;

  // Game state
  private score = 0;
  private combo = 0;
  private currentMultiplier = 1;
  private level = 1;
  private lives = livesConfig.starting;
  private maxLives = livesConfig.max;
  private bankedAnimals = 0;
  private inDangerState = false;
  private screenShake = 0;

  // Player state
  private playerEntity: Entity | null = null;
  private playerWorldX = 0;
  private playerWorldY = -2; // Floor level
  private isDragging = false;
  private lastDragWorldX = 0;
  private playerVelocity = 0;

  // Spawning
  private lastSpawnTime = 0;
  private spawnInterval = spawning.initialInterval;
  private gameStartTime = 0;

  // Directors
  private gameDirector: GameDirector;
  private wobbleGovernor: WobbleGovernor;
  private autoPlayerIntegration: AutoPlayerIntegration;

  // Stats tracking
  private recentCatches = 0;
  private recentMisses = 0;
  private recentPerfects = 0;
  private timeSinceLastPowerUp = 0;
  private timeSinceLastMiss = Infinity;
  private timeSinceLastPerfect = Infinity;

  // Active power-ups (tracked for duration-based effects)
  private activePowerUps: Map<PowerUpType, { expiresAt: number }> = new Map();

  // Animation loop
  private animationId: number | null = null;
  private lastFrameTime = 0;

  // Callbacks
  private callbacks: GameCallbacks;

  isPlaying = false;
  isPaused = false;

  constructor(callbacks: GameCallbacks) {
    this.callbacks = callbacks;
    this.gameDirector = new GameDirector();
    this.wobbleGovernor = new WobbleGovernor();
    this.autoPlayerIntegration = createAutoPlayerIntegration(() => this.bankStack());
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Set screen dimensions for coordinate mapping
   */
  setScreenDimensions(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  /**
   * Get current game state for UI
   */
  getState(): GameLogicState {
    return {
      score: this.score,
      multiplier: this.currentMultiplier,
      combo: this.combo,
      level: this.level,
      lives: this.lives,
      maxLives: this.maxLives,
      stackHeight: this.getStackHeight(),
      bankedAnimals: this.bankedAnimals,
      canBank: this.canBank(),
      inDanger: this.inDangerState,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      playerWorldX: this.playerWorldX,
      playerWorldY: this.playerWorldY,
      screenShake: this.screenShake,
    };
  }

  /**
   * Start a new game
   */
  start(characterId: "farmer_john" | "farmer_mary" = "farmer_john"): void {
    // Clear any existing state
    world.clear();
    this.activePowerUps.clear();

    // Reset game state
    this.score = 0;
    this.combo = 0;
    this.currentMultiplier = 1;
    this.level = 1;
    this.lives = livesConfig.starting;
    this.bankedAnimals = 0;
    this.inDangerState = false;
    this.screenShake = 0;
    this.recentCatches = 0;
    this.recentMisses = 0;
    this.recentPerfects = 0;
    this.timeSinceLastPowerUp = 0;
    this.timeSinceLastMiss = Infinity;
    this.timeSinceLastPerfect = Infinity;

    // Reset spawning
    this.spawnInterval = spawning.initialInterval;
    this.lastSpawnTime = performance.now();
    this.gameStartTime = performance.now();

    // Reset directors
    this.gameDirector = new GameDirector();
    this.wobbleGovernor = new WobbleGovernor();

    // Create player entity
    this.playerWorldX = 0;
    this.playerWorldY = -2;
    const playerPos = new Vector3(this.playerWorldX, this.playerWorldY, 0);
    this.playerEntity = createPlayer(characterId, playerPos);
    world.add(this.playerEntity);

    // Start game loop
    this.isPlaying = true;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    this.gameLoop();

    // Notify UI
    this.callbacks.onScoreChange(0, 1, 0);
    this.callbacks.onStackChange(0, false);
    this.callbacks.onLivesChange(this.lives, this.maxLives);
  }

  /**
   * Pause the game
   */
  pause(): void {
    if (this.isPlaying && !this.isPaused) {
      this.isPaused = true;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }
  }

  /**
   * Resume the game
   */
  resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.lastFrameTime = performance.now();
      this.gameLoop();
    }
  }

  /**
   * Clean up and stop
   */
  destroy(): void {
    this.isPlaying = false;
    this.isPaused = false;
    world.clear();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  // ============================================================
  // INPUT HANDLING
  // ============================================================

  /**
   * Handle pointer/touch down - start dragging
   */
  handlePointerDown(worldX: number): void {
    if (!this.isPlaying || this.isPaused) return;

    this.isDragging = true;
    this.lastDragWorldX = worldX;
    feedback.uiTap();
  }

  /**
   * Handle pointer/touch move - drag player
   */
  handlePointerMove(worldX: number): void {
    if (!this.isPlaying || this.isPaused || !this.isDragging) return;

    const deltaX = worldX - this.lastDragWorldX;
    this.lastDragWorldX = worldX;

    // Update player position with smoothing
    const smoothing = 0.15;
    this.playerVelocity = this.playerVelocity * (1 - smoothing) + deltaX * smoothing * 60;

    // Clamp to play area
    const halfWidth = 8; // Visible area is -10 to +10, leave margin
    this.playerWorldX = Math.max(-halfWidth, Math.min(halfWidth, this.playerWorldX + deltaX));
  }

  /**
   * Handle pointer/touch up - stop dragging
   */
  handlePointerUp(): void {
    this.isDragging = false;
  }

  /**
   * Bank the current stack
   */
  bankStack(): void {
    if (!this.canBank()) return;

    const stackedEntities = getStackedEntitiesSorted();
    if (stackedEntities.length === 0) return;

    // Calculate score bonus
    const stackSize = stackedEntities.length;
    const basePoints = stackSize * scoring.basePoints;
    const heightBonus = Math.floor(stackSize * stackSize * scoring.stackMultiplier);
    const totalPoints = Math.floor((basePoints + heightBonus) * this.currentMultiplier);

    this.score += totalPoints;
    this.bankedAnimals += stackSize;

    // Check for level up based on score threshold
    const newLevel = Math.floor(this.score / difficulty.levelUpThreshold) + 1;
    if (newLevel > this.level && newLevel <= difficulty.maxLevel) {
      this.level = newLevel;
      this.spawnInterval = Math.max(
        spawning.minInterval,
        spawning.initialInterval - (this.level - 1) * spawning.intervalDecreasePerLevel
      );
      this.callbacks.onLevelUp(this.level);
    }

    // Convert stacked entities to banking state
    const bankTarget = new Vector3(9, 2, 0); // Off-screen right
    for (const entity of stackedEntities) {
      convertToBanking(entity, bankTarget.x, bankTarget.y);
    }

    // Update UI
    this.callbacks.onScoreChange(this.score, this.currentMultiplier, this.combo);
    this.callbacks.onBankComplete(this.bankedAnimals);
    this.callbacks.onStackChange(0, false);
    this.callbacks.onParticleEffect("bank", new Vector3(this.playerWorldX, this.playerWorldY + 2, 0));

    feedback.play("land");
  }

  // ============================================================
  // GAME LOOP
  // ============================================================

  private gameLoop = (): void => {
    if (!this.isPlaying || this.isPaused) return;

    const now = performance.now();
    const deltaTime = Math.min(now - this.lastFrameTime, 50); // Cap at 50ms
    this.lastFrameTime = now;

    this.update(deltaTime);

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    // Update screen shake
    this.screenShake *= 0.9;
    if (this.screenShake > 0.01) {
      this.callbacks.onScreenShake(this.screenShake);
    }

    // Update timers
    this.timeSinceLastPowerUp += deltaTime;
    this.timeSinceLastMiss += deltaTime;
    this.timeSinceLastPerfect += deltaTime;

    // Update active power-ups
    this.updateActivePowerUps();

    // Update player position in ECS
    this.updatePlayerEntity();

    // Run ECS systems
    this.runECSSystems(deltaTime / 1000);

    // Update game director and spawning
    this.updateGameDirector(deltaTime);
    this.updateSpawning();

    // Check for catches
    this.checkCatches();

    // Update stacked animals
    this.updateStackedAnimals(deltaTime);

    // Check for misses (animals hitting floor)
    this.checkMisses();

    // Handle auto-player for E2E testing
    if (isAutoPlayerEnabled()) {
      this.updateAutoPlayer();
    }
  }

  private updatePlayerEntity(): void {
    if (!this.playerEntity) return;

    // Update ECS entity position
    if (this.playerEntity.position) {
      this.playerEntity.position.x = this.playerWorldX;
      this.playerEntity.position.y = this.playerWorldY;
    }

    // Apply wobble from stack
    if (this.playerEntity.wobble) {
      const stackHeight = this.getStackHeight();
      const wobbleAmount = this.wobbleGovernor.calculateWobble(
        stackHeight,
        this.playerVelocity,
        this.inDangerState
      );
      this.playerEntity.wobble.velocity += wobbleAmount * 0.01;
    }

    // Decay player velocity
    this.playerVelocity *= 0.95;
  }

  private runECSSystems(deltaTime: number): void {
    runAllSystems(
      deltaTime,
      this.playerEntity,
      this.screenWidth,
      this.screenHeight,
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
          this.handleStackTopple();
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
          if (target.id) {
            world.remove(target);
          }
          this.score += Math.floor(scoring.fireKillBonus * this.currentMultiplier);
          this.callbacks.onScoreChange(this.score, this.currentMultiplier, this.combo);
          feedback.play("land");
        },
        onShatter: (_entity) => {
          feedback.play("land");
        },
        onThawComplete: (_entity) => {
          // Entity transitions back to falling automatically
        },
      }
    );
  }

  private updateGameDirector(deltaTime: number): void {
    const now = performance.now();
    const gameTime = now - this.gameStartTime;

    const totalAttempts = this.recentCatches + this.recentMisses;
    const catchRate = totalAttempts > 0 ? this.recentCatches / totalAttempts : 0.5;

    const state: GameState = {
      playerX: worldToScreen(
        new Vector3(this.playerWorldX, this.playerWorldY, 0),
        this.screenWidth,
        this.screenHeight
      ).x,
      playerY: worldToScreen(
        new Vector3(this.playerWorldX, this.playerWorldY, 0),
        this.screenWidth,
        this.screenHeight
      ).y,
      stackHeight: this.getStackHeight(),
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
      activeDucks: getFallingEntities().length,
      activePowerUps: this.activePowerUps.size,
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      level: this.level,
      bankedDucks: this.bankedAnimals,
    };

    this.gameDirector.updateGameState(state);
    this.gameDirector.update(deltaTime / 1000);

    // Decay recent stats periodically
    if (gameTime > 0 && Math.floor(gameTime / 10000) > Math.floor((gameTime - deltaTime) / 10000)) {
      this.recentCatches = Math.floor(this.recentCatches * 0.7);
      this.recentMisses = Math.floor(this.recentMisses * 0.7);
      this.recentPerfects = Math.floor(this.recentPerfects * 0.7);
    }
  }

  private updateSpawning(): void {
    const now = performance.now();

    // Check if game director wants to spawn
    const spawnDecisions = this.gameDirector.getSpawnDecisions();

    for (const decision of spawnDecisions) {
      this.spawnAnimal(decision);
      this.lastSpawnTime = now;
    }

    // Check for power-up spawns
    const powerUpDecisions = this.gameDirector.getPowerUpDecisions();
    for (const decision of powerUpDecisions) {
      this.spawnPowerUp(decision);
      this.timeSinceLastPowerUp = 0;
    }
  }

  private spawnAnimal(decision: import("../ai/GameDirector").SpawnDecision): void {
    // Validate animal type
    const animalType = decision.duckType as AnimalType;
    const config = ANIMAL_TYPES[animalType];
    if (!config || !config.hasModel) {
      console.warn(`Cannot spawn animal type: ${animalType} - no model`);
      return;
    }

    // Convert screen position to world position
    const worldPos = screenToWorld(decision.x, -50, this.screenWidth, this.screenHeight);
    worldPos.y = 8; // Spawn above visible area

    // Create ECS entity
    const entity = createFallingAnimal(
      animalType,
      worldPos,
      this.playerWorldX,
      this.playerWorldY + this.getStackHeight() * 0.8,
      decision.behaviorType
    );

    // Set initial velocity
    if (entity.velocity) {
      entity.velocity.x = decision.initialVelocityX * 0.01;
      entity.velocity.y = decision.initialVelocityY * 0.01;
    }

    world.add(entity);
  }

  private spawnPowerUp(decision: import("../ai/GameDirector").PowerUpDecision): void {
    // Power-ups are now ECS entities too
    const worldPos = screenToWorld(decision.x, -50, this.screenWidth, this.screenHeight);
    worldPos.y = 8;

    const entity: Entity = {
      id: crypto.randomUUID(),
      position: worldPos,
      velocity: new Vector3(0, -0.05, 0),
      tag: { type: "powerup", subtype: decision.type },
    };

    world.add(entity);
  }

  private checkCatches(): void {
    const fallingEntities = getFallingEntities();
    const stackHeight = this.getStackHeight();

    // Catch zone is around the top of the stack
    const catchY = this.playerWorldY + stackHeight * 0.8 + 0.5;
    const catchRadius = 1.5;

    for (const entity of fallingEntities) {
      if (!entity.position || !entity.falling) continue;

      const dx = entity.position.x - this.playerWorldX;
      const dy = entity.position.y - catchY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if entity is in catch zone
      if (distance < catchRadius && entity.velocity && entity.velocity.y < 0) {
        // Caught!
        const isPerfect = distance < catchRadius * 0.3;

        this.handleCatch(entity, isPerfect);
      }
    }

    // Also check power-up collection
    this.checkPowerUpCollection();
  }

  private handleCatch(entity: Entity, isPerfect: boolean): void {
    if (!entity.falling || !entity.position) return;

    // Convert to stacked
    const stackIndex = this.getStackHeight();
    const stackOffset = (Math.random() - 0.5) * 0.3; // Slight random offset

    convertToStacked(entity, stackIndex, stackOffset, this.playerEntity?.id || "");

    // Update position to stack position
    entity.position.x = this.playerWorldX + stackOffset;
    entity.position.y = this.playerWorldY + stackIndex * 0.8;

    // Squish animation
    squishEntity(entity, 0.85, 1.15);

    // Update score
    this.recentCatches++;
    this.combo++;

    if (isPerfect) {
      this.recentPerfects++;
      this.timeSinceLastPerfect = 0;
      this.currentMultiplier = Math.min(
        scoring.maxMultiplier,
        this.currentMultiplier + scoring.perfectMultiplierBonus
      );
      this.callbacks.onPerfectCatch(entity.position.clone());
      this.callbacks.onParticleEffect("perfect", entity.position.clone());
      feedback.perfectCatch();
    } else {
      this.callbacks.onGoodCatch(entity.position.clone());
      this.callbacks.onParticleEffect("good", entity.position.clone());
      feedback.play("land");
    }

    // Base score
    const points = Math.floor(scoring.basePoints * this.currentMultiplier);
    this.score += points;

    // Update UI
    this.callbacks.onScoreChange(this.score, this.currentMultiplier, this.combo);
    this.callbacks.onStackChange(this.getStackHeight(), this.canBank());
  }

  private checkPowerUpCollection(): void {
    const powerUpEntities = world.with("tag").entities.filter(
      (e) => e.tag?.type === "powerup"
    );

    const collectRadius = 1.5;

    for (const entity of powerUpEntities) {
      if (!entity.position) continue;

      const dx = entity.position.x - this.playerWorldX;
      const dy = entity.position.y - this.playerWorldY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < collectRadius) {
        const powerUpType = entity.tag?.subtype as PowerUpType;
        this.collectPowerUp(powerUpType);
        world.remove(entity);
      }
    }
  }

  private collectPowerUp(type: PowerUpType): void {
    const config = POWER_UPS[type];
    if (!config) return;

    // Apply power-up effect
    switch (type) {
      case "multiplier":
        this.currentMultiplier = Math.min(scoring.maxMultiplier, this.currentMultiplier + 1);
        break;
      case "slowmo":
        // Slow down spawning temporarily
        this.activePowerUps.set(type, { expiresAt: performance.now() + config.duration });
        break;
      case "shield":
        // Extra life
        this.lives = Math.min(this.maxLives, this.lives + 1);
        this.callbacks.onLivesChange(this.lives, this.maxLives);
        break;
      case "magnet":
        // Attract nearby animals (handled in update loop)
        this.activePowerUps.set(type, { expiresAt: performance.now() + config.duration });
        break;
      case "freeze":
        // Freeze all falling animals
        const falling = getFallingEntities();
        for (const entity of falling) {
          freezeEntity(entity, config.duration);
        }
        this.callbacks.onAnimalFrozen();
        break;
      case "fireball":
        // Give player a fireball shot
        this.shootFireball();
        break;
    }

    this.callbacks.onPowerUpCollected(type);
    this.callbacks.onParticleEffect("powerup", new Vector3(this.playerWorldX, this.playerWorldY, 0));
  }

  private shootFireball(): void {
    const direction = Math.random() > 0.5 ? 1 : -1;
    const fireball = createFireballEntity(
      this.playerWorldX,
      this.playerWorldY + this.getStackHeight() * 0.8,
      direction as 1 | -1
    );
    world.add(fireball);
    this.callbacks.onFireballShot();
  }

  private updateActivePowerUps(): void {
    const now = performance.now();

    for (const [type, data] of this.activePowerUps.entries()) {
      if (now >= data.expiresAt) {
        this.activePowerUps.delete(type);
      }
    }
  }

  private checkMisses(): void {
    const fallingEntities = getFallingEntities();
    const floorY = -3; // Below visible area

    for (const entity of fallingEntities) {
      if (!entity.position) continue;

      if (entity.position.y < floorY) {
        this.handleMiss(entity);
      }
    }
  }

  private handleMiss(entity: Entity): void {
    // Remove entity
    world.remove(entity);

    // Update stats
    this.recentMisses++;
    this.timeSinceLastMiss = 0;
    this.combo = 0;
    this.currentMultiplier = Math.max(1, this.currentMultiplier - 0.5);

    // Lose a life
    this.lives--;
    this.callbacks.onLivesChange(this.lives, this.maxLives);
    this.callbacks.onMiss();

    // Screen shake
    this.screenShake = Math.max(this.screenShake, 0.3);

    feedback.play("miss");

    // Check game over
    if (this.lives <= 0) {
      this.handleGameOver();
    }
  }

  private handleStackTopple(): void {
    const stackedEntities = getStackedEntitiesSorted();

    // Convert all stacked to scattering
    for (const entity of stackedEntities) {
      convertToScattering(entity);
    }

    // Lose lives based on stack size
    const livesLost = Math.min(this.lives, Math.ceil(stackedEntities.length / 3));
    this.lives -= livesLost;

    // Reset combo
    this.combo = 0;
    this.currentMultiplier = 1;

    // Big screen shake
    this.screenShake = 1;

    // Update UI
    this.callbacks.onLivesChange(this.lives, this.maxLives);
    this.callbacks.onStackChange(0, false);
    this.callbacks.onStackTopple();
    this.callbacks.onParticleEffect("topple", new Vector3(this.playerWorldX, this.playerWorldY + 2, 0));

    feedback.play("topple");

    if (this.lives <= 0) {
      this.handleGameOver();
    }
  }

  private updateStackedAnimals(deltaTime: number): void {
    const stackedEntities = getStackedEntitiesSorted();

    // Update positions to follow player
    for (let i = 0; i < stackedEntities.length; i++) {
      const entity = stackedEntities[i];
      if (!entity.position || !entity.stacked) continue;

      // Follow player X with slight delay
      const targetX = this.playerWorldX + entity.stacked.stackOffset;
      entity.position.x += (targetX - entity.position.x) * 0.2;

      // Update Y position
      entity.position.y = this.playerWorldY + (i + 1) * 0.8;
    }
  }

  private handleGameOver(): void {
    this.isPlaying = false;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.callbacks.onGameOver(this.score, this.bankedAnimals);
  }

  private updateAutoPlayer(): void {
    const falling = getFallingEntities();
    const autoPlayerState: AutoPlayerGameState = {
      playerX: this.playerWorldX,
      stackHeight: this.getStackHeight(),
      incomingDucks: falling.map((e) => ({
        x: e.position?.x ?? 0,
        y: e.position?.y ?? 0,
        velocityX: e.velocity?.x ?? 0,
        velocityY: e.velocity?.y ?? 0,
      })),
      canBank: this.canBank(),
    };

    const targetX = this.autoPlayerIntegration.update(autoPlayerState);
    if (targetX !== null) {
      this.playerWorldX += (targetX - this.playerWorldX) * 0.1;
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private getStackHeight(): number {
    return getStackedEntitiesSorted().length;
  }

  private canBank(): boolean {
    return this.getStackHeight() >= banking.minStackToBank;
  }
}
