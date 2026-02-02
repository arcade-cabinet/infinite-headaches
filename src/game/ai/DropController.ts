/**
 * Drop Controller -- Unified AI Orchestrator with Yahtzee-Aware Distribution
 *
 * Replaces GameDirector with all original responsibilities preserved plus:
 *  - Yahtzee-aware animal type selection (combo-oriented distribution)
 *  - Stack composition analysis
 *  - Remediation logic (compensate after disruptive drops)
 *  - Tornado drop indicator positioning (nextDropX)
 *
 * Original responsibilities (preserved from GameDirector):
 *  - Track an internal model of estimated player skill, fatigue, frustration, and engagement.
 *  - Compute difficulty on a logarithmic curve from level, time, and score.
 *  - Choose a dominant strategy (BuildPressure, ReleaseTension, Challenge, Mercy, Reward).
 *  - Produce spawn decisions: position, animal type, behavior type, velocity.
 *  - Decide when and which power-ups to spawn.
 */

import type { AnimalType, PowerUpType } from "../config";
import { ANIMAL_TYPES, GAME_CONFIG } from "../config";
import type { DuckBehaviorType } from "./DuckBehavior";
import type { PlayerState, SpawnDecision, PowerUpDecision, YahtzeeCombo } from "./types";
import { TORNADO_RAIL_CONFIG, worldXToRailT, railTToWorldX } from "../rails";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The five high-level strategies the controller can pursue. */
type DirectorStrategy =
  | "build_pressure"
  | "release_tension"
  | "challenge"
  | "mercy"
  | "reward";

/** Classification of a type choice relative to current combo paths. */
type TypeClassification = "helpful" | "neutral" | "disruptive";

/** Internal interface for a strategy evaluator. */
interface StrategyEvaluator {
  readonly name: DirectorStrategy;
  readonly bias: number;
  score(controller: DropController): number;
}

