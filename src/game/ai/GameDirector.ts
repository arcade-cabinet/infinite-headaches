/**
 * YUKA-powered Game Director
 *
 * An intelligent AI that orchestrates the entire game experience:
 * - Where to spawn animals (strategic positioning)
 * - When to spawn animals (pacing and rhythm)
 * - What type of animals to spawn (difficulty curve)
 * - Animal AI behaviors and momentum
 * - Power-up timing and placement
 * - Dynamic difficulty adjustment based on player performance
 *
 * Uses logarithmic scaling and goal-driven AI to create
 * an experience that feels challenging but fair.
 */

import { GameEntity, GoalEvaluator, Think } from "yuka";
import { getRandomAnimalType } from "../entities/Animal";
import type { AnimalType, PowerUpType } from "../config";
import type { DuckBehaviorType } from "./DuckBehavior";

/**
 * Spawn decision from the director
 */
export interface SpawnDecision {
  shouldSpawn: boolean;
  x: number;
  duckType: AnimalType;
  behaviorType: DuckBehaviorType;
  initialVelocityX: number;
  initialVelocityY: number;
  targetBias: number; // How much to aim at player (0-1)
}

/**
 * Power-up decision from the director
 */
export interface PowerUpDecision {
  shouldSpawn: boolean;
  type: PowerUpType;
  x: number;
  timing: "immediate" | "delayed";
}

/**
 * Director's view of the current game state
 */
export interface GameState {
  // Player state
  playerX: number;
  playerY: number;
  stackHeight: number;
  lives: number;
  maxLives: number;
  score: number;
  combo: number;

  // Timing
  gameTime: number; // ms since game start
  timeSinceLastSpawn: number;
  timeSinceLastPowerUp: number;
  timeSinceLastMiss: number;
  timeSinceLastPerfect: number;

  // Performance metrics
  recentCatches: number; // Last 10 seconds
  recentMisses: number;
  recentPerfects: number;
  catchRate: number; // 0-1

  // Field state
  activeDucks: number;
  activePowerUps: number;
  screenWidth: number;
  screenHeight: number;

  // Current level/difficulty
  level: number;
  bankedDucks: number;
}

/**
 * The Game Director - YUKA-powered AI orchestrating the experience
 */
export class GameDirector extends GameEntity {
  // AI brain
  brain: Think<GameDirector>;

  // Difficulty state (0-1 scale, logarithmically scaled)
  difficulty: number = 0;
  targetDifficulty: number = 0;

  // Pacing state
  intensity: number = 0.3; // Current action intensity
  desiredIntensity: number = 0.5;

  // Spawn timing (in ms)
  baseSpawnInterval: number = 2200;
  currentSpawnInterval: number = 2200;
  minSpawnInterval: number = 600;

  // Player model (the director's understanding of the player)
  playerSkill: number = 0.5; // Estimated skill 0-1
  playerFatigue: number = 0; // Builds over time
  playerFrustration: number = 0; // From misses
  playerEngagement: number = 0.5; // Are they in flow?

  // Strategic state
  lastSpawnSide: "left" | "center" | "right" = "center";
  consecutiveSameSide: number = 0;
  pressureDirection: number = 0; // -1 left, 0 center, 1 right

  // Power-up strategy
  powerUpDebt: number = 0; // Accumulated "owed" power-ups from good play
  lastPowerUpType: PowerUpType | null = null;
  mercyModeActive: boolean = false;

  // Current game state (updated each frame)
  gameState: GameState | null = null;

  // Active goal
  private activeGoal: "build_pressure" | "release_tension" | "challenge" | "mercy" | "reward" =
    "build_pressure";

  constructor() {
    super();
    this.brain = new Think(this);
    this.setupGoalEvaluators();
  }

  /**
   * Setup goal evaluators
   */
  private setupGoalEvaluators(): void {
    this.brain.addEvaluator(new BuildPressureEvaluator());
    this.brain.addEvaluator(new ReleaseTensionEvaluator());
    this.brain.addEvaluator(new ChallengeEvaluator());
    this.brain.addEvaluator(new DirectorMercyEvaluator());
    this.brain.addEvaluator(new RewardEvaluator());
  }

  /**
   * Update director with current game state
   */
  updateGameState(state: GameState): void {
    this.gameState = state;

    // Update player model
    this.updatePlayerModel(state);

    // Update difficulty using logarithmic scaling
    this.updateDifficulty(state);
  }

