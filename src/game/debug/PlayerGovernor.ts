/**
 * PlayerGovernor - Yuka-powered AI that plays the game automatically.
 *
 * Extends Yuka's GameEntity so we can use Yuka's StateMachine and Time.
 * Drives the farmer along the rail to catch falling animals, then banks
 * the stack at opportune moments.
 *
 * Dev-only: activated via `window.__DEV_API__.enableAutoPlay()`.
 * Allows Chrome MCP / E2E tests to observe real gameplay without manual input.
 */

import {
  GameEntity,
  StateMachine,
  State,
  Time,
} from "yuka";
import type { GameLogic } from "../engine/GameLogic";
import { getStackedEntitiesSorted, getFallingEntities } from "../ecs/systems";
import type { Entity } from "../ecs/components";

// ─── Constants ──────────────────────────────────────────────────────────

/** Farmer max movement speed (world units per second). */
const MAX_SPEED = 12;

/** How close the farmer must be to the target before switching to idle. */
const ARRIVE_TOLERANCE = 0.3;

/** Stack height at which the governor considers banking. */
const BANK_THRESHOLD = 4;

/** If wobble danger is active, bank at a lower threshold. */
const DANGER_BANK_THRESHOLD = 2;

// ─── State IDs ──────────────────────────────────────────────────────────

const STATE_IDLE = "idle";
const STATE_PURSUING = "pursuing";
const STATE_BANKING = "banking";

// ─── Helpers ────────────────────────────────────────────────────────────

interface FallingTarget {
  entity: Entity;
  predictedX: number;
  priority: number; // lower = more urgent
}

function scoreFallingEntity(
  entity: Entity,
  playerX: number,
): FallingTarget | null {
  if (!entity.position || !entity.falling) return null;

  const y = entity.position.y;
  const targetX = entity.falling.targetX;

  // Ignore entities that are too high (just spawned) or already past catch zone
  if (y > 7 || y < -1) return null;

  // Predicted landing X
  const predictedX = targetX;

  // Priority: lower Y = more urgent, closer to player = easier
  const urgency = 8 - y; // 0-9 range, higher = more urgent
  const distance = Math.abs(predictedX - playerX);
  const reachability = distance < 6 ? 1 : 2; // penalty for far targets

  const priority = distance * reachability - urgency * 2;

  return { entity, predictedX, priority };
}

// ─── FSM States ─────────────────────────────────────────────────────────

class IdleState extends State<PlayerGovernor> {
  private patrolTimer = 0;

  enter(gov: PlayerGovernor): void {
    gov.targetX = gov.playerX;
    this.patrolTimer = 0;
  }

  execute(gov: PlayerGovernor): void {
    this.patrolTimer += gov.dt;
    if (this.patrolTimer > 0.5) {
      // Drift toward center
      const centerBias = -gov.playerX * 0.3;
      gov.targetX = gov.playerX + centerBias;
    }

    // Check if any falling entities need catching
    const target = gov.pickBestTarget();
    if (target) {
      gov.currentTarget = target;
      gov.fsm.changeTo(STATE_PURSUING);
      return;
    }

    // Check if we should bank
    if (gov.shouldBank()) {
      gov.fsm.changeTo(STATE_BANKING);
    }
  }

  exit(): void { /* no-op */ }
}

class PursuingState extends State<PlayerGovernor> {
  enter(): void { /* target was set before transition */ }

  execute(gov: PlayerGovernor): void {
    const newTarget = gov.pickBestTarget();
    if (!newTarget) {
      gov.fsm.changeTo(STATE_IDLE);
      return;
    }

    gov.currentTarget = newTarget;
    gov.targetX = newTarget.predictedX;

    // Danger overrides pursuit
    if (gov.shouldBank() && gov.inDanger) {
      gov.fsm.changeTo(STATE_BANKING);
      return;
    }

    // Tall stack + no imminent threats → bank
    if (gov.stackHeight >= BANK_THRESHOLD && !gov.inDanger) {
      const falling = getFallingEntities();
      const imminent = falling.filter(
        (e) => e.position && e.position.y < 3 && e.position.y > -1,
      );
      if (imminent.length === 0) {
        gov.fsm.changeTo(STATE_BANKING);
      }
    }
  }

  exit(): void { /* no-op */ }
}

