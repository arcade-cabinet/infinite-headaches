/**
 * WeatherSystem Unit Tests
 *
 * Tests cover: initial state, level gating, weather transitions,
 * probability distribution, wind force / wobble calculations,
 * transition progress ramping, anti-repeat logic, setLevel during
 * active weather, the onWeatherChange callback, and reset.
 */
import { describe, it, expect, vi } from "vitest";
import { WeatherSystem } from "../WeatherSystem";
import type { WeatherState, WeatherType } from "../WeatherSystem";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build an RNG that returns a pre-defined sequence of values.
 * Once the sequence is exhausted it cycles from the start.
 */
function sequenceRng(values: number[]): () => number {
  let idx = 0;
  return () => {
    const v = values[idx % values.length];
    idx++;
    return v;
  };
}

/**
 * Force the internal state to have a *finite* duration so that the next
 * call to `update()` with a large-enough deltaMs will trigger
 * `transitionToNewWeather()`.  This is necessary because the initial
 * clear-weather state uses `duration = Infinity`.
 */
function setFiniteDuration(system: WeatherSystem, duration: number): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (system as any).state.duration = duration;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WeatherSystem", () => {
  describe("initial state", () => {
    it("starts with clear weather, zero intensity, and no wind", () => {
      const system = new WeatherSystem(() => 0);
      const s = system.getState();
      expect(s.type).toBe("clear");
      expect(s.intensity).toBe(0);
      expect(s.windDirection).toBe(0);
      expect(s.windStrength).toBe(0);
      expect(s.wobbleBonus).toBe(0);
      expect(s.transitionProgress).toBe(1);
      expect(s.duration).toBe(Infinity);
      expect(s.elapsed).toBe(0);
    });

    it("getState returns a shallow copy, not a reference", () => {
      const system = new WeatherSystem(() => 0);
      const a = system.getState();
      const b = system.getState();
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });
  });

  // -----------------------------------------------------------------------
  // Levels 1-5: clear weather, update is gated
  // -----------------------------------------------------------------------
  describe("clear weather at levels 1-5", () => {
    it.each([1, 2, 3, 4, 5])(
      "update is a no-op at level %i (elapsed stays 0)",
      (level) => {
        const system = new WeatherSystem(() => 0);
        system.setLevel(level);
        system.update(99999);
        const s = system.getState();
        expect(s.type).toBe("clear");
        expect(s.elapsed).toBe(0);
      },
    );

    it("elapsed advances only after level is raised above 5", () => {
      const system = new WeatherSystem(() => 0);
      system.setLevel(3);
      system.update(5000);
      expect(system.getState().elapsed).toBe(0);

      system.setLevel(6);
      system.update(5000);
      expect(system.getState().elapsed).toBe(5000);
    });
  });

  // -----------------------------------------------------------------------
  // Weather transitions at level > 5
  // -----------------------------------------------------------------------
  describe("weather transitions", () => {
    it("transitions to a new weather type when duration expires", () => {
      // RNG sequence:
      //   [0] roll = 0.5 -> selects "windy" at level 6 (clearChance ~0.68)
      //       Actually let's compute: level 6 => stormyChance = min(0.3, 1*0.015)=0.015
      //       rainyChance = min(0.3, 1*0.02)=0.02, windyChance=0.3
      //       clearChance = max(0.1, 1 - 0.015 - 0.02 - 0.3)=0.665
      //       roll 0.5 < 0.665 => "clear", but anti-repeat kicks in
      //       (selected === state.type "clear") => pick from others
      //   [1] rng for anti-repeat index: 0.0 => floor(0*3)=0 => types[0] after filter = ["windy","rainy","stormy"][0] = "windy"
      //   [2] duration rng: 0.5 => 30000 + 0.5*30000 = 45000
      //   [3] windStr rng: 0.5 => windRange windy [0.3,0.7] => 0.3+0.5*0.4=0.5
      //   [4] windDir rng: 0.9 (>0.5 => +1)
      const rng = sequenceRng([0.5, 0.0, 0.5, 0.5, 0.9]);
      const system = new WeatherSystem(rng);
      system.setLevel(6);
      setFiniteDuration(system, 100); // expire quickly

      system.update(200); // elapsed(200) >= duration(100) => transition

      const s = system.getState();
      expect(s.type).toBe("windy");
      expect(s.windStrength).toBeCloseTo(0.5);
      expect(s.windDirection).toBe(1);
      expect(s.wobbleBonus).toBe(0.01);
      expect(s.transitionProgress).toBe(0); // non-clear starts at 0
      expect(s.duration).toBe(45000);
      expect(s.elapsed).toBe(0);
    });

    it("transitions directly to rainy when roll lands in rainy range", () => {
      // level 20 => stormyChance=min(0.3,15*0.015)=0.225
      //             rainyChance=min(0.3,15*0.02)=0.3
      //             windyChance=0.3
      //             clearChance=max(0.1,1-0.225-0.3-0.3)=0.175
      // roll needs to land in [clearChance+windyChance, clearChance+windyChance+rainyChance)
      // = [0.475, 0.775)
      // Use roll = 0.6
      const rng = sequenceRng([0.6, 0.5, 0.5, 0.9]);
      const system = new WeatherSystem(rng);
      system.setLevel(20);
      setFiniteDuration(system, 10);

      system.update(20);
      expect(system.getState().type).toBe("rainy");
      expect(system.getState().wobbleBonus).toBe(0.015);
    });

    it("transitions to stormy when roll exceeds all other ranges", () => {
      // level 20 (same probabilities as above)
      // stormy range = [0.775, 1.0)
      // Use roll = 0.9
      const rng = sequenceRng([0.9, 0.5, 0.5, 0.9]);
      const system = new WeatherSystem(rng);
      system.setLevel(20);
      setFiniteDuration(system, 10);

      system.update(20);
      expect(system.getState().type).toBe("stormy");
      expect(system.getState().wobbleBonus).toBe(0.025);
    });

    it("transitions to clear when roll is below clearChance", () => {
      // level 6 => clearChance=0.665  (see calculation above)
      // roll=0.01 < 0.665 => "clear"
      // But state.type is already "clear" => anti-repeat fires
      // Start from a non-clear state to avoid anti-repeat.
      // First transition: force a windy state.
      // Then expire it and have the second transition select clear.

      // First transition: roll=0.99 at level 6 => stormy (above 0.965+)
      //   stormyChance=0.015, range starts at 0.985 -- actually 0.99 > 0.985 => stormy
      //   Actually recalculate: clear=0.665, windy ends at 0.965, rainy ends at 0.985, stormy from 0.985
      //   0.99 > 0.985 => stormy. Good.
      //   duration rng=0.5 => 45000, windStr rng=0.5 => stormy [0.5,1.0] => 0.75, windDir rng=0.9 => +1
      // Second transition: roll=0.01 < 0.665 => "clear" (state is stormy, no anti-repeat)
      //   duration rng=0.5 => 45000

      const rng = sequenceRng([
        0.99, 0.5, 0.5, 0.9, // first transition => stormy
        0.01, 0.5,            // second transition => clear
      ]);
      const system = new WeatherSystem(rng);
      system.setLevel(6);
      setFiniteDuration(system, 10);

      system.update(20); // first transition => stormy
      expect(system.getState().type).toBe("stormy");

      setFiniteDuration(system, 10);
      system.update(20); // second transition => clear

      const s = system.getState();
      expect(s.type).toBe("clear");
      expect(s.intensity).toBe(0);
      expect(s.windDirection).toBe(0);
      expect(s.windStrength).toBe(0);
      expect(s.wobbleBonus).toBe(0);
      expect(s.transitionProgress).toBe(1); // clear is immediate
    });

    it("avoids repeating the same weather type", () => {
      // At level 6, a low roll selects "clear". If state is already "clear",
      // anti-repeat picks from the filtered list ["windy","rainy","stormy"].
      // rng for anti-repeat index: 0.0 => floor(0*3) = 0 => "windy"
      const rng = sequenceRng([0.01, 0.0, 0.5, 0.5, 0.9]);
      const system = new WeatherSystem(rng);
      system.setLevel(6);
      setFiniteDuration(system, 10);

      system.update(20);
      // Should NOT be "clear" because anti-repeat fired
      expect(system.getState().type).not.toBe("clear");
      expect(system.getState().type).toBe("windy");
    });
  });

  // -----------------------------------------------------------------------
  // Transition progress ramping
  // -----------------------------------------------------------------------
  describe("transition progress", () => {
    it("ramps from 0 to 1 over 2000ms for non-clear weather", () => {
      // Force a transition to windy
      const rng = sequenceRng([0.5, 0.0, 0.5, 0.5, 0.9]);
      const system = new WeatherSystem(rng);
      system.setLevel(6);
      setFiniteDuration(system, 10);
      system.update(20); // trigger transition => windy, transitionProgress=0

      expect(system.getState().transitionProgress).toBe(0);

      // Advance 1000ms => progress should be 0.5
      system.update(1000);
      expect(system.getState().transitionProgress).toBeCloseTo(0.5);

      // Advance another 1000ms => progress should be 1.0
      system.update(1000);
      expect(system.getState().transitionProgress).toBeCloseTo(1.0);
    });

    it("clamps transition progress at 1 (does not exceed)", () => {
      const rng = sequenceRng([0.5, 0.0, 0.99, 0.5, 0.9]);
      const system = new WeatherSystem(rng);
      system.setLevel(6);
      setFiniteDuration(system, 10);
      system.update(20); // transition => windy

      // Advance 5000ms (well past the 2000ms transition)
      system.update(5000);
      expect(system.getState().transitionProgress).toBe(1);
    });

    it("intensity ramps with transition progress for non-clear weather", () => {
      // Transition to windy (intensity base = 0.5)
      const rng = sequenceRng([0.5, 0.0, 0.99, 0.5, 0.9]);
      const system = new WeatherSystem(rng);
      system.setLevel(6);
      setFiniteDuration(system, 10);
      system.update(20); // transition => windy, progress=0, intensity=0

      expect(system.getState().intensity).toBe(0);

      system.update(1000); // progress = 0.5, intensity = 0.5 * 0.5 = 0.25
      expect(system.getState().intensity).toBeCloseTo(0.25);

      system.update(1000); // progress = 1.0, intensity = 1.0 * 0.5 = 0.5
      expect(system.getState().intensity).toBeCloseTo(0.5);
    });
  });

  // -----------------------------------------------------------------------
  // Wind force and wobble bonus calculations
  // -----------------------------------------------------------------------
  describe("getWindForce", () => {
    it("returns 0 for clear weather", () => {
      const system = new WeatherSystem(() => 0);
      expect(system.getWindForce()).toBe(0);
    });

    it("returns windDirection * windStrength * intensity for non-clear weather", () => {
      // Transition to windy: windStr=0.5, windDir=+1, intensity starts at 0
      const rng = sequenceRng([0.5, 0.0, 0.5, 0.5, 0.9]);
      const system = new WeatherSystem(rng);
      system.setLevel(6);
      setFiniteDuration(system, 10);
      system.update(20); // transition => windy

      // intensity is 0 right after transition (transitionProgress=0)
      expect(system.getWindForce()).toBe(0);

      // Ramp to full: advance 2000ms => transitionProgress=1, intensity=0.5
      system.update(2000);
      // windForce = 1 * 0.5 * 0.5 = 0.25
      expect(system.getWindForce()).toBeCloseTo(0.25);
    });

    it("returns negative force when wind direction is -1", () => {
      // windDir rng <= 0.5 => -1
      const rng = sequenceRng([0.5, 0.0, 0.5, 0.5, 0.4]);
      const system = new WeatherSystem(rng);
      system.setLevel(6);
      setFiniteDuration(system, 10);
      system.update(20); // transition => windy, windDir = -1

      system.update(2000); // ramp to full
      expect(system.getWindForce()).toBeLessThan(0);
      // windForce = -1 * 0.5 * 0.5 = -0.25
      expect(system.getWindForce()).toBeCloseTo(-0.25);
    });

    it("scales with stormy wind strength", () => {
      // Transition to stormy: windRange [0.5, 1.0], rng=0.5 => windStr=0.75
      // windDir rng=0.9 => +1, intensity base=1.0
      const rng = sequenceRng([0.99, 0.5, 0.5, 0.9]);
      const system = new WeatherSystem(rng);
      system.setLevel(6);
      setFiniteDuration(system, 10);
      system.update(20);
      expect(system.getState().type).toBe("stormy");

      system.update(2000); // ramp to full intensity=1.0
      // windForce = 1 * 0.75 * 1.0 = 0.75
      expect(system.getWindForce()).toBeCloseTo(0.75);
    });
  });

  describe("getWobbleBonus", () => {
    it("returns 0 for clear weather", () => {
      const system = new WeatherSystem(() => 0);
      expect(system.getWobbleBonus()).toBe(0);
    });

    it("returns wobbleBonus * intensity for windy weather", () => {
      const rng = sequenceRng([0.5, 0.0, 0.99, 0.5, 0.9]);
      const system = new WeatherSystem(rng);
      system.setLevel(6);
      setFiniteDuration(system, 10);
      system.update(20); // => windy, wobbleBonus=0.01

      // At transitionProgress=0, intensity=0
      expect(system.getWobbleBonus()).toBe(0);

      // Ramp to full
      system.update(2000);
      // wobbleBonus=0.01, intensity=0.5 => 0.005
      expect(system.getWobbleBonus()).toBeCloseTo(0.005);
    });

    it("returns wobbleBonus * intensity for stormy weather", () => {
      const rng = sequenceRng([0.99, 0.5, 0.5, 0.9]);
      const system = new WeatherSystem(rng);
      system.setLevel(6);
      setFiniteDuration(system, 10);
      system.update(20); // => stormy, wobbleBonus=0.025

      system.update(2000);
      // wobbleBonus=0.025, intensity=1.0 => 0.025
      expect(system.getWobbleBonus()).toBeCloseTo(0.025);
    });

    it("returns wobbleBonus * intensity for rainy weather", () => {
      // level 20 to increase rainy probability
      // clearChance=0.175, windy ends 0.475, rainy ends 0.775
      // roll=0.6 => rainy
      const rng = sequenceRng([0.6, 0.5, 0.5, 0.9]);
      const system = new WeatherSystem(rng);
      system.setLevel(20);
      setFiniteDuration(system, 10);
      system.update(20); // => rainy, wobbleBonus=0.015

      system.update(2000);
      // wobbleBonus=0.015, intensity=0.7 => 0.0105
      expect(system.getWobbleBonus()).toBeCloseTo(0.0105);
    });
  });

  // -----------------------------------------------------------------------
  // Probability distribution
  // -----------------------------------------------------------------------
  describe("probability distribution", () => {
    it("clearChance never goes below 0.1 regardless of level", () => {
      // At extremely high levels the formula is:
      //   clearChance = max(0.1, 1 - stormyChance - rainyChance - windyChance)
      // stormyChance caps at 0.3, rainyChance caps at 0.3, windyChance=0.3
      //   => 1 - 0.3 - 0.3 - 0.3 = 0.1
      // So clearChance = max(0.1, 0.1) = 0.1

      // Use roll = 0.09 (below clearChance=0.1) at very high level
      // Should select "clear" (but anti-repeat fires since starting clear)
      const rng = sequenceRng([0.09, 0.0, 0.5, 0.5, 0.9]);
      const system = new WeatherSystem(rng);
      system.setLevel(1000);
      setFiniteDuration(system, 10);

      // Start from stormy to avoid anti-repeat for clear
      // Actually let's approach differently: just verify the math.
      // The important thing is clearChance >= 0.1, so roll=0.09 < 0.1 => clear selected
      // But anti-repeat fires if state is clear. Let's first transition away.

      // Transition 1: force stormy
      const rng2 = sequenceRng([
        0.99, 0.5, 0.5, 0.9,  // => stormy
        0.05, 0.5,             // => clear (roll < 0.1)
      ]);
      const sys2 = new WeatherSystem(rng2);
      sys2.setLevel(1000);
      setFiniteDuration(sys2, 10);
      sys2.update(20); // => stormy
      expect(sys2.getState().type).toBe("stormy");

      setFiniteDuration(sys2, 10);
      sys2.update(20); // roll=0.05 < 0.1 => clear
      expect(sys2.getState().type).toBe("clear");
    });

    it("clearChance is higher at low levels (just above 5)", () => {
      // level 6: stormyChance = min(0.3, 1*0.015)=0.015
      //          rainyChance  = min(0.3, 1*0.02) =0.02
      //          windyChance  = 0.3
      //          clearChance  = max(0.1, 1-0.015-0.02-0.3) = 0.665
      //
      // level 25: stormyChance = min(0.3, 20*0.015)=0.3
      //           rainyChance  = min(0.3, 20*0.02) =0.3
      //           windyChance  = 0.3
      //           clearChance  = max(0.1, 1-0.3-0.3-0.3) = 0.1
      //
      // We verify indirectly: at level 6, roll=0.6 should still be clear
      // At level 25, roll=0.6 should NOT be clear

      // Level 6: roll=0.6 < 0.665 => clear (anti-repeat since already clear)
      const rng6 = sequenceRng([0.6, 0.0, 0.5, 0.5, 0.9]);
      const sys6 = new WeatherSystem(rng6);
      sys6.setLevel(6);
      setFiniteDuration(sys6, 10);
      sys6.update(20);
      // Anti-repeat fires (was clear, selected clear) => picks from others
      // rng=0.0 => "windy"
      expect(sys6.getState().type).toBe("windy");

      // Level 25: roll=0.6 lands in rainy range [0.1+0.3, 0.1+0.3+0.3) = [0.4, 0.7)
      const rng25 = sequenceRng([0.6, 0.5, 0.5, 0.9]);
      const sys25 = new WeatherSystem(rng25);
      sys25.setLevel(25);
      setFiniteDuration(sys25, 10);
      sys25.update(20);
      expect(sys25.getState().type).toBe("rainy");
    });

    it("stormy and rainy chances cap at 0.3 each", () => {
      // At level 100: stormyChance = min(0.3, 95*0.015=1.425)=0.3
      //               rainyChance  = min(0.3, 95*0.02 =1.9  )=0.3
      // These are the same caps as level 25, confirming the min() clamp.
      // The total non-clear chance is 0.9, clearChance=0.1.
      // A roll of 0.95 should always be stormy at any high level.
      const rng = sequenceRng([0.95, 0.5, 0.5, 0.9]);
      const sys = new WeatherSystem(rng);
      sys.setLevel(100);
      setFiniteDuration(sys, 10);
      sys.update(20);
      expect(sys.getState().type).toBe("stormy");
    });

    it("weather duration is between 30000ms and 60000ms", () => {
      // duration = 30000 + rng * 30000
      // rng=0.0 => 30000, rng=1.0 => 60000

      // With rng=0.0 for duration
      const rngMin = sequenceRng([0.99, 0.0, 0.0, 0.9]); // stormy, dur=0.0 => 30000
      const sysMin = new WeatherSystem(rngMin);
      sysMin.setLevel(6);
      setFiniteDuration(sysMin, 10);
      sysMin.update(20);
      expect(sysMin.getState().duration).toBe(30000);

      // With rng=1.0 for duration (edge)
      const rngMax = sequenceRng([0.99, 1.0, 0.5, 0.9]); // stormy, dur=1.0 => 60000
      const sysMax = new WeatherSystem(rngMax);
      sysMax.setLevel(6);
      setFiniteDuration(sysMax, 10);
      sysMax.update(20);
      expect(sysMax.getState().duration).toBe(60000);
    });
  });

  // -----------------------------------------------------------------------
  // setLevel during active weather
  // -----------------------------------------------------------------------
  describe("setLevel during active weather", () => {
    it("forces clear when dropping to level <= 5 from active non-clear weather", () => {
      const rng = sequenceRng([0.99, 0.5, 0.5, 0.9]);
      const system = new WeatherSystem(rng);
      system.setLevel(10);
      setFiniteDuration(system, 10);
      system.update(20); // => stormy

      expect(system.getState().type).toBe("stormy");

      system.setLevel(5);
      const s = system.getState();
      expect(s.type).toBe("clear");
      expect(s.intensity).toBe(0);
      expect(s.windDirection).toBe(0);
      expect(s.windStrength).toBe(0);
      expect(s.wobbleBonus).toBe(0);
      expect(s.transitionProgress).toBe(1);
    });

    it("fires onWeatherChange callback when forcing clear on level drop", () => {
      const callback = vi.fn();
      const rng = sequenceRng([0.99, 0.5, 0.5, 0.9]);
      const system = new WeatherSystem(rng);
      system.setLevel(10);
      setFiniteDuration(system, 10);
      system.update(20); // => stormy

      system.onWeatherChange(callback);
      system.setLevel(3);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: "clear" }),
      );
    });

    it("does NOT force clear if weather is already clear when level drops", () => {
      const callback = vi.fn();
      const system = new WeatherSystem(() => 0);
      system.onWeatherChange(callback);
      system.setLevel(10);
      system.setLevel(3);

      // Weather was already clear, so the guard `this.state.type !== "clear"`
      // prevents the forced reset and the callback should not fire.
      expect(callback).not.toHaveBeenCalled();
      expect(system.getState().type).toBe("clear");
    });

    it("does NOT force clear when level stays above 5", () => {
      const rng = sequenceRng([0.99, 0.5, 0.5, 0.9]);
      const system = new WeatherSystem(rng);
      system.setLevel(10);
      setFiniteDuration(system, 10);
      system.update(20); // => stormy

      system.setLevel(8); // still above 5
      expect(system.getState().type).toBe("stormy");
    });

    it("resumes weather generation when level goes back above 5", () => {
      const rng = sequenceRng([
        0.99, 0.5, 0.5, 0.9, // first transition => stormy
        0.5, 0.0, 0.5, 0.5, 0.9, // second transition => anti-repeat from clear => windy
      ]);
      const system = new WeatherSystem(rng);
      system.setLevel(10);
      setFiniteDuration(system, 10);
      system.update(20); // => stormy

      system.setLevel(3); // force clear
      expect(system.getState().type).toBe("clear");

      // After set to level 3, update should be no-op
      system.update(99999);
      expect(system.getState().type).toBe("clear");

      // Raise level again and trigger transition
      system.setLevel(10);
      setFiniteDuration(system, 10);
      system.update(20);
      // Anti-repeat: roll selects clear, but state is clear => picks from others
      expect(system.getState().type).not.toBe("clear");
    });
  });

  // -----------------------------------------------------------------------
  // onWeatherChange callback
  // -----------------------------------------------------------------------
  describe("onWeatherChange callback", () => {
    it("fires on every weather transition via update", () => {
      const callback = vi.fn();
      const rng = sequenceRng([
        0.99, 0.5, 0.5, 0.9,  // first => stormy
        0.01, 0.5,             // second => clear
      ]);
      const system = new WeatherSystem(rng);
      system.onWeatherChange(callback);
      system.setLevel(10);
      setFiniteDuration(system, 10);

      system.update(20); // => stormy
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].type).toBe("stormy");

      setFiniteDuration(system, 10);
      system.update(20); // => clear
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback.mock.calls[1][0].type).toBe("clear");
    });

    it("can be replaced by calling onWeatherChange again", () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      const rng = sequenceRng([0.99, 0.5, 0.5, 0.9]);
      const system = new WeatherSystem(rng);

      system.onWeatherChange(cb1);
      system.onWeatherChange(cb2); // replaces cb1

      system.setLevel(10);
      setFiniteDuration(system, 10);
      system.update(20);

      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // Wind direction assignment
  // -----------------------------------------------------------------------
  describe("wind direction", () => {
    it("assigns +1 when rng > 0.5", () => {
      // windDir rng = 0.9 => +1
      const rng = sequenceRng([0.99, 0.5, 0.5, 0.9]);
      const system = new WeatherSystem(rng);
      system.setLevel(6);
      setFiniteDuration(system, 10);
      system.update(20);
      expect(system.getState().windDirection).toBe(1);
    });

    it("assigns -1 when rng <= 0.5", () => {
      // windDir rng = 0.5 => rng > 0.5 is false => -1
      const rng = sequenceRng([0.99, 0.5, 0.5, 0.5]);
      const system = new WeatherSystem(rng);
      system.setLevel(6);
      setFiniteDuration(system, 10);
      system.update(20);
      expect(system.getState().windDirection).toBe(-1);
    });
  });

  // -----------------------------------------------------------------------
  // Wind strength ranges per weather type
  // -----------------------------------------------------------------------
  describe("wind strength ranges", () => {
    it("windy: windStrength within [0.3, 0.7]", () => {
      // rng for windStr = 0.0 => 0.3 + 0.0*(0.7-0.3) = 0.3
      const rngLow = sequenceRng([0.5, 0.0, 0.5, 0.0, 0.9]);
      const sysLow = new WeatherSystem(rngLow);
      sysLow.setLevel(6);
      setFiniteDuration(sysLow, 10);
      sysLow.update(20);
      expect(sysLow.getState().type).toBe("windy");
      expect(sysLow.getState().windStrength).toBeCloseTo(0.3);

      // rng for windStr = 1.0 => 0.3 + 1.0*(0.7-0.3) = 0.7
      const rngHigh = sequenceRng([0.5, 0.0, 0.5, 1.0, 0.9]);
      const sysHigh = new WeatherSystem(rngHigh);
      sysHigh.setLevel(6);
      setFiniteDuration(sysHigh, 10);
      sysHigh.update(20);
      expect(sysHigh.getState().type).toBe("windy");
      expect(sysHigh.getState().windStrength).toBeCloseTo(0.7);
    });

    it("rainy: windStrength within [0.1, 0.3]", () => {
      // level 20: rainy range is [0.475, 0.775), roll=0.6
      const rng = sequenceRng([0.6, 0.5, 0.5, 0.9]);
      const sys = new WeatherSystem(rng);
      sys.setLevel(20);
      setFiniteDuration(sys, 10);
      sys.update(20);
      expect(sys.getState().type).toBe("rainy");
      // windStr = 0.1 + 0.5*(0.3-0.1) = 0.2
      expect(sys.getState().windStrength).toBeCloseTo(0.2);
    });

    it("stormy: windStrength within [0.5, 1.0]", () => {
      const rng = sequenceRng([0.99, 0.5, 0.5, 0.9]);
      const sys = new WeatherSystem(rng);
      sys.setLevel(6);
      setFiniteDuration(sys, 10);
      sys.update(20);
      expect(sys.getState().type).toBe("stormy");
      // windStr = 0.5 + 0.5*(1.0-0.5) = 0.75
      expect(sys.getState().windStrength).toBeCloseTo(0.75);
    });
  });

  // -----------------------------------------------------------------------
  // reset()
  // -----------------------------------------------------------------------
  describe("reset", () => {
    it("restores clear weather, resets level to 1, and stops updates", () => {
      const rng = sequenceRng([0.99, 0.5, 0.5, 0.9]);
      const system = new WeatherSystem(rng);
      system.setLevel(10);
      setFiniteDuration(system, 10);
      system.update(20); // => stormy

      system.reset();

      const s = system.getState();
      expect(s.type).toBe("clear");
      expect(s.intensity).toBe(0);
      expect(s.windDirection).toBe(0);
      expect(s.windStrength).toBe(0);
      expect(s.wobbleBonus).toBe(0);
      expect(s.elapsed).toBe(0);
      expect(s.transitionProgress).toBe(1);
      expect(s.duration).toBe(Infinity);

      // After reset level is 1 so update is a no-op
      system.update(99999);
      expect(system.getState().elapsed).toBe(0);
      expect(system.getState().type).toBe("clear");
    });
  });

  // -----------------------------------------------------------------------
  // Multiple transitions in sequence (integration-style)
  // -----------------------------------------------------------------------
  describe("multiple sequential transitions", () => {
    it("cycles through weather types over time", () => {
      const weatherLog: WeatherType[] = [];
      const callback = vi.fn((state: WeatherState) => {
        weatherLog.push(state.type);
      });

      // Provide enough rng values for several transitions
      const rng = sequenceRng([
        // Transition 1: stormy (roll=0.99)
        0.99, 0.5, 0.5, 0.9,
        // Transition 2: clear from stormy (roll=0.01)
        0.01, 0.5,
        // Transition 3: anti-repeat from clear (roll=0.05) => picks from others
        0.05, 0.33, 0.5, 0.5, 0.9,
        // Transition 4: some weather
        0.99, 0.5, 0.5, 0.9,
      ]);

      const system = new WeatherSystem(rng);
      system.onWeatherChange(callback);
      system.setLevel(6);

      // Trigger 4 transitions
      for (let i = 0; i < 4; i++) {
        setFiniteDuration(system, 10);
        system.update(20);
      }

      expect(callback).toHaveBeenCalledTimes(4);
      expect(weatherLog.length).toBe(4);
      // Each transition should produce a valid weather type
      const validTypes: WeatherType[] = ["clear", "windy", "rainy", "stormy"];
      for (const w of weatherLog) {
        expect(validTypes).toContain(w);
      }
    });
  });
});