  /**
   * Update the director's model of the player
   */
  private updatePlayerModel(state: GameState): void {
    // Skill estimation (exponential moving average of catch rate)
    const skillAlpha = 0.1;
    this.playerSkill = this.playerSkill * (1 - skillAlpha) + state.catchRate * skillAlpha;

    // Fatigue builds logarithmically with time
    this.playerFatigue = Math.min(1, Math.log10(1 + state.gameTime / 60000) * 0.3);

    // Frustration from recent misses, decays over time
    const frustrationFromMisses = state.recentMisses * 0.15;
    const frustrationDecay = Math.min(1, state.timeSinceLastMiss / 10000);
    this.playerFrustration = Math.max(0, frustrationFromMisses - frustrationDecay * 0.5);

    // Engagement (in "flow" state)
    const hasGoodCombo = state.combo > 3;
    const hasGoodStack = state.stackHeight >= 3 && state.stackHeight <= 12;
    const recentSuccess = state.timeSinceLastPerfect < 5000;
    this.playerEngagement =
      (hasGoodCombo ? 0.3 : 0) +
      (hasGoodStack ? 0.3 : 0) +
      (recentSuccess ? 0.2 : 0) +
      (1 - this.playerFrustration) * 0.2;
  }

  /**
   * Calculate difficulty using logarithmic scaling
   * This creates a curve that's gentle early and steeper later
   */
  private updateDifficulty(state: GameState): void {
    // Base difficulty from level (logarithmic)
    const levelDifficulty = Math.log10(1 + state.level) / Math.log10(26); // 0-1 over 25 levels

    // Time-based difficulty (logarithmic, caps at ~5 minutes)
    const timeDifficulty = Math.log10(1 + state.gameTime / 10000) / Math.log10(31);

    // Score-based difficulty (logarithmic)
    const scoreDifficulty = Math.log10(1 + state.score / 100) / Math.log10(1001);

    // Combine factors with weights
    this.targetDifficulty = Math.min(
      1,
      levelDifficulty * 0.4 + timeDifficulty * 0.3 + scoreDifficulty * 0.2 + this.playerSkill * 0.1
    );

    // Smooth difficulty changes (don't spike suddenly)
    const difficultyAlpha = 0.05;
    this.difficulty =
      this.difficulty * (1 - difficultyAlpha) + this.targetDifficulty * difficultyAlpha;

    // Calculate spawn interval from difficulty
    const difficultyRange = this.baseSpawnInterval - this.minSpawnInterval;
    this.currentSpawnInterval = this.baseSpawnInterval - this.difficulty * difficultyRange;

    // Mercy mode check
    this.mercyModeActive = state.lives <= 1 || this.playerFrustration > 0.6;
  }

  /**
   * Main update loop
   */
  update(delta: number): this {
    super.update(delta);

    if (!this.gameState) return this;

    // Let brain decide current goal
    this.brain.execute();

    // Update intensity based on goal
    this.updateIntensity();

    // Accumulate power-up debt from good play
    if (this.playerSkill > 0.7 && this.gameState.combo > 5) {
      this.powerUpDebt += delta * 0.1;
    }

    return this;
  }

  /**
   * Update action intensity based on active goal
   */
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

