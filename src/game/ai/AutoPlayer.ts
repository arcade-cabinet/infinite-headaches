/**
 * YUKA-powered AutoPlayer for Automated Playtesting
 *
 * An intelligent AI that plays the game automatically for E2E testing.
 * Uses YUKA's goal-driven AI and steering behaviors to:
 * - Track and catch falling animals
 * - Maintain stack balance
 * - Bank the stack strategically
 * - Activate special animal abilities
 */

import { GameEntity, GoalEvaluator, Think, StateMachine, State, Vector3 } from "yuka";
import type { Animal } from "../entities/Animal";
import type { GameEngine } from "../engine/GameEngine";
import { GAME_CONFIG } from "../config";

// Global toggle for auto-player
let autoPlayerEnabled = false;

/**
 * Enable the AutoPlayer for E2E testing
 */
export function enableAutoPlayer(): void {
  autoPlayerEnabled = true;
  console.log("[AutoPlayer] Enabled");
}

/**
 * Disable the AutoPlayer
 */
export function disableAutoPlayer(): void {
  autoPlayerEnabled = false;
  console.log("[AutoPlayer] Disabled");
}

/**
 * Check if AutoPlayer is currently enabled
 */
export function isAutoPlayerEnabled(): boolean {
  return autoPlayerEnabled;
}

// Expose toggle functions on window for Maestro tests
if (typeof window !== "undefined") {
  (window as any).__enableAutoPlayer = enableAutoPlayer;
  (window as any).__disableAutoPlayer = disableAutoPlayer;
  (window as any).__isAutoPlayerEnabled = isAutoPlayerEnabled;
}

/**
 * Predicted landing position for a falling animal
 */
interface PredictedLanding {
  animal: Animal;
  x: number;
  y: number;
  timeToLand: number;
  priority: number;
  threatLevel: number;
}

/**
 * AutoPlayer game state snapshot
 */
export interface AutoPlayerGameState {
  playerX: number;
  playerY: number;
  stackHeight: number;
  stackWobble: number;
  canBank: boolean;
  fallingAnimals: Animal[];
  stackedAnimals: Animal[];
  screenWidth: number;
  screenHeight: number;
  inDanger: boolean;
}

/**
 * AutoPlayer strategies
 */
type AutoPlayerStrategy = "catch" | "balance" | "bank" | "ability" | "idle";

/**
 * The AutoPlayer - YUKA GameEntity that controls the base player
 */
export class AutoPlayer extends GameEntity {
  // Thinking brain for goal-driven behavior
  brain: Think<AutoPlayer>;

  // State machine for play strategies
  stateMachine: StateMachine<AutoPlayer>;

  // Current game state (updated each frame)
  gameState: AutoPlayerGameState | null = null;

  // Target position for movement
  targetX: number = 0;
  currentX: number = 0;

  // Predicted landing positions
  predictions: PredictedLanding[] = [];

  // Current strategy
  activeStrategy: AutoPlayerStrategy = "idle";

  // Movement smoothing
  private moveSpeed: number = 8;
  private arriveRadius: number = 20;

  // Decision thresholds
  private bankThreshold: number = 5;
  private dangerWobbleThreshold: number = 15;
  private balancePriority: number = 0.7;

  // Timing
  private lastDecisionTime: number = 0;
  private decisionInterval: number = 100; // ms between major decisions
  private lastBankTime: number = 0;
  private bankCooldown: number = 2000;

  // Reference to game engine (set externally)
  private gameEngineRef: GameEngine | null = null;

  // Callback for banking
  private bankCallback: (() => void) | null = null;

  constructor() {
    super();

    this.brain = new Think(this);
    this.setupGoalEvaluators();

    this.stateMachine = new StateMachine(this);
    this.setupStateMachine();
  }

  /**
   * Set reference to the game engine for control actions
   */
  setGameEngine(engine: GameEngine): void {
    this.gameEngineRef = engine;
  }

  /**
   * Set callback for banking the stack
   */
  setBankCallback(callback: () => void): void {
    this.bankCallback = callback;
  }

  /**
   * Setup goal evaluators for decision making
   */
  private setupGoalEvaluators(): void {
    this.brain.addEvaluator(new CatchEvaluator());
    this.brain.addEvaluator(new BalanceEvaluator());
    this.brain.addEvaluator(new BankEvaluator());
    this.brain.addEvaluator(new AbilityEvaluator());
    this.brain.addEvaluator(new IdleEvaluator());
  }

  /**
   * Setup state machine for play strategies
   */
  private setupStateMachine(): void {
    this.stateMachine.add("catch", new CatchState());
    this.stateMachine.add("balance", new BalanceState());
    this.stateMachine.add("bank", new BankState());
    this.stateMachine.add("ability", new AbilityState());
    this.stateMachine.add("idle", new IdleState());

    this.stateMachine.changeTo("idle");
  }