/** Info about an in-progress Yahtzee combo. */
interface ComboProgress {
  combo: YahtzeeCombo;
  /** How many more of the right type are needed. */
  remaining: number;
  /** Which types would advance this combo. */
  helpfulTypes: AnimalType[];
  /** Completion probability estimate (0-1). */
  probability: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All spawnable animal types (farmer excluded). */
const SPAWNABLE_TYPES: AnimalType[] = (
  Object.entries(ANIMAL_TYPES) as [AnimalType, typeof ANIMAL_TYPES[AnimalType]][]
)
  .filter(([_, cfg]) => cfg.hasModel && cfg.spawnWeight > 0)
  .map(([type]) => type);

/** Fairness distribution by game phase. */
const FAIRNESS_TABLE = {
  early:  { helpful: 0.70, neutral: 0.20, disruptive: 0.10 }, // levels 1-5
  mid:    { helpful: 0.50, neutral: 0.30, disruptive: 0.20 }, // levels 6-15
  late:   { helpful: 0.35, neutral: 0.30, disruptive: 0.35 }, // levels 16-25
} as const;

// ---------------------------------------------------------------------------
// Strategy Evaluators (identical to GameDirector)
// ---------------------------------------------------------------------------

const EVALUATORS: readonly StrategyEvaluator[] = [
  {
    name: "build_pressure",
    bias: 0.5,
    score(d: DropController): number {
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
    score(d: DropController): number {
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
    score(d: DropController): number {
      if (!d.gameState) return 0.2;
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
    score(d: DropController): number {
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
    score(d: DropController): number {
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
// DropController
// ---------------------------------------------------------------------------

export class DropController {
  // -- Public read-only state (exposed for debugging / UI / tornado) --------

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

  // -- Tornado / drop indicator state (rail-based) -------------------------

  /** Current tornado position as rail parameter T in [0, 1]. */
  private _tornadoRailT: number = 0.5;

  /** Smooth current tornado X position (world-space, derived from rail T). */
  private _tornadoX: number = 0;

  /** True when spawn timer is within 30% of firing. */
  private _isDropImminent: boolean = false;

  // -- Yahtzee-aware state -------------------------------------------------

  /** Count of consecutive disruptive drops. */
  private consecutiveDisruptive: number = 0;

  /** Recent drop type classifications for remediation tracking. */
  private recentDropClassifications: TypeClassification[] = [];

  /** Current stack composition cache. */
  private stackComposition: Record<AnimalType, number> = {} as Record<AnimalType, number>;

  // -- Private state (preserved from GameDirector) -------------------------

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

  /** Patrol phase for tornado idle movement. */
  private tornadoPatrolPhase: number = 0;

  // -----------------------------------------------------------------------

  constructor(config: typeof GAME_CONFIG = GAME_CONFIG) {
    this.baseSpawnInterval = config.spawning.initialInterval;
    this.currentSpawnInterval = this.baseSpawnInterval;
    this.minSpawnInterval = config.spawning.minInterval;

    // Initialize stack composition
    for (const type of SPAWNABLE_TYPES) {
      this.stackComposition[type] = 0;
    }
  }

  // -----------------------------------------------------------------------
  // Main update
  // -----------------------------------------------------------------------

  update(dt: number, state: PlayerState): SpawnDecision | null {
    this.gameState = state;

    // Advance internal timers
    this.timeSinceLastSpawn += dt;
    this.timeSinceLastPowerUp += dt;
    this.timeSinceLastMiss += dt;
    this.timeSinceLastPerfect += dt;

    // Update stack composition from state
    if (state.stackComposition) {
      this.stackComposition = { ...state.stackComposition };
    }

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

    // Update tornado indicator position
    this.updateTornadoPosition(dt);

    // Update drop imminence flag
    const spawnProgress = this.timeSinceLastSpawn / this.currentSpawnInterval;
    this._isDropImminent = spawnProgress > 0.7;

    // Decide whether to spawn
    return this.decideSpawn(state);
  }

  // -----------------------------------------------------------------------
  // Event notifications (called by GameLogic)
  // -----------------------------------------------------------------------

  onAnimalCaught(quality: "perfect" | "good" | "normal"): void {
    const boost = quality === "perfect" ? 0.04 : quality === "good" ? 0.02 : 0.01;
    this.playerSkill = Math.min(1, this.playerSkill + boost);
    this.playerFrustration = Math.max(0, this.playerFrustration - 0.05);

    if (quality === "perfect") {
      this.recentPerfects++;
      this.timeSinceLastPerfect = 0;
    }
  }

  onAnimalMissed(): void {
    this.playerSkill = Math.max(0, this.playerSkill - 0.03);
    this.playerFrustration = Math.min(1, this.playerFrustration + 0.15);
    this.timeSinceLastMiss = 0;
  }

  onStackTopple(): void {
    this.playerFrustration = Math.min(1, this.playerFrustration + 0.25);
    this.playerFatigue = Math.min(1, this.playerFatigue + 0.1);
  }

  onBankSuccess(count: number): void {
    this.playerEngagement = Math.min(1, this.playerEngagement + 0.1);
    this.powerUpDebt += count * 0.05;
    this.playerFrustration = Math.max(0, this.playerFrustration - 0.1);
  }

  onLevelUp(_level: number): void {
    this.playerEngagement = Math.min(1, this.playerEngagement + 0.05);
  }

  // -----------------------------------------------------------------------
  // Public queries
  // -----------------------------------------------------------------------

  getSpawnInterval(): number {
    return this.currentSpawnInterval;
  }

  shouldSpawnPowerUp(): PowerUpType | null {
    const decision = this.decidePowerUp();
    return decision.shouldSpawn ? (decision.type as PowerUpType) : null;
  }

  getBehaviorType(): DuckBehaviorType {
    return this.chooseBehaviorType();
  }

  getActiveGoal(): DirectorStrategy {
    return this.activeGoal;
  }

  getDifficulty(): number {
    return this.difficulty;
  }

  /** Get current tornado indicator X position (world-space, -7.5 to 7.5). */
  getNextDropX(): number {
    return this._tornadoX;
  }

  /** True when the next spawn is imminent (within 30% of timer). */
  getIsDropImminent(): boolean {
    return this._isDropImminent;
  }

  /** Preview of the next drop type based on current stack analysis. */
  getDropPreview(): { type: AnimalType; helpful: boolean } {
    const type = this.chooseYahtzeeAwareType();
    const classification = this.classifyType(type);
    return { type, helpful: classification === "helpful" };
  }

  // -----------------------------------------------------------------------
  // Player model (preserved from GameDirector)
  // -----------------------------------------------------------------------

  private updatePlayerModel(state: PlayerState): void {
    const skillAlpha = 0.1;
    this.playerSkill =
      this.playerSkill * (1 - skillAlpha) + state.catchRate * skillAlpha;

    this.playerFatigue = Math.min(
      1,
      Math.log10(1 + state.gameTime / 60000) * 0.3,
    );

    const frustrationDecay = Math.min(1, this.timeSinceLastMiss / 10000);
    this.playerFrustration = Math.max(
      0,
      this.playerFrustration - frustrationDecay * 0.002,
    );

    const hasGoodCombo = state.combo > 3;
    const hasGoodStack = state.stackHeight >= 3 && state.stackHeight <= 12;
    const recentSuccess = this.timeSinceLastPerfect < 5000;
    this.playerEngagement =
      (hasGoodCombo ? 0.3 : 0) +
      (hasGoodStack ? 0.3 : 0) +
      (recentSuccess ? 0.2 : 0) +
      (1 - this.playerFrustration) * 0.2;

    if (this.timeSinceLastPerfect > 10000) {
      this.recentPerfects = Math.max(0, this.recentPerfects - 1);
    }
  }

  // -----------------------------------------------------------------------
  // Difficulty (preserved from GameDirector)
  // -----------------------------------------------------------------------

  private updateDifficulty(state: PlayerState): void {
    const levelDifficulty =
      Math.log10(1 + state.level) / Math.log10(26);
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

    const alpha = 0.05;
    this.difficulty =
      this.difficulty * (1 - alpha) + this.targetDifficulty * alpha;

    const range = this.baseSpawnInterval - this.minSpawnInterval;
    this.currentSpawnInterval = this.baseSpawnInterval - this.difficulty * range;

    this.mercyModeActive =
      (state.lives <= 1) || (this.playerFrustration > 0.6);
  }

  // -----------------------------------------------------------------------
  // Strategy selection (preserved from GameDirector)
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
  // Intensity (preserved from GameDirector)
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
  // Tornado position management (rail-based)
  // -----------------------------------------------------------------------

  private updateTornadoPosition(dt: number): void {
    // Advance patrol phase (sinusoidal idle movement)
    this.tornadoPatrolPhase += (dt / 1000) * 0.5; // Half-cycle per second

    // Idle patrol in T-space: sinusoidal sweep centered at 0.5, amplitude 0.4
    const patrolT = 0.5 + Math.sin(this.tornadoPatrolPhase) * 0.4;

    // Strategy-based target T
    const strategyT = this.calculateTornadoTargetT();

    // Blend between patrol and strategy target based on spawn imminence
    const spawnProgress = this.timeSinceLastSpawn / this.currentSpawnInterval;
    const targetWeight = Math.min(1, Math.max(0, (spawnProgress - 0.3) / 0.7));

    const targetT = patrolT * (1 - targetWeight) + strategyT * targetWeight;

    // Smooth interpolation in T-space
    const lerpSpeed = this._isDropImminent ? 0.15 : 0.05;
    this._tornadoRailT += (targetT - this._tornadoRailT) * lerpSpeed;

    // Clamp T to [0, 1]
    this._tornadoRailT = Math.max(0, Math.min(1, this._tornadoRailT));

    // Derive world-space X from rail T
    this._tornadoX = railTToWorldX(this._tornadoRailT, TORNADO_RAIL_CONFIG);
  }

  /**
   * Calculate the strategic tornado target position in rail T-space.
   * Absorbs strategy logic from the old calculateSpawnX().
   */
  private calculateTornadoTargetT(): number {
    if (!this.gameState) return 0.5;
    const state = this.gameState;

    // Convert player screen X to rail T for comparison
    const playerWorldX = (state.playerX / state.screenWidth) * 16 - 8;
    const playerT = worldXToRailT(playerWorldX, TORNADO_RAIL_CONFIG);

    let targetT: number;

    switch (this.activeGoal) {
      case "challenge":
        // Opposite side of player
        if (playerT < 0.5) {
          targetT = 0.7 + Math.random() * 0.25;
        } else {
          targetT = Math.random() * 0.25 + 0.05;
        }
        break;

      case "mercy":
        // Near player position with small jitter
        targetT = playerT + (Math.random() - 0.5) * 0.1;
        break;

      case "build_pressure": {
        // Directional drift from player
        this.driftPressureDirection();
        const pressureOffset = this.pressureDirection * 0.3;
        targetT = playerT + pressureOffset + (Math.random() - 0.5) * 0.1;
        break;
      }

      case "release_tension":
        // Random position
        targetT = Math.random();
        break;

      default: {
        // Reward / fallback: player-biased random
        const biasStrength = 0.3 + this.difficulty * 0.3;
        const randomT = Math.random();
        targetT = randomT * (1 - biasStrength) + playerT * biasStrength;
      }
    }

    // Anti-repetition: prevent 3+ spawns from the same third of the rail
    const third = targetT < 0.33 ? "left" : targetT > 0.66 ? "right" : "center";
    if (third === this.lastSpawnSide) {
      this.consecutiveSameSide++;
      if (this.consecutiveSameSide > 2) {
        if (third === "left") targetT = 0.7;
        else if (third === "right") targetT = 0.3;
        else targetT = Math.random() > 0.5 ? 0.2 : 0.8;
        this.consecutiveSameSide = 0;
      }
    } else {
      this.consecutiveSameSide = 0;
    }

    return Math.max(0, Math.min(1, targetT));
  }

  // -----------------------------------------------------------------------
  // Spawn decision
  // -----------------------------------------------------------------------

  private decideSpawn(state: PlayerState): SpawnDecision | null {
    if (this.timeSinceLastSpawn < this.currentSpawnInterval) {
      return null;
    }

    if (
      this.mercyModeActive &&
      this.timeSinceLastSpawn < this.currentSpawnInterval * 1.5
    ) {
      return null;
    }

    this.timeSinceLastSpawn = 0;

    // Tornado IS the spawn point: spawn at current tornado world X
    const spawnWorldX = this._tornadoX;
    // Convert to backward-compatible screen-space X for SpawnDecision.x
    const spawnScreenX = ((spawnWorldX + 8) / 16) * state.screenWidth;

    const duckType = this.chooseYahtzeeAwareType();
    const behaviorType = this.chooseBehaviorType();
    const { vx, vy } = this.calculateInitialVelocity(spawnScreenX, state);
    const targetBias = this.calculateTargetBias();

    // Update lastSpawnSide for anti-repetition tracking
    this.lastSpawnSide = this._tornadoRailT < 0.33 ? "left" : this._tornadoRailT > 0.66 ? "right" : "center";

    // Track the type classification for remediation
    const classification = this.classifyType(duckType);
    this.recentDropClassifications.push(classification);
    if (this.recentDropClassifications.length > 10) {
      this.recentDropClassifications.shift();
    }
    if (classification === "disruptive") {
      this.consecutiveDisruptive++;
    } else {
      this.consecutiveDisruptive = 0;
    }

    return {
      shouldSpawn: true,
      x: spawnScreenX,
      duckType,
      behaviorType,
      initialVelocityX: vx,
      initialVelocityY: vy,
      targetBias,
      nextDropX: spawnWorldX,
    };
  }

  // -----------------------------------------------------------------------
  // Yahtzee-Aware Type Selection
  // -----------------------------------------------------------------------

  /** Analyze current stack and select a type based on Yahtzee combo fairness. */
  private chooseYahtzeeAwareType(): AnimalType {
    const level = this.gameState?.level ?? 1;

    // If stack is empty, just do weighted random (no combo context)
    const totalInStack = Object.values(this.stackComposition).reduce((a, b) => a + b, 0);
    if (totalInStack === 0) {
      return this.weightedRandomType();
    }

    // Analyze active combo paths
    const comboPaths = this.analyzeComboProgress();

    // Determine game phase for fairness distribution
    const phase = level <= 5 ? "early" : level <= 15 ? "mid" : "late";
    const fairness = FAIRNESS_TABLE[phase];

    // Remediation: if last 2 drops were disruptive, force helpful or trigger power-up compensation
    const needsRemediation = this.consecutiveDisruptive >= 2;

    if (needsRemediation) {
      // Try to pick a helpful type
      const helpfulTypes = this.getHelpfulTypes(comboPaths);
      if (helpfulTypes.length > 0) {
        return helpfulTypes[Math.floor(Math.random() * helpfulTypes.length)];
      }
      // If no helpful type exists, at least pick a neutral one
      // (power-up compensation is handled in GameLogic via shouldSpawnPowerUp)
      return this.weightedRandomType();
    }

    // Normal selection: roll for classification, then pick type
    const roll = Math.random();
    if (roll < fairness.helpful) {
      const helpfulTypes = this.getHelpfulTypes(comboPaths);
      if (helpfulTypes.length > 0) {
        return helpfulTypes[Math.floor(Math.random() * helpfulTypes.length)];
      }
    } else if (roll < fairness.helpful + fairness.neutral) {
      return this.weightedRandomType();
    }
    // else: disruptive -- pick a type that doesn't help any combo
    const disruptiveTypes = this.getDisruptiveTypes(comboPaths);
    if (disruptiveTypes.length > 0) {
      return disruptiveTypes[Math.floor(Math.random() * disruptiveTypes.length)];
    }

    return this.weightedRandomType();
  }

  /** Analyze which Yahtzee combos are in progress given the current stack. */
  private analyzeComboProgress(): ComboProgress[] {
    const comp = this.stackComposition;
    const totalInStack = Object.values(comp).reduce((a, b) => a + b, 0);
    const paths: ComboProgress[] = [];

    const typeCounts = SPAWNABLE_TYPES.map(t => ({ type: t, count: comp[t] || 0 }))
      .filter(tc => tc.count > 0)
      .sort((a, b) => b.count - a.count);

    const uniqueTypes = typeCounts.length;

    // Pair detection (2 of same)
    for (const tc of typeCounts) {
      if (tc.count >= 1 && tc.count < 2) {
        paths.push({
          combo: "pair",
          remaining: 2 - tc.count,
          helpfulTypes: [tc.type],
          probability: 0.8, // Easy to complete
        });
      }
    }

    // Three of a kind
    for (const tc of typeCounts) {
      if (tc.count >= 2 && tc.count < 3) {
        paths.push({
          combo: "three_of_kind",
          remaining: 3 - tc.count,
          helpfulTypes: [tc.type],
          probability: 0.5,
        });
      } else if (tc.count >= 1 && tc.count < 3) {
        paths.push({
          combo: "three_of_kind",
          remaining: 3 - tc.count,
          helpfulTypes: [tc.type],
          probability: 0.3,
        });
      }
    }

    // Four of a kind
    for (const tc of typeCounts) {
      if (tc.count >= 3) {
        paths.push({
          combo: "four_of_kind",
          remaining: 4 - tc.count,
          helpfulTypes: [tc.type],
          probability: Math.max(0.1, 0.4 - (4 - tc.count) * 0.1),
        });
      }
    }

    // Two pair
    const pairs = typeCounts.filter(tc => tc.count >= 1);
    if (pairs.length >= 2) {
      const nearPairs = typeCounts.filter(tc => tc.count === 1);
      if (nearPairs.length >= 1) {
        paths.push({
          combo: "two_pair",
          remaining: nearPairs.length >= 2 ? 2 : 1,
          helpfulTypes: nearPairs.map(np => np.type),
          probability: 0.4,
        });
      }
    }

    // Full house (3 + 2)
    const hasThree = typeCounts.some(tc => tc.count >= 3);
    const hasTwo = typeCounts.filter(tc => tc.count >= 2).length >= 2;
    if (typeCounts.length >= 2) {
      const helpfulForFullHouse: AnimalType[] = [];
      for (const tc of typeCounts) {
        if (tc.count === 2) helpfulForFullHouse.push(tc.type); // needs one more for triple
        if (tc.count === 1 && hasThree) helpfulForFullHouse.push(tc.type); // needs one more for pair
      }
      if (helpfulForFullHouse.length > 0) {
        paths.push({
          combo: "full_house",
          remaining: (hasThree && hasTwo) ? 0 : helpfulForFullHouse.length,
          helpfulTypes: helpfulForFullHouse,
          probability: hasThree ? 0.4 : 0.2,
        });
      }
    }

    // Straight (one of each of 5 types)
    if (uniqueTypes >= 3) {
      const missingTypes = SPAWNABLE_TYPES.filter(t => (comp[t] || 0) === 0);
      if (missingTypes.length <= 2 && missingTypes.length > 0) {
        paths.push({
          combo: "straight",
          remaining: missingTypes.length,
          helpfulTypes: missingTypes,
          probability: Math.max(0.1, 0.3 - missingTypes.length * 0.1),
        });
      }
    }

    // Flush (all same type, 5+)
    for (const tc of typeCounts) {
      if (tc.count >= 3 && totalInStack <= tc.count + 2) {
        paths.push({
          combo: "flush",
          remaining: Math.max(0, 5 - tc.count),
          helpfulTypes: [tc.type],
          probability: Math.max(0.05, 0.3 - (5 - tc.count) * 0.05),
        });
      }
    }

    // Sort by probability descending
    paths.sort((a, b) => b.probability - a.probability);
    return paths;
  }

  /** Get types that would advance at least one in-progress combo. */
  private getHelpfulTypes(comboPaths: ComboProgress[]): AnimalType[] {
    const helpfulSet = new Set<AnimalType>();
    for (const path of comboPaths) {
      if (path.remaining > 0) {
        for (const t of path.helpfulTypes) {
          helpfulSet.add(t);
        }
      }
    }
    return Array.from(helpfulSet);
  }

  /** Get types that don't advance any in-progress combo. */
  private getDisruptiveTypes(comboPaths: ComboProgress[]): AnimalType[] {
    const helpfulSet = new Set<AnimalType>();
    for (const path of comboPaths) {
      for (const t of path.helpfulTypes) {
        helpfulSet.add(t);
      }
    }
    return SPAWNABLE_TYPES.filter(t => !helpfulSet.has(t));
  }

  /** Classify a type as helpful, neutral, or disruptive given current stack. */
  private classifyType(type: AnimalType): TypeClassification {
    const totalInStack = Object.values(this.stackComposition).reduce((a, b) => a + b, 0);
    if (totalInStack === 0) return "neutral";

    const comboPaths = this.analyzeComboProgress();
    const helpfulTypes = this.getHelpfulTypes(comboPaths);
    const disruptiveTypes = this.getDisruptiveTypes(comboPaths);

    if (helpfulTypes.includes(type)) return "helpful";
    if (disruptiveTypes.includes(type)) return "disruptive";
    return "neutral";
  }

  /** Simple weighted random from ANIMAL_TYPES spawn weights. */
  private weightedRandomType(): AnimalType {
    const rand = Math.random();
    let cumulative = 0;
    const totalWeight = SPAWNABLE_TYPES.reduce(
      (sum, t) => sum + ANIMAL_TYPES[t].spawnWeight,
      0,
    );

    for (const type of SPAWNABLE_TYPES) {
      cumulative += ANIMAL_TYPES[type].spawnWeight / totalWeight;
      if (rand < cumulative) return type;
    }

    return SPAWNABLE_TYPES[SPAWNABLE_TYPES.length - 1];
  }

  /** Whether remediation requires a compensating power-up spawn. */
  needsRemediationPowerUp(): boolean {
    if (this.consecutiveDisruptive < 2) return false;
    // If no helpful types exist, compensate with a power-up
    const comboPaths = this.analyzeComboProgress();
    const helpfulTypes = this.getHelpfulTypes(comboPaths);
    return helpfulTypes.length === 0;
  }

  // -----------------------------------------------------------------------
  // Pressure direction drift (used by calculateTornadoTargetT)
  // -----------------------------------------------------------------------

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
  // Behavior type selection (preserved from GameDirector)
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

    if (this.mercyModeActive) {
      if (roll < 0.3) return "floater";
      if (roll < 0.5) return "normal";
    }

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
  // Initial velocity (preserved from GameDirector)
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
  // Power-up decision (preserved from GameDirector, with remediation hook)
  // -----------------------------------------------------------------------

  decidePowerUp(): PowerUpDecision {
    const noSpawn: PowerUpDecision = {
      shouldSpawn: false,
      type: "potion",
      x: 0,
      timing: "immediate",
    };

    if (!this.gameState) return noSpawn;
    const state = this.gameState;

    if (this.timeSinceLastPowerUp < GAME_CONFIG.powerUps.spawnInterval) {
      // Exception: remediation can override cooldown
      if (!this.needsRemediationPowerUp()) {
        return noSpawn;
      }
    }

    let chance = 0.01;
    chance += this.powerUpDebt * 0.02;

    if (state.lives <= 1) chance += 0.03;
    if (this.playerFrustration > 0.5) chance += 0.02;

    if (state.activePowerUps > 1) chance *= 0.3;

    if (this.activeGoal === "reward") chance *= 2;

    // Remediation boost: greatly increase power-up chance after consecutive disruptive drops
    if (this.needsRemediationPowerUp()) chance += 0.15;

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
  // Power-up type selection (preserved from GameDirector)
  // -----------------------------------------------------------------------

  private choosePowerUpType(state: PlayerState): PowerUpType {
    if (state.lives < state.maxLives && state.lives <= 2) {
      if (Math.random() < 0.5) return "potion";
    }

    if (state.lives === 1 && Math.random() < 0.3) {
      return "full_restore";
    }

    if (state.stackHeight >= 5 && Math.random() < 0.2) {
      return "rare_candy";
    }

    if (state.activeDucks > 2 && Math.random() < 0.25) {
      return "great_ball";
    }

    if (this.playerSkill > 0.7 && state.combo > 3 && Math.random() < 0.2) {
      return "x_attack";
    }

    if (state.maxLives < GAME_CONFIG.lives.absoluteMax && Math.random() < 0.1) {
      return "max_up";
    }

    const roll = Math.random();
    if (roll < 0.35) return "potion";
    if (roll < 0.50) return "great_ball";
    if (roll < 0.65) return "x_attack";
    if (roll < 0.78) return "rare_candy";
    if (roll < 0.90) return "max_up";
    return "full_restore";
  }
}