    // Smooth intensity changes
    this.intensity += (this.desiredIntensity - this.intensity) * 0.1;
  }

  /**
   * Decide whether and where to spawn an animal
   */
  decideSpawn(): SpawnDecision {
    if (!this.gameState) {
      return {
        shouldSpawn: false,
        x: 0,
        duckType: "cow",
        behaviorType: "normal",
        initialVelocityX: 0,
        initialVelocityY: 0,
        targetBias: 0,
      };
    }

    const state = this.gameState;

    // Check timing
    if (state.timeSinceLastSpawn < this.currentSpawnInterval) {
      return {
        shouldSpawn: false,
        x: 0,
        duckType: "cow",
        behaviorType: "normal",
        initialVelocityX: 0,
        initialVelocityY: 0,
        targetBias: 0,
      };
    }

    // Mercy mode: slower spawns
    if (this.mercyModeActive && state.timeSinceLastSpawn < this.currentSpawnInterval * 1.5) {
      return {
        shouldSpawn: false,
        x: 0,
        duckType: "cow",
        behaviorType: "normal",
        initialVelocityX: 0,
        initialVelocityY: 0,
        targetBias: 0,
      };
    }

    // Calculate spawn position strategically
    const spawnX = this.calculateSpawnX(state);

    // Determine animal type based on difficulty and level
    const duckType = this.chooseAnimalType(state.level);

    // Determine AI behavior
    const behaviorType = this.chooseBehaviorType();

    // Calculate initial momentum
    const { vx, vy } = this.calculateInitialVelocity(spawnX, state);

    // Target bias (how much the animal aims at player)
    const targetBias = this.calculateTargetBias();

    return {
      shouldSpawn: true,
      x: spawnX,
      duckType,
      behaviorType,
      initialVelocityX: vx,
      initialVelocityY: vy,
      targetBias,
    };
  }

  /**
   * Strategic spawn position calculation
   */
  private calculateSpawnX(state: GameState): number {
    const padding = 60;
    const playableWidth = state.screenWidth - 65 - padding * 2; // Account for bank zone
    const playerX = state.playerX;

    // Decide spawn strategy based on active goal
    let targetX: number;

    switch (this.activeGoal) {
      case "challenge":
        // Spawn away from player to force movement
        if (playerX < state.screenWidth / 2) {
          targetX = padding + playableWidth * 0.7 + Math.random() * playableWidth * 0.25;
        } else {
          targetX = padding + Math.random() * playableWidth * 0.25;
        }
        break;

      case "mercy":
        // Spawn near player for easy catches
        targetX = playerX + (Math.random() - 0.5) * 100;
        break;

      case "build_pressure": {
        // Gradually push player in a direction
        this.updatePressureDirection();
        const pressureOffset = this.pressureDirection * playableWidth * 0.3;
        targetX = playerX + pressureOffset + (Math.random() - 0.5) * 80;
        break;
      }

      case "release_tension":
        // Random, relaxed positioning
        targetX = padding + Math.random() * playableWidth;
        break;

      default: {
        // Balanced - slight bias toward player
        const biasStrength = 0.3 + this.difficulty * 0.3;
        const randomX = padding + Math.random() * playableWidth;
        targetX = randomX * (1 - biasStrength) + playerX * biasStrength;
      }
    }

    // Avoid spawning in same spot repeatedly
    const lastThird = this.getSpawnThird(targetX, playableWidth, padding);
    if (lastThird === this.lastSpawnSide) {
      this.consecutiveSameSide++;
      if (this.consecutiveSameSide > 2) {
        // Force different position
        if (lastThird === "left") targetX = padding + playableWidth * 0.7;
        else if (lastThird === "right") targetX = padding + playableWidth * 0.3;
        else targetX = padding + (Math.random() > 0.5 ? playableWidth * 0.2 : playableWidth * 0.8);
        this.consecutiveSameSide = 0;
      }
    } else {
      this.consecutiveSameSide = 0;
    }

    this.lastSpawnSide = this.getSpawnThird(targetX, playableWidth, padding);

    // Clamp to valid range
    return Math.max(padding, Math.min(state.screenWidth - 65 - padding, targetX));
  }

  private getSpawnThird(x: number, width: number, padding: number): "left" | "center" | "right" {
    const relativeX = (x - padding) / width;
    if (relativeX < 0.33) return "left";
    if (relativeX > 0.66) return "right";
    return "center";
  }

  private updatePressureDirection(): void {
    // Slowly shift pressure direction
    if (Math.random() < 0.1) {
      this.pressureDirection += (Math.random() - 0.5) * 0.5;
      this.pressureDirection = Math.max(-1, Math.min(1, this.pressureDirection));
    }
  }

  /**
   * Choose animal type using the helper from Animal entity
   */
  private chooseAnimalType(level: number): AnimalType {
    // If mercy mode, force simple animals sometimes?
    // For now, just rely on getRandomAnimalType which respects config weights
    return getRandomAnimalType(level);
  }

  /**
   * Choose AI behavior type based on difficulty and strategy
   */
  private chooseBehaviorType(): DuckBehaviorType {
    const roll = Math.random();

    // Difficulty affects behavior distribution
    const seekerChance = 0.05 + this.difficulty * 0.15;
    const diveChance = this.difficulty > 0.4 ? 0.02 + (this.difficulty - 0.4) * 0.1 : 0;
    const zigzagChance = 0.05 + this.difficulty * 0.1;
    const evaderChance = 0.03 + this.difficulty * 0.08;
    const floaterChance = 0.08 - this.difficulty * 0.03; // Fewer floaters as difficulty increases

    // Mercy mode: more floaters, fewer aggressive behaviors
    if (this.mercyModeActive) {
      if (roll < 0.3) return "floater";
      if (roll < 0.5) return "normal";
    }

    // Challenge mode: more aggressive behaviors
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

  /**
   * Calculate initial velocity to give animals momentum
   */
  private calculateInitialVelocity(spawnX: number, state: GameState): { vx: number; vy: number } {
    let vx = 0;
    let vy = 0;

    // Base horizontal drift increases with difficulty
    const baseDrift = 0.5 + this.difficulty * 1.5;

    // Direction toward player for targeting
    const toPlayer = state.playerX - spawnX;
    const targetingStrength = this.calculateTargetBias() * 0.5;

    vx = (Math.random() - 0.5) * baseDrift + Math.sign(toPlayer) * targetingStrength;

    // Vertical speed increases with difficulty
    vy = 2 + this.difficulty * 2;

    // Challenge mode: faster animals
    if (this.activeGoal === "challenge") {
      vy *= 1.2;
      vx *= 1.3;
    }

    // Mercy mode: slower animals
    if (this.mercyModeActive) {
      vy *= 0.7;
      vx *= 0.6;
    }

    return { vx, vy };
  }

  /**
   * Calculate how much animals should aim at player
   */
  private calculateTargetBias(): number {
    let bias = 0.2 + this.difficulty * 0.4;

    if (this.activeGoal === "challenge") bias += 0.2;
    if (this.activeGoal === "mercy") bias -= 0.3;
    if (this.mercyModeActive) bias *= 0.5;

    return Math.max(0, Math.min(1, bias));
  }

  /**
   * Decide whether to spawn a power-up
   */
  decidePowerUp(): PowerUpDecision {
    if (!this.gameState) {
      return { shouldSpawn: false, type: "potion", x: 0, timing: "immediate" };
    }

    const state = this.gameState;

    // Base spawn chance
    let spawnChance = 0.01;

    // Increase chance based on power-up debt
    spawnChance += this.powerUpDebt * 0.02;

    // Increase chance if player is struggling (mercy)
    if (state.lives <= 1) spawnChance += 0.03;
    if (this.playerFrustration > 0.5) spawnChance += 0.02;

    // Decrease if too many power-ups active
    if (state.activePowerUps > 1) spawnChance *= 0.3;

    // Time since last power-up
    if (state.timeSinceLastPowerUp < 8000) {
      return { shouldSpawn: false, type: "potion", x: 0, timing: "immediate" };
    }

    // Reward goal increases chance
    if (this.activeGoal === "reward") spawnChance *= 2;

    if (Math.random() > spawnChance) {
      return { shouldSpawn: false, type: "potion", x: 0, timing: "immediate" };
    }

    // Choose power-up type intelligently
    const type = this.choosePowerUpType(state);

    // Position near player for easy collection, but not too easy
    const x = state.playerX + (Math.random() - 0.5) * 150;

    // Reset debt
    this.powerUpDebt = Math.max(0, this.powerUpDebt - 1);
    this.lastPowerUpType = type;

    return {
      shouldSpawn: true,
      type,
      x: Math.max(60, Math.min(state.screenWidth - 125, x)),
      timing: "immediate",
    };
  }

  /**
   * Choose power-up type based on game state
   */
  private choosePowerUpType(state: GameState): PowerUpType {
    // Potions when low on lives
    if (state.lives < state.maxLives && state.lives <= 2) {
      if (Math.random() < 0.5) return "potion";
    }

    // Full restore when critical
    if (state.lives === 1 && Math.random() < 0.3) {
      return "full_restore";
    }

    // Rare candy when stack is big enough
    if (state.stackHeight >= 5 && Math.random() < 0.2) {
      return "rare_candy";
    }

    // Great ball when many animals falling
    if (state.activeDucks > 2 && Math.random() < 0.25) {
      return "great_ball";
    }

    // X Attack for skilled players on good runs
    if (this.playerSkill > 0.7 && state.combo > 3 && Math.random() < 0.2) {
      return "x_attack";
    }

    // HP Up rarely
    if (state.maxLives < 8 && Math.random() < 0.1) {
      return "max_up";
    }

    // Default weighted random
    const roll = Math.random();
    if (roll < 0.35) return "potion";
    if (roll < 0.5) return "great_ball";
    if (roll < 0.65) return "x_attack";
    if (roll < 0.78) return "rare_candy";
    if (roll < 0.9) return "max_up";
    return "full_restore";
  }

  /**
   * Set active goal (called by evaluators)
   */
  setActiveGoal(
    goal: "build_pressure" | "release_tension" | "challenge" | "mercy" | "reward"
  ): void {
    this.activeGoal = goal;
  }

  /**
   * Get current spawn interval for UI/debugging
   */
  getSpawnInterval(): number {
    return this.currentSpawnInterval;
  }

  /**
   * Get difficulty for UI/debugging
   */
  getDifficulty(): number {
    return this.difficulty;
  }

  /**
   * Get active goal for debugging
   */
  getActiveGoal(): string {
    return this.activeGoal;
  }
}

