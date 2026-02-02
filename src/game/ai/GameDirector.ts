/**
 * Game Director -- Pure TypeScript AI Orchestrator
 *
 * Makes intelligent spawn decisions by modeling the player and selecting
 * from five competing strategies each tick. Replaces the former YUKA-based
 * goal-driven architecture with lightweight weighted scoring.
 *
 * Responsibilities:
 *  - Track an internal model of estimated player skill, fatigue, frustration, and engagement.
 *  - Compute difficulty on a logarithmic curve from level, time, and score.
 *  - Choose a dominant strategy (BuildPressure, ReleaseTension, Challenge, Mercy, Reward).
 *  - Produce spawn decisions: position, animal type, behavior type, velocity.
 *  - Decide when and which power-ups to spawn.
 */

import type { AnimalType, PowerUpType } from "../config";
import { GAME_CONFIG } from "../config";
import { getRandomAnimalType } from "../entities/Animal";
import type { DuckBehaviorType } from "./DuckBehavior";
import type { PlayerState, SpawnDecision, PowerUpDecision } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The five high-level strategies the director can pursue. */
type DirectorStrategy =
  | "build_pressure"
  | "release_tension"
  | "challenge"
  | "mercy"
  | "reward";

/** Internal interface for a strategy evaluator. */
interface StrategyEvaluator {
  readonly name: DirectorStrategy;
  /** Weight multiplier (akin to YUKA characterBias). */
  readonly bias: number;
  /** Return a raw desirability score in [0, 1]. */
  score(director: GameDirector): number;
}

// ---------------------------------------------------------------------------
// Strategy Evaluators
// ---------------------------------------------------------------------------

const EVALUATORS: readonly StrategyEvaluator[] = [
  {
    name: "build_pressure",
    bias: 0.5,
    score(d: GameDirector): number {
      if (!d.gameState) return 0.3;
      const performanceFactor = d.playerSkill * 0.3;
      const stackFactor = Math.min(1, d.gameState.stackHeight / 10) * 0.2;
      const engagementFactor = d.playerEngagement * 0.3;
      return 0.4 + performanceFactor + stackFactor + engagementFactor;
    },
  },
  {
    name: "release_tension",
    bias: 0.4,
    score(d: GameDirector): number {
      if (!d.gameState) return 0.2;
      const stressFactor = d.playerFrustration * 0.4;
      const recentIntensity = d.intensity > 0.7 ? 0.3 : 0;
      const postBank =
        d.gameState.stackHeight === 0 && d.gameState.bankedAnimals > 0 ? 0.3 : 0;
      return stressFactor + recentIntensity + postBank;
    },
  },
  {
    name: "challenge",
    bias: 0.45,
    score(d: GameDirector): number {
      if (!d.gameState) return 0.2;
      // Don't challenge struggling players
      if (d.playerFrustration > 0.4) return 0.1;
      const skillFactor = d.playerSkill > 0.7 ? 0.4 : d.playerSkill * 0.3;
      const flowFactor = d.playerEngagement > 0.6 ? 0.3 : 0;
      const difficultyFactor = d.difficulty * 0.2;
      const comboFactor = d.gameState.combo > 5 ? 0.2 : 0;
      return skillFactor + flowFactor + difficultyFactor + comboFactor;
    },
  },
  {
    name: "mercy",
    bias: 0.35,
    score(d: GameDirector): number {
      if (!d.gameState) return 0.2;
      const lowLives = d.gameState.lives <= 1 ? 0.5 : 0;
      const frustrationFactor = d.playerFrustration * 0.5;
      const dangerFactor = d.gameState.stackHeight > 12 ? 0.2 : 0;
      const recentMisses = d.gameState.recentMisses > 2 ? 0.3 : 0;
      return lowLives + frustrationFactor + dangerFactor + recentMisses;
    },
  },
  {
    name: "reward",
    bias: 0.3,
    score(d: GameDirector): number {
      if (!d.gameState) return 0.1;
      const debtFactor = Math.min(0.4, d.powerUpDebt * 0.1);
      const comboFactor =
        d.gameState.combo > 8 ? 0.3 : d.gameState.combo > 4 ? 0.15 : 0;
      const perfectFactor = d.gameState.recentPerfects > 3 ? 0.2 : 0;
      return debtFactor + comboFactor + perfectFactor;
    },
  },
];