  /**
   * Update game state snapshot
   */
  updateGameState(state: AutoPlayerGameState): void {
    this.gameState = state;
    this.currentX = state.playerX;

    // Update landing predictions
    this.updatePredictions();
  }

  /**
   * Predict where falling animals will land
   */
  private updatePredictions(): void {
    if (!this.gameState) {
      this.predictions = [];
      return;
    }

    const { fallingAnimals, playerY, screenWidth, screenHeight } = this.gameState;
    const floorY = screenHeight * GAME_CONFIG.layout.floorY;
    const bankWidth = GAME_CONFIG.layout.bankWidth;

    this.predictions = fallingAnimals.map((animal) => {
      // Predict landing position based on current velocity
      const remainingY = floorY - animal.y;
      const fallSpeed = Math.max(animal.velocityY, GAME_CONFIG.physics.gravity * 10);
      const timeToLand = remainingY / fallSpeed;

      // Predict X position at landing
      let predictedX = animal.x + animal.velocityX * timeToLand;

      // Clamp to playable area
      const padding = GAME_CONFIG.spawning.horizontalPadding;
      predictedX = Math.max(padding, Math.min(screenWidth - bankWidth - padding, predictedX));

      // Calculate priority based on multiple factors
      const timeFactor = Math.max(0, 1 - timeToLand / 3); // Higher priority for closer animals
      const distanceFactor = 1 - Math.abs(predictedX - this.currentX) / screenWidth;
      const behaviorThreat = this.getBehaviorThreat(animal.behaviorType);

      const priority = timeFactor * 0.5 + distanceFactor * 0.3 + behaviorThreat * 0.2;

      return {
        animal,
        x: predictedX,
        y: floorY,
        timeToLand,
        priority,
        threatLevel: behaviorThreat,
      };
    });

    // Sort by priority (highest first)
    this.predictions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get threat level for a behavior type
   */
  private getBehaviorThreat(behaviorType: string): number {
    switch (behaviorType) {
      case "dive":
        return 1.0;
      case "seeker":
        return 0.8;
      case "zigzag":
        return 0.6;
      case "evader":
        return 0.5;
      case "floater":
        return 0.2;
      default:
        return 0.4;
    }
  }

  /**
   * Calculate stack wobble magnitude
   */
  getStackWobble(): number {
    if (!this.gameState) return 0;

    let maxWobble = 0;
    for (const animal of this.gameState.stackedAnimals) {
      maxWobble = Math.max(maxWobble, Math.abs(animal.wobbleOffset));
    }
    return maxWobble;
  }

  /**
   * Get the best catch target
   */
  getBestCatchTarget(): PredictedLanding | null {
    if (this.predictions.length === 0) return null;

    // Filter to animals that are actually reachable
    const reachable = this.predictions.filter((p) => {
      const distance = Math.abs(p.x - this.currentX);
      const timeNeeded = distance / (this.moveSpeed * 60); // Rough estimate
      return p.timeToLand > timeNeeded * 0.5; // Some buffer
    });

    return reachable[0] || this.predictions[0];
  }

  /**
   * Get center of mass offset for balance calculation
   */
  getCenterOfMassOffset(): number {
    if (!this.gameState || this.gameState.stackedAnimals.length === 0) return 0;

    let totalMass = 1;
    let weightedOffset = 0;

    for (let i = 0; i < this.gameState.stackedAnimals.length; i++) {
      const animal = this.gameState.stackedAnimals[i];
      const massFactor = animal.mergeLevel * (1 + i * 0.2);
      totalMass += massFactor;
      weightedOffset += (animal.wobbleOffset + animal.stackOffset) * massFactor;
    }

    return weightedOffset / totalMass;
  }

  /**
   * Find a special animal that can use its ability
   */
  findReadyAbilityAnimal(): Animal | null {
    if (!this.gameState) return null;

    for (const animal of this.gameState.stackedAnimals) {
      if (animal.canUseAbility()) {
        return animal;
      }
    }
    return null;
  }

  /**
   * Determine if we should bank
   */
  shouldBank(): boolean {
    if (!this.gameState) return false;

    const now = performance.now();
    if (now - this.lastBankTime < this.bankCooldown) return false;

    const { stackHeight, canBank, inDanger } = this.gameState;

    // Always bank if in danger with good stack
    if (inDanger && stackHeight >= this.bankThreshold) return true;

    // Bank if stack is getting tall
    if (stackHeight >= this.bankThreshold + 3) return true;

    // Bank if wobble is high
    if (canBank && this.getStackWobble() > this.dangerWobbleThreshold) return true;

    return false;
  }

  /**
   * Execute bank action
   */
  executeBank(): void {
    if (this.bankCallback) {
      this.bankCallback();
      this.lastBankTime = performance.now();
      console.log("[AutoPlayer] Banking stack");
    }
  }

  /**
   * Execute poke/ability action on an animal
   */
  executeAbility(animal: Animal): void {
    animal.poke();
    console.log(`[AutoPlayer] Activated ability on ${animal.type}`);
  }

  /**
   * Set the active strategy
   */
  setActiveStrategy(strategy: AutoPlayerStrategy): void {
    if (this.activeStrategy !== strategy) {
      this.activeStrategy = strategy;
      this.stateMachine.changeTo(strategy);
    }
  }

  /**
   * Move toward a target position using arrive behavior
   */
  moveToward(targetX: number): void {
    this.targetX = targetX;
  }

  /**
   * Get the desired X position (called by game engine)
   */
  getDesiredX(): number {
    if (!autoPlayerEnabled || !this.gameState) {
      return this.currentX;
    }

    // Smooth movement toward target
    const dx = this.targetX - this.currentX;
    const distance = Math.abs(dx);

    if (distance < 1) {
      return this.currentX;
    }

    // Arrive behavior: slow down as we get close
    let speed = this.moveSpeed;
    if (distance < this.arriveRadius) {
      speed = this.moveSpeed * (distance / this.arriveRadius);
    }

    const direction = Math.sign(dx);
    const movement = direction * Math.min(speed, distance);

    return this.currentX + movement;
  }

  /**
   * Main update loop
   */
  update(delta: number): this {
    super.update(delta);

    if (!autoPlayerEnabled || !this.gameState) {
      return this;
    }

    const now = performance.now();

    // Make major decisions at intervals
    if (now - this.lastDecisionTime >= this.decisionInterval) {
      this.lastDecisionTime = now;

      // Let brain evaluate and pick best goal
      this.brain.execute();
    }

    // Update state machine
    this.stateMachine.update();

    return this;
  }
}

// ============================================================================
// Goal Evaluators
// ============================================================================

/**
 * Evaluator: Catch falling animals
 */
class CatchEvaluator extends GoalEvaluator<AutoPlayer> {
  constructor() {
    super(0.6);
  }

