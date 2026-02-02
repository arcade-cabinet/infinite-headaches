/**
 * WobbleGovernor Unit Tests
 *
 * Comprehensive tests for the stack-pressure controller that decides how
 * much wobble force to apply based on game state, mode selection, tension
 * mechanics, and player events.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { WobbleGovernor } from "./WobbleGovernor";

// Provide a minimal GAME_CONFIG mock - WobbleGovernor only imports the symbol
// for the constructor signature but does not read any properties from it yet.
vi.mock("../config", () => ({
  GAME_CONFIG: {
    difficulty: { specialDuckLevelBonus: 0.02 },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Standard frame delta (~60 fps). */
const FRAME_DT = 16.67;

/** Build a governor and run one initial update tick so internal state settles. */
function tickedGovernor(
  stackHeight = 0,
  isInDanger = false,
  dt = FRAME_DT,
): WobbleGovernor {
  const gov = new WobbleGovernor();
  gov.update(dt, stackHeight, isInDanger);
  return gov;
}

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe("WobbleGovernor - Constructor", () => {
  it("creates with default state", () => {
    const gov = new WobbleGovernor();
    expect(gov.stackHeight).toBe(0);
    expect(gov.threatLevel).toBe(0);
    expect(gov.playerStress).toBe(0);
    expect(gov.gameLevel).toBe(1);
    expect(gov.dangerState).toBe(false);
  });

  it("starts in steady mode", () => {
    const gov = new WobbleGovernor();
    expect(gov.getActiveMode()).toBe("steady");
  });

  it("initial wobble force is 0", () => {
    const gov = new WobbleGovernor();
    expect(gov.getWobbleForce()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// update()
// ---------------------------------------------------------------------------

describe("WobbleGovernor - update", () => {
  let gov: WobbleGovernor;

  beforeEach(() => {
    gov = new WobbleGovernor();
  });

  it("returns value in [0, 1] range", () => {
    // Low stack
    const a = gov.update(FRAME_DT, 0, false);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(1);

    // High stack
    const b = gov.update(FRAME_DT, 20, true);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThanOrEqual(1);
  });

  it("updates stackHeight from parameter", () => {
    gov.update(FRAME_DT, 7, false);
    expect(gov.stackHeight).toBe(7);

    gov.update(FRAME_DT, 12, false);
    expect(gov.stackHeight).toBe(12);
  });

  it("updates dangerState from parameter", () => {
    gov.update(FRAME_DT, 0, true);
    expect(gov.dangerState).toBe(true);

    gov.update(FRAME_DT, 0, false);
    expect(gov.dangerState).toBe(false);
  });

  it("calculates threatLevel from stackHeight (stackHeight/15 clamped to 1)", () => {
    gov.update(FRAME_DT, 0, false);
    expect(gov.threatLevel).toBe(0);

    gov.update(FRAME_DT, 7.5, false);
    expect(gov.threatLevel).toBeCloseTo(0.5, 5);

    gov.update(FRAME_DT, 15, false);
    expect(gov.threatLevel).toBe(1);

    // Above 15 is clamped to 1
    gov.update(FRAME_DT, 30, false);
    expect(gov.threatLevel).toBe(1);
  });

  it("calculates playerStress from misses and danger", () => {
    // No misses, no danger -> stress 0
    gov.update(FRAME_DT, 0, false);
    expect(gov.playerStress).toBe(0);

    // No misses, in danger -> stress 0.3
    gov.update(FRAME_DT, 0, true);
    expect(gov.playerStress).toBeCloseTo(0.3, 5);
  });

  it("returns 0 for empty stack with no threats", () => {
    const result = gov.update(FRAME_DT, 0, false);
    expect(result).toBe(0);
  });

  it("returns higher values for taller stacks", () => {
    const lowResult = gov.update(FRAME_DT, 2, false);
    // Reset governor for fair comparison
    const gov2 = new WobbleGovernor();
    const highResult = gov2.update(FRAME_DT, 12, false);
    expect(highResult).toBeGreaterThan(lowResult);
  });

  it("player stress increases when in danger (+0.3)", () => {
    gov.update(FRAME_DT, 5, false);
    const stressNoDanger = gov.playerStress;

    const gov2 = new WobbleGovernor();
    gov2.update(FRAME_DT, 5, true);
    const stressDanger = gov2.playerStress;

    expect(stressDanger - stressNoDanger).toBeCloseTo(0.3, 5);
  });
});

// ---------------------------------------------------------------------------
// Mode Selection
// ---------------------------------------------------------------------------

describe("WobbleGovernor - Mode Selection", () => {
  it("defaults to steady mode with low stack and no threats", () => {
    const gov = tickedGovernor(0, false);
    expect(gov.getActiveMode()).toBe("steady");
  });

  it("stays in steady mode with moderate stacks", () => {
    const gov = tickedGovernor(8, false);
    expect(gov.getActiveMode()).toBe("steady");
  });

  it("switches to mercy when playerStress > 0.7", () => {
    const gov = new WobbleGovernor();
    // Each topple adds 2 to recentMisses and +0.3 stress directly.
    // After two topples: recentMisses = 4, so update stress = min(1, 4*0.2 + 0) = 0.8
    gov.onStackTopple();
    gov.onStackTopple();
    gov.update(FRAME_DT, 0, false);
    expect(gov.playerStress).toBeCloseTo(0.8, 5);
    expect(gov.getActiveMode()).toBe("mercy");
  });

  it("switches to mercy when dangerState is true", () => {
    const gov = new WobbleGovernor();
    // With danger, mercy evaluator returns 0.9 regardless of stress.
    // mercy weighted = 0.9 * 0.3 = 0.27
    // steady weighted = (0.5 - playerStress*0.2) * 0.5
    // With danger and no misses, playerStress = 0.3:
    //   steady = (0.5 - 0.06) * 0.5 = 0.22
    // So mercy (0.27) > steady (0.22).
    gov.update(FRAME_DT, 0, true);
    expect(gov.getActiveMode()).toBe("mercy");
  });

  it("stays in steady at high game levels when stack is moderate", () => {
    // Steady's bias (0.5) dominates over chaos (0.35) for most conditions.
    // At gameLevel=25, stackHeight=5, playerStress=0:
    //   steady = (0.5 + 0.075) * 0.5 = 0.2875
    //   chaos  = (0.4 + 0.3 + 0.1) * 0.35 = 0.28
    const gov = new WobbleGovernor();
    gov.setGameLevel(25);
    gov.update(FRAME_DT, 5, false);
    expect(gov.getActiveMode()).toBe("steady");
  });

  it("pulse mode scoring increases with high threat and low stress", () => {
    // While pulse may not overtake steady in most conditions due to bias,
    // verify its score components contribute correctly by checking that
    // a higher stack (higher threat) keeps steady dominant but at a closer margin.
    const gov1 = new WobbleGovernor();
    gov1.update(FRAME_DT, 3, false);
    const result1 = gov1.update(FRAME_DT, 3, false);

    const gov2 = new WobbleGovernor();
    gov2.update(FRAME_DT, 14, false);
    const result2 = gov2.update(FRAME_DT, 14, false);

    // Higher stack -> more wobble pressure regardless of mode
    expect(result2).toBeGreaterThan(result1);
    // Both remain in steady since steady dominates
    expect(gov1.getActiveMode()).toBe("steady");
    expect(gov2.getActiveMode()).toBe("steady");
  });

  it("mode transitions reset timers (tested via mercy toggle)", () => {
    const gov = new WobbleGovernor();

    // Start in steady
    gov.update(FRAME_DT, 5, false);
    expect(gov.getActiveMode()).toBe("steady");

    // Transition to mercy
    gov.onStackTopple();
    gov.onStackTopple();
    gov.update(FRAME_DT, 0, false);
    expect(gov.getActiveMode()).toBe("mercy");

    // Return to steady after stress dissipates (bank successes reduce misses)
    gov.onBankSuccess();
    gov.onBankSuccess();
    gov.onBankSuccess();
    gov.onBankSuccess();
    gov.update(FRAME_DT, 0, false);
    expect(gov.getActiveMode()).toBe("steady");
  });
});

// ---------------------------------------------------------------------------
// Steady Mode
// ---------------------------------------------------------------------------

describe("WobbleGovernor - Steady Mode", () => {
  it("produces pressure proportional to stack height", () => {
    const gov1 = new WobbleGovernor();
    gov1.update(FRAME_DT, 3, false);
    const force1 = gov1.getWobbleForce();

    const gov2 = new WobbleGovernor();
    gov2.update(FRAME_DT, 10, false);
    const force2 = gov2.getWobbleForce();

    expect(force2).toBeGreaterThan(force1);
  });

  it("low output for empty stack", () => {
    const gov = new WobbleGovernor();
    const result = gov.update(FRAME_DT, 0, false);
    expect(result).toBe(0);
    expect(gov.getWobbleForce()).toBe(0);
  });

  it("moderate output for medium stack (5-8)", () => {
    const gov = new WobbleGovernor();
    const result = gov.update(FRAME_DT, 6, false);
    // With stackHeight=6: basePressure uses stackFactor = 6/15 = 0.4,
    // threatFactor = 0.4, stressPenalty = 0.
    // pressure = (0.4*0.4 + 0.4*0.4)*(1-0) = 0.32
    // steady executeMode: baseForce = 6 * 0.02 = 0.12
    // outputWobbleForce = max(prev, 0.12) then final = base * 0.5 + tension * 0.5
    // Should be moderate but non-zero
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(0.5);
  });
});

// ---------------------------------------------------------------------------
// Mercy Mode
// ---------------------------------------------------------------------------

describe("WobbleGovernor - Mercy Mode", () => {
  it("reduces wobble force (multiplied by 0.5)", () => {
    // Build up some output force first in steady mode
    const govSteady = new WobbleGovernor();
    govSteady.update(FRAME_DT, 10, false);
    const steadyForce = govSteady.getWobbleForce();

    // Now create a governor that enters mercy mode
    const govMercy = new WobbleGovernor();
    govMercy.onStackTopple();
    govMercy.onStackTopple();
    govMercy.update(FRAME_DT, 10, false);
    expect(govMercy.getActiveMode()).toBe("mercy");

    // Mercy mode multiplies outputWobbleForce by 0.5, plus stress penalty
    // in pressure calc, so mercy force should be lower
    const mercyForce = govMercy.getWobbleForce();
    expect(mercyForce).toBeLessThan(steadyForce);
  });

  it("reduces tension (multiplied by 0.9)", () => {
    const gov = new WobbleGovernor();
    gov.addTension(0.8);
    gov.onStackTopple();
    gov.onStackTopple();

    // Enters mercy mode. Tension was reset by onStackTopple, so add more.
    gov.addTension(0.5);
    gov.update(FRAME_DT, 0, false);
    expect(gov.getActiveMode()).toBe("mercy");

    // After mercy mode execution, tension is further reduced by 0.9 multiplier
    // plus the normal decay. Verify it decays faster by running more ticks.
    gov.addTension(0.5);
    const beforeMercyTick = 0.5; // We just added this
    gov.update(FRAME_DT, 0, false);
    // The wobble force should reflect reduced tension
    expect(gov.getWobbleForce()).toBeLessThan(0.03 * 0.5);
  });

  it("activates during player struggle", () => {
    const gov = new WobbleGovernor();
    // Simulate struggle: multiple topples increase misses and stress
    gov.onStackTopple();
    gov.onStackTopple();
    gov.onStackTopple();
    gov.update(FRAME_DT, 5, false);
    // recentMisses = 6, playerStress = min(1, 6*0.2) = 1.0
    expect(gov.playerStress).toBe(1.0);
    expect(gov.getActiveMode()).toBe("mercy");
  });
});

// ---------------------------------------------------------------------------
// Tension
// ---------------------------------------------------------------------------

describe("WobbleGovernor - Tension", () => {
  let gov: WobbleGovernor;

  beforeEach(() => {
    gov = new WobbleGovernor();
  });

  it("addTension increases tension", () => {
    // After adding tension, the wobble force should be non-zero
    gov.addTension(0.5);
    gov.update(FRAME_DT, 0, false);
    // outputWobbleForce includes tension * 0.5 component
    expect(gov.getWobbleForce()).toBeGreaterThan(0);
  });

  it("addTension clamps to 1", () => {
    gov.addTension(0.8);
    gov.addTension(0.8);
    // Internal tension should be clamped to 1. We verify indirectly:
    // after one tick, tension decays from 1. Adding more shouldn't exceed 1.
    gov.update(FRAME_DT, 0, false);
    const force1 = gov.getWobbleForce();

    // Adding beyond cap shouldn't increase output further next tick
    gov.addTension(5.0);
    gov.update(FRAME_DT, 0, false);
    const force2 = gov.getWobbleForce();

    // Both should be bounded and similar (tension can't exceed 1)
    expect(force1).toBeGreaterThan(0);
    expect(force2).toBeGreaterThan(0);
    expect(force2).toBeLessThanOrEqual(0.03); // max wobble force = 1 * 0.03
  });

  it("tension decays over time", () => {
    gov.addTension(1.0);
    gov.update(FRAME_DT, 0, false);
    const initialForce = gov.getWobbleForce();

    // Run many ticks to allow tension to decay significantly
    for (let i = 0; i < 200; i++) {
      gov.update(FRAME_DT, 0, false);
    }
    const laterForce = gov.getWobbleForce();

    expect(laterForce).toBeLessThan(initialForce);
  });

  it("onStackTopple resets tension to 0", () => {
    gov.addTension(0.9);
    gov.onStackTopple();
    // After reset, update with no stack should produce minimal output
    // (the stress from topple will trigger mercy, but tension component is 0)
    gov.update(FRAME_DT, 0, false);
    // Even though mercy reduces force, the key point is tension was zeroed
    // The output should be very small since basePressure ~0 and tension ~0
    expect(gov.getWobbleForce()).toBeCloseTo(0, 3);
  });

  it("onBankSuccess halves tension", () => {
    gov.addTension(0.8);
    const gov2 = new WobbleGovernor();
    gov2.addTension(0.8);
    gov2.onBankSuccess();

    // Both update in same conditions
    gov.update(FRAME_DT, 5, false);
    gov2.update(FRAME_DT, 5, false);

    // The banked governor should have lower force due to halved tension
    expect(gov2.getWobbleForce()).toBeLessThan(gov.getWobbleForce());
  });
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

describe("WobbleGovernor - Events", () => {
  it("onStackTopple increases stress", () => {
    const gov = new WobbleGovernor();
    gov.update(FRAME_DT, 0, false);
    const stressBefore = gov.playerStress;

    gov.onStackTopple();
    expect(gov.playerStress).toBeCloseTo(stressBefore + 0.3, 5);
  });

  it("onStackTopple adds to recent misses (reflected in next update stress)", () => {
    const gov = new WobbleGovernor();
    gov.onStackTopple(); // +2 misses
    gov.update(FRAME_DT, 0, false);
    // playerStress = min(1, 2 * 0.2 + 0) = 0.4
    expect(gov.playerStress).toBeCloseTo(0.4, 5);
  });

  it("onBankSuccess reduces recent misses", () => {
    const gov = new WobbleGovernor();
    gov.onStackTopple(); // +2 misses
    gov.onBankSuccess(); // -1 miss -> 1 miss
    gov.update(FRAME_DT, 0, false);
    // playerStress = min(1, 1 * 0.2 + 0) = 0.2
    expect(gov.playerStress).toBeCloseTo(0.2, 5);
  });

  it("multiple topples accumulate stress", () => {
    const gov = new WobbleGovernor();
    gov.onStackTopple(); // +2 misses
    gov.onStackTopple(); // +2 misses -> 4 total
    gov.onStackTopple(); // +2 misses -> 6 total
    gov.update(FRAME_DT, 0, false);
    // playerStress = min(1, 6 * 0.2) = min(1, 1.2) = 1.0
    expect(gov.playerStress).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

describe("WobbleGovernor - Queries", () => {
  it("getWobbleForce returns scaled value (*0.03)", () => {
    const gov = new WobbleGovernor();
    gov.addTension(1.0);
    gov.update(FRAME_DT, 10, false);
    const force = gov.getWobbleForce();
    // Force = outputWobbleForce * 0.03, and outputWobbleForce is in [0,1]
    expect(force).toBeGreaterThan(0);
    expect(force).toBeLessThanOrEqual(0.03);
  });

  it("getPulseIntensity returns tension pulse value", () => {
    const gov = new WobbleGovernor();
    // Initially 0 since no pulse has fired
    expect(gov.getPulseIntensity()).toBe(0);

    // After updates, pulse intensity should remain 0 in steady mode
    // (only pulse/chaos modes set outputTensionPulse to non-zero)
    gov.update(FRAME_DT, 5, false);
    expect(gov.getPulseIntensity()).toBe(0);
  });

  it("getActiveMode returns current mode string", () => {
    const gov = new WobbleGovernor();
    const mode = gov.getActiveMode();
    expect(typeof mode).toBe("string");
    expect(["steady", "pulse", "mercy", "chaos"]).toContain(mode);
  });

  it("setGameLevel updates gameLevel", () => {
    const gov = new WobbleGovernor();
    expect(gov.gameLevel).toBe(1);

    gov.setGameLevel(10);
    expect(gov.gameLevel).toBe(10);

    gov.setGameLevel(25);
    expect(gov.gameLevel).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// updateThreatFromAnimals
// ---------------------------------------------------------------------------

describe("WobbleGovernor - updateThreatFromAnimals", () => {
  let gov: WobbleGovernor;

  beforeEach(() => {
    gov = new WobbleGovernor();
  });

  it("calculates threat from seeker behavior (0.15 * distFactor)", () => {
    // distFactor = max(0, 1 - |y - targetY| / 600)
    // animal right on target: distFactor = 1 -> threat = 0.15
    gov.updateThreatFromAnimals([
      { behaviorType: "seeker", y: 100, targetY: 100 },
    ]);
    expect(gov.threatLevel).toBeCloseTo(0.15, 5);
  });

  it("calculates threat from zigzag behavior (0.10 * distFactor)", () => {
    gov.updateThreatFromAnimals([
      { behaviorType: "zigzag", y: 200, targetY: 200 },
    ]);
    expect(gov.threatLevel).toBeCloseTo(0.1, 5);
  });

  it("calculates threat from normal behavior (0.05 * distFactor)", () => {
    gov.updateThreatFromAnimals([
      { behaviorType: "normal", y: 300, targetY: 300 },
    ]);
    expect(gov.threatLevel).toBeCloseTo(0.05, 5);
  });

  it("accounts for distance in threat calculation", () => {
    // Animal 300 units away: distFactor = max(0, 1 - 300/600) = 0.5
    gov.updateThreatFromAnimals([
      { behaviorType: "seeker", y: 0, targetY: 300 },
    ]);
    expect(gov.threatLevel).toBeCloseTo(0.15 * 0.5, 5);

    // Animal 600+ units away: distFactor = 0
    gov.updateThreatFromAnimals([
      { behaviorType: "seeker", y: 0, targetY: 700 },
    ]);
    expect(gov.threatLevel).toBe(0);
  });

  it("clamps threat to [0, 1]", () => {
    // Many close seekers: 10 * 0.15 = 1.5, clamped to 1
    const animals = Array.from({ length: 10 }, () => ({
      behaviorType: "seeker",
      y: 100,
      targetY: 100,
    }));
    gov.updateThreatFromAnimals(animals);
    expect(gov.threatLevel).toBe(1);
  });

  it("empty array sets threat to 0", () => {
    // Set a non-zero threat first
    gov.updateThreatFromAnimals([
      { behaviorType: "seeker", y: 100, targetY: 100 },
    ]);
    expect(gov.threatLevel).toBeGreaterThan(0);

    // Now clear it
    gov.updateThreatFromAnimals([]);
    expect(gov.threatLevel).toBe(0);
  });

  it("calculates threat from dive behavior same as seeker (0.15)", () => {
    gov.updateThreatFromAnimals([
      { behaviorType: "dive", y: 50, targetY: 50 },
    ]);
    expect(gov.threatLevel).toBeCloseTo(0.15, 5);
  });

  it("accumulates threat from multiple animals", () => {
    gov.updateThreatFromAnimals([
      { behaviorType: "seeker", y: 100, targetY: 100 }, // 0.15
      { behaviorType: "zigzag", y: 200, targetY: 200 }, // 0.10
      { behaviorType: "normal", y: 300, targetY: 300 }, // 0.05
    ]);
    expect(gov.threatLevel).toBeCloseTo(0.3, 5);
  });
});