class BankingState extends State<PlayerGovernor> {
  private bankDelay = 0;

  enter(gov: PlayerGovernor): void {
    this.bankDelay = 0.2; // Brief pause before banking
    gov.targetX = gov.playerX;
  }

  execute(gov: PlayerGovernor): void {
    this.bankDelay -= gov.dt;
    if (this.bankDelay > 0) return;

    if (gov.stackHeight >= 1) {
      gov.requestBank();
    }

    gov.fsm.changeTo(STATE_IDLE);
  }

  exit(): void { /* no-op */ }
}

// ─── PlayerGovernor ─────────────────────────────────────────────────────

export class PlayerGovernor extends GameEntity {
  /** Yuka state machine. */
  readonly fsm: StateMachine<PlayerGovernor>;

  /** Yuka time helper. */
  private time: Time;

  /** Reference to the game engine. */
  private engine: GameLogic | null = null;

  /** Whether the governor is active. */
  private _enabled = false;

  /** Current movement target X. */
  targetX = 0;

  /** Current best falling target. */
  currentTarget: FallingTarget | null = null;

  /** Cached per-frame values. */
  dt = 0;
  playerX = 0;
  stackHeight = 0;
  inDanger = false;

  /** rAF handle for the governor loop. */
  private rafId: number | null = null;

  constructor() {
    super();
    this.name = "PlayerGovernor";

    this.fsm = new StateMachine(this);
    this.fsm.add(STATE_IDLE, new IdleState());
    this.fsm.add(STATE_PURSUING, new PursuingState());
    this.fsm.add(STATE_BANKING, new BankingState());
    this.fsm.changeTo(STATE_IDLE);

    this.time = new Time();
  }

  // ── Public API ──────────────────────────────────────────────────────

  get enabled(): boolean {
    return this._enabled;
  }

  bind(engine: GameLogic): void {
    this.engine = engine;
  }

  unbind(): void {
    this.engine = null;
    this.disable();
  }

  enable(): void {
    if (this._enabled) return;
    this._enabled = true;
    this.time.update(); // Reset time delta
    this.fsm.changeTo(STATE_IDLE);
    this.loop();
    console.log("[PlayerGovernor] Enabled — AI is playing");
  }

  disable(): void {
    if (!this._enabled) return;
    this._enabled = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    console.log("[PlayerGovernor] Disabled");
  }

  // ── Game loop ───────────────────────────────────────────────────────

  private loop = (): void => {
    if (!this._enabled) return;

    this.time.update();
    this.dt = Math.min(this.time.getDelta(), 0.1);

    if (this.engine) {
      this.tick();
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private tick(): void {
    const eng = this.engine!;
    const state = eng._dev_getFullState();

    if (!state.isPlaying || state.isPaused) return;

    // Cache state
    this.playerX = state.playerX;
    this.stackHeight = getStackedEntitiesSorted().length;
    this.inDanger = state.inDanger;

    // Run FSM
    this.fsm.update();

    // Execute movement toward targetX
    this.executeMovement();
  }

  private executeMovement(): void {
    const eng = this.engine!;
    const dx = this.targetX - this.playerX;

    if (Math.abs(dx) < ARRIVE_TOLERANCE) return;

    // Smooth approach: move faster when far, slow when close
    const maxDelta = MAX_SPEED * this.dt;
    const moveAmount = Math.sign(dx) * Math.min(Math.abs(dx) * 0.3, maxDelta);

    eng.movePlayer(moveAmount);
  }

  // ── Decision helpers (called by FSM states) ─────────────────────────

  pickBestTarget(): FallingTarget | null {
    const falling = getFallingEntities();
    const scored: FallingTarget[] = [];

    for (const entity of falling) {
      const target = scoreFallingEntity(entity, this.playerX);
      if (target) scored.push(target);
    }

    if (scored.length === 0) return null;

    scored.sort((a, b) => a.priority - b.priority);
    return scored[0];
  }

  shouldBank(): boolean {
    if (this.stackHeight < 1) return false;
    if (this.inDanger && this.stackHeight >= DANGER_BANK_THRESHOLD) return true;
    return this.stackHeight >= BANK_THRESHOLD;
  }

  requestBank(): void {
    this.engine?.bankStack();
  }
}
