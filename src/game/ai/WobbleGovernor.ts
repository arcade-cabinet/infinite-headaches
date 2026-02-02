/**
 * Wobble Governor -- Pure TypeScript Stack Pressure Controller
 *
 * Observes game state and decides how much wobble pressure to apply to the
 * stack, creating an organic-feeling difficulty curve. Replaces the former
 * YUKA-based goal-driven architecture with lightweight weighted scoring.
 *
 * Four mutually exclusive modes are evaluated each tick:
 *  - **Steady**  -- Gentle background pressure proportional to stack height.
 *  - **Pulse**   -- Periodic dramatic wobble spikes for tension.
 *  - **Mercy**   -- Dampen wobble when the player is struggling.
 *  - **Chaos**   -- Oscillating, unpredictable wobble during high-level play.
 */

import { GAME_CONFIG } from "../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The four wobble modes the governor can select. */
type WobbleMode = "steady" | "pulse" | "mercy" | "chaos";

/** Internal interface for a mode evaluator. */
interface ModeEvaluator {
  readonly name: WobbleMode;
  readonly bias: number;
  score(gov: WobbleGovernor): number;
}

// ---------------------------------------------------------------------------
// Mode Evaluators
// ---------------------------------------------------------------------------

const MODE_EVALUATORS: readonly ModeEvaluator[] = [
  {
    name: "steady",
    bias: 0.5,
    score(g: WobbleGovernor): number {
      return 0.5 + (g.stackHeight / 20) * 0.3 - g.playerStress * 0.2;
    },
  },
  {
    name: "pulse",
    bias: 0.4,
    score(g: WobbleGovernor): number {
      return g.threatLevel * 0.5 + (1 - g.playerStress) * 0.3;
    },
  },
  {
    name: "mercy",
    bias: 0.3,
    score(g: WobbleGovernor): number {
      if (g.playerStress > 0.7 || g.dangerState) return 0.9;
      return g.playerStress * 0.5;
    },
  },
  {
    name: "chaos",
    bias: 0.35,
    score(g: WobbleGovernor): number {
      const levelFactor = g.gameLevel / 25;
      const performanceFactor = 1 - g.playerStress;
      const stackFactor = Math.min(1, g.stackHeight / 10);
      return levelFactor * 0.4 + performanceFactor * 0.3 + stackFactor * 0.2;
    },
  },
];

// ---------------------------------------------------------------------------
// WobbleGovernor
// ---------------------------------------------------------------------------

/**
 * Controls wobble pressure on the player's stack.
 *
 * Each tick, call {@link update} with the current delta-time, stack height,
 * and danger flag. The governor returns a pressure value in [0, 1] that
 * the physics system can multiply into its wobble force.
 */
export class WobbleGovernor {
  // -- Public observable state (for debugging / UI) -------------------------

  /** Current stack height supplied by the game. */
  stackHeight: number = 0;

  /** Threat level in [0, 1] derived from active falling animals. */
  threatLevel: number = 0;

  /** Player stress in [0, 1] derived from recent misses and danger. */
  playerStress: number = 0;

  /** Current game level. */
  gameLevel: number = 1;

  /** Whether the stack is in a danger state. */
  dangerState: boolean = false;

  // -- Private state --------------------------------------------------------

  private activeMode: WobbleMode = "steady";

  /** Accumulated tension (decays each tick). */
  private tension: number = 0;
  private readonly tensionDecay: number = 0.995;

  /** Output values composed from mode behavior + tension. */
  private outputWobbleForce: number = 0;
  private outputTensionPulse: number = 0;

  /** Timers for pulse and chaos modes. */
  private pulseTimer: number = 0;
  private pulseInterval: number = 2000;
  private chaosTimer: number = 0;

  /** Tracks recent misses for stress estimation. */
  private recentMisses: number = 0;
  private missDecayTimer: number = 0;

  // -----------------------------------------------------------------------

  /**
   * Create a new WobbleGovernor.
   * @param _config - Game configuration (reserved for future tuning knobs).
   */
  constructor(_config: typeof GAME_CONFIG = GAME_CONFIG) {
    // Config is accepted for API symmetry; no knobs are read yet.
  }

  // -----------------------------------------------------------------------
  // Main update
  // -----------------------------------------------------------------------

  /**
   * Advance the governor by one tick.
   *
   * @param dt - Delta time in **milliseconds**.
   * @param stackHeight - Current number of stacked animals.
   * @param isInDanger - Whether the stack is in the danger zone.
   * @returns Wobble pressure in [0, 1].
   */
  update(dt: number, stackHeight: number, isInDanger: boolean): number {
    this.stackHeight = stackHeight;
    this.dangerState = isInDanger;

    // Decay recent misses over time
    this.missDecayTimer += dt;
    if (this.missDecayTimer > 5000) {
      this.recentMisses = Math.max(0, this.recentMisses - 1);
      this.missDecayTimer = 0;
    }

    // Recalculate player stress
    this.playerStress = Math.min(
      1,
      this.recentMisses * 0.2 + (isInDanger ? 0.3 : 0),
    );

    // Stack height drives a baseline threat
    this.threatLevel = Math.min(1, stackHeight / 15);

    // Pick best mode
    this.evaluateModes();

    // Execute mode-specific behavior
    this.executeMode(dt);

    // Decay tension
    const decaySteps = dt / 16.67; // Normalize to ~60 fps ticks
    this.tension *= Math.pow(this.tensionDecay, decaySteps);

    // Calculate combined wobble pressure
    const basePressure = this.calculateWobblePressure();
    this.outputWobbleForce = basePressure * 0.5 + this.tension * 0.5;

    return Math.max(0, Math.min(1, this.outputWobbleForce));
  }