// Goal Evaluators

class BuildPressureEvaluator extends GoalEvaluator<GameDirector> {
  constructor() {
    super(0.5);
  }

  calculateDesirability(owner: GameDirector): number {
    if (!owner.gameState) return 0.3;

    // Good for maintaining tension during normal play
    const performanceFactor = owner.playerSkill * 0.3;
    const stackFactor = Math.min(1, owner.gameState.stackHeight / 10) * 0.2;
    const engagementFactor = owner.playerEngagement * 0.3;

    return 0.4 + performanceFactor + stackFactor + engagementFactor;
  }

  setGoal(owner: GameDirector): void {
    owner.setActiveGoal("build_pressure");
  }
}

class ReleaseTensionEvaluator extends GoalEvaluator<GameDirector> {
  constructor() {
    super(0.4);
  }

  calculateDesirability(owner: GameDirector): number {
    if (!owner.gameState) return 0.2;

    // Release after high stress or after big stack
    const stressFactor = owner.playerFrustration * 0.4;
    const recentIntensity = owner.intensity > 0.7 ? 0.3 : 0;
    const postBank = owner.gameState.stackHeight === 0 && owner.gameState.bankedDucks > 0 ? 0.3 : 0;

    return stressFactor + recentIntensity + postBank;
  }

  setGoal(owner: GameDirector): void {
    owner.setActiveGoal("release_tension");
  }
}

