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
  bankedAnimals: number;
  stackComposition?: Record<AnimalType, number>;
}

export interface SpawnDecision {
  shouldSpawn: boolean;
  x: number;
  duckType: AnimalType;
  behaviorType: string;
  initialVelocityX: number;
  initialVelocityY: number;
  targetBias: number;
  nextDropX: number;
}

export type YahtzeeCombo =
  | "pair"           // 2 of same type
  | "two_pair"       // 2 different pairs
  | "three_of_kind"  // 3 of same type
  | "four_of_kind"   // 4 of same type
  | "full_house"     // 3 + 2 of different types
  | "straight"       // one of each of 5 types
  | "flush";         // all same type (5+)

export interface PowerUpDecision {
  shouldSpawn: boolean;
  type: string;
  x: number;
  timing: "immediate" | "delayed";
}