  calculateDesirability(owner: AutoPlayer): number {
    if (!owner.gameState) return 0;

    const target = owner.getBestCatchTarget();
    if (!target) return 0.1;

    // Higher desirability for urgent catches
    const urgency = Math.max(0, 1 - target.timeToLand / 2);
    const distance = Math.abs(target.x - owner.currentX);
    const reachability = 1 - distance / (owner.gameState?.screenWidth || 800);

    return 0.4 + urgency * 0.4 + reachability * 0.2;
  }

  setGoal(owner: AutoPlayer): void {
    owner.setActiveStrategy("catch");
  }
}

/**
 * Evaluator: Balance the stack
 */
class BalanceEvaluator extends GoalEvaluator<AutoPlayer> {
  constructor() {
    super(0.5);
  }

  calculateDesirability(owner: AutoPlayer): number {
    if (!owner.gameState) return 0;

    const wobble = owner.getStackWobble();
    const stackHeight = owner.gameState.stackHeight;

    if (stackHeight === 0) return 0;

    // More desirable when wobble is high
    const wobbleFactor = Math.min(1, wobble / 20);

    // More important with taller stacks
    const heightFactor = Math.min(1, stackHeight / 10);

    // Very high priority if in danger
    if (owner.gameState.inDanger) return 0.9;

    return wobbleFactor * 0.6 + heightFactor * 0.3;
  }

  setGoal(owner: AutoPlayer): void {
    owner.setActiveStrategy("balance");
  }
}

/**
 * Evaluator: Bank the stack
 */
class BankEvaluator extends GoalEvaluator<AutoPlayer> {
  constructor() {
    super(0.55);
  }

  calculateDesirability(owner: AutoPlayer): number {
    if (!owner.gameState) return 0;

    const { stackHeight, canBank, inDanger } = owner.gameState;

    if (!canBank) return 0;

    // High priority when stack is tall
    const heightFactor = Math.min(1, (stackHeight - 5) / 5);

    // Critical if in danger
    if (inDanger && stackHeight >= 5) return 0.95;

    // Also consider wobble
    const wobbleFactor = Math.min(0.3, owner.getStackWobble() / 50);

    return heightFactor * 0.7 + wobbleFactor;
  }

  setGoal(owner: AutoPlayer): void {
    owner.setActiveStrategy("bank");
  }
}

/**
 * Evaluator: Use special abilities
 */
class AbilityEvaluator extends GoalEvaluator<AutoPlayer> {
  constructor() {
    super(0.4);
  }

  calculateDesirability(owner: AutoPlayer): number {
    if (!owner.gameState) return 0;

    const abilityAnimal = owner.findReadyAbilityAnimal();
    if (!abilityAnimal) return 0;

    // More desirable when many animals are falling
    const threatCount = owner.predictions.filter((p) => p.timeToLand < 2).length;
    if (threatCount === 0) return 0.1;

    return 0.3 + Math.min(0.4, threatCount * 0.15);
  }