class ChallengeEvaluator extends GoalEvaluator<GameDirector> {
  constructor() {
    super(0.45);
  }

  calculateDesirability(owner: GameDirector): number {
    if (!owner.gameState) return 0.2;

    // Challenge skilled players who are in flow
    const skillFactor = owner.playerSkill > 0.7 ? 0.4 : owner.playerSkill * 0.3;
    const flowFactor = owner.playerEngagement > 0.6 ? 0.3 : 0;
    const difficultyFactor = owner.difficulty * 0.2;
    const comboFactor = owner.gameState.combo > 5 ? 0.2 : 0;

    // Don't challenge struggling players
    if (owner.playerFrustration > 0.4) return 0.1;

    return skillFactor + flowFactor + difficultyFactor + comboFactor;
  }

  setGoal(owner: GameDirector): void {
    owner.setActiveGoal("challenge");
  }
}

class DirectorMercyEvaluator extends GoalEvaluator<GameDirector> {
  constructor() {
    super(0.35);
  }

  calculateDesirability(owner: GameDirector): number {
    if (!owner.gameState) return 0.2;

    // High priority when player is struggling
    const lowLives = owner.gameState.lives <= 1 ? 0.5 : 0;
    const frustrationFactor = owner.playerFrustration * 0.5;
    const dangerFactor = owner.gameState.stackHeight > 12 ? 0.2 : 0;
    const recentMisses = owner.gameState.recentMisses > 2 ? 0.3 : 0;

    return lowLives + frustrationFactor + dangerFactor + recentMisses;
  }

  setGoal(owner: GameDirector): void {
    owner.setActiveGoal("mercy");
  }
}

class RewardEvaluator extends GoalEvaluator<GameDirector> {
  constructor() {
    super(0.3);
  }

  calculateDesirability(owner: GameDirector): number {
    if (!owner.gameState) return 0.1;

    // Reward after good performance
    const debtFactor = Math.min(0.4, owner.powerUpDebt * 0.1);
    const comboFactor = owner.gameState.combo > 8 ? 0.3 : owner.gameState.combo > 4 ? 0.15 : 0;
    const perfectFactor = owner.gameState.recentPerfects > 3 ? 0.2 : 0;

    return debtFactor + comboFactor + perfectFactor;
  }

  setGoal(owner: GameDirector): void {
    owner.setActiveGoal("reward");
  }
}