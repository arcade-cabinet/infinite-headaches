/**
 * DevAPI - Comprehensive dev/test-only API for E2E testing
 *
 * Exposes window.__DEV_API__ in development mode.
 * Tree-shaken in production builds via import.meta.env.DEV guard.
 *
 * Usage in E2E tests:
 *   await page.evaluate(() => window.__DEV_API__.setScore(500));
 *   const state = await page.evaluate(() => window.__DEV_API__.getGameState());
 */

import { Vector3 } from "@babylonjs/core";
import {
  ANIMAL_TYPES,
  GAME_CONFIG,
  POWER_UPS,
  type AnimalType,
  type PowerUpType,
} from "../config";

/** Must match the SPAWN_Y in GameLogic.ts */
const SPAWN_Y = 8;
import { world } from "../ecs/world";
import {
  createFallingAnimal,
  createBossAnimal,
  convertToStacked,
  convertToScattering,
  convertToBanking,
  freezeEntityArchetype,
  createFireballEntity,
} from "../ecs/archetypes";
import {
  getStackedEntitiesSorted,
  getFallingEntities,
  squishEntity,
  freezeEntity,
} from "../ecs/systems";
import type { Entity, FallingComponent, BossComponent } from "../ecs/components";
import type { GameLogic } from "../engine/GameLogic";
import { PlayerGovernor } from "./PlayerGovernor";

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface DevAPIResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

export interface GameStateSnapshot {
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
  stackHeight: number;
  fallingCount: number;
  entityCount: number;
  playerX: number;
  playerY: number;
  inDanger: boolean;
  spawnPaused: boolean;
  invincible: boolean;
  gameSpeedMultiplier: number;
}

export interface EntitySnapshot {
  id: string;
  type: string;
  subtype: string;
  x: number;
  y: number;
  z: number;
  hasFalling: boolean;
  hasStacked: boolean;
  hasFrozen: boolean;
  hasBoss: boolean;
  hasAbility: boolean;
  stackIndex?: number;
  bossType?: string;
  bossHealth?: number;
}

// --------------------------------------------------------------------------
// DevAPI Singleton
// --------------------------------------------------------------------------

export class DevAPIImpl {
  private engine: GameLogic | null = null;

  // Override flags managed by DevAPI (not stored on GameLogic)
  private _spawnPaused = false;
  private _invincible = false;
  private _gameSpeedMultiplier = 1;
  private _freezeNextAnimal = false;

  /** Yuka-powered AI player that plays the game automatically. */
  readonly governor = new PlayerGovernor();

  // -----------------------------------------------------------------------
  // Engine binding
  // -----------------------------------------------------------------------

  /**
   * Called by GameLogic.start() to bind the active engine instance.
   */
  bind(engine: GameLogic): void {
    this.engine = engine;
    this._spawnPaused = false;
    this._invincible = false;
    this._gameSpeedMultiplier = 1;
    this._freezeNextAnimal = false;
    this.governor.bind(engine);
  }

  /**
   * Called by GameLogic.destroy() to unbind.
   */
  unbind(): void {
    this.engine = null;
    this.governor.unbind();
  }

  // -----------------------------------------------------------------------
  // Flag accessors (read by GameLogic during its loop)
  // -----------------------------------------------------------------------

  get spawnPaused(): boolean {
    return this._spawnPaused;
  }

  get invincible(): boolean {
    return this._invincible;
  }

  get gameSpeedMultiplier(): number {
    return this._gameSpeedMultiplier;
  }

  get freezeNextAnimal(): boolean {
    return this._freezeNextAnimal;
  }

  /** Called by GameLogic after consuming the freeze-next flag */
  consumeFreezeNext(): void {
    this._freezeNextAnimal = false;
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private ok<T>(data?: T): DevAPIResult<T> {
    return { ok: true, data };
  }

  private fail<T = void>(msg: string): DevAPIResult<T> {
    console.warn(`[DevAPI] ${msg}`);
    return { ok: false, error: msg };
  }

  private requireEngine(): GameLogic | null {
    if (!this.engine) {
      console.warn("[DevAPI] No active game engine bound.");
      return null;
    }
    return this.engine;
  }

  // -----------------------------------------------------------------------
  // Score / Level / Lives
  // -----------------------------------------------------------------------

  setScore(n: number): DevAPIResult {
    const eng = this.requireEngine();
    if (!eng) return this.fail("No active game");
    if (typeof n !== "number" || n < 0) return this.fail("Score must be a non-negative number");
    eng._dev_setScore(n);
    return this.ok();
  }

  setLevel(n: number): DevAPIResult {
    const eng = this.requireEngine();
    if (!eng) return this.fail("No active game");
    if (typeof n !== "number" || n < 1) return this.fail("Level must be >= 1");
    eng._dev_setLevel(n);
    return this.ok();
  }

  setLives(n: number): DevAPIResult {
    const eng = this.requireEngine();
    if (!eng) return this.fail("No active game");
    if (typeof n !== "number" || n < 0) return this.fail("Lives must be non-negative");
    eng._dev_setLives(n);
    return this.ok();
  }

  setMaxLives(n: number): DevAPIResult {
    const eng = this.requireEngine();
    if (!eng) return this.fail("No active game");
    if (typeof n !== "number" || n < 1) return this.fail("MaxLives must be >= 1");
    eng._dev_setMaxLives(n);
    return this.ok();
  }

  setCombo(n: number): DevAPIResult {
    const eng = this.requireEngine();
    if (!eng) return this.fail("No active game");
    if (typeof n !== "number" || n < 0) return this.fail("Combo must be non-negative");
    eng._dev_setCombo(n);
    return this.ok();
  }

  setMultiplier(n: number): DevAPIResult {
    const eng = this.requireEngine();
    if (!eng) return this.fail("No active game");
    if (typeof n !== "number" || n < 0) return this.fail("Multiplier must be non-negative");
    eng._dev_setMultiplier(n);
    return this.ok();
  }

  // -----------------------------------------------------------------------
  // Spawning
  // -----------------------------------------------------------------------

  spawnAnimal(
    type?: AnimalType,
    x?: number,
    behavior?: FallingComponent["behaviorType"]
  ): DevAPIResult<{ entityId: string }> {
    const eng = this.requireEngine();
    if (!eng) return this.fail<{ entityId: string }>("No active game");

    const animalType = type ?? "cow";
    if (!ANIMAL_TYPES[animalType]) {
      return this.fail<{ entityId: string }>(`Unknown animal type: ${animalType}`);
    }

    const spawnX = x ?? 0;
    const targetX = spawnX;
    const targetY = -2;
    const behaviorType = behavior ?? "normal";

    const entity = createFallingAnimal(
      animalType,
      new Vector3(spawnX, SPAWN_Y, 0),
      targetX,
      targetY,
      behaviorType
    );
    if (entity.falling) {
      entity.falling.spawnTime = eng._dev_getGameTime();
    }
    world.add(entity);
    return this.ok({ entityId: entity.id ?? "unknown" });
  }

  spawnPowerUp(type?: PowerUpType, x?: number): DevAPIResult {
    const eng = this.requireEngine();
    if (!eng) return this.fail("No active game");

    const puType = type ?? "potion";
    if (!POWER_UPS[puType]) {
      return this.fail(`Unknown power-up type: ${puType}`);
    }

    // Power-ups spawn as falling entities with a "powerup" tag
    const spawnX = x ?? 0;
    const entity: Entity = {
      id: crypto.randomUUID(),
      position: new Vector3(spawnX, SPAWN_Y, 0),
      velocity: new Vector3(0, 0, 0),
      tag: { type: "powerup", subtype: puType },
      falling: {
        targetX: spawnX,
        targetY: -2,
        behaviorType: "floater",
        spawnX: spawnX,
        spawnTime: eng._dev_getGameTime(),
      },
    };
    world.add(entity);
    return this.ok();
  }

  spawnBoss(
    bossType?: BossComponent["bossType"],
    animalType?: AnimalType,
    x?: number
  ): DevAPIResult<{ entityId: string }> {
    const eng = this.requireEngine();
    if (!eng) return this.fail<{ entityId: string }>("No active game");

    const bt = bossType ?? "mega";
    const at = animalType ?? "cow";
    const spawnX = x ?? 0;

    if (!ANIMAL_TYPES[at]) {
      return this.fail<{ entityId: string }>(`Unknown animal type: ${at}`);
    }

    const entity = createBossAnimal(
      at,
      bt,
      new Vector3(spawnX, SPAWN_Y, 0),
      spawnX,
      -2
    );
    if (entity.falling) {
      entity.falling.spawnTime = eng._dev_getGameTime();
    }
    world.add(entity);
    return this.ok({ entityId: entity.id ?? "unknown" });
  }

  // -----------------------------------------------------------------------
  // Player control
  // -----------------------------------------------------------------------

  movePlayerTo(x: number): DevAPIResult {
    const eng = this.requireEngine();
    if (!eng) return this.fail("No active game");
    if (typeof x !== "number") return this.fail("x must be a number");
    eng._dev_movePlayerTo(x);
    return this.ok();
  }

  // -----------------------------------------------------------------------
  // Stack manipulation
  // -----------------------------------------------------------------------

  bankStack(): DevAPIResult {
    const eng = this.requireEngine();
    if (!eng) return this.fail("No active game");
    eng.bankStack();
    return this.ok();
  }

  triggerTopple(): DevAPIResult {
    const eng = this.requireEngine();
    if (!eng) return this.fail("No active game");
    eng._dev_triggerTopple();
    return this.ok();
  }

  // -----------------------------------------------------------------------
  // Freeze & Power-ups
  // -----------------------------------------------------------------------

  queueFreezeNext(): DevAPIResult {
    this._freezeNextAnimal = true;
    return this.ok();
  }

  collectPowerUp(type: PowerUpType): DevAPIResult {
    const eng = this.requireEngine();
    if (!eng) return this.fail("No active game");
    if (!POWER_UPS[type]) return this.fail(`Unknown power-up type: ${type}`);
    eng._dev_collectPowerUp(type);
    return this.ok();
  }

  // -----------------------------------------------------------------------
  // Game flow control
  // -----------------------------------------------------------------------

  setSpawnPaused(paused: boolean): DevAPIResult {
    this._spawnPaused = !!paused;
    return this.ok();
  }

  setInvincible(enabled: boolean): DevAPIResult {
    this._invincible = !!enabled;
    return this.ok();
  }

  setPhysicsGravity(g: number): DevAPIResult {
    if (typeof g !== "number") return this.fail("Gravity must be a number");
    // Mutate the config object - affects all future physics ticks
    (GAME_CONFIG.physics as { gravity: number }).gravity = g;
    return this.ok();
  }

  skipToLevel(n: number): DevAPIResult {
    const eng = this.requireEngine();
    if (!eng) return this.fail("No active game");
    if (typeof n !== "number" || n < 1) return this.fail("Level must be >= 1");
    eng._dev_setLevel(n);
    return this.ok();
  }

  setGameSpeed(multiplier: number): DevAPIResult {
    if (typeof multiplier !== "number" || multiplier <= 0)
      return this.fail("Speed multiplier must be > 0");
    this._gameSpeedMultiplier = multiplier;
    return this.ok();
  }

  triggerGameOver(): DevAPIResult {
    const eng = this.requireEngine();
    if (!eng) return this.fail("No active game");
    eng.gameOver();
    return this.ok();
  }

  setGameMode(mode: string): DevAPIResult {
    // Game mode is handled at the screen level, not inside GameLogic
    // This is a stub for tests that can be wired up via the screen component
    return this.ok();
  }

  pause(): DevAPIResult {
    const eng = this.requireEngine();
    if (!eng) return this.fail("No active game");
    eng.pause();
    return this.ok();
  }

  resume(): DevAPIResult {
    const eng = this.requireEngine();
    if (!eng) return this.fail("No active game");
    eng.resume();
    return this.ok();
  }

  // -----------------------------------------------------------------------
  // AutoPlay (AI Governor)
  // -----------------------------------------------------------------------

  enableAutoPlay(): DevAPIResult {
    const eng = this.requireEngine();
    if (!eng) return this.fail("No active game — start a game first");
    this.governor.enable();
    return this.ok();
  }

  disableAutoPlay(): DevAPIResult {
    this.governor.disable();
    return this.ok();
  }

  get isAutoPlaying(): boolean {
    return this.governor.enabled;
  }

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  getGameState(): DevAPIResult<GameStateSnapshot> {
    const eng = this.requireEngine();
    if (!eng) return this.fail<GameStateSnapshot>("No active game");
    const state = eng._dev_getFullState();
    return this.ok({
      ...state,
      stackHeight: getStackedEntitiesSorted().length,
      fallingCount: getFallingEntities().length,
      entityCount: world.size,
      inDanger: state.inDanger,
      spawnPaused: this._spawnPaused,
      invincible: this._invincible,
      gameSpeedMultiplier: this._gameSpeedMultiplier,
    });
  }

  getEntities(): DevAPIResult<EntitySnapshot[]> {
    const all: EntitySnapshot[] = [];
    for (const e of world) {
      all.push(this.entityToSnapshot(e));
    }
    return this.ok(all);
  }

  getStackedEntities(): DevAPIResult<EntitySnapshot[]> {
    const stacked = getStackedEntitiesSorted();
    return this.ok(stacked.map((e) => this.entityToSnapshot(e)));
  }

  getFallingEntities(): DevAPIResult<EntitySnapshot[]> {
    const falling = getFallingEntities();
    return this.ok(falling.map((e) => this.entityToSnapshot(e)));
  }

  getStackHeight(): DevAPIResult<number> {
    return this.ok(getStackedEntitiesSorted().length);
  }

  private entityToSnapshot(e: Entity): EntitySnapshot {
    return {
      id: e.id ?? "",
      type: e.tag?.type ?? "unknown",
      subtype: (e.tag?.subtype as string) ?? "unknown",
      x: e.position?.x ?? 0,
      y: e.position?.y ?? 0,
      z: e.position?.z ?? 0,
      hasFalling: !!e.falling,
      hasStacked: !!e.stacked,
      hasFrozen: !!e.frozen,
      hasBoss: !!e.boss,
      hasAbility: !!e.ability,
      stackIndex: e.stacked?.stackIndex,
      bossType: e.boss?.bossType,
      bossHealth: e.boss?.health,
    };
  }

  // -----------------------------------------------------------------------
  // Utility
  // -----------------------------------------------------------------------

  /** Clears all entities from the ECS world (useful for test isolation) */
  clearWorld(): DevAPIResult {
    world.clear();
    return this.ok();
  }

  /** Wait for N game ticks (useful in tests for deterministic waits) */
  async waitTicks(n: number): Promise<DevAPIResult> {
    return new Promise((resolve) => {
      let count = 0;
      const check = () => {
        count++;
        if (count >= n) {
          resolve(this.ok());
        } else {
          requestAnimationFrame(check);
        }
      };
      requestAnimationFrame(check);
    });
  }
}

// --------------------------------------------------------------------------
// Singleton & window binding
// --------------------------------------------------------------------------

export const devAPI = new DevAPIImpl();

/**
 * Install DevAPI on window. Called once at app startup.
 * Guarded by import.meta.env.DEV so it's tree-shaken in production.
 */
export function installDevAPI(): void {
  if (typeof window !== "undefined") {
    (window as any).__DEV_API__ = devAPI;
    console.log("[DevAPI] Installed on window.__DEV_API__");
  }
}

// TypeScript augmentation for window
declare global {
  interface Window {
    __DEV_API__: DevAPIImpl;
  }
}