  // -----------------------------------------------------------------------
  // Event notifications
  // -----------------------------------------------------------------------

  /**
   * Notify the governor that the stack toppled.
   * Resets tension and increases stress.
   */
  onStackTopple(): void {
    this.tension = 0;
    this.recentMisses += 2;
    this.playerStress = Math.min(1, this.playerStress + 0.3);
  }

  /**
   * Notify the governor that the player banked successfully.
   * Releases accumulated tension.
   */
  onBankSuccess(): void {
    this.tension *= 0.5;
    this.recentMisses = Math.max(0, this.recentMisses - 1);
  }

  // -----------------------------------------------------------------------
  // Additional mutators for external callers
  // -----------------------------------------------------------------------

  /**
   * Inform the governor of the current game level.
   * @param level - The active level number.
   */
  setGameLevel(level: number): void {
    this.gameLevel = level;
  }

  /**
   * Directly add tension (useful when the game logic detects exciting events).
   * @param amount - Tension to add (clamped to [0, 1] total).
   */
  addTension(amount: number): void {
    this.tension = Math.min(1, this.tension + amount);
  }

  /**
   * Supply threat information from falling animals so the governor can
   * factor active threats into its mode selection.
   *
   * @param fallingAnimals - Array of minimal descriptors for each falling animal.
   */
  updateThreatFromAnimals(
    fallingAnimals: Array<{
      behaviorType: string;
      y: number;
      targetY: number;
    }>,
  ): void {
    let threat = 0;
    for (const animal of fallingAnimals) {
      const distFactor = Math.max(
        0,
        1 - Math.abs(animal.y - animal.targetY) / 600,
      );
      switch (animal.behaviorType) {
        case "seeker":
        case "dive":
          threat += 0.15 * distFactor;
          break;
        case "zigzag":
          threat += 0.1 * distFactor;
          break;
        default:
          threat += 0.05 * distFactor;
      }
    }
    this.threatLevel = Math.min(1, threat);
  }

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  /**
   * Get the scaled wobble force suitable for direct use in physics.
   * The raw [0, 1] output is multiplied by 0.03 to match the original
   * physics tuning from the YUKA-based governor.
   */
  getWobbleForce(): number {
    return this.outputWobbleForce * 0.03;
  }

  /**
   * Get the current tension-pulse intensity (useful for VFX).
   */
  getPulseIntensity(): number {
    return this.outputTensionPulse;
  }

  /**
   * Get the currently active wobble mode (useful for debugging).
   */
  getActiveMode(): WobbleMode {
    return this.activeMode;
  }

  // -----------------------------------------------------------------------
  // Mode selection (replaces YUKA Think / GoalEvaluators)
  // -----------------------------------------------------------------------

  private evaluateModes(): void {
    let bestScore = -Infinity;
    let bestMode: WobbleMode = "steady";

    for (const evaluator of MODE_EVALUATORS) {
      const weighted = evaluator.score(this) * evaluator.bias;
      if (weighted > bestScore) {
        bestScore = weighted;
        bestMode = evaluator.name;
      }
    }

    if (bestMode !== this.activeMode) {
      // Reset mode-specific timers on transition
      this.pulseTimer = 0;
      this.chaosTimer = 0;
      if (bestMode === "chaos") {
        this.addTension(0.3);
      }
      this.activeMode = bestMode;
    }
  }

  // -----------------------------------------------------------------------
  // Mode execution
  // -----------------------------------------------------------------------

  private executeMode(dt: number): void {
    switch (this.activeMode) {
      case "steady": {
        const baseForce = this.stackHeight * 0.02;
        this.outputWobbleForce = Math.max(this.outputWobbleForce, baseForce);
        break;
      }

      case "pulse": {
        this.pulseTimer += dt;
        if (this.pulseTimer >= this.pulseInterval) {
          this.addTension(0.2 * this.threatLevel);
          this.outputTensionPulse = 0.8;
          this.pulseTimer = 0;
          this.pulseInterval = 1500 + Math.random() * 2000;
        } else {
          this.outputTensionPulse *= 0.95;
        }
        break;
      }

      case "mercy": {
        this.outputWobbleForce *= 0.5;
        this.outputTensionPulse *= 0.3;
        this.tension *= 0.9;
        break;
      }

      case "chaos": {
        this.chaosTimer += dt;
        const oscillation =
          Math.sin(this.chaosTimer * 0.001) * 0.3;
        this.outputWobbleForce += oscillation * this.gameLevel * 0.05;
        if (Math.random() < 0.02) {
          this.addTension(0.15);
          this.outputTensionPulse = 0.6;
        }
        break;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Base pressure calculation
  // -----------------------------------------------------------------------

  private calculateWobblePressure(): number {
    const stackFactor = Math.min(1, this.stackHeight / 15);
    const threatFactor = this.threatLevel;
    const stressPenalty = this.playerStress * 0.4;
    const pressure =
      (stackFactor * 0.4 + threatFactor * 0.4) * (1 - stressPenalty);
    return Math.max(0, Math.min(1, pressure));
  }
}