// ---------------------------------------------------------------------------
// GameDirector
// ---------------------------------------------------------------------------

/**
 * Standalone AI director that orchestrates the game experience.
 *
 * Call {@link update} every tick with delta-time and the current
 * {@link PlayerState}. The director returns a {@link SpawnDecision}
 * when it determines an animal should spawn, or `null` otherwise.
 *
 * Notify the director of player-triggered events via the `on*` methods
 * so it can refine its internal player model.
 */
export class GameDirector {
  // -- Public read-only state (exposed for debugging / UI) ------------------

  /** Current smoothed difficulty in [0, 1]. */
  difficulty: number = 0;

  /** Current action intensity in [0, 1]. */
  intensity: number = 0.3;

  /** Estimated player skill in [0, 1]. */
  playerSkill: number = 0.5;

  /** Estimated player fatigue in [0, 1]. */
  playerFatigue: number = 0;

  /** Estimated player frustration in [0, 1]. */
  playerFrustration: number = 0;

  /** Estimated player engagement / flow in [0, 1]. */
  playerEngagement: number = 0.5;

  /** Accumulated power-up "debt" from sustained good play. */
  powerUpDebt: number = 0;

  /** Latest game state snapshot (set each update). */
  gameState: PlayerState | null = null;

  // -- Private state --------------------------------------------------------

  private targetDifficulty: number = 0;
  private desiredIntensity: number = 0.5;

  private baseSpawnInterval: number;
  private currentSpawnInterval: number;
  private minSpawnInterval: number;

  private activeGoal: DirectorStrategy = "build_pressure";

  private lastSpawnSide: "left" | "center" | "right" = "center";
  private consecutiveSameSide: number = 0;
  private pressureDirection: number = 0;

  private lastPowerUpType: PowerUpType | null = null;
  private mercyModeActive: boolean = false;

  private timeSinceLastSpawn: number = 0;
  private timeSinceLastPowerUp: number = 0;
  private timeSinceLastMiss: number = Infinity;
  private timeSinceLastPerfect: number = Infinity;
  private recentPerfects: number = 0;

  // -----------------------------------------------------------------------

  /**
   * Create a new GameDirector.
   * @param config - The game configuration object (typically {@link GAME_CONFIG}).
   */
  constructor(config: typeof GAME_CONFIG = GAME_CONFIG) {
    this.baseSpawnInterval = config.spawning.initialInterval;
    this.currentSpawnInterval = this.baseSpawnInterval;
    this.minSpawnInterval = config.spawning.minInterval;
  }

  // -----------------------------------------------------------------------
  // Main update
  // -----------------------------------------------------------------------

  /**
   * Advance the director by one tick.
   *
   * @param dt - Delta time in **milliseconds** since the last call.
   * @param state - Current game state snapshot.
   * @returns A {@link SpawnDecision} if an animal should spawn, else `null`.
   */
  update(dt: number, state: PlayerState): SpawnDecision | null {
    this.gameState = state;

    // Advance internal timers
    this.timeSinceLastSpawn += dt;
    this.timeSinceLastPowerUp += dt;
    this.timeSinceLastMiss += dt;
    this.timeSinceLastPerfect += dt;

    // Refresh the player model
    this.updatePlayerModel(state);

    // Refresh difficulty
    this.updateDifficulty(state);

    // Pick the best strategy
    this.evaluateStrategies();

    // Update intensity based on active strategy
    this.updateIntensity();

    // Accumulate power-up debt from sustained skilled play
    if (this.playerSkill > 0.7 && state.combo > 5) {
      this.powerUpDebt += (dt / 1000) * 0.1;
    }

    // Decide whether to spawn
    return this.decideSpawn(state);
  }

  // -----------------------------------------------------------------------
  // Event notifications (called by GameLogic)
  // -----------------------------------------------------------------------

  /**
   * Notify the director that the player caught an animal.
   * @param quality - Catch quality tier.
   */
  onAnimalCaught(quality: "perfect" | "good" | "normal"): void {
    // Adjust skill upward
    const boost = quality === "perfect" ? 0.04 : quality === "good" ? 0.02 : 0.01;
    this.playerSkill = Math.min(1, this.playerSkill + boost);

    // Reduce frustration
    this.playerFrustration = Math.max(0, this.playerFrustration - 0.05);

    if (quality === "perfect") {
      this.recentPerfects++;
      this.timeSinceLastPerfect = 0;
    }
  }

  /**
   * Notify the director that the player missed an animal.
   */
  onAnimalMissed(): void {
    this.playerSkill = Math.max(0, this.playerSkill - 0.03);
    this.playerFrustration = Math.min(1, this.playerFrustration + 0.15);
    this.timeSinceLastMiss = 0;
  }

  /**
   * Notify the director that the stack toppled.
   */
  onStackTopple(): void {
    this.playerFrustration = Math.min(1, this.playerFrustration + 0.25);
    this.playerFatigue = Math.min(1, this.playerFatigue + 0.1);
  }

  /**
   * Notify the director that the player successfully banked.
   * @param count - Number of animals banked.
   */
  onBankSuccess(count: number): void {
    this.playerEngagement = Math.min(1, this.playerEngagement + 0.1);
    this.powerUpDebt += count * 0.05;
    this.playerFrustration = Math.max(0, this.playerFrustration - 0.1);
  }

  /**
   * Notify the director that the player leveled up.
   * @param _level - The new level (unused internally but kept for API symmetry).
   */
  onLevelUp(_level: number): void {
    // Small engagement boost on level-up
    this.playerEngagement = Math.min(1, this.playerEngagement + 0.05);
  }

  // -----------------------------------------------------------------------
  // Public queries
  // -----------------------------------------------------------------------

  /**
   * Get the current spawn interval in milliseconds.
   */
  getSpawnInterval(): number {
    return this.currentSpawnInterval;
  }

  /**
   * Determine whether a power-up should spawn right now.
   * @returns The power-up type to spawn, or `null`.
   */
  shouldSpawnPowerUp(): PowerUpType | null {
    const decision = this.decidePowerUp();
    return decision.shouldSpawn ? (decision.type as PowerUpType) : null;
  }

  /**
   * Get a behavior type appropriate for the current difficulty / strategy.
   */
  getBehaviorType(): DuckBehaviorType {
    return this.chooseBehaviorType();
  }

  /**
   * Get the currently active strategy name (useful for debugging).
   */
  getActiveGoal(): DirectorStrategy {
    return this.activeGoal;
  }

  /**
   * Get difficulty for UI/debugging.
   */
  getDifficulty(): number {
    return this.difficulty;
  }

  // -----------------------------------------------------------------------
  // Player model
  // -----------------------------------------------------------------------

  private updatePlayerModel(state: PlayerState): void {
    // Skill: exponential moving average of catch rate
    const skillAlpha = 0.1;
    this.playerSkill =
      this.playerSkill * (1 - skillAlpha) + state.catchRate * skillAlpha;

    // Fatigue: builds logarithmically with game time
    this.playerFatigue = Math.min(
      1,
      Math.log10(1 + state.gameTime / 60000) * 0.3,
    );

    // Frustration: decays toward zero over time when not missing
    const frustrationDecay = Math.min(1, this.timeSinceLastMiss / 10000);
    this.playerFrustration = Math.max(
      0,
      this.playerFrustration - frustrationDecay * 0.002,
    );

    // Engagement: combo, stack quality, recent perfects
    const hasGoodCombo = state.combo > 3;
    const hasGoodStack = state.stackHeight >= 3 && state.stackHeight <= 12;
    const recentSuccess = this.timeSinceLastPerfect < 5000;
    this.playerEngagement =
      (hasGoodCombo ? 0.3 : 0) +
      (hasGoodStack ? 0.3 : 0) +
      (recentSuccess ? 0.2 : 0) +
      (1 - this.playerFrustration) * 0.2;

    // Decay recent-perfects counter slowly
    if (this.timeSinceLastPerfect > 10000) {
      this.recentPerfects = Math.max(0, this.recentPerfects - 1);
    }
  }

