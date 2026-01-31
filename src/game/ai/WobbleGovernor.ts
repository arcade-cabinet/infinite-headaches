/**
 * YUKA-powered Wobble Governor
 * Uses goal-driven AI to control stack wobble based on game state
 *
 * The Governor observes the game and decides when/how to apply wobble pressure
 * creating emergent difficulty that feels organic rather than random.
 */

import { GameEntity, GoalEvaluator, Think } from "yuka";

/**
 * The Wobble Governor entity - an AI that watches the game and decides
 * how much pressure to apply to the stack
 */
export class WobbleGovernor extends GameEntity {
  // Thinking brain for goal-driven behavior
  brain: Think<WobbleGovernor>;

  // Current wobble output (0-1)
  wobbleIntensity: number = 0;

  // Game state inputs
  stackHeight: number = 0;
  threatLevel: number = 0; // Based on falling animals
  playerStress: number = 0; // Based on recent mistakes/close calls
  gameLevel: number = 1;
  dangerState: boolean = false;

  // Accumulated tension (builds over time)
  tension: number = 0;
  tensionDecay: number = 0.995;

  // Output forces
  outputWobbleForce: number = 0;
  outputTensionPulse: number = 0;

  // Goal state tracking
  private activeGoal: "steady" | "pulse" | "mercy" | "chaos" = "steady";
  private pulseTimer: number = 0;
  private pulseInterval: number = 2000;
  private chaosTimer: number = 0;

  constructor() {
    super();

    this.brain = new Think(this);
    this.setupGoalEvaluators();
  }

  /**
   * Calculate wobble pressure using simple decision logic
   * (Replaces fuzzy logic with cleaner deterministic approach)
   */
  private calculateWobblePressure(): number {
    // Stack height factor (0-1)
    const stackFactor = Math.min(1, this.stackHeight / 15);

    // Threat factor
    const threatFactor = this.threatLevel;

    // Stress reduces pressure (mercy)
    const stressPenalty = this.playerStress * 0.4;

    // Combine factors with weights
    const pressure = (stackFactor * 0.4 + threatFactor * 0.4) * (1 - stressPenalty);

    // Clamp to 0-1
    return Math.max(0, Math.min(1, pressure));
  }

  /**
   * Setup goal evaluators for the thinking brain
   */
  private setupGoalEvaluators(): void {
    // Goal: Apply steady pressure
    this.brain.addEvaluator(new SteadyPressureEvaluator());

    // Goal: Create tension pulses
    this.brain.addEvaluator(new TensionPulseEvaluator());

    // Goal: Mercy mode (back off when player struggling)
    this.brain.addEvaluator(new MercyEvaluator());

    // Goal: Chaos mode (ramp up for excitement)
    this.brain.addEvaluator(new ChaosEvaluator());
  }

  /**
   * Update the governor with current game state
   */
  updateGameState(
    stackHeight: number,
    fallingAnimals: Array<{ behaviorType: string; y: number; targetY: number }>,
    recentMisses: number,
    gameLevel: number,
    inDanger: boolean
  ): void {
    this.stackHeight = stackHeight;
    this.gameLevel = gameLevel;
    this.dangerState = inDanger;

    // Calculate threat level from falling animals
    let threat = 0;
    for (const animal of fallingAnimals) {
      const distanceFactor = Math.max(0, 1 - Math.abs(animal.y - animal.targetY) / 600);

      switch (animal.behaviorType) {
        case "seeker":
        case "dive":
          threat += 0.15 * distanceFactor;
          break;
        case "zigzag":
          threat += 0.1 * distanceFactor;
          break;
        default:
          threat += 0.05 * distanceFactor;
      }
    }
    this.threatLevel = Math.min(1, threat);

    // Calculate player stress from recent performance
    this.playerStress = Math.min(1, recentMisses * 0.2 + (inDanger ? 0.3 : 0));
  }

