/**
 * Duck AI Behavior System
 * Smart steering behaviors for falling ducks
 */

/**
 * Behavior types for falling ducks
 */
export type DuckBehaviorType =
  | "normal" // Falls straight down with slight drift
  | "seeker" // Actively seeks the player
  | "evader" // Tries to avoid the player
  | "zigzag" // Moves in a zigzag pattern
  | "swarm" // Follows other ducks
  | "dive" // Fast dive at player
  | "floater"; // Slow, drifting fall

export interface DuckAIState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  behaviorType: DuckBehaviorType;
}

/**
 * Get a random behavior type based on level
 * Higher levels have more aggressive behaviors
 */
export function getRandomBehavior(level: number): DuckBehaviorType {
  const rand = Math.random();

  // Base probabilities that increase with level
  let seeker = 0.05 + level * 0.02; // Increases with level
  let evader = 0.03 + level * 0.01;
  let zigzag = 0.05 + level * 0.015;
  let dive = level >= 5 ? 0.02 + (level - 5) * 0.01 : 0;
  const floater = 0.08;

  // Cap probabilities
  seeker = Math.min(seeker, 0.25);
  evader = Math.min(evader, 0.15);
  zigzag = Math.min(zigzag, 0.2);
  dive = Math.min(dive, 0.1);

  let cumulative = 0;

  cumulative += seeker;
  if (rand < cumulative) return "seeker";

  cumulative += evader;
  if (rand < cumulative) return "evader";

  cumulative += zigzag;
  if (rand < cumulative) return "zigzag";

  cumulative += dive;
  if (rand < cumulative) return "dive";

  cumulative += floater;
  if (rand < cumulative) return "floater";

  return "normal";
}

/**
 * Apply AI behavior to duck position
 */
export function applyDuckAI(
  state: DuckAIState,
  deltaTime: number,
  screenWidth: number
): { x: number; y: number; vx: number; vy: number } {
  const { x, y, vx, vy, targetX, targetY, behaviorType } = state;

  let newVx = vx;
  let newVy = vy;

  const dt = deltaTime / 1000; // Convert to seconds

  switch (behaviorType) {
    case "seeker": {
      // Move toward player
      const dx = targetX - x;
      const dy = targetY - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 10) {
        newVx += (dx / dist) * 0.5 * dt * 60;
        newVy += (dy / dist) * 0.3 * dt * 60;
      }
      break;
    }

    case "evader": {
      // Move away from player when close
      const dx = x - targetX;
      const dy = y - targetY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150 && dist > 10) {
        newVx += (dx / dist) * 0.4 * dt * 60;
      }
      break;
    }

    case "zigzag": {
      // Sinusoidal horizontal movement
      const phase = y * 0.02;
      newVx = Math.sin(phase) * 3;
      break;
    }

    case "dive": {
      // Fast dive toward player
      const dx = targetX - x;
      const dy = targetY - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 10) {
        newVx += (dx / dist) * 0.8 * dt * 60;
        newVy = Math.max(newVy, 6); // Fast fall
      }
      break;
    }

    case "floater": {
      // Slow drift with slight wander
      newVx += (Math.random() - 0.5) * 0.1;
      newVy = Math.min(newVy, 2); // Slow fall
      break;
    }

    case "swarm": {
      // Would need other duck positions - simplified here
      newVx += (Math.random() - 0.5) * 0.2;
      break;
    }

    default:
      // Normal - slight random drift
      newVx += (Math.random() - 0.5) * 0.05;
      break;
  }

  // Clamp velocities
  newVx = Math.max(-5, Math.min(5, newVx));
  newVy = Math.max(0, Math.min(12, newVy));

  // Apply damping
  newVx *= 0.98;

  // Calculate new position
  let newX = x + newVx;
  const newY = y + newVy;

  // Bounce off walls
  const padding = 40;
  if (newX < padding) {
    newX = padding;
    newVx = Math.abs(newVx) * 0.5;
  } else if (newX > screenWidth - padding - 65) {
    // Account for bank zone
    newX = screenWidth - padding - 65;
    newVx = -Math.abs(newVx) * 0.5;
  }

  return { x: newX, y: newY, vx: newVx, vy: newVy };
}

/**
 * Get behavior display info for UI
 */
export function getBehaviorInfo(type: DuckBehaviorType): { name: string; color: string } {
  switch (type) {
    case "seeker":
      return { name: "Seeker", color: "#F44336" };
    case "evader":
      return { name: "Evader", color: "#9C27B0" };
    case "zigzag":
      return { name: "Zigzag", color: "#FF9800" };
    case "dive":
      return { name: "Diver", color: "#E91E63" };
    case "floater":
      return { name: "Floater", color: "#4CAF50" };
    case "swarm":
      return { name: "Swarm", color: "#2196F3" };
    default:
      return { name: "Normal", color: "#FDD835" };
  }
}
