/**
 * HitStop Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HitStopManager } from "../HitStop";

describe("HitStopManager", () => {
  let hitStop: HitStopManager;

  beforeEach(() => {
    hitStop = new HitStopManager();
    vi.restoreAllMocks();
  });

  it("shouldPause returns false initially", () => {
    // performance.now() returns some positive value, pauseUntil starts at 0
    expect(hitStop.shouldPause()).toBe(false);
  });

  it("shouldPause returns true after trigger", () => {
    vi.spyOn(performance, "now").mockReturnValue(1000);

    hitStop.trigger(200); // pauseUntil = 1000 + 200 = 1200

    // Still at time 1000, which is < 1200
    expect(hitStop.shouldPause()).toBe(true);
  });

  it("shouldPause returns false after duration expires", () => {
    const nowSpy = vi.spyOn(performance, "now");

    nowSpy.mockReturnValue(1000);
    hitStop.trigger(200); // pauseUntil = 1200

    // Advance time past the pause
    nowSpy.mockReturnValue(1300);
    expect(hitStop.shouldPause()).toBe(false);
  });

  it("shouldPause returns false exactly at duration boundary", () => {
    const nowSpy = vi.spyOn(performance, "now");

    nowSpy.mockReturnValue(1000);
    hitStop.trigger(200); // pauseUntil = 1200

    // At exactly 1200: now (1200) < pauseUntil (1200) is false
    nowSpy.mockReturnValue(1200);
    expect(hitStop.shouldPause()).toBe(false);
  });

  it("overlapping triggers extend the pause, not shorten", () => {
    const nowSpy = vi.spyOn(performance, "now");

    nowSpy.mockReturnValue(1000);
    hitStop.trigger(500); // pauseUntil = 1500

    nowSpy.mockReturnValue(1100);
    hitStop.trigger(100); // would set to 1200, but Math.max(1500, 1200) = 1500

    // At time 1300, pauseUntil is still 1500 (not shortened to 1200)
    nowSpy.mockReturnValue(1300);
    expect(hitStop.shouldPause()).toBe(true);

    // At time 1600, past original 1500
    nowSpy.mockReturnValue(1600);
    expect(hitStop.shouldPause()).toBe(false);
  });

  it("overlapping triggers can extend beyond original pause", () => {
    const nowSpy = vi.spyOn(performance, "now");

    nowSpy.mockReturnValue(1000);
    hitStop.trigger(200); // pauseUntil = 1200

    nowSpy.mockReturnValue(1100);
    hitStop.trigger(500); // pauseUntil = Math.max(1200, 1600) = 1600

    nowSpy.mockReturnValue(1400);
    expect(hitStop.shouldPause()).toBe(true);

    nowSpy.mockReturnValue(1700);
    expect(hitStop.shouldPause()).toBe(false);
  });

  it("reset clears the pause state", () => {
    const nowSpy = vi.spyOn(performance, "now");

    nowSpy.mockReturnValue(1000);
    hitStop.trigger(500); // pauseUntil = 1500

    hitStop.reset(); // pauseUntil = 0

    // Even though we haven't advanced time, shouldPause is false
    // because now (1000) < 0 is false
    expect(hitStop.shouldPause()).toBe(false);
  });

  it("trigger with 0 duration pauses only at the exact moment", () => {
    const nowSpy = vi.spyOn(performance, "now");

    nowSpy.mockReturnValue(1000);
    hitStop.trigger(0); // pauseUntil = 1000

    // now (1000) < pauseUntil (1000) is false
    expect(hitStop.shouldPause()).toBe(false);
  });

  it("multiple triggers and resets work correctly", () => {
    const nowSpy = vi.spyOn(performance, "now");

    nowSpy.mockReturnValue(100);
    hitStop.trigger(300); // pauseUntil = 400
    expect(hitStop.shouldPause()).toBe(true);

    hitStop.reset();
    expect(hitStop.shouldPause()).toBe(false);

    nowSpy.mockReturnValue(500);
    hitStop.trigger(100); // pauseUntil = 600
    expect(hitStop.shouldPause()).toBe(true);

    nowSpy.mockReturnValue(700);
    expect(hitStop.shouldPause()).toBe(false);
  });
});
