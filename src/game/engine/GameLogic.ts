/**
 * GameLogic - Pure game logic engine with NO rendering dependencies
 * 
 * Deterministic logic using seedrandom.
 * NO Yuka.
 */

import { Vector3 } from "@babylonjs/core";
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
} = GAME_CONFIG;

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
  private lives = livesConfig.starting;
  private maxLives = livesConfig.max;
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

  private callbacks: GameCallbacks;

  isPlaying = false;
  isPaused = false;

  constructor(callbacks: GameCallbacks) {
    this.callbacks = callbacks;
  }

  start(characterId: "farmer_john" | "farmer_mary"): void {
    world.clear();
    this.gameRNG = forkRng(`gameplay-${performance.now()}`);

    this.score = 0;
    this.combo = 0;
    this.currentMultiplier = 1;
    this.level = 1;
    this.lives = livesConfig.starting;
    this.bankedAnimals = 0;
    this.inDangerState = false;
    
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

    // E2E Control API
    if (typeof window !== "undefined") {
      (window as any).GAME_CONTROL = {
        movePlayerTo: (x: number) => {
          this.playerWorldX = x;
          if (this.playerEntity?.position) this.playerEntity.position.x = x;
        },
        spawnAnimalAt: (x: number, type: AnimalType = "cow") => {
          const entity = createFallingAnimal(type, new Vector3(x, 10, 0), x, -2);
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
    world.clear();
    if (typeof window !== "undefined") {
      delete (window as any).GAME_CONTROL;
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
    const halfWidth = 8;
    this.playerWorldX = Math.max(-halfWidth, Math.min(halfWidth, this.playerWorldX + deltaX));
    if (this.playerEntity?.position) {
      this.playerEntity.position.x = this.playerWorldX;
    }
    this.playerVelocity = deltaX * 60;
  }

  bankStack(): void {
    const stacked = getStackedEntitiesSorted();
    if (stacked.length < banking.minStackToBank) return;

    const stackSize = stacked.length;
    this.score += Math.floor(stackSize * scoring.basePoints * this.currentMultiplier);
    this.bankedAnimals += stackSize;

    const bankTarget = new Vector3(9, 2, 0);
    for (const entity of stacked) {
      convertToBanking(entity, bankTarget.x, bankTarget.y);
    }

    this.callbacks.onScoreChange(this.score, this.currentMultiplier, this.combo);
    this.callbacks.onBankComplete(this.bankedAnimals);
    this.callbacks.onStackChange(0, false);
    feedback.play("bank");
  }

  private gameLoop = (timestamp: number): void => {
    if (!this.isPlaying || this.isPaused) return;
    
    const frameTime = Math.min(timestamp - this.lastFrameTime, 100);
    this.lastFrameTime = timestamp;
    this.accumulator += frameTime;

    while (this.accumulator >= this.FIXED_TIMESTEP) {
      this.fixedUpdate(this.FIXED_TIMESTEP);
      this.accumulator -= this.FIXED_TIMESTEP;
      this.gameTime += this.FIXED_TIMESTEP;
    }

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private fixedUpdate(deltaTime: number): void {
    // Logarithmic leveling
    const nextLevelThreshold = Math.floor(100 * Math.pow(1.5, this.level - 1));
    if (this.score >= nextLevelThreshold) {
      this.level++;
      this.callbacks.onLevelUp(this.level);
    }

    // Spawning logic using SeedRNG
    const spawnInterval = Math.max(500, 2000 / Math.log2(this.level + 1));
    if (this.gameTime - this.lastSpawnTime > spawnInterval) {
      this.spawnAnimal();
      this.lastSpawnTime = this.gameTime;
    }

    // Wobble based on weights
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

    this.checkCollisions();
  }

  private spawnAnimal(): void {
    const types: AnimalType[] = ["cow", "pig", "chicken", "duck", "sheep"];
    const type = types[Math.floor(this.gameRNG() * types.length)];
    const spawnX = (this.gameRNG() - 0.5) * 15;
    const targetX = this.playerWorldX + (this.gameRNG() - 0.5) * 2;
    
    const entity = createFallingAnimal(type, new Vector3(spawnX, 10, 0), targetX, -2);
    // Sync spawn time
    if (entity.falling) entity.falling.spawnTime = this.gameTime;
    world.add(entity);
  }

  private updateWobble(): void {
    if (!this.playerEntity?.wobble) return;
    const stacked = getStackedEntitiesSorted();
    let totalWeight = 0;
    for (const s of stacked) {
      const sub = s.tag?.subtype as AnimalType;
      totalWeight += ANIMAL_TYPES[sub]?.weight || 1;
    }
    // More weight = more wobble sensitivity
    this.playerEntity.wobble.springiness = 0.05 + (totalWeight * 0.01);
  }

  private checkCollisions(): void {
    const falling = getFallingEntities();
    const stackedCount = getStackedEntitiesSorted().length;
    const catchY = this.playerWorldY + stackedCount * 0.8 + 0.5;

    for (const f of falling) {
      if (!f.position) continue;
      if (f.position.y < -3) {
        console.log("Entity fell out of bounds", f.id, f.position.y);
        world.remove(f);
        this.lives--;
        this.callbacks.onLivesChange(this.lives, this.maxLives);
        if (this.lives <= 0) this.gameOver();
        continue;
      }

      const dist = Math.abs(f.position.x - this.playerWorldX);
      const dy = Math.abs(f.position.y - catchY);
      
      if (dist < 1.5 && dy < 0.5) {
        console.log("CATCH!", f.id);
        this.handleCatch(f);
      }
    }
  }

  private handleCatch(entity: Entity): void {
    const index = getStackedEntitiesSorted().length;
    convertToStacked(entity, index, (Math.random() - 0.5) * 0.5, this.playerEntity?.id || "");
    squishEntity(entity);
    this.callbacks.onStackChange(index + 1, index + 1 >= banking.minStackToBank);
    feedback.play("land");
  }

  private handleTopple(): void {
    const stacked = getStackedEntitiesSorted();
    for (const s of stacked) convertToScattering(s);
    this.callbacks.onStackChange(0, false);
    this.callbacks.onStackTopple();
    feedback.play("topple");
  }

  setScreenDimensions(w: number, h: number) {}
}