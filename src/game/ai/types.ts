import { AnimalType } from "../config";

export interface DuckAIConfig {
  behaviorType: "normal" | "seeker" | "evader" | "zigzag" | "dive" | "floater" | "swarm";
  y: number;
  targetY: number;
}

export interface PlayerState {
  playerX: number;
  playerY: number;
  stackHeight: number;
  lives: number;
  maxLives: number;
  score: number;
  combo: number;
  gameTime: number;
  timeSinceLastSpawn: number;
  timeSinceLastPowerUp: number;
  timeSinceLastMiss: number;
  timeSinceLastPerfect: number;
  recentCatches: number;
  recentMisses: number;
  recentPerfects: number;
  catchRate: number;
  activeDucks: number; // Renamed concept but keeping key for now
  activePowerUps: number;
  screenWidth: number;
  screenHeight: number;
  level: number;
  bankedDucks: number;
}

export interface SpawnDecision {
  shouldSpawn: boolean;
  x: number;
  duckType: AnimalType;
  behaviorType: string;
  initialVelocityX: number;
  initialVelocityY: number;
  targetBias: number;
}

export interface PowerUpDecision {
  shouldSpawn: boolean;
  type: string;
  x: number;
  timing: "immediate" | "delayed";
}
