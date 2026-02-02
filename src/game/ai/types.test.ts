/**
 * AI Types Unit Tests
 *
 * Validates the shape and fields of the AI type interfaces,
 * including new fields added for DropController integration.
 */

import { describe, it, expect } from "vitest";
import type {
  PlayerState,
  SpawnDecision,
  PowerUpDecision,
  YahtzeeCombo,
  DuckAIConfig,
} from "./types";

describe("AI Types", () => {
  describe("PlayerState", () => {
    it("should accept all required fields", () => {
      const state: PlayerState = {
        playerX: 960,
        playerY: -2,
        stackHeight: 5,
        lives: 3,
        maxLives: 5,
        score: 1500,
        combo: 3,
        gameTime: 30000,
        timeSinceLastSpawn: 1000,
        timeSinceLastPowerUp: 5000,
        timeSinceLastMiss: 8000,
        timeSinceLastPerfect: 2000,
        recentCatches: 5,
        recentMisses: 1,
        recentPerfects: 2,
        catchRate: 0.83,
        activeDucks: 2,
        activePowerUps: 1,
        screenWidth: 1920,
        screenHeight: 1080,
        level: 5,
        bankedAnimals: 10,
      };
      expect(state.level).toBe(5);
      expect(state.bankedAnimals).toBe(10);
    });

    it("should accept optional stackComposition field", () => {
      const state: PlayerState = {
        playerX: 960,
        playerY: -2,
        stackHeight: 3,
        lives: 3,
        maxLives: 5,
        score: 500,
        combo: 1,
        gameTime: 10000,
        timeSinceLastSpawn: 500,
        timeSinceLastPowerUp: 3000,
        timeSinceLastMiss: 5000,
        timeSinceLastPerfect: 3000,
        recentCatches: 3,
        recentMisses: 0,
        recentPerfects: 1,
        catchRate: 1.0,
        activeDucks: 1,
        activePowerUps: 0,
        screenWidth: 1920,
        screenHeight: 1080,
        level: 2,
        bankedAnimals: 5,
        stackComposition: {
          cow: 2,
          pig: 1,
          chicken: 0,
          duck: 0,
          sheep: 0,
          farmer: 0,
        },
      };
      expect(state.stackComposition).toBeDefined();
      expect(state.stackComposition!.cow).toBe(2);
      expect(state.stackComposition!.pig).toBe(1);
    });

    it("should allow stackComposition to be undefined", () => {
      const state: PlayerState = {
        playerX: 960,
        playerY: -2,
        stackHeight: 0,
        lives: 5,
        maxLives: 5,
        score: 0,
        combo: 0,
        gameTime: 0,
        timeSinceLastSpawn: 0,
        timeSinceLastPowerUp: 0,
        timeSinceLastMiss: 99999,
        timeSinceLastPerfect: 99999,
        recentCatches: 0,
        recentMisses: 0,
        recentPerfects: 0,
        catchRate: 0.5,
        activeDucks: 0,
        activePowerUps: 0,
        screenWidth: 1920,
        screenHeight: 1080,
        level: 1,
        bankedAnimals: 0,
      };
      expect(state.stackComposition).toBeUndefined();
    });
  });

  describe("SpawnDecision", () => {
    it("should include nextDropX field", () => {
      const decision: SpawnDecision = {
        shouldSpawn: true,
        x: 960,
        duckType: "cow",
        behaviorType: "normal",
        initialVelocityX: 0.5,
        initialVelocityY: 3.0,
        targetBias: 0.4,
        nextDropX: 2.5,
      };
      expect(decision.nextDropX).toBe(2.5);
    });

    it("should accept negative nextDropX (left side of board)", () => {
      const decision: SpawnDecision = {
        shouldSpawn: true,
        x: 200,
        duckType: "pig",
        behaviorType: "seeker",
        initialVelocityX: -0.3,
        initialVelocityY: 2.5,
        targetBias: 0.6,
        nextDropX: -5.5,
      };
      expect(decision.nextDropX).toBe(-5.5);
    });

    it("should accept all animal types", () => {
      const types: SpawnDecision["duckType"][] = ["cow", "pig", "chicken", "duck", "sheep"];
      for (const type of types) {
        const decision: SpawnDecision = {
          shouldSpawn: true,
          x: 960,
          duckType: type,
          behaviorType: "normal",
          initialVelocityX: 0,
          initialVelocityY: 2,
          targetBias: 0.3,
          nextDropX: 0,
        };
        expect(decision.duckType).toBe(type);
      }
    });
  });

  describe("YahtzeeCombo", () => {
    it("should accept all combo types", () => {
      const combos: YahtzeeCombo[] = [
        "pair",
        "two_pair",
        "three_of_kind",
        "four_of_kind",
        "full_house",
        "straight",
        "flush",
      ];
      expect(combos).toHaveLength(7);
      for (const combo of combos) {
        expect(typeof combo).toBe("string");
      }
    });
  });

  describe("PowerUpDecision", () => {
    it("should have correct shape", () => {
      const decision: PowerUpDecision = {
        shouldSpawn: true,
        type: "potion",
        x: 500,
        timing: "immediate",
      };
      expect(decision.shouldSpawn).toBe(true);
      expect(decision.timing).toBe("immediate");
    });

    it("should accept delayed timing", () => {
      const decision: PowerUpDecision = {
        shouldSpawn: false,
        type: "rare_candy",
        x: 0,
        timing: "delayed",
      };
      expect(decision.timing).toBe("delayed");
    });
  });

  describe("DuckAIConfig", () => {
    it("should accept all behavior types", () => {
      const behaviors: DuckAIConfig["behaviorType"][] = [
        "normal", "seeker", "evader", "zigzag", "dive", "floater", "swarm",
      ];
      for (const bt of behaviors) {
        const config: DuckAIConfig = { behaviorType: bt, y: 10, targetY: -2 };
        expect(config.behaviorType).toBe(bt);
      }
    });
  });
});
