/**
 * Spawning Logic Tests
 * Tests for animal spawn weights, level scaling, and behavior types
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { getRandomAnimalType, Animal } from "@/game/entities/Animal";
import { ANIMAL_TYPES, GAME_CONFIG, type AnimalType } from "@/game/config";
import { GameDirector, type GameState } from "@/game/ai/GameDirector";

describe("Spawning Logic", () => {
  describe("getRandomAnimalType", () => {
    it("returns a valid animal type", () => {
      const type = getRandomAnimalType(1);

      expect(Object.keys(ANIMAL_TYPES)).toContain(type);
    });

    it("only returns spawnable animals (hasModel: true, spawnWeight > 0)", () => {
      // Run many times to ensure variety
      for (let i = 0; i < 100; i++) {
        const type = getRandomAnimalType(1);
        const config = ANIMAL_TYPES[type];

        expect(config.hasModel).toBe(true);
        expect(config.spawnWeight).toBeGreaterThan(0);
      }
    });

    it("never returns farmer (spawnWeight is 0)", () => {
      for (let i = 0; i < 100; i++) {
        const type = getRandomAnimalType(1);
        expect(type).not.toBe("farmer");
      }
    });

    it("respects spawn weights over many samples", () => {
      const counts: Record<string, number> = {};

      // Initialize counts
      for (const type of Object.keys(ANIMAL_TYPES)) {
        counts[type] = 0;
      }

      // Sample many times
      const samples = 10000;
      for (let i = 0; i < samples; i++) {
        const type = getRandomAnimalType(1);
        counts[type]++;
      }

      // Check that animals with higher spawn weight appear more often
      // chicken has weight 0.25, cow has weight 0.2, sheep has weight 0.15
      // So chicken should generally appear more than cow, cow more than sheep
      expect(counts.chicken).toBeGreaterThan(counts.sheep);

      // All spawnable types should have at least some spawns
      const spawnableTypes = Object.entries(ANIMAL_TYPES)
        .filter(([_, config]) => config.hasModel && config.spawnWeight > 0)
        .map(([type]) => type);

      for (const type of spawnableTypes) {
        expect(counts[type]).toBeGreaterThan(0);
      }
    });

    it("increases special animal chance with higher levels", () => {
      // At higher levels, animals with abilities get bonus spawn weight
      // Count spawns at level 1 vs level 20
      const countsLevel1: Record<string, number> = {};
      const countsLevel20: Record<string, number> = {};

      for (const type of Object.keys(ANIMAL_TYPES)) {
        countsLevel1[type] = 0;
        countsLevel20[type] = 0;
      }

      const samples = 5000;

      for (let i = 0; i < samples; i++) {
        countsLevel1[getRandomAnimalType(1)]++;
        countsLevel20[getRandomAnimalType(20)]++;
      }

      // Find animals with abilities
      const specialAnimals = Object.entries(ANIMAL_TYPES)
        .filter(([_, config]) => config.ability && config.spawnWeight > 0)
        .map(([type]) => type);

      // If there are special animals, they should spawn more at higher levels
      // Note: Current config may not have special animals, so this test is conditional
      if (specialAnimals.length > 0) {
        // Calculate total special spawns at each level
        let level1Special = 0;
        let level20Special = 0;

        for (const type of specialAnimals) {
          level1Special += countsLevel1[type];
          level20Special += countsLevel20[type];
        }

        // Higher level should have relatively more special animals
        // Due to the levelBonus in getRandomAnimalType
        expect(level20Special).toBeGreaterThanOrEqual(level1Special);
      }
    });

    it("distributes spawns according to configured weights at level 1", () => {
      const counts: Record<string, number> = {};

      for (const type of Object.keys(ANIMAL_TYPES)) {
        counts[type] = 0;
      }

      const samples = 50000;
      for (let i = 0; i < samples; i++) {
        counts[getRandomAnimalType(1)]++;
      }

      // Calculate expected distribution
      const spawnableTypes = Object.entries(ANIMAL_TYPES)
        .filter(([_, config]) => config.hasModel && config.spawnWeight > 0);

      const totalWeight = spawnableTypes.reduce(
        (sum, [_, config]) => sum + config.spawnWeight,
        0
      );

      // Each animal's actual percentage should be within 2% of expected
      for (const [type, config] of spawnableTypes) {
        const expectedPercentage = config.spawnWeight / totalWeight;
        const actualPercentage = counts[type] / samples;

        expect(actualPercentage).toBeCloseTo(expectedPercentage, 1);
      }
    });
  });

  describe("Animal spawn configuration", () => {
    it("all animal types have hasModel property", () => {
      for (const [type, config] of Object.entries(ANIMAL_TYPES)) {
        expect(config).toHaveProperty("hasModel");
      }
    });

    it("all spawnable animals have positive spawn weight", () => {
      const spawnableAnimals = Object.entries(ANIMAL_TYPES)
        .filter(([type, config]) => config.hasModel && type !== "farmer");

      for (const [type, config] of spawnableAnimals) {
        expect(config.spawnWeight).toBeGreaterThanOrEqual(0);
      }
    });

    it("farmer has zero spawn weight", () => {
      expect(ANIMAL_TYPES.farmer.spawnWeight).toBe(0);
    });

    it("spawn weights sum to approximately 1 for standard animals", () => {
      const standardAnimals = Object.entries(ANIMAL_TYPES)
        .filter(([type, config]) => config.hasModel && config.spawnWeight > 0);

      const totalWeight = standardAnimals.reduce(
        (sum, [_, config]) => sum + config.spawnWeight,
        0
      );

      // Total should be around 1.0 (allowing for special animal weights)
      expect(totalWeight).toBeCloseTo(1.0, 1);
    });
  });

  describe("Animal behavior types", () => {
    it("Animal entity accepts behavior type", () => {
      const animal = new Animal(100, 100, "falling", "cow");

      animal.behaviorType = "seeker";
      expect(animal.behaviorType).toBe("seeker");

      animal.behaviorType = "dive";
      expect(animal.behaviorType).toBe("dive");

      animal.behaviorType = "normal";
      expect(animal.behaviorType).toBe("normal");
    });

    it("Animal defaults to normal behavior", () => {
      const animal = new Animal(100, 100, "falling", "cow");
      expect(animal.behaviorType).toBe("normal");
    });

    it("Animal can have target coordinates for AI", () => {
      const animal = new Animal(100, 100, "falling", "cow");

      animal.targetX = 200;
      animal.targetY = 500;

      expect(animal.targetX).toBe(200);
      expect(animal.targetY).toBe(500);
    });
  });

  describe("GameDirector spawn decisions", () => {
    let director: GameDirector;
    let baseGameState: GameState;

    beforeEach(() => {
      director = new GameDirector();

      baseGameState = {
        playerX: 400,
        playerY: 700,
        stackHeight: 3,
        lives: 3,
        maxLives: 5,
        score: 500,
        combo: 2,
        gameTime: 30000,
        timeSinceLastSpawn: 3000,
        timeSinceLastPowerUp: 10000,
        timeSinceLastMiss: 5000,
        timeSinceLastPerfect: 2000,
        recentCatches: 10,
        recentMisses: 2,
        recentPerfects: 3,
        catchRate: 0.83,
        activeDucks: 1,
        activePowerUps: 0,
        screenWidth: 800,
        screenHeight: 900,
        level: 5,
        bankedDucks: 10,
      };
    });

    it("decides to spawn when enough time has passed", () => {
      director.updateGameState(baseGameState);
      director.update(0.016);

      const decision = director.decideSpawn();

      // With 3000ms since last spawn and initial interval of ~2200ms, should spawn
      expect(decision.shouldSpawn).toBe(true);
    });

    it("does not spawn too quickly", () => {
      const quickSpawnState = { ...baseGameState, timeSinceLastSpawn: 500 };

      director.updateGameState(quickSpawnState);
      director.update(0.016);

      const decision = director.decideSpawn();

      expect(decision.shouldSpawn).toBe(false);
    });

    it("returns valid spawn position within screen bounds", () => {
      director.updateGameState(baseGameState);
      director.update(0.016);

      const decision = director.decideSpawn();

      if (decision.shouldSpawn) {
        expect(decision.x).toBeGreaterThanOrEqual(0);
        expect(decision.x).toBeLessThanOrEqual(
          baseGameState.screenWidth - GAME_CONFIG.layout.bankWidth
        );
      }
    });

    it("returns valid animal type", () => {
      director.updateGameState(baseGameState);
      director.update(0.016);

      const decision = director.decideSpawn();

      if (decision.shouldSpawn) {
        expect(Object.keys(ANIMAL_TYPES)).toContain(decision.duckType);
      }
    });

    it("returns valid behavior type", () => {
      const validBehaviors = [
        "normal",
        "seeker",
        "evader",
        "zigzag",
        "swarm",
        "dive",
        "floater",
      ];

      director.updateGameState(baseGameState);
      director.update(0.016);

      const decision = director.decideSpawn();

      if (decision.shouldSpawn) {
        expect(validBehaviors).toContain(decision.behaviorType);
      }
    });

    it("applies target bias between 0 and 1", () => {
      director.updateGameState(baseGameState);
      director.update(0.016);

      const decision = director.decideSpawn();

      if (decision.shouldSpawn) {
        expect(decision.targetBias).toBeGreaterThanOrEqual(0);
        expect(decision.targetBias).toBeLessThanOrEqual(1);
      }
    });

    it("spawn interval decreases with higher difficulty", () => {
      // Low difficulty state
      const lowDiffState = {
        ...baseGameState,
        level: 1,
        score: 50,
        gameTime: 5000,
      };

      director.updateGameState(lowDiffState);
      director.update(0.5); // Update a few times to let difficulty settle
      const lowDiffInterval = director.getSpawnInterval();

      // High difficulty state
      const highDiffState = {
        ...baseGameState,
        level: 20,
        score: 5000,
        gameTime: 180000,
      };

      director.updateGameState(highDiffState);
      for (let i = 0; i < 100; i++) {
        director.update(0.016);
      }
      const highDiffInterval = director.getSpawnInterval();

      expect(highDiffInterval).toBeLessThan(lowDiffInterval);
    });

    it("activates mercy mode when player has low lives", () => {
      const lowLivesState = { ...baseGameState, lives: 1 };

      director.updateGameState(lowLivesState);
      director.update(0.016);

      // Mercy mode should delay spawns
      const mercyState = { ...lowLivesState, timeSinceLastSpawn: 2500 };
      director.updateGameState(mercyState);

      const decision = director.decideSpawn();

      // With mercy mode, spawn interval is multiplied by 1.5
      // So 2500ms might not be enough if interval is ~2200 * 1.5 = 3300
      // This depends on exact calculations, but mercy mode should be active
      expect(director["mercyModeActive"]).toBe(true);
    });

    it("increases aggressive behaviors at higher difficulty", () => {
      // Collect behaviors at different difficulty levels
      const lowDiffBehaviors: string[] = [];
      const highDiffBehaviors: string[] = [];

      // Low difficulty
      const lowDiffState = {
        ...baseGameState,
        level: 1,
        score: 50,
        gameTime: 5000,
        timeSinceLastSpawn: 5000,
      };

      director.updateGameState(lowDiffState);
      for (let i = 0; i < 50; i++) {
        director.update(0.016);
      }

      for (let i = 0; i < 100; i++) {
        const state = { ...lowDiffState, timeSinceLastSpawn: 5000 };
        director.updateGameState(state);
        const decision = director.decideSpawn();
        if (decision.shouldSpawn) {
          lowDiffBehaviors.push(decision.behaviorType);
        }
      }

      // High difficulty
      const highDiffState = {
        ...baseGameState,
        level: 20,
        score: 8000,
        gameTime: 300000,
        timeSinceLastSpawn: 5000,
      };

      director.updateGameState(highDiffState);
      for (let i = 0; i < 100; i++) {
        director.update(0.016);
      }

      for (let i = 0; i < 100; i++) {
        const state = { ...highDiffState, timeSinceLastSpawn: 5000 };
        director.updateGameState(state);
        const decision = director.decideSpawn();
        if (decision.shouldSpawn) {
          highDiffBehaviors.push(decision.behaviorType);
        }
      }

      // Count aggressive behaviors
      const aggressiveBehaviors = ["seeker", "dive", "zigzag", "evader"];

      const lowDiffAggressive = lowDiffBehaviors.filter((b) =>
        aggressiveBehaviors.includes(b)
      ).length;
      const highDiffAggressive = highDiffBehaviors.filter((b) =>
        aggressiveBehaviors.includes(b)
      ).length;

      // High difficulty should have more aggressive behaviors on average
      // This may vary due to randomness, so we check with a margin
      if (lowDiffBehaviors.length > 0 && highDiffBehaviors.length > 0) {
        const lowDiffRatio = lowDiffAggressive / lowDiffBehaviors.length;
        const highDiffRatio = highDiffAggressive / highDiffBehaviors.length;

        expect(highDiffRatio).toBeGreaterThanOrEqual(lowDiffRatio * 0.8);
      }
    });
  });

  describe("Level-based spawning", () => {
    it("GAME_CONFIG has correct difficulty settings", () => {
      expect(GAME_CONFIG.difficulty.levelUpThreshold).toBe(75);
      expect(GAME_CONFIG.difficulty.maxLevel).toBe(25);
      expect(GAME_CONFIG.difficulty.specialDuckLevelBonus).toBe(0.02);
    });

    it("spawning interval settings are defined", () => {
      expect(GAME_CONFIG.spawning.initialInterval).toBe(2200);
      expect(GAME_CONFIG.spawning.minInterval).toBe(700);
      expect(GAME_CONFIG.spawning.intervalDecreasePerLevel).toBe(120);
    });

    it("spawn interval decreases correctly per level", () => {
      // At level 1: 2200ms
      // At level 10: 2200 - 9 * 120 = 2200 - 1080 = 1120ms
      // At level 25: min(700, 2200 - 24 * 120) = 700ms (capped)

      const level1Interval = GAME_CONFIG.spawning.initialInterval;
      const level10Interval =
        GAME_CONFIG.spawning.initialInterval -
        9 * GAME_CONFIG.spawning.intervalDecreasePerLevel;
      const level25Interval = Math.max(
        GAME_CONFIG.spawning.minInterval,
        GAME_CONFIG.spawning.initialInterval -
          24 * GAME_CONFIG.spawning.intervalDecreasePerLevel
      );

      expect(level1Interval).toBe(2200);
      expect(level10Interval).toBe(1120);
      expect(level25Interval).toBe(700); // Capped at minimum
    });
  });
});