  /**
   * Execute the currently active goal
   */
  private executeActiveGoal(delta: number): void {
    const deltaMs = delta * 1000;

    switch (this.activeGoal) {
      case "steady": {
        // Apply continuous subtle force based on stack height
        const baseForce = this.stackHeight * 0.02;
        this.outputWobbleForce = Math.max(this.outputWobbleForce, baseForce);
        break;
      }

      case "pulse":
        this.pulseTimer += deltaMs;
        if (this.pulseTimer >= this.pulseInterval) {
          // Create a tension pulse
          this.addTension(0.2 * this.threatLevel);
          this.outputTensionPulse = 0.8;
          this.pulseTimer = 0;
          this.pulseInterval = 1500 + Math.random() * 2000;
        } else {
          this.outputTensionPulse *= 0.95;
        }
        break;

      case "mercy":
        // Reduce wobble output
        this.outputWobbleForce *= 0.5;
        this.outputTensionPulse *= 0.3;
        this.tension *= 0.9;
        break;

      case "chaos": {
        this.chaosTimer += deltaMs;
        // Apply oscillating wobble
        const oscillation = Math.sin(this.chaosTimer * 0.001) * 0.3;
        this.outputWobbleForce += oscillation * this.gameLevel * 0.05;
        // Random tension spikes
        if (Math.random() < 0.02) {
          this.addTension(0.15);
          this.outputTensionPulse = 0.6;
        }
        break;
      }
    }
  }

  /**
   * Main update - let the brain think and compute wobble
   */
  update(delta: number): this {
    super.update(delta);

    // Let the brain evaluate goals and pick the best one
    this.brain.execute();

    // Execute the selected goal behavior
    this.executeActiveGoal(delta);

    // Apply tension decay
    this.tension *= this.tensionDecay;

    // Calculate base wobble pressure
    this.wobbleIntensity = this.calculateWobblePressure();

    // Combine with goal-driven outputs
    this.outputWobbleForce = this.wobbleIntensity * 0.5 + this.tension * 0.5;

    return this;
  }

  /**
   * Set the active goal (called by evaluators)
   */
  setActiveGoal(goal: "steady" | "pulse" | "mercy" | "chaos"): void {
    if (this.activeGoal !== goal) {
      // Reset timers when switching goals
      this.pulseTimer = 0;
      this.chaosTimer = 0;

      if (goal === "chaos") {
        this.addTension(0.3);
      }
    }
    this.activeGoal = goal;
  }

  /**
   * Get the current wobble force to apply to the stack
   */
  getWobbleForce(): number {
    return this.outputWobbleForce * 0.03; // Scale for game physics
  }

  /**
   * Get pulse intensity for visual effects
   */
  getPulseIntensity(): number {
    return this.outputTensionPulse;
  }

  /**
   * Add tension (called when exciting things happen)
   */
  addTension(amount: number): void {
    this.tension = Math.min(1, this.tension + amount);
  }
}

/**
 * Goal Evaluator: Apply steady background pressure
 */
class SteadyPressureEvaluator extends GoalEvaluator<WobbleGovernor> {
  constructor() {
    super(0.5);
  }

  calculateDesirability(owner: WobbleGovernor): number {
    // More desirable when stack is moderate and player isn't stressed
    return 0.5 + (owner.stackHeight / 20) * 0.3 - owner.playerStress * 0.2;
  }

  setGoal(owner: WobbleGovernor): void {
    owner.setActiveGoal("steady");
  }
}

/**
 * Goal Evaluator: Create tension pulses for dramatic moments
 */
class TensionPulseEvaluator extends GoalEvaluator<WobbleGovernor> {
  constructor() {
    super(0.4);
  }

  calculateDesirability(owner: WobbleGovernor): number {
    // More desirable when threat is high and player seems comfortable
    return owner.threatLevel * 0.5 + (1 - owner.playerStress) * 0.3;
  }

  setGoal(owner: WobbleGovernor): void {
    owner.setActiveGoal("pulse");
  }
}

/**
 * Goal Evaluator: Show mercy when player is struggling
 */
class MercyEvaluator extends GoalEvaluator<WobbleGovernor> {
  constructor() {
    super(0.3);
  }

  calculateDesirability(owner: WobbleGovernor): number {
    // Very desirable when player is struggling
    if (owner.playerStress > 0.7 || owner.dangerState) {
      return 0.9;
    }
    return owner.playerStress * 0.5;
  }

  setGoal(owner: WobbleGovernor): void {
    owner.setActiveGoal("mercy");
  }
}

/**
 * Goal Evaluator: Chaos mode - ramp up for exciting gameplay
 */
class ChaosEvaluator extends GoalEvaluator<WobbleGovernor> {
  constructor() {
    super(0.35);
  }

  calculateDesirability(owner: WobbleGovernor): number {
    // Desirable at higher levels when player is doing well
    const levelFactor = owner.gameLevel / 25;
    const performanceFactor = 1 - owner.playerStress;
    const stackFactor = Math.min(1, owner.stackHeight / 10);

    return levelFactor * 0.4 + performanceFactor * 0.3 + stackFactor * 0.2;
  }

  setGoal(owner: WobbleGovernor): void {
    owner.setActiveGoal("chaos");
  }
}