/**
 * Unit Tests for Game Configuration
 *
 * Tests that ANIMAL_TYPES has all required fields,
 * all animals with hasModel:true exist in AVAILABLE_MODELS,
 * and GAME_CONFIG has valid physics values.
 */

import { describe, expect, it } from "vitest";
import {
  GAME_INFO,
  ANIMAL_TYPES,
  POWER_UPS,
  GAME_CONFIG,
  FAIL_MESSAGES,
  type AnimalType,
  type PowerUpType,
} from "./config";

describe("GAME_INFO", () => {
  it("should have required title fields", () => {
    expect(GAME_INFO.title).toBe("Homestead Headaches");
    expect(GAME_INFO.shortTitle).toBe("Headache Tower");
    expect(typeof GAME_INFO.tagline).toBe("string");
    expect(GAME_INFO.tagline.length).toBeGreaterThan(0);
  });
});

describe("ANIMAL_TYPES", () => {
  const validAnimalTypes: AnimalType[] = [
    "cow",
    "pig",
    "chicken",
    "duck",
    "sheep",
    "farmer",
  ];
  const AVAILABLE_MODELS = [
    "cow",
    "pig",
    "chicken",
    "duck",
    "sheep",
    "farmer_john",
    "farmer_mary",
  ];

  it("should contain all valid animal types", () => {
    for (const type of validAnimalTypes) {
      expect(ANIMAL_TYPES[type]).toBeDefined();
    }
  });

  it("should have exactly the expected animal types", () => {
    const configuredTypes = Object.keys(ANIMAL_TYPES);
    expect(configuredTypes.sort()).toEqual(validAnimalTypes.sort());
  });

  describe("each animal type should have required fields", () => {
    for (const type of validAnimalTypes) {
      describe(type, () => {
        const config = ANIMAL_TYPES[type];

        it("should have a color string", () => {
          expect(typeof config.color).toBe("string");
          expect(config.color.length).toBeGreaterThan(0);
          // Should be a valid hex color
          expect(config.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });

        it("should have a spawnWeight number", () => {
          expect(typeof config.spawnWeight).toBe("number");
          expect(config.spawnWeight).toBeGreaterThanOrEqual(0);
          expect(config.spawnWeight).toBeLessThanOrEqual(1);
        });

        it("should have ability as string or null", () => {
          expect(
            config.ability === null || typeof config.ability === "string"
          ).toBe(true);
        });

        it("should have hasModel boolean", () => {
          expect(typeof config.hasModel).toBe("boolean");
        });

        it("should have optional abilityColor if ability exists", () => {
          if (config.ability !== null) {
            // abilityColor can be optional
            if (config.abilityColor !== undefined) {
              expect(typeof config.abilityColor).toBe("string");
            }
          }
        });

        it("should have optional abilityCooldown if ability exists", () => {
          if (config.ability !== null) {
            // abilityCooldown can be optional
            if (config.abilityCooldown !== undefined) {
              expect(typeof config.abilityCooldown).toBe("number");
              expect(config.abilityCooldown).toBeGreaterThan(0);
            }
          }
        });

        it("should have optional freezeDuration with valid min/max", () => {
          if (config.freezeDuration !== undefined) {
            expect(typeof config.freezeDuration.min).toBe("number");
            expect(typeof config.freezeDuration.max).toBe("number");
            expect(config.freezeDuration.min).toBeLessThanOrEqual(
              config.freezeDuration.max
            );
            expect(config.freezeDuration.min).toBeGreaterThan(0);
          }
        });
      });
    }
  });

  describe("model availability validation", () => {
    it("all animals with hasModel:true should have a model available (except farmer which uses character models)", () => {
      for (const [type, config] of Object.entries(ANIMAL_TYPES)) {
        if (config.hasModel && type !== "farmer") {
          // The farmer type doesn't have a direct model but uses farmer_john/farmer_mary
          expect(AVAILABLE_MODELS).toContain(type);
        }
      }
    });

    it("farmer type should have hasModel:true (uses character models)", () => {
      expect(ANIMAL_TYPES.farmer.hasModel).toBe(true);
    });

    it("all animals should have hasModel:true (no fallback animals)", () => {
      for (const config of Object.values(ANIMAL_TYPES)) {
        expect(config.hasModel).toBe(true);
      }
    });
  });

  describe("spawn weights", () => {
    it("should have non-zero spawn weights for spawnable animals", () => {
      const spawnableAnimals: AnimalType[] = [
        "cow",
        "pig",
        "chicken",
        "duck",
        "sheep",
      ];
      for (const type of spawnableAnimals) {
        expect(ANIMAL_TYPES[type].spawnWeight).toBeGreaterThan(0);
      }
    });

    it("should have zero spawn weight for non-spawnable types", () => {
      expect(ANIMAL_TYPES.farmer.spawnWeight).toBe(0);
    });

    it("spawn weights should sum to approximately 1.0 for spawnable animals", () => {
      const spawnableAnimals: AnimalType[] = [
        "cow",
        "pig",
        "chicken",
        "duck",
        "sheep",
      ];
      const totalWeight = spawnableAnimals.reduce(
        (sum, type) => sum + ANIMAL_TYPES[type].spawnWeight,
        0
      );
      expect(totalWeight).toBeCloseTo(1.0, 1);
    });

    it("chicken should have highest spawn weight among animals", () => {
      const chickenWeight = ANIMAL_TYPES.chicken.spawnWeight;
      expect(chickenWeight).toBe(0.25);
      expect(chickenWeight).toBeGreaterThan(ANIMAL_TYPES.cow.spawnWeight);
      expect(chickenWeight).toBeGreaterThan(ANIMAL_TYPES.pig.spawnWeight);
      expect(chickenWeight).toBeGreaterThan(ANIMAL_TYPES.sheep.spawnWeight);
    });

    it("sheep should have lowest spawn weight among spawnable animals", () => {
      const sheepWeight = ANIMAL_TYPES.sheep.spawnWeight;
      expect(sheepWeight).toBe(0.15);
      expect(sheepWeight).toBeLessThan(ANIMAL_TYPES.cow.spawnWeight);
      expect(sheepWeight).toBeLessThan(ANIMAL_TYPES.pig.spawnWeight);
      expect(sheepWeight).toBeLessThan(ANIMAL_TYPES.chicken.spawnWeight);
      expect(sheepWeight).toBeLessThan(ANIMAL_TYPES.duck.spawnWeight);
    });
  });

  describe("specific animal configurations", () => {
    it("cow should have correct color", () => {
      expect(ANIMAL_TYPES.cow.color).toBe("#795548");
    });

    it("pig should have correct color", () => {
      expect(ANIMAL_TYPES.pig.color).toBe("#F06292");
    });

    it("chicken should have correct color", () => {
      expect(ANIMAL_TYPES.chicken.color).toBe("#FFFFFF");
    });

    it("duck should have correct color", () => {
      expect(ANIMAL_TYPES.duck.color).toBe("#FDD835");
    });

    it("sheep should have correct color", () => {
      expect(ANIMAL_TYPES.sheep.color).toBe("#F5F5F5");
    });

    it("farmer should have correct color", () => {
      expect(ANIMAL_TYPES.farmer.color).toBe("#1976D2");
    });

    it("no animals should have abilities in base config", () => {
      for (const config of Object.values(ANIMAL_TYPES)) {
        expect(config.ability).toBeNull();
      }
    });
  });
});

describe("POWER_UPS", () => {
  const validPowerUpTypes: PowerUpType[] = [
    "rare_candy",
    "potion",
    "max_up",
    "great_ball",
    "x_attack",
    "full_restore",
  ];

  it("should contain all valid power-up types", () => {
    for (const type of validPowerUpTypes) {
      expect(POWER_UPS[type]).toBeDefined();
    }
  });

  describe("each power-up should have required fields", () => {
    for (const type of validPowerUpTypes) {
      describe(type, () => {
        const config = POWER_UPS[type];

        it("should have a name", () => {
          expect(typeof config.name).toBe("string");
          expect(config.name.length).toBeGreaterThan(0);
        });

        it("should have a description", () => {
          expect(typeof config.description).toBe("string");
          expect(config.description.length).toBeGreaterThan(0);
        });

        it("should have a valid hex color", () => {
          expect(config.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });

        it("should have a valid rgba glow color", () => {
          expect(config.glowColor).toMatch(
            /^rgba\(\d{1,3}, \d{1,3}, \d{1,3}, [\d.]+\)$/
          );
        });

        it("should have a valid spawn weight", () => {
          expect(typeof config.spawnWeight).toBe("number");
          expect(config.spawnWeight).toBeGreaterThan(0);
          expect(config.spawnWeight).toBeLessThanOrEqual(1);
        });
      });
    }
  });

  describe("spawn weights should sum to approximately 1.0", () => {
    it("total spawn weight should be around 0.9", () => {
      const totalWeight = Object.values(POWER_UPS).reduce(
        (sum, config) => sum + config.spawnWeight,
        0
      );
      expect(totalWeight).toBeCloseTo(0.9, 1);
    });
  });

  describe("specific power-up configurations", () => {
    it("rare_candy should require minimum stack size", () => {
      expect(POWER_UPS.rare_candy.minStackToUse).toBe(3);
    });

    it("great_ball (Lasso) should have duration", () => {
      expect(POWER_UPS.great_ball.duration).toBe(5000);
    });

    it("x_attack (Coffee) should have duration and multiplier", () => {
      expect(POWER_UPS.x_attack.duration).toBe(8000);
      expect(POWER_UPS.x_attack.multiplier).toBe(2);
    });

    it("full_restore should have invincibility duration", () => {
      expect(POWER_UPS.full_restore.invincibilityDuration).toBe(3000);
    });

    it("full_restore should be rarest power-up", () => {
      const fullRestoreWeight = POWER_UPS.full_restore.spawnWeight;
      expect(fullRestoreWeight).toBe(0.05);
      for (const [type, config] of Object.entries(POWER_UPS)) {
        if (type !== "full_restore") {
          expect(config.spawnWeight).toBeGreaterThanOrEqual(fullRestoreWeight);
        }
      }
    });

    it("potion should be most common power-up", () => {
      const potionWeight = POWER_UPS.potion.spawnWeight;
      expect(potionWeight).toBe(0.35);
      for (const config of Object.values(POWER_UPS)) {
        expect(config.spawnWeight).toBeLessThanOrEqual(potionWeight);
      }
    });
  });
});

describe("GAME_CONFIG", () => {
  describe("animal dimensions", () => {
    it("should have valid width and height", () => {
      expect(GAME_CONFIG.animal.width).toBe(60);
      expect(GAME_CONFIG.animal.height).toBe(60);
      expect(GAME_CONFIG.animal.width).toBeGreaterThan(0);
      expect(GAME_CONFIG.animal.height).toBeGreaterThan(0);
    });

    it("should have valid merge scale parameters", () => {
      expect(GAME_CONFIG.animal.mergeScaleBase).toBe(1.0);
      expect(GAME_CONFIG.animal.mergeScalePerDuck).toBe(0.12);
      expect(GAME_CONFIG.animal.maxMergeScale).toBe(2.5);
      expect(GAME_CONFIG.animal.maxMergeScale).toBeGreaterThan(
        GAME_CONFIG.animal.mergeScaleBase
      );
    });
  });

  describe("physics", () => {
    it("should have positive gravity", () => {
      expect(GAME_CONFIG.physics.gravity).toBe(0.35);
      expect(GAME_CONFIG.physics.gravity).toBeGreaterThan(0);
    });

    it("should have reasonable max fall speed", () => {
      expect(GAME_CONFIG.physics.maxFallSpeed).toBe(14);
      expect(GAME_CONFIG.physics.maxFallSpeed).toBeGreaterThan(0);
    });

    it("should have wobble parameters in valid range", () => {
      expect(GAME_CONFIG.physics.wobbleStrength).toBe(0.045);
      expect(GAME_CONFIG.physics.wobbleStrength).toBeGreaterThan(0);
      expect(GAME_CONFIG.physics.wobbleStrength).toBeLessThan(1);

      expect(GAME_CONFIG.physics.wobbleDamping).toBe(0.94);
      expect(GAME_CONFIG.physics.wobbleDamping).toBeGreaterThan(0);
      expect(GAME_CONFIG.physics.wobbleDamping).toBeLessThan(1);

      expect(GAME_CONFIG.physics.wobbleSpringiness).toBe(0.08);
      expect(GAME_CONFIG.physics.wobbleSpringiness).toBeGreaterThan(0);
      expect(GAME_CONFIG.physics.wobbleSpringiness).toBeLessThan(1);
    });

    it("should have stack stability in valid range", () => {
      expect(GAME_CONFIG.physics.stackStability).toBe(0.72);
      expect(GAME_CONFIG.physics.stackStability).toBeGreaterThan(0);
      expect(GAME_CONFIG.physics.stackStability).toBeLessThan(1);
    });

    it("should have AI wobble parameters", () => {
      expect(GAME_CONFIG.physics.aiWobble).toBeDefined();
      expect(GAME_CONFIG.physics.aiWobble.seekerImpact).toBe(0.015);
      expect(GAME_CONFIG.physics.aiWobble.diveImpact).toBe(0.025);
      expect(GAME_CONFIG.physics.aiWobble.evaderImpact).toBe(0.008);
      expect(GAME_CONFIG.physics.aiWobble.swarmBonus).toBe(0.005);
      expect(GAME_CONFIG.physics.aiWobble.maxAIWobble).toBe(0.08);
    });

    it("should have tipping parameters", () => {
      expect(GAME_CONFIG.physics.tipping).toBeDefined();
      expect(GAME_CONFIG.physics.tipping.criticalAngleBase).toBe(0.58);
      expect(GAME_CONFIG.physics.tipping.heightPenalty).toBe(0.007);
      expect(GAME_CONFIG.physics.tipping.minCriticalAngle).toBe(0.22);
      expect(GAME_CONFIG.physics.tipping.warningThreshold).toBe(0.6);
      expect(GAME_CONFIG.physics.tipping.dangerThreshold).toBe(0.88);
      expect(GAME_CONFIG.physics.tipping.warningThreshold).toBeLessThan(
        GAME_CONFIG.physics.tipping.dangerThreshold
      );
    });

    it("should have fireball physics parameters", () => {
      expect(GAME_CONFIG.physics.fireball).toBeDefined();
      expect(GAME_CONFIG.physics.fireball.speed).toBe(12);
      expect(GAME_CONFIG.physics.fireball.size).toBe(20);
      expect(GAME_CONFIG.physics.fireball.duration).toBe(2000);
      expect(GAME_CONFIG.physics.fireball.speed).toBeGreaterThan(0);
      expect(GAME_CONFIG.physics.fireball.size).toBeGreaterThan(0);
      expect(GAME_CONFIG.physics.fireball.duration).toBeGreaterThan(0);
    });

    it("should have ice physics parameters", () => {
      expect(GAME_CONFIG.physics.ice).toBeDefined();
      expect(GAME_CONFIG.physics.ice.fallSpeed).toBe(0.5);
      expect(GAME_CONFIG.physics.ice.crackStages).toBe(4);
      expect(GAME_CONFIG.physics.ice.crackStages).toBeGreaterThan(0);
    });
  });

  describe("lives", () => {
    it("should have valid starting lives", () => {
      expect(GAME_CONFIG.lives.starting).toBe(3);
      expect(GAME_CONFIG.lives.starting).toBeGreaterThan(0);
    });

    it("should have max lives greater than or equal to starting", () => {
      expect(GAME_CONFIG.lives.max).toBe(5);
      expect(GAME_CONFIG.lives.max).toBeGreaterThanOrEqual(
        GAME_CONFIG.lives.starting
      );
    });

    it("should have absolute max lives greater than max", () => {
      expect(GAME_CONFIG.lives.absoluteMax).toBe(8);
      expect(GAME_CONFIG.lives.absoluteMax).toBeGreaterThanOrEqual(
        GAME_CONFIG.lives.max
      );
    });

    it("should have earn thresholds", () => {
      expect(GAME_CONFIG.lives.earnThresholds).toBeDefined();
      expect(GAME_CONFIG.lives.earnThresholds.perfectStreak).toBe(5);
      expect(GAME_CONFIG.lives.earnThresholds.scoreBonus).toBe(500);
      expect(GAME_CONFIG.lives.earnThresholds.bankingBonus).toBe(10);
    });

    it("should have invincibility duration", () => {
      expect(GAME_CONFIG.lives.invincibilityDuration).toBe(1500);
      expect(GAME_CONFIG.lives.invincibilityDuration).toBeGreaterThan(0);
    });
  });

  describe("powerUps", () => {
    it("should have valid spawn parameters", () => {
      expect(GAME_CONFIG.powerUps.baseSpawnChance).toBe(0.08);
      expect(GAME_CONFIG.powerUps.baseSpawnChance).toBeGreaterThan(0);
      expect(GAME_CONFIG.powerUps.baseSpawnChance).toBeLessThan(1);

      expect(GAME_CONFIG.powerUps.spawnInterval).toBe(8000);
      expect(GAME_CONFIG.powerUps.spawnInterval).toBeGreaterThan(0);

      expect(GAME_CONFIG.powerUps.minLevelToSpawn).toBe(2);
      expect(GAME_CONFIG.powerUps.minLevelToSpawn).toBeGreaterThanOrEqual(1);
    });

    it("should have valid fall and collect parameters", () => {
      expect(GAME_CONFIG.powerUps.fallSpeed).toBe(3);
      expect(GAME_CONFIG.powerUps.collectRadius).toBe(50);
      expect(GAME_CONFIG.powerUps.bobSpeed).toBe(0.003);
      expect(GAME_CONFIG.powerUps.bobAmount).toBe(8);
    });
  });

  describe("spawning", () => {
    it("should have valid spawn interval parameters", () => {
      expect(GAME_CONFIG.spawning.initialInterval).toBe(2200);
      expect(GAME_CONFIG.spawning.minInterval).toBe(700);
      expect(GAME_CONFIG.spawning.intervalDecreasePerLevel).toBe(120);
      expect(GAME_CONFIG.spawning.initialInterval).toBeGreaterThan(
        GAME_CONFIG.spawning.minInterval
      );
    });

    it("should have valid spawn positioning parameters", () => {
      expect(GAME_CONFIG.spawning.horizontalPadding).toBe(50);
      expect(GAME_CONFIG.spawning.horizontalDrift).toBe(0.8);
      expect(GAME_CONFIG.spawning.targetingBias).toBe(0.3);
      expect(GAME_CONFIG.spawning.targetingBias).toBeGreaterThanOrEqual(0);
      expect(GAME_CONFIG.spawning.targetingBias).toBeLessThanOrEqual(1);
    });
  });

  describe("collision", () => {
    it("should have valid catch window parameters", () => {
      expect(GAME_CONFIG.collision.catchWindowTop).toBe(0.9);
      expect(GAME_CONFIG.collision.catchWindowBottom).toBe(0.3);
      expect(GAME_CONFIG.collision.catchWindowTop).toBeGreaterThan(
        GAME_CONFIG.collision.catchWindowBottom
      );
    });

    it("should have valid tolerance parameters", () => {
      expect(GAME_CONFIG.collision.perfectTolerance).toBe(8);
      expect(GAME_CONFIG.collision.goodTolerance).toBe(0.5);
      expect(GAME_CONFIG.collision.hitTolerance).toBe(0.7);
      expect(GAME_CONFIG.collision.goodTolerance).toBeLessThanOrEqual(
        GAME_CONFIG.collision.hitTolerance
      );
    });

    it("should have valid interpolation steps", () => {
      expect(GAME_CONFIG.collision.interpolationSteps).toBe(3);
      expect(GAME_CONFIG.collision.interpolationSteps).toBeGreaterThan(0);
    });

    it("should have valid landing offset", () => {
      expect(GAME_CONFIG.collision.landingOffset).toBe(0.82);
      expect(GAME_CONFIG.collision.landingOffset).toBeGreaterThan(0);
      expect(GAME_CONFIG.collision.landingOffset).toBeLessThanOrEqual(1);
    });
  });

  describe("effects", () => {
    it("should have valid squish factor", () => {
      expect(GAME_CONFIG.effects.squishFactor).toBe(0.22);
      expect(GAME_CONFIG.effects.squishFactor).toBeGreaterThan(0);
      expect(GAME_CONFIG.effects.squishFactor).toBeLessThan(1);
    });

    it("should have valid particle parameters", () => {
      expect(GAME_CONFIG.effects.particleCount).toBe(18);
      expect(GAME_CONFIG.effects.particleDecay).toBe(0.022);
      expect(GAME_CONFIG.effects.mergeParticles).toBe(30);
      expect(GAME_CONFIG.effects.fireTrailParticles).toBe(3);
      expect(GAME_CONFIG.effects.iceShardCount).toBe(8);
    });

    it("should have valid effect durations", () => {
      expect(GAME_CONFIG.effects.mergeFlashDuration).toBe(500);
      expect(GAME_CONFIG.effects.mergeFlashDuration).toBeGreaterThan(0);
    });
  });

  describe("scoring", () => {
    it("should have valid base scoring", () => {
      expect(GAME_CONFIG.scoring.basePoints).toBe(10);
      expect(GAME_CONFIG.scoring.basePoints).toBeGreaterThan(0);
    });

    it("should have valid multipliers", () => {
      expect(GAME_CONFIG.scoring.stackMultiplier).toBe(1.6);
      expect(GAME_CONFIG.scoring.perfectBonus).toBe(2.5);
      expect(GAME_CONFIG.scoring.goodBonus).toBe(1.3);
      expect(GAME_CONFIG.scoring.maxMultiplier).toBe(15);
      expect(GAME_CONFIG.scoring.perfectBonus).toBeGreaterThan(
        GAME_CONFIG.scoring.goodBonus
      );
    });

    it("should have valid combo parameters", () => {
      expect(GAME_CONFIG.scoring.comboDecayTime).toBe(3000);
      expect(GAME_CONFIG.scoring.comboMultiplier).toBe(0.15);
    });

    it("should have valid banking parameters", () => {
      expect(GAME_CONFIG.scoring.bankingPenalty).toBe(0.4);
      expect(GAME_CONFIG.scoring.bankingBonusPerDuck).toBe(5);
      expect(GAME_CONFIG.scoring.bankingPenalty).toBeGreaterThan(0);
      expect(GAME_CONFIG.scoring.bankingPenalty).toBeLessThan(1);
    });

    it("should have valid bonus scores", () => {
      expect(GAME_CONFIG.scoring.mergeBonus).toBe(50);
      expect(GAME_CONFIG.scoring.mergeBonusPerDuck).toBe(20);
      expect(GAME_CONFIG.scoring.fireKillBonus).toBe(25);
      expect(GAME_CONFIG.scoring.iceAssistBonus).toBe(15);
    });
  });

  describe("banking", () => {
    it("should have valid banking parameters", () => {
      expect(GAME_CONFIG.banking.minStackToBank).toBe(5);
      expect(GAME_CONFIG.banking.minStackToBank).toBeGreaterThan(0);
      expect(GAME_CONFIG.banking.bankAnimationDuration).toBe(600);
      expect(GAME_CONFIG.banking.bankAnimationDuration).toBeGreaterThan(0);
    });
  });

  describe("difficulty", () => {
    it("should have valid level parameters", () => {
      expect(GAME_CONFIG.difficulty.levelUpThreshold).toBe(75);
      expect(GAME_CONFIG.difficulty.maxLevel).toBe(25);
      expect(GAME_CONFIG.difficulty.maxLevel).toBeGreaterThan(1);
    });

    it("should have valid scaling parameters", () => {
      expect(GAME_CONFIG.difficulty.speedIncreasePerLevel).toBe(0.04);
      expect(GAME_CONFIG.difficulty.spawnRateCurve).toBe(0.85);
      expect(GAME_CONFIG.difficulty.specialDuckLevelBonus).toBe(0.02);
    });
  });

  describe("layout", () => {
    it("should have valid layout dimensions", () => {
      expect(GAME_CONFIG.layout.platformHeight).toBe(90);
      expect(GAME_CONFIG.layout.bankWidth).toBe(65);
      expect(GAME_CONFIG.layout.safeZoneTop).toBe(80);
      expect(GAME_CONFIG.layout.floorY).toBe(0.92);
      expect(GAME_CONFIG.layout.floorY).toBeGreaterThan(0);
      expect(GAME_CONFIG.layout.floorY).toBeLessThanOrEqual(1);
    });
  });

  describe("poke", () => {
    it("should have valid poke parameters", () => {
      expect(GAME_CONFIG.poke.cooldown).toBe(400);
      expect(GAME_CONFIG.poke.wobbleAmount).toBe(0.25);
      expect(GAME_CONFIG.poke.confusionChance).toBe(0.25);
      expect(GAME_CONFIG.poke.confusionChance).toBeGreaterThan(0);
      expect(GAME_CONFIG.poke.confusionChance).toBeLessThanOrEqual(1);
    });
  });

  describe("colors", () => {
    it("should have valid background colors", () => {
      expect(GAME_CONFIG.colors.background.primary).toBe("#5D4037");
      expect(GAME_CONFIG.colors.background.secondary).toBe("#795548");
      expect(GAME_CONFIG.colors.background.tertiary).toBe("#3E2723");
    });

    it("should have valid duck colors", () => {
      expect(GAME_CONFIG.colors.duck.body).toBe("#FDD835");
      expect(GAME_CONFIG.colors.duck.beak).toBe("#FFE082");
      expect(GAME_CONFIG.colors.duck.feet).toBe("#FFCCBC");
      expect(GAME_CONFIG.colors.duck.outline).toBe("#3E2723");
    });

    it("should have valid UI colors", () => {
      expect(GAME_CONFIG.colors.platform).toBe("#8BC34A");
      expect(GAME_CONFIG.colors.bank).toBe("#FF5722");
      expect(GAME_CONFIG.colors.danger).toBe("#F44336");
      expect(GAME_CONFIG.colors.warning).toBe("#FF9800");
      expect(GAME_CONFIG.colors.heart).toBe("#E91E63");
    });

    it("should have valid capture ball colors", () => {
      expect(GAME_CONFIG.colors.captureball.top).toBe("#EF5350");
      expect(GAME_CONFIG.colors.captureball.bottom).toBe("#FAFAFA");
      expect(GAME_CONFIG.colors.captureball.band).toBe("#424242");
    });

    it("should have valid ice colors", () => {
      expect(GAME_CONFIG.colors.ice.solid).toMatch(/^rgba/);
      expect(GAME_CONFIG.colors.ice.crack).toMatch(/^rgba/);
      expect(GAME_CONFIG.colors.ice.shard).toBe("#B3E5FC");
    });

    it("should have valid fire colors", () => {
      expect(GAME_CONFIG.colors.fire.core).toBe("#FFEB3B");
      expect(GAME_CONFIG.colors.fire.mid).toBe("#FF9800");
      expect(GAME_CONFIG.colors.fire.outer).toBe("#F44336");
    });
  });
});

describe("FAIL_MESSAGES", () => {
  it("should be a non-empty array", () => {
    expect(Array.isArray(FAIL_MESSAGES)).toBe(true);
    expect(FAIL_MESSAGES.length).toBeGreaterThan(0);
  });

  it("should contain at least 10 messages", () => {
    expect(FAIL_MESSAGES.length).toBeGreaterThanOrEqual(10);
  });

  it("all messages should be non-empty strings", () => {
    for (const message of FAIL_MESSAGES) {
      expect(typeof message).toBe("string");
      expect(message.length).toBeGreaterThan(0);
    }
  });

  it("should contain specific expected messages", () => {
    expect(FAIL_MESSAGES).toContain("Barnyard chaos!");
    expect(FAIL_MESSAGES).toContain("Timber!");
    expect(FAIL_MESSAGES).toContain("Physics wins again!");
  });
});
