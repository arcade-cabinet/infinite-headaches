/**
 * HitStop Manager
 * Provides freeze-frame effects for impactful moments.
 * Singleton - shared across the game.
 */

export class HitStopManager {
  private pauseUntil = 0;

  /** Trigger a freeze frame for the given duration in ms. */
  trigger(durationMs: number): void {
    const now = performance.now();
    // Extend if already paused, don't shorten
    this.pauseUntil = Math.max(this.pauseUntil, now + durationMs);
  }

  /** Returns true if the game loop should skip physics this frame. */
  shouldPause(): boolean {
    return performance.now() < this.pauseUntil;
  }

  /** Reset state (call on game start). */
  reset(): void {
    this.pauseUntil = 0;
  }
}

export const hitStop = new HitStopManager();
