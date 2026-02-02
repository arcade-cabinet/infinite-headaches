/**
 * HitStop Unit Tests
 *
 * Covers:
 *  - trigger / shouldPause lifecycle
 *  - Overlapping triggers (extension behavior)
 *  - reset clears state
 *  - Edge cases (zero duration, negative duration, boundary)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HitStopManager } from "../HitStop";

describe("HitStopManager", () => {
  let hitStop: HitStopManager;

  beforeEach(() => {
    hitStop = new HitStopManager();
    vi.restoreAllMocks();
  });

  // ── trigger / shouldPause lifecycle ───────────────────────────

  describe("trigger / shouldPause lifecycle", () => {
    it("shouldPause returns false initially (no trigger)", () => {
      // performance.now() returns some positive value; pauseUntil starts at 0
      expect(hitStop.shouldPause()).toBe(false);
    });

    it("shouldPause returns true immediately after trigger", () => {
      vi.spyOn(performance, "now").mockReturnValue(1000);

      hitStop.trigger(200); // pauseUntil = 1200
      // Still at time 1000 < 1200
      expect(hitStop.shouldPause()).toBe(true);
    });

    it("shouldPause returns true while within the pause window", () => {
      const nowSpy = vi.spyOn(performance, "now");

      nowSpy.mockReturnValue(1000);
      hitStop.trigger(500); // pauseUntil = 1500

      nowSpy.mockReturnValue(1200);
      expect(hitStop.shouldPause()).toBe(true);

      nowSpy.mockReturnValue(1499);
      expect(hitStop.shouldPause()).toBe(true);
    });

    it("shouldPause returns false after duration expires", () => {
      const nowSpy = vi.spyOn(performance, "now");

      nowSpy.mockReturnValue(1000);
      hitStop.trigger(200); // pauseUntil = 1200

      nowSpy.mockReturnValue(1300);
      expect(hitStop.shouldPause()).toBe(false);
    });

    it("shouldPause returns false exactly at duration boundary (strict <)", () => {
      const nowSpy = vi.spyOn(performance, "now");

      nowSpy.mockReturnValue(1000);
      hitStop.trigger(200); // pauseUntil = 1200

      // At exactly 1200: now (1200) < pauseUntil (1200) is false
      nowSpy.mockReturnValue(1200);
      expect(hitStop.shouldPause()).toBe(false);
    });

    it("successive independent triggers each produce their own pause window", () => {
      const nowSpy = vi.spyOn(performance, "now");

      // First trigger
      nowSpy.mockReturnValue(1000);
      hitStop.trigger(100); // pauseUntil = 1100
      expect(hitStop.shouldPause()).toBe(true);

      // Let it expire
      nowSpy.mockReturnValue(1200);
      expect(hitStop.shouldPause()).toBe(false);

      // Second trigger later
      nowSpy.mockReturnValue(2000);
      hitStop.trigger(50); // pauseUntil = 2050
      expect(hitStop.shouldPause()).toBe(true);

      nowSpy.mockReturnValue(2051);
      expect(hitStop.shouldPause()).toBe(false);
    });
  });

  // ── Overlapping triggers (extension behavior) ────────────────

  describe("overlapping triggers", () => {
    it("shorter overlapping trigger does not shorten existing pause", () => {
      const nowSpy = vi.spyOn(performance, "now");

      nowSpy.mockReturnValue(1000);
      hitStop.trigger(500); // pauseUntil = 1500

      nowSpy.mockReturnValue(1100);
      hitStop.trigger(100); // Math.max(1500, 1200) = 1500 -- no change

      // At 1300, still paused (pauseUntil is 1500, not 1200)
      nowSpy.mockReturnValue(1300);
      expect(hitStop.shouldPause()).toBe(true);

      nowSpy.mockReturnValue(1600);
      expect(hitStop.shouldPause()).toBe(false);
    });

    it("longer overlapping trigger extends the pause window", () => {
      const nowSpy = vi.spyOn(performance, "now");

      nowSpy.mockReturnValue(1000);
      hitStop.trigger(200); // pauseUntil = 1200

      nowSpy.mockReturnValue(1100);
      hitStop.trigger(500); // Math.max(1200, 1600) = 1600

      // At 1400, still paused (original would have expired at 1200)
      nowSpy.mockReturnValue(1400);
      expect(hitStop.shouldPause()).toBe(true);

      nowSpy.mockReturnValue(1700);
      expect(hitStop.shouldPause()).toBe(false);
    });

    it("many rapid overlapping triggers keep the latest maximum", () => {
      const nowSpy = vi.spyOn(performance, "now");

      nowSpy.mockReturnValue(1000);
      hitStop.trigger(100); // pauseUntil = 1100
      hitStop.trigger(200); // pauseUntil = 1200
      hitStop.trigger(50);  // pauseUntil stays 1200

      nowSpy.mockReturnValue(1150);
      expect(hitStop.shouldPause()).toBe(true);

      nowSpy.mockReturnValue(1201);
      expect(hitStop.shouldPause()).toBe(false);
    });
  });

  // ── reset clears state ────────────────────────────────────────

  describe("reset", () => {
    it("clears the pause state immediately", () => {
      const nowSpy = vi.spyOn(performance, "now");

      nowSpy.mockReturnValue(1000);
      hitStop.trigger(500); // pauseUntil = 1500
      expect(hitStop.shouldPause()).toBe(true);

      hitStop.reset(); // pauseUntil = 0

      // now (1000) < 0 is false
      expect(hitStop.shouldPause()).toBe(false);
    });

    it("allows new triggers to work after reset", () => {
      const nowSpy = vi.spyOn(performance, "now");

      nowSpy.mockReturnValue(100);
      hitStop.trigger(300);
      expect(hitStop.shouldPause()).toBe(true);

      hitStop.reset();
      expect(hitStop.shouldPause()).toBe(false);

      nowSpy.mockReturnValue(500);
      hitStop.trigger(100); // pauseUntil = 600
      expect(hitStop.shouldPause()).toBe(true);

      nowSpy.mockReturnValue(700);
      expect(hitStop.shouldPause()).toBe(false);
    });

    it("reset during an active pause stops the pause", () => {
      const nowSpy = vi.spyOn(performance, "now");

      nowSpy.mockReturnValue(1000);
      hitStop.trigger(1000); // pauseUntil = 2000

      nowSpy.mockReturnValue(1500);
      expect(hitStop.shouldPause()).toBe(true);

      hitStop.reset();
      expect(hitStop.shouldPause()).toBe(false);

      // Even at the same timestamp, still not paused
      expect(hitStop.shouldPause()).toBe(false);
    });

    it("calling reset multiple times is harmless", () => {
      const nowSpy = vi.spyOn(performance, "now");

      nowSpy.mockReturnValue(1000);
      hitStop.trigger(200);

      hitStop.reset();
      hitStop.reset();
      hitStop.reset();

      expect(hitStop.shouldPause()).toBe(false);
    });
  });

  // ── Edge cases ────────────────────────────────────────────────

  describe("edge cases", () => {
    it("trigger with 0 duration does not pause (boundary is not inclusive)", () => {
      const nowSpy = vi.spyOn(performance, "now");

      nowSpy.mockReturnValue(1000);
      hitStop.trigger(0); // pauseUntil = 1000

      // 1000 < 1000 is false
      expect(hitStop.shouldPause()).toBe(false);
    });

    it("trigger with negative duration does not create a future pause", () => {
      const nowSpy = vi.spyOn(performance, "now");

      nowSpy.mockReturnValue(1000);
      hitStop.trigger(-500); // pauseUntil = Math.max(0, 500) = 500

      // 1000 < 500 is false
      expect(hitStop.shouldPause()).toBe(false);
    });

    it("trigger with very large duration sets a far-future pause", () => {
      const nowSpy = vi.spyOn(performance, "now");

      nowSpy.mockReturnValue(1000);
      hitStop.trigger(999999); // pauseUntil = 1000999

      nowSpy.mockReturnValue(500000);
      expect(hitStop.shouldPause()).toBe(true);

      nowSpy.mockReturnValue(1001000);
      expect(hitStop.shouldPause()).toBe(false);
    });

    it("fresh instance shouldPause is false regardless of performance.now value", () => {
      const nowSpy = vi.spyOn(performance, "now");

      nowSpy.mockReturnValue(0);
      expect(hitStop.shouldPause()).toBe(false);

      nowSpy.mockReturnValue(999999);
      expect(hitStop.shouldPause()).toBe(false);
    });
  });
});