  // -----------------------------------------------------------------------
  // Difficulty
  // -----------------------------------------------------------------------

  private updateDifficulty(state: PlayerState): void {
    // Logarithmic curves: gentle early, steeper later
    const levelDifficulty =
      Math.log10(1 + state.level) / Math.log10(26); // 0-1 over 25 levels
    const timeDifficulty =
      Math.log10(1 + state.gameTime / 10000) / Math.log10(31);
    const scoreDifficulty =
      Math.log10(1 + state.score / 100) / Math.log10(1001);

    this.targetDifficulty = Math.min(
      1,
      levelDifficulty * 0.4 +
        timeDifficulty * 0.3 +
        scoreDifficulty * 0.2 +
        this.playerSkill * 0.1,
    );

    // Smooth toward target
    const alpha = 0.05;
    this.difficulty =
      this.difficulty * (1 - alpha) + this.targetDifficulty * alpha;

    // Derive spawn interval
    const range = this.baseSpawnInterval - this.minSpawnInterval;
    this.currentSpawnInterval = this.baseSpawnInterval - this.difficulty * range;

    // Mercy mode flag
    this.mercyModeActive =
      (state.lives <= 1) || (this.playerFrustration > 0.6);
  }

  // -----------------------------------------------------------------------
  // Strategy selection (replaces YUKA Think / GoalEvaluators)
  // -----------------------------------------------------------------------

  private evaluateStrategies(): void {
    let bestScore = -Infinity;
    let bestStrategy: DirectorStrategy = "build_pressure";

    for (const evaluator of EVALUATORS) {
      const raw = evaluator.score(this);
      const weighted = raw * evaluator.bias;
      if (weighted > bestScore) {
        bestScore = weighted;
        bestStrategy = evaluator.name;
      }
    }

    this.activeGoal = bestStrategy;
  }

  // -----------------------------------------------------------------------
  // Intensity
  // -----------------------------------------------------------------------

  private updateIntensity(): void {
    switch (this.activeGoal) {
      case "build_pressure":
        this.desiredIntensity = 0.5 + this.difficulty * 0.3;
        break;
      case "release_tension":
        this.desiredIntensity = 0.3;
        break;
      case "challenge":
        this.desiredIntensity = 0.7 + this.difficulty * 0.3;
        break;
      case "mercy":
        this.desiredIntensity = 0.2;
        break;
      case "reward":
        this.desiredIntensity = 0.4;
        break;
    }
    this.intensity += (this.desiredIntensity - this.intensity) * 0.1;
  }

  // -----------------------------------------------------------------------
  // Spawn decision
  // -----------------------------------------------------------------------

  private decideSpawn(state: PlayerState): SpawnDecision | null {
    // Check timing
    if (this.timeSinceLastSpawn < this.currentSpawnInterval) {
      return null;
    }

    // Mercy mode: extend interval by 50 %
    if (
      this.mercyModeActive &&
      this.timeSinceLastSpawn < this.currentSpawnInterval * 1.5
    ) {
      return null;
    }

    // Reset timer
    this.timeSinceLastSpawn = 0;

    const spawnX = this.calculateSpawnX(state);
    const duckType = this.chooseAnimalType(state.level);
    const behaviorType = this.chooseBehaviorType();
    const { vx, vy } = this.calculateInitialVelocity(spawnX, state);
    const targetBias = this.calculateTargetBias();

    return {
      shouldSpawn: true,
      x: spawnX,
      duckType,
      behaviorType,
      initialVelocityX: vx,
      initialVelocityY: vy,
      targetBias,
      nextDropX: (spawnX / state.screenWidth) * 16 - 8,
    };
  }

  // -----------------------------------------------------------------------
  // Strategic spawn positioning
  // -----------------------------------------------------------------------

