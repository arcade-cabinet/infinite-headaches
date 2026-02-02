/**
 * GameRails - Pure-math module for BabylonJS Path3D rail constraints.
 *
 * Two horizontal rails define the player and tornado movement bounds:
 *  - Player rail (bottom): Y=-2, X from -8 to +8
 *  - Tornado rail (top):   Y=8.25, X from -7.5 to +7.5
 *
 * All helpers are pure functions operating on rail parameter space (0-1).
 * No scene dependency - only BabylonJS math types.
 */

import { Path3D, Vector3 } from "@babylonjs/core";

// ---------------------------------------------------------------------------
// Rail Configurations
// ---------------------------------------------------------------------------

export interface RailConfig {
  readonly start: Vector3;
  readonly end: Vector3;
}

/** Player walks at Y=-2 across the full playable width. */
export const PLAYER_RAIL_CONFIG: RailConfig = {
  start: new Vector3(-8, -2, 0),
  end: new Vector3(8, -2, 0),
};

/** Tornado patrols at Y=8.25 (spawn height) across a slightly narrower band. */
export const TORNADO_RAIL_CONFIG: RailConfig = {
  start: new Vector3(-7.5, 8.25, 0),
  end: new Vector3(7.5, 8.25, 0),
};

// ---------------------------------------------------------------------------
// Path3D Factory
// ---------------------------------------------------------------------------

/**
 * Creates a BabylonJS Path3D from a rail config.
 * Straight line from start to end.
 */
export function createRail(config: RailConfig): Path3D {
  return new Path3D([config.start.clone(), config.end.clone()]);
}

// ---------------------------------------------------------------------------
// Coordinate Conversion Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a world-space X coordinate to a rail parameter T in [0, 1].
 * T=0 is the left end (start.x), T=1 is the right end (end.x).
 */
export function worldXToRailT(worldX: number, config: RailConfig): number {
  const range = config.end.x - config.start.x;
  if (range === 0) return 0.5;
  const t = (worldX - config.start.x) / range;
  return Math.max(0, Math.min(1, t));
}

/**
 * Convert a rail parameter T in [0, 1] to a world-space X coordinate.
 */
export function railTToWorldX(t: number, config: RailConfig): number {
  const clampedT = Math.max(0, Math.min(1, t));
  return config.start.x + clampedT * (config.end.x - config.start.x);
}

/**
 * Get the full 3D position on a rail at parameter T.
 */
export function railTToWorldPos(t: number, config: RailConfig): Vector3 {
  const clampedT = Math.max(0, Math.min(1, t));
  return Vector3.Lerp(config.start, config.end, clampedT);
}

/**
 * Clamp a world-space X coordinate to the rail's valid range.
 * Returns the clamped X value.
 */
export function clampToRail(worldX: number, config: RailConfig): number {
  const minX = Math.min(config.start.x, config.end.x);
  const maxX = Math.max(config.start.x, config.end.x);
  return Math.max(minX, Math.min(maxX, worldX));
}

/**
 * Get the width of a rail in world units.
 */
export function getRailWidth(config: RailConfig): number {
  return Math.abs(config.end.x - config.start.x);
}

/**
 * Get the Y-coordinate of a rail.
 */
export function getRailY(config: RailConfig): number {
  return config.start.y;
}