  setGoal(owner: AutoPlayer): void {
    owner.setActiveStrategy("ability");
  }
}

/**
 * Evaluator: Idle/wait state
 */
class IdleEvaluator extends GoalEvaluator<AutoPlayer> {
  constructor() {
    super(0.3);
  }

  calculateDesirability(owner: AutoPlayer): number {
    if (!owner.gameState) return 1;

    // Default when nothing else to do
    if (owner.predictions.length === 0 && owner.gameState.stackHeight === 0) {
      return 0.8;
    }

    return 0.2;
  }

  setGoal(owner: AutoPlayer): void {
    owner.setActiveStrategy("idle");
  }
}

// ============================================================================
// State Machine States
// ============================================================================

/**
 * State: Catching falling animals
 */
class CatchState extends State<AutoPlayer> {
  enter(owner: AutoPlayer): void {
    // Nothing specific on enter
  }

  execute(owner: AutoPlayer): void {
    const target = owner.getBestCatchTarget();
    if (target) {
      owner.moveToward(target.x);
    }
  }

  exit(owner: AutoPlayer): void {
    // Nothing specific on exit
  }
}

/**
 * State: Balancing the stack
 */
class BalanceState extends State<AutoPlayer> {
  enter(owner: AutoPlayer): void {
    // Nothing specific
  }

  execute(owner: AutoPlayer): void {
    if (!owner.gameState) return;

    // Move to counteract center of mass offset
    const comOffset = owner.getCenterOfMassOffset();

    // Move slightly in the opposite direction of the lean
    const counterX = owner.currentX - comOffset * 0.5;

    // But also try to catch the next animal if possible
    const target = owner.getBestCatchTarget();
    if (target && target.timeToLand < 1.5) {
      // Blend between balance and catch
      const blendedX = counterX * 0.4 + target.x * 0.6;
      owner.moveToward(blendedX);
    } else {
      owner.moveToward(counterX);
    }
  }

  exit(owner: AutoPlayer): void {
    // Nothing specific
  }
}

/**
 * State: Banking the stack
 */
class BankState extends State<AutoPlayer> {
  private executed: boolean = false;

  enter(owner: AutoPlayer): void {
    this.executed = false;
  }

  execute(owner: AutoPlayer): void {
    if (!this.executed && owner.shouldBank()) {
      owner.executeBank();
      this.executed = true;
    }
  }

  exit(owner: AutoPlayer): void {
    this.executed = false;
  }
}

/**
 * State: Using special abilities
 */
class AbilityState extends State<AutoPlayer> {
  private executed: boolean = false;

  enter(owner: AutoPlayer): void {
    this.executed = false;
  }

  execute(owner: AutoPlayer): void {
    if (this.executed) return;

    const abilityAnimal = owner.findReadyAbilityAnimal();
    if (abilityAnimal) {
      owner.executeAbility(abilityAnimal);
      this.executed = true;
    }
  }

  exit(owner: AutoPlayer): void {
    this.executed = false;
  }
}

/**
 * State: Idle/waiting
 */
class IdleState extends State<AutoPlayer> {
  enter(owner: AutoPlayer): void {
    // Nothing specific
  }

  execute(owner: AutoPlayer): void {
    if (!owner.gameState) return;

    // Gently move toward center when idle
    const centerX = (owner.gameState.screenWidth - GAME_CONFIG.layout.bankWidth) / 2;
    owner.moveToward(centerX);
  }

  exit(owner: AutoPlayer): void {
    // Nothing specific
  }
}

// ============================================================================
// Integration Helper
// ============================================================================

/**
 * Create and configure an AutoPlayer instance
 */
export function createAutoPlayer(): AutoPlayer {
  return new AutoPlayer();
}

/**
 * AutoPlayer integration data for GameEngine
 */
export interface AutoPlayerIntegration {
  autoPlayer: AutoPlayer;
  enabled: boolean;
  update: (deltaTime: number, gameState: AutoPlayerGameState) => number | null;
}

/**
 * Create integration helper for GameEngine
 */
export function createAutoPlayerIntegration(bankCallback: () => void): AutoPlayerIntegration {
  const autoPlayer = createAutoPlayer();
  autoPlayer.setBankCallback(bankCallback);

  return {
    autoPlayer,
    get enabled() {
      return autoPlayerEnabled;
    },
    update(deltaTime: number, gameState: AutoPlayerGameState): number | null {
      if (!autoPlayerEnabled) return null;

      autoPlayer.updateGameState(gameState);
      autoPlayer.update(deltaTime / 1000);

      return autoPlayer.getDesiredX();
    },
  };
}