  private calculateSpawnX(state: PlayerState): number {
    const padding = 60;
    const playableWidth = state.screenWidth - 65 - padding * 2;
    const playerX = state.playerX;

    let targetX: number;

    switch (this.activeGoal) {
      case "challenge":
        // Away from the player
        if (playerX < state.screenWidth / 2) {
          targetX =
            padding +
            playableWidth * 0.7 +
            Math.random() * playableWidth * 0.25;
        } else {
          targetX = padding + Math.random() * playableWidth * 0.25;
        }
        break;

      case "mercy":
        // Near the player
        targetX = playerX + (Math.random() - 0.5) * 100;
        break;

      case "build_pressure": {
        this.driftPressureDirection();
        const pressureOffset = this.pressureDirection * playableWidth * 0.3;
        targetX = playerX + pressureOffset + (Math.random() - 0.5) * 80;
        break;
      }

      case "release_tension":
        targetX = padding + Math.random() * playableWidth;
        break;

      default: {
        const biasStrength = 0.3 + this.difficulty * 0.3;
        const randomX = padding + Math.random() * playableWidth;
        targetX = randomX * (1 - biasStrength) + playerX * biasStrength;
      }
    }

    // Avoid repetitive same-side spawns
    const third = this.getSpawnThird(targetX, playableWidth, padding);
    if (third === this.lastSpawnSide) {
      this.consecutiveSameSide++;
      if (this.consecutiveSameSide > 2) {
        if (third === "left") targetX = padding + playableWidth * 0.7;
        else if (third === "right") targetX = padding + playableWidth * 0.3;
        else
          targetX =
            padding +
            (Math.random() > 0.5
              ? playableWidth * 0.2
              : playableWidth * 0.8);
        this.consecutiveSameSide = 0;
      }
    } else {
      this.consecutiveSameSide = 0;
    }

    this.lastSpawnSide = this.getSpawnThird(targetX, playableWidth, padding);

    return Math.max(padding, Math.min(state.screenWidth - 65 - padding, targetX));
  }

  private getSpawnThird(
    x: number,
    width: number,
    padding: number,
  ): "left" | "center" | "right" {
    const rel = (x - padding) / width;
    if (rel < 0.33) return "left";
    if (rel > 0.66) return "right";
    return "center";
  }

  private driftPressureDirection(): void {
    if (Math.random() < 0.1) {
      this.pressureDirection += (Math.random() - 0.5) * 0.5;
      this.pressureDirection = Math.max(
        -1,
        Math.min(1, this.pressureDirection),
      );
    }
  }

  // -----------------------------------------------------------------------
  // Animal type selection
  // -----------------------------------------------------------------------

  private chooseAnimalType(level: number): AnimalType {
    return getRandomAnimalType(level);
  }

  // -----------------------------------------------------------------------
  // Behavior type selection
  // -----------------------------------------------------------------------

  private chooseBehaviorType(): DuckBehaviorType {
    const roll = Math.random();

    const seekerChance = 0.05 + this.difficulty * 0.15;
    const diveChance =
      this.difficulty > 0.4
        ? 0.02 + (this.difficulty - 0.4) * 0.1
        : 0;
    const zigzagChance = 0.05 + this.difficulty * 0.1;
    const evaderChance = 0.03 + this.difficulty * 0.08;
    const floaterChance = 0.08 - this.difficulty * 0.03;

    // Mercy mode: prefer easy behaviors
    if (this.mercyModeActive) {
      if (roll < 0.3) return "floater";
      if (roll < 0.5) return "normal";
    }

    // Challenge mode: amplify aggressive behaviors
    if (this.activeGoal === "challenge") {
      if (roll < seekerChance * 1.5) return "seeker";
      if (roll < seekerChance * 1.5 + diveChance * 2) return "dive";
    }

    let cumulative = 0;

    cumulative += seekerChance;
    if (roll < cumulative) return "seeker";

    cumulative += diveChance;
    if (roll < cumulative) return "dive";

    cumulative += zigzagChance;
    if (roll < cumulative) return "zigzag";

    cumulative += evaderChance;
    if (roll < cumulative) return "evader";

    cumulative += floaterChance;
    if (roll < cumulative) return "floater";

    return "normal";
  }

  // -----------------------------------------------------------------------
  // Initial velocity
  // -----------------------------------------------------------------------

