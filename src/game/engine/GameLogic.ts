/**
 * GameLogic - Pure game logic engine with NO rendering dependencies
 *
 * Deterministic logic using seedrandom.
 * NO Yuka.
 */

import { Vector3, Color3 } from "@babylonjs/core";
import { feedback } from "@/platform";
import { ANIMAL_TYPES, GAME_CONFIG, POWER_UPS, type AnimalType, type PowerUpType } from "../config";
import { world } from "../ecs/world";
import { forkRng } from "../seed/SeedManager";
import {
  createPlayer,
  createFallingAnimal,
  createFireballEntity,
  convertToStacked,
  convertToBanking,
  convertToScattering,
} from "../ecs/archetypes";
import { Entity } from "../ecs/components";
import {
  runAllSystems,
  getStackedEntitiesSorted,
  getFallingEntities,
  squishEntity,
  freezeEntity,
  propagateWobbleFromBase,
  applyWobble,
  type TippingState,
} from "../ecs/systems";
import { type GameModeType, GAME_MODES } from "../modes/GameMode";
import { getUpgradeModifiers } from "../progression/Upgrades";
import { DropController } from "../ai/DropController";
import { WobbleGovernor } from "../ai/WobbleGovernor";
import type { PlayerState } from "../ai/types";
import { PLAYER_RAIL_CONFIG, TORNADO_RAIL_CONFIG, clampToRail, getRailY } from "../rails";
import type { PhysicsCatchEvent } from "../../features/gameplay/scene/components/PhysicsCollisionBridge";

// Conditionally import DevAPI only in dev builds (tree-shaken in production)
let devAPI: import("../debug/DevAPI").DevAPIImpl | null = null;
if (import.meta.env.DEV) {
  import("../debug/DevAPI").then((mod) => {
    devAPI = mod.devAPI;
  });
}

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

/** Y coordinate where animals spawn — matches the tornado rail position. */
const SPAWN_Y = getRailY(TORNADO_RAIL_CONFIG);

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
  onFireballShot: () => void;
  onAnimalFrozen: () => void;
  onScreenShake: (intensity: number) => void;
  onParticleEffect: (type: string, position: Vector3) => void;
}

export class GameLogic {
  private score = 0;
  private combo = 0;
  private currentMultiplier = 1;
  private level = 1;
  private lives: number = livesConfig.starting;
  private maxLives: number = livesConfig.max;
  private bankedAnimals = 0;
  private inDangerState = false;
  private screenShake = 0;

  private playerEntity: Entity | null = null;
  private playerWorldX = 0;
  private playerWorldY = -2;
  private isDragging = false;
  private lastDragWorldX = 0;
  private dragDistance = 0;
  private playerVelocity = 0;

  private lastSpawnTime = 0;
  private gameStartTime = 0;
  private gameTime = 0;
  private gameRNG = forkRng("gameplay");

  private animationId: number | null = null;
  private lastFrameTime = 0;
  private accumulator = 0;
  private readonly FIXED_TIMESTEP = 1000 / 60; // 60 Hz physics

  // --- Restored gameplay state ---
  private lastCatchTime = 0;
  private perfectStreak = 0;
  private lastScoreForLifeBonus = 0;

  // Invincibility after taking a hit
  private invincibleUntil = 0;

  // Active power-up timers
  private magnetActive = false;
  private magnetUntil = 0;
  private xAttackActive = false;
  private xAttackUntil = 0;
  private xAttackMultiplier = 1;
  private lastPowerUpSpawnTime = 0;

  // AI systems
  private dropController: DropController;
  private wobbleGovernor: WobbleGovernor;

  // Physics collision queue (populated by PhysicsCollisionBridge, consumed each fixedUpdate)
  private physicsCollisionQueue: PhysicsCatchEvent[] = [];

  // PlayerState tracking for AI director
  private recentCatches = 0;
  private recentMisses = 0;
  private recentPerfects = 0;
  private totalCatches = 0;
  private totalMisses = 0;
  private timeSinceLastMiss = Infinity;
  private timeSinceLastPerfect = Infinity;

  // Game mode
  private gameMode: GameModeType = "endless";
  private modeTimeRemaining = 0; // For time_attack mode (ms)
  private lastBossSpawnTime = 0; // For boss_rush mode

  // Upgrade modifiers (applied at game start)
  private upgradeModifiers = {
    extraLives: 0,
    wobbleReduction: 0,
    coinMultiplier: 1,
    powerUpRadius: 1,
    comboDecayMultiplier: 1,
    abilityCooldownReduction: 0,
    powerUpSpawnBonus: 1,
    specialDuckBonus: 0,
  };

  private callbacks: GameCallbacks;

  isPlaying = false;
  isPaused = false;

  private onVisibilityChange = (): void => {
    if (document.visibilityState === "visible" && this.isPlaying && !this.isPaused) {
      // Tab became visible again — restart rAF chain
      this.lastFrameTime = performance.now();
      this.accumulator = 0;
      if (this.animationId) cancelAnimationFrame(this.animationId);
      this.animationId = requestAnimationFrame(this.gameLoop);
    }
  };

  constructor(callbacks: GameCallbacks) {
    this.callbacks = callbacks;
    this.dropController = new DropController(GAME_CONFIG);
    this.wobbleGovernor = new WobbleGovernor(GAME_CONFIG);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  start(characterId: "farmer_john" | "farmer_mary", mode: GameModeType = "endless"): void {
    world.clear();
    this.gameRNG = forkRng(`gameplay-${performance.now()}`);

    // Apply upgrade modifiers before setting initial state
    this.upgradeModifiers = getUpgradeModifiers();

    // Game mode setup
    this.gameMode = mode;
    const modeConfig = GAME_MODES[mode];
    this.modeTimeRemaining = modeConfig.hasTimer ? (modeConfig.timerSeconds ?? 90) * 1000 : 0;
    this.lastBossSpawnTime = 0;

    this.score = 0;
    this.combo = 0;
    this.currentMultiplier = 1;
    this.level = 1;
    this.lives = livesConfig.starting + this.upgradeModifiers.extraLives;
    this.maxLives = livesConfig.max + this.upgradeModifiers.extraLives;
    this.bankedAnimals = 0;
    this.inDangerState = false;
    this.lastCatchTime = 0;
    this.perfectStreak = 0;
    this.lastScoreForLifeBonus = 0;
    this.invincibleUntil = 0;
    this.magnetActive = false;
    this.magnetUntil = 0;
    this.xAttackActive = false;
    this.xAttackUntil = 0;
    this.xAttackMultiplier = 1;
    this.lastPowerUpSpawnTime = 0;

    // Reset AI tracking state
    this.recentCatches = 0;
    this.recentMisses = 0;
    this.recentPerfects = 0;
    this.totalCatches = 0;
    this.totalMisses = 0;
    this.timeSinceLastMiss = Infinity;
    this.timeSinceLastPerfect = Infinity;

    // Recreate AI systems for fresh state
    this.dropController = new DropController(GAME_CONFIG);
    this.wobbleGovernor = new WobbleGovernor(GAME_CONFIG);

    this.playerWorldX = 0;
    const playerPos = new Vector3(this.playerWorldX, this.playerWorldY, 0);
    this.playerEntity = createPlayer(characterId, playerPos);
    world.add(this.playerEntity);

    this.isPlaying = true;
    this.isPaused = false;
    this.accumulator = 0;
    this.gameTime = 0;
    this.lastFrameTime = performance.now();
    this.gameStartTime = this.lastFrameTime;

    // Start loop
    this.gameLoop(this.lastFrameTime);

    this.callbacks.onScoreChange(0, 1, 0);
    this.callbacks.onStackChange(0, false);
    this.callbacks.onLivesChange(this.lives, this.maxLives);

    // E2E Control API (legacy - kept for backward compat)
    if (typeof window !== "undefined") {
      (window as any).GAME_CONTROL = {
        movePlayerTo: (x: number) => {
          this.playerWorldX = x;
          if (this.playerEntity?.position) this.playerEntity.position.x = x;
        },
        spawnAnimalAt: (x: number, type: AnimalType = "cow") => {
          const entity = createFallingAnimal(type, new Vector3(x, SPAWN_Y, 0), x, -2);
          if (entity.falling) entity.falling.spawnTime = this.gameTime;
          world.add(entity);
        },
        setLives: (n: number) => {
          console.log("Setting lives to", n);
          this.lives = n;
          this.callbacks.onLivesChange(this.lives, this.maxLives);
        },
        getStackHeight: () => getStackedEntitiesSorted().length,
      };
    }

    // Bind DevAPI (dev builds only)
    if (import.meta.env.DEV && devAPI) {
      devAPI.bind(this);
    }
  }

  gameOver(): void {
    console.log("GAME OVER TRIGGERED");
    this.isPlaying = false;
    feedback.stopMusic();
    feedback.play("fail");
    this.callbacks.onGameOver(this.score, this.bankedAnimals);
  }

  pause(): void {
    if (this.isPlaying && !this.isPaused) {
      this.isPaused = true;
      if (this.animationId) cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.lastFrameTime = performance.now();
      this.gameLoop(this.lastFrameTime);
    }
  }

  destroy(): void {
    this.isPlaying = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    world.clear();
    if (typeof window !== "undefined") {
      delete (window as any).GAME_CONTROL;
    }
    // Unbind DevAPI
    if (import.meta.env.DEV && devAPI) {
      devAPI.unbind();
    }
  }

  handlePointerDown(worldX: number): void {
    if (!this.isPlaying || this.isPaused) return;
    this.isDragging = true;
    this.lastDragWorldX = worldX;
    this.dragDistance = 0;
  }

  handlePointerMove(worldX: number): void {
    if (!this.isDragging || this.isPaused) return;
    const deltaX = worldX - this.lastDragWorldX;
    this.lastDragWorldX = worldX;
    this.dragDistance += Math.abs(deltaX);
    this.movePlayer(deltaX);
  }

  handlePointerUp(): void {
    if (this.isDragging && this.dragDistance < 0.1) {
      this.isPaused ? this.resume() : this.pause();
    }
    this.isDragging = false;
  }

  movePlayer(deltaX: number): void {
    this.playerWorldX = clampToRail(this.playerWorldX + deltaX, PLAYER_RAIL_CONFIG);
    if (this.playerEntity?.position) {
      this.playerEntity.position.x = this.playerWorldX;
    }
    // Write velocity to entity so AnimationSystem can determine walk/idle/run
    if (this.playerEntity?.velocity) {
      this.playerEntity.velocity.x = deltaX * 60;
    }
    this.playerVelocity = deltaX * 60;
  }

  bankStack(): void {
    const stacked = getStackedEntitiesSorted();
    if (stacked.length < banking.minStackToBank) return;

    const stackSize = stacked.length;

    // Banking life bonus: bank enough animals to earn a life
    if (stackSize >= livesConfig.earnThresholds.bankingBonus) {
      this.earnLife();
    }

    // Score using bankingBonusPerDuck (not just basePoints)
    const modeScoreMultiplier = GAME_MODES[this.gameMode].scoreMultiplier;
    const bankBonus = stackSize * scoring.bankingBonusPerDuck * this.currentMultiplier * modeScoreMultiplier;
    this.score += Math.floor(bankBonus);
    this.bankedAnimals += stackSize;

    const bankTarget = new Vector3(9, 2, 0);
    for (const entity of stacked) {
      convertToBanking(entity, bankTarget.x, bankTarget.y);
    }

    // Apply banking multiplier penalty (banking is safe, so reduce multiplier)
    this.currentMultiplier = Math.max(1, this.currentMultiplier * scoring.bankingPenalty);

    // Notify AI systems of successful bank
    this.dropController.onBankSuccess(stackSize);
    this.wobbleGovernor.onBankSuccess();

    this.callbacks.onScoreChange(this.score, this.currentMultiplier, this.combo);
    this.callbacks.onBankComplete(this.bankedAnimals);
    this.callbacks.onStackChange(0, false);
    feedback.play("bank");
  }

  private gameLoop = (timestamp: number): void => {
    if (!this.isPlaying || this.isPaused) return;

    const frameTime = Math.min(timestamp - this.lastFrameTime, 100);
    this.lastFrameTime = timestamp;

    // Apply game speed multiplier from DevAPI
    const speedMultiplier = (import.meta.env.DEV && devAPI) ? devAPI.gameSpeedMultiplier : 1;
    this.accumulator += frameTime * speedMultiplier;

    while (this.accumulator >= this.FIXED_TIMESTEP) {
      this.fixedUpdate(this.FIXED_TIMESTEP);
      this.accumulator -= this.FIXED_TIMESTEP;
      this.gameTime += this.FIXED_TIMESTEP;
    }

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private fixedUpdate(deltaTime: number): void {
    const modeConfig = GAME_MODES[this.gameMode];

    // Time Attack mode timer
    if (modeConfig.hasTimer && this.modeTimeRemaining > 0) {
      this.modeTimeRemaining -= deltaTime;
      if (this.modeTimeRemaining <= 0) {
        this.modeTimeRemaining = 0;
        this.gameOver();
        return;
      }
    }

    // Logarithmic leveling
    const nextLevelThreshold = Math.floor(100 * Math.pow(1.5, this.level - 1));
    if (this.score >= nextLevelThreshold) {
      this.level++;
      this.dropController.onLevelUp(this.level);
      this.wobbleGovernor.setGameLevel(this.level);
      this.callbacks.onLevelUp(this.level);
    }

    // Decay player velocity when not actively dragging
    if (this.playerEntity?.velocity && !this.isDragging) {
      this.playerEntity.velocity.x *= 0.85;
      if (Math.abs(this.playerEntity.velocity.x) < 0.1) {
        this.playerEntity.velocity.x = 0;
      }
    }

    // Check DevAPI spawn pause flag
    const isSpawnPaused = import.meta.env.DEV && devAPI?.spawnPaused;

    // Advance AI director tracking timers
    this.timeSinceLastMiss += deltaTime;
    this.timeSinceLastPerfect += deltaTime;

    // Build PlayerState for the AI director
    const fallingEntities = getFallingEntities();
    const stackedEntities = getStackedEntitiesSorted();
    const activePowerUpCount = (this.magnetActive ? 1 : 0) + (this.xAttackActive ? 1 : 0);
    const catchRate = (this.totalCatches + this.totalMisses) > 0
      ? this.totalCatches / (this.totalCatches + this.totalMisses)
      : 0.5;

    // Convert world-space player position to screen-space for controller
    const screenWidth = 1920;
    const screenHeight = 1080;
    const playerScreenX = (this.playerWorldX + 8) / 16 * screenWidth;

    // Build stack composition for Yahtzee-aware type selection
    const stackComposition = {} as Record<AnimalType, number>;
    for (const entity of stackedEntities) {
      const subtype = entity.tag?.subtype as AnimalType;
      if (subtype) {
        stackComposition[subtype] = (stackComposition[subtype] || 0) + 1;
      }
    }

    const playerState: PlayerState = {
      playerX: playerScreenX,
      playerY: this.playerWorldY,
      stackHeight: stackedEntities.length,
      lives: this.lives,
      maxLives: this.maxLives,
      score: this.score,
      combo: this.combo,
      gameTime: this.gameTime,
      timeSinceLastSpawn: this.gameTime - this.lastSpawnTime,
      timeSinceLastPowerUp: this.gameTime - this.lastPowerUpSpawnTime,
      timeSinceLastMiss: this.timeSinceLastMiss,
      timeSinceLastPerfect: this.timeSinceLastPerfect,
      recentCatches: this.recentCatches,
      recentMisses: this.recentMisses,
      recentPerfects: this.recentPerfects,
      catchRate,
      activeDucks: fallingEntities.length,
      activePowerUps: activePowerUpCount,
      screenWidth,
      screenHeight,
      level: this.level,
      bankedAnimals: this.bankedAnimals,
      stackComposition,
    };

    // Director-driven spawning
    if (!isSpawnPaused) {
      const spawnDecision = this.dropController.update(deltaTime, playerState);
      if (spawnDecision && spawnDecision.shouldSpawn) {
        // Convert director screen-space X back to world-space
        const worldSpawnX = (spawnDecision.x / screenWidth) * 16 - 8;
        this.spawnAnimalFromDirector(
          spawnDecision.duckType,
          worldSpawnX,
          spawnDecision.behaviorType as "normal" | "seeker" | "evader" | "zigzag" | "swarm" | "dive" | "floater",
        );
        this.lastSpawnTime = this.gameTime;
      } else if (!spawnDecision) {
        // Fallback: simple spawn logic if director returns null
        const baseInterval = Math.max(500, 2000 / Math.log2(this.level + 1));
        const spawnInterval = baseInterval / modeConfig.spawnRateMultiplier;
        if (this.gameTime - this.lastSpawnTime > spawnInterval) {
          this.spawnAnimal();
          this.lastSpawnTime = this.gameTime;
        }
      }
    }

    // Director-driven power-up spawning (only at level 2+)
    if (
      !isSpawnPaused &&
      this.level >= powerUpConfig.minLevelToSpawn
    ) {
      const powerUpType = this.dropController.shouldSpawnPowerUp();
      if (powerUpType) {
        this.spawnPowerUp();
        this.lastPowerUpSpawnTime = this.gameTime;
      } else if (this.gameTime - this.lastPowerUpSpawnTime > powerUpConfig.spawnInterval) {
        // Fallback: original random power-up logic
        const spawnChance = powerUpConfig.baseSpawnChance * this.upgradeModifiers.powerUpSpawnBonus;
        if (this.gameRNG() < spawnChance) {
          this.spawnPowerUp();
        }
        this.lastPowerUpSpawnTime = this.gameTime;
      }
    }

    // Expire active power-up timers
    if (this.magnetActive && this.gameTime > this.magnetUntil) {
      this.magnetActive = false;
    }
    if (this.xAttackActive && this.gameTime > this.xAttackUntil) {
      this.xAttackActive = false;
      this.xAttackMultiplier = 1;
    }

    // Combo decay
    const comboDecayTime = scoring.comboDecayTime * this.upgradeModifiers.comboDecayMultiplier;
    if (this.combo > 0 && this.gameTime - this.lastCatchTime > comboDecayTime) {
      this.combo = 0;
      this.callbacks.onScoreChange(this.score, this.currentMultiplier, this.combo);
    }

    // Wobble based on weights (with upgrade reduction)
    this.updateWobble();

    // Run Systems
    runAllSystems(deltaTime, this.playerEntity, 1920, 1080, {
      onTopple: () => this.handleTopple(),
      onDangerStateChange: (d) => {
        if (d !== this.inDangerState) {
          this.inDangerState = d;
          this.callbacks.onDangerState(d);
        }
      }
    });

    // Process physics-based catches first, then check for misses/fallback
    this.processPhysicsCollisions();
    this.checkCollisions();
    this.checkPowerUpCollisions();

    // Magnetic pull for falling animals when great_ball is active
    if (this.magnetActive) {
      const falling = getFallingEntities();
      for (const f of falling) {
        if (!f.position) continue;
        const dx = this.playerWorldX - f.position.x;
        const pullStrength = 0.08;
        f.position.x += dx * pullStrength;
      }
    }

    // Cleanup banking/scattering entities that have outlived their animation
    this.cleanupTransientEntities();
  }

  private spawnAnimal(): void {
    const types: AnimalType[] = ["cow", "pig", "chicken", "duck", "sheep"];
    const type = types[Math.floor(this.gameRNG() * types.length)];
    const spawnX = (this.gameRNG() - 0.5) * 15;
    const targetX = this.playerWorldX + (this.gameRNG() - 0.5) * 2;

    const entity = createFallingAnimal(type, new Vector3(spawnX, SPAWN_Y, 0), targetX, -2);
    // Sync spawn time
    if (entity.falling) entity.falling.spawnTime = this.gameTime;
    world.add(entity);

    // Check DevAPI freeze-next flag
    if (import.meta.env.DEV && devAPI?.freezeNextAnimal) {
      freezeEntity(entity, 5000);
      devAPI.consumeFreezeNext();
      this.callbacks.onAnimalFrozen();
    }
  }

  private spawnAnimalFromDirector(
    duckType: AnimalType,
    spawnX: number,
    behaviorType: "normal" | "seeker" | "evader" | "zigzag" | "swarm" | "dive" | "floater",
  ): void {
    const targetX = this.playerWorldX + (this.gameRNG() - 0.5) * 2;

    const entity = createFallingAnimal(
      duckType,
      new Vector3(spawnX, SPAWN_Y, 0),
      targetX,
      -2,
      behaviorType,
    );
    // Sync spawn time
    if (entity.falling) {
      entity.falling.spawnTime = this.gameTime;
    }
    world.add(entity);

    // Check DevAPI freeze-next flag
    if (import.meta.env.DEV && devAPI?.freezeNextAnimal) {
      freezeEntity(entity, 5000);
      devAPI.consumeFreezeNext();
      this.callbacks.onAnimalFrozen();
    }
  }

  private updateWobble(): void {
    if (!this.playerEntity?.wobble) return;
    const stacked = getStackedEntitiesSorted();
    let totalWeight = 0;
    for (const s of stacked) {
      const sub = s.tag?.subtype as AnimalType;
      totalWeight += ANIMAL_TYPES[sub]?.weight || 1;
    }
    // More weight = more wobble sensitivity, reduced by stable_stack upgrade
    const wobbleReduction = 1 - this.upgradeModifiers.wobbleReduction;
    const baseSpringiness = (0.05 + (totalWeight * 0.01)) * wobbleReduction;

    // WobbleGovernor adds AI-driven wobble pressure on top of weight-based springiness
    this.wobbleGovernor.update(this.FIXED_TIMESTEP, stacked.length, this.inDangerState);
    const governorForce = this.wobbleGovernor.getWobbleForce();

    this.playerEntity.wobble.springiness = baseSpringiness + governorForce;
  }

  private checkCollisions(): void {
    const falling = getFallingEntities();

    const modeConfig = GAME_MODES[this.gameMode];

    // Check DevAPI invincibility
    const isDevInvincible = import.meta.env.DEV && devAPI?.invincible;
    // Zen mode never loses lives, time_attack has no lives system
    const isInvincible = isDevInvincible ||
      this.gameTime < this.invincibleUntil ||
      !modeConfig.hasLives;

    // Max time a falling entity can exist before forced cleanup (safety net
    // for entities stuck on physics bodies that physics-catch didn't process)
    const MAX_FALL_TIME_MS = 8000;

    for (const f of falling) {
      if (!f.position) continue;

      // Time-based cleanup: if a falling entity has existed too long, treat as miss.
      // This catches entities stuck on physics bodies that weren't processed as catches.
      if (f.falling && (this.gameTime - f.falling.spawnTime) > MAX_FALL_TIME_MS) {
        world.remove(f);
        this.dropController.onAnimalMissed();
        this.totalMisses++;
        this.recentMisses++;
        this.timeSinceLastMiss = 0;
        if (!isInvincible) {
          this.loseLife("miss");
        } else {
          this.callbacks.onMiss();
        }
        continue;
      }

      // Y-threshold miss detection: animal fell below the floor
      if (f.position.y < -4) {
        world.remove(f);
        // Notify AI director of missed animal regardless of invincibility
        this.dropController.onAnimalMissed();
        this.totalMisses++;
        this.recentMisses++;
        this.timeSinceLastMiss = 0;
        if (!isInvincible) {
          this.loseLife("miss");
        } else {
          // Still fire miss callback for visual feedback
          this.callbacks.onMiss();
        }
        continue;
      }

      // Distance-based catch fallback for when physics collision doesn't trigger
      // (e.g., fast-moving entities or physics engine edge cases)
      const stackedCount = getStackedEntitiesSorted().length;
      const catchY = this.playerWorldY + stackedCount * 0.8 + 0.5;
      const dist = Math.abs(f.position.x - this.playerWorldX);
      const dy = Math.abs(f.position.y - catchY);

      // Widen catch window: Y tolerance accounts for physics bodies settling
      // on top of the player, and X tolerance matches physics box width
      if (dist < collision.hitTolerance && dy < 1.2) {
        this.handleCatch(f, dist);
      }
    }
  }

  // =========================================================================
  // Physics collision queue (populated by PhysicsCollisionBridge)
  // =========================================================================

  /** Called by PhysicsCollisionBridge when a falling entity collides with player/stacked. */
  pushCollisionEvent(event: PhysicsCatchEvent): void {
    this.physicsCollisionQueue.push(event);
  }

  /** Process queued physics collision events as catches. */
  private processPhysicsCollisions(): void {
    if (this.physicsCollisionQueue.length === 0) return;

    const fallingEntities = getFallingEntities();

    for (const event of this.physicsCollisionQueue) {
      // Find the falling entity
      const falling = fallingEntities.find(f => f.id === event.fallingEntityId);
      if (!falling || !falling.falling) continue; // Already caught or removed

      // Calculate catch quality from contact point X offset
      const offsetX = Math.abs(event.contactPointX - this.playerWorldX);
      this.handleCatch(falling, offsetX);
    }

    this.physicsCollisionQueue.length = 0;
  }

  private handleCatch(entity: Entity, horizontalDistance: number): void {
    const stacked = getStackedEntitiesSorted();
    const index = stacked.length;
    const modeConfig = GAME_MODES[this.gameMode];

    // PERFECT / GOOD / regular catch detection
    // perfectTolerance and goodTolerance from config (3D world units)
    const isPerfect = horizontalDistance < collision.perfectTolerance * 0.01; // scale from px config to world units
    const isGood = horizontalDistance < collision.goodTolerance;

    // Landing offset - perfect catches land centered, imperfect ones offset
    const offsetX = isPerfect ? 0 : (Math.random() - 0.5) * 0.5;
    convertToStacked(entity, index, offsetX, this.playerEntity?.id || "");
    squishEntity(entity);

    // --- Combo system ---
    const comboDecayTime = scoring.comboDecayTime * this.upgradeModifiers.comboDecayMultiplier;
    if (this.gameTime - this.lastCatchTime < comboDecayTime) {
      this.combo++;
    } else {
      this.combo = 1;
    }
    this.lastCatchTime = this.gameTime;

    // --- Per-catch scoring ---
    const stackMultiplier = scoring.stackMultiplier ** index;
    const catchBonus = isPerfect ? scoring.perfectBonus : isGood ? scoring.goodBonus : 1;
    const comboMultiplier = 1 + this.combo * scoring.comboMultiplier;
    const xAttackBonus = this.xAttackActive ? this.xAttackMultiplier : 1;
    const modeScoreMultiplier = modeConfig.scoreMultiplier;
    const points = Math.floor(
      scoring.basePoints *
        stackMultiplier *
        catchBonus *
        this.currentMultiplier *
        comboMultiplier *
        xAttackBonus *
        modeScoreMultiplier
    );

    this.score += points;
    this.currentMultiplier = Math.min(scoring.maxMultiplier, this.currentMultiplier + 0.1);

    // --- Perfect streak life earning ---
    if (isPerfect) {
      this.perfectStreak++;
      if (this.perfectStreak >= livesConfig.earnThresholds.perfectStreak) {
        this.earnLife();
        this.perfectStreak = 0;
      }
    } else {
      this.perfectStreak = 0;
    }

    // --- Score threshold life earning ---
    if (this.score - this.lastScoreForLifeBonus >= livesConfig.earnThresholds.scoreBonus) {
      this.earnLife();
      this.lastScoreForLifeBonus =
        Math.floor(this.score / livesConfig.earnThresholds.scoreBonus) *
        livesConfig.earnThresholds.scoreBonus;
    }

    // --- Feed AI Director ---
    const catchQuality: "perfect" | "good" | "normal" = isPerfect ? "perfect" : isGood ? "good" : "normal";
    this.dropController.onAnimalCaught(catchQuality);

    // Update tracking counters
    this.totalCatches++;
    this.recentCatches++;
    if (isPerfect) {
      this.recentPerfects++;
      this.timeSinceLastPerfect = 0;
    }

    // --- Visual/audio feedback ---
    if (isPerfect) {
      const catchPos = entity.position ?? new Vector3(this.playerWorldX, this.playerWorldY, 0);
      this.callbacks.onPerfectCatch(catchPos);
      feedback.play("perfect");
    } else if (isGood) {
      const catchPos = entity.position ?? new Vector3(this.playerWorldX, this.playerWorldY, 0);
      this.callbacks.onGoodCatch(catchPos);
    }

    this.callbacks.onScoreChange(this.score, this.currentMultiplier, this.combo);
    this.callbacks.onStackChange(index + 1, index + 1 >= banking.minStackToBank);
    feedback.play("land");
  }

  // =========================================================================
  // Life management
  // =========================================================================

  private loseLife(reason: "miss" | "topple"): void {
    // Invincibility check (after-hit grace period)
    if (this.gameTime < this.invincibleUntil) return;

    this.lives--;
    this.callbacks.onLivesChange(this.lives, this.maxLives);

    // Reset combo and perfect streak on hit
    this.combo = 0;
    this.perfectStreak = 0;

    if (reason === "topple") {
      this.handleTopple();
    } else {
      this.callbacks.onMiss();
      feedback.play("drop");
    }

    if (this.lives <= 0) {
      this.gameOver();
    } else {
      // Grant invincibility after taking a hit
      this.invincibleUntil = this.gameTime + livesConfig.invincibilityDuration;
      this.screenShake = 0.5;
      this.callbacks.onScreenShake(this.screenShake);
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

  // =========================================================================
  // Power-up spawning and collection
  // =========================================================================

  private spawnPowerUp(): void {
    // Weighted random selection of power-up type
    const types = Object.keys(POWER_UPS) as PowerUpType[];
    const weights = types.map((t) => POWER_UPS[t].spawnWeight);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let rand = this.gameRNG() * totalWeight;
    let selectedType: PowerUpType = "potion";
    for (let i = 0; i < types.length; i++) {
      rand -= weights[i];
      if (rand <= 0) {
        selectedType = types[i];
        break;
      }
    }

    const spawnX = (this.gameRNG() - 0.5) * 15;
    const entity: Entity = {
      id: crypto.randomUUID(),
      position: new Vector3(spawnX, SPAWN_Y, 0),
      velocity: new Vector3(0, -powerUpConfig.fallSpeed * 0.05, 0),
      tag: { type: "powerup", subtype: selectedType },
      colorOverlay: { color: new Color3(1, 0.85, 0), intensity: 0.8 },
    };

    world.add(entity);
  }

  private checkPowerUpCollisions(): void {
    const powerUps = Array.from(world.with("tag")).filter(
      (e) => e.tag?.type === "powerup" && e.position
    );

    const stackedCount = getStackedEntitiesSorted().length;
    const collectRadius = powerUpConfig.collectRadius * 0.02 * this.upgradeModifiers.powerUpRadius;

    for (const pu of powerUps) {
      if (!pu.position) continue;

      // Power-ups fall via velocity
      if (pu.velocity) {
        pu.position.y += pu.velocity.y;
      }

      // Remove if off screen
      if (pu.position.y < -5) {
        world.remove(pu);
        continue;
      }

      // Check collection against player and stack column
      const dx = Math.abs(pu.position.x - this.playerWorldX);
      const puY = pu.position.y;
      const stackTop = this.playerWorldY + stackedCount * 0.8 + 0.5;

      if (dx < collectRadius && puY >= this.playerWorldY - 1 && puY <= stackTop + 1) {
        this.collectPowerUp(pu.tag!.subtype as PowerUpType);
        world.remove(pu);
      }
    }
  }

  private collectPowerUp(type: PowerUpType): void {
    this.callbacks.onPowerUpCollected(type);
    feedback.play("powerup");

    switch (type) {
      case "rare_candy": {
        // Merge stack into mega animal - award bonus score
        const stacked = getStackedEntitiesSorted();
        if (stacked.length >= (POWER_UPS.rare_candy.minStackToUse ?? 3)) {
          const stackSize = stacked.length;
          this.score += Math.floor(
            (scoring.mergeBonus + stackSize * scoring.mergeBonusPerDuck) * this.currentMultiplier
          );
          this.callbacks.onScoreChange(this.score, this.currentMultiplier, this.combo);
        }
        break;
      }

      case "potion":
        if (this.lives < this.maxLives) {
          this.lives++;
          this.callbacks.onLivesChange(this.lives, this.maxLives);
          this.callbacks.onLifeEarned();
        }
        break;

      case "max_up":
        if (this.maxLives < livesConfig.absoluteMax) {
          this.maxLives++;
          this.lives++;
          this.callbacks.onLivesChange(this.lives, this.maxLives);
          this.callbacks.onLifeEarned();
        }
        break;

      case "great_ball":
        this.magnetActive = true;
        this.magnetUntil = this.gameTime + (POWER_UPS.great_ball.duration ?? 5000);
        break;

      case "x_attack": {
        this.xAttackActive = true;
        this.xAttackUntil = this.gameTime + (POWER_UPS.x_attack.duration ?? 8000);
        this.xAttackMultiplier = POWER_UPS.x_attack.multiplier ?? 2;
        this.callbacks.onScoreChange(this.score, this.currentMultiplier, this.combo);
        break;
      }

      case "full_restore":
        this.lives = this.maxLives;
        this.invincibleUntil = this.gameTime + (POWER_UPS.full_restore.invincibilityDuration ?? 3000);
        this.callbacks.onLivesChange(this.lives, this.maxLives);
        break;
    }
  }

  // =========================================================================
  // Poke mechanic
  // =========================================================================

  pokeDuck(entityId: string): void {
    if (!this.isPlaying || this.isPaused) return;
    const stacked = getStackedEntitiesSorted();
    const target = stacked.find((e) => e.id === entityId);
    if (!target) return;

    // Reduce the target's wobble offset (stabilizing poke)
    if (target.wobble) {
      target.wobble.offset *= 0.5;
      target.wobble.velocity *= 0.3;
    }

    // Trigger a small confusion animation
    if (target.emotion) {
      target.emotion.isConfused = true;
      target.emotion.confusedTimer = 500;
    }

    // Propagate a small wobble through the stack as trade-off
    if (this.playerEntity) {
      propagateWobbleFromBase(this.playerEntity, GAME_CONFIG.poke.wobbleAmount);
    }

    feedback.play("drop");
  }

  // =========================================================================
  // Topple handling
  // =========================================================================

  /** Remove banking/scattering entities once their animation duration has elapsed. */
  private cleanupTransientEntities(): void {
    const now = Date.now();
    const bankMaxAge = banking.bankAnimationDuration + 500; // config duration + buffer
    const scatterMaxAge = 2500; // scatter off-screen in ~2.5s

    for (const entity of world) {
      if (entity.banking && now - entity.banking.startedAt > bankMaxAge) {
        world.remove(entity);
        continue;
      }
      if (entity.scattering && now - entity.scattering.startedAt > scatterMaxAge) {
        world.remove(entity);
      }
    }
  }

  private handleTopple(): void {
    const stacked = getStackedEntitiesSorted();
    for (const s of stacked) convertToScattering(s);

    // Notify AI systems of topple event
    this.dropController.onStackTopple();
    this.wobbleGovernor.onStackTopple();

    this.callbacks.onStackChange(0, false);
    this.callbacks.onStackTopple();
    this.callbacks.onScreenShake(1);
    feedback.play("topple");
  }

  setScreenDimensions(w: number, h: number) {}

  // =========================================================================
  // DevAPI accessors (dev builds only, called by DevAPI singleton)
  // =========================================================================

  /** @internal */
  _dev_setScore(n: number): void {
    this.score = n;
    this.callbacks.onScoreChange(this.score, this.currentMultiplier, this.combo);
  }

  /** @internal */
  _dev_setLevel(n: number): void {
    this.level = n;
    this.callbacks.onLevelUp(this.level);
  }

  /** @internal */
  _dev_setLives(n: number): void {
    this.lives = n;
    this.callbacks.onLivesChange(this.lives, this.maxLives);
  }

  /** @internal */
  _dev_setMaxLives(n: number): void {
    this.maxLives = n;
    this.callbacks.onLivesChange(this.lives, this.maxLives);
  }

  /** @internal */
  _dev_setCombo(n: number): void {
    this.combo = n;
    this.callbacks.onScoreChange(this.score, this.currentMultiplier, this.combo);
  }

  /** @internal */
  _dev_setMultiplier(n: number): void {
    this.currentMultiplier = n;
    this.callbacks.onScoreChange(this.score, this.currentMultiplier, this.combo);
  }

  /** @internal */
  _dev_movePlayerTo(x: number): void {
    this.playerWorldX = x;
    if (this.playerEntity?.position) this.playerEntity.position.x = x;
  }

  /** @internal */
  _dev_triggerTopple(): void {
    this.handleTopple();
  }

  /** @internal */
  _dev_collectPowerUp(type: PowerUpType): void {
    this.collectPowerUp(type);
  }

  /** @internal */
  _dev_getGameTime(): number {
    return this.gameTime;
  }

  /** @internal - Return a full state snapshot for DevAPI queries */
  _dev_getFullState(): {
    score: number;
    level: number;
    lives: number;
    maxLives: number;
    combo: number;
    multiplier: number;
    bankedAnimals: number;
    isPlaying: boolean;
    isPaused: boolean;
    gameTime: number;
    playerX: number;
    playerY: number;
    inDanger: boolean;
    gameMode: GameModeType;
    timeRemaining: number;
  } {
    return {
      score: this.score,
      level: this.level,
      lives: this.lives,
      maxLives: this.maxLives,
      combo: this.combo,
      multiplier: this.currentMultiplier,
      bankedAnimals: this.bankedAnimals,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      gameTime: this.gameTime,
      playerX: this.playerWorldX,
      playerY: this.playerWorldY,
      inDanger: this.inDangerState,
      gameMode: this.gameMode,
      timeRemaining: this.modeTimeRemaining,
    };
  }

  // =========================================================================
  // Public accessors for game mode / timer state
  // =========================================================================

  getTimeRemaining(): number {
    return this.modeTimeRemaining;
  }

  getGameMode(): GameModeType {
    return this.gameMode;
  }

  // =========================================================================
  // Drop indicator / tornado state accessors
  // =========================================================================

  /** Current tornado X position in world-space (-7.5 to 7.5). */
  getNextDropX(): number {
    return this.dropController.getNextDropX();
  }

  /** Current difficulty (0-1) for tornado intensity scaling. */
  getDropDifficulty(): number {
    return this.dropController.getDifficulty();
  }

  /** True when next animal spawn is imminent. */
  getIsDropImminent(): boolean {
    return this.dropController.getIsDropImminent();
  }
}