  private calculateInitialVelocity(
    spawnX: number,
    state: PlayerState,
  ): { vx: number; vy: number } {
    const baseDrift = 0.5 + this.difficulty * 1.5;
    const toPlayer = state.playerX - spawnX;
    const targetingStrength = this.calculateTargetBias() * 0.5;

    let vx =
      (Math.random() - 0.5) * baseDrift +
      Math.sign(toPlayer) * targetingStrength;
    let vy = 2 + this.difficulty * 2;

    if (this.activeGoal === "challenge") {
      vy *= 1.2;
      vx *= 1.3;
    }

    if (this.mercyModeActive) {
      vy *= 0.7;
      vx *= 0.6;
    }

    return { vx, vy };
  }

  private calculateTargetBias(): number {
    let bias = 0.2 + this.difficulty * 0.4;
    if (this.activeGoal === "challenge") bias += 0.2;
    if (this.activeGoal === "mercy") bias -= 0.3;
    if (this.mercyModeActive) bias *= 0.5;
    return Math.max(0, Math.min(1, bias));
  }

  // -----------------------------------------------------------------------
  // Power-up decision
  // -----------------------------------------------------------------------

  /**
   * Produce a full power-up spawn decision.
   * Typically called internally; public for advanced usage.
   */
  decidePowerUp(): PowerUpDecision {
    const noSpawn: PowerUpDecision = {
      shouldSpawn: false,
      type: "potion",
      x: 0,
      timing: "immediate",
    };

    if (!this.gameState) return noSpawn;
    const state = this.gameState;

    // Minimum cooldown between power-ups
    if (this.timeSinceLastPowerUp < GAME_CONFIG.powerUps.spawnInterval) {
      return noSpawn;
    }

    // Base spawn chance per tick
    let chance = 0.01;
    chance += this.powerUpDebt * 0.02;

    // Mercy boosts
    if (state.lives <= 1) chance += 0.03;
    if (this.playerFrustration > 0.5) chance += 0.02;

    // Suppress if too many active
    if (state.activePowerUps > 1) chance *= 0.3;

    // Reward strategy doubles chance
    if (this.activeGoal === "reward") chance *= 2;

    if (Math.random() > chance) return noSpawn;

    const type = this.choosePowerUpType(state);
    const x = Math.max(
      60,
      Math.min(
        state.screenWidth - 125,
        state.playerX + (Math.random() - 0.5) * 150,
      ),
    );

    this.powerUpDebt = Math.max(0, this.powerUpDebt - 1);
    this.lastPowerUpType = type;
    this.timeSinceLastPowerUp = 0;

    return { shouldSpawn: true, type, x, timing: "immediate" };
  }

  // -----------------------------------------------------------------------
  // Intelligent power-up type selection
  // -----------------------------------------------------------------------

  private choosePowerUpType(state: PlayerState): PowerUpType {
    // Potion when low on lives
    if (state.lives < state.maxLives && state.lives <= 2) {
      if (Math.random() < 0.5) return "potion";
    }

    // Full restore (Grandma's Pie) when critical
    if (state.lives === 1 && Math.random() < 0.3) {
      return "full_restore";
    }

    // Rare candy when stack is tall enough
    if (state.stackHeight >= 5 && Math.random() < 0.2) {
      return "rare_candy";
    }

    // Great ball (Lasso) when many animals are in the air
    if (state.activeDucks > 2 && Math.random() < 0.25) {
      return "great_ball";
    }

    // Coffee (X Attack) for skilled players on hot streaks
    if (this.playerSkill > 0.7 && state.combo > 3 && Math.random() < 0.2) {
      return "x_attack";
    }

    // Max Up (Vitamin) rarely
    if (state.maxLives < GAME_CONFIG.lives.absoluteMax && Math.random() < 0.1) {
      return "max_up";
    }

    // Default weighted random
    const roll = Math.random();
    if (roll < 0.35) return "potion";
    if (roll < 0.50) return "great_ball";
    if (roll < 0.65) return "x_attack";
    if (roll < 0.78) return "rare_candy";
    if (roll < 0.90) return "max_up";
    return "full_restore";
  }
}
