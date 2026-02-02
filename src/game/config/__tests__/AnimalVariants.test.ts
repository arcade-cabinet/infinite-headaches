/**
 * AnimalVariants Unit Tests
 *
 * Comprehensive tests for the variant rolling system, level gating,
 * weight distributions, and configuration validation.
 */
import { describe, it, expect } from "vitest";
import { rollVariant, VARIANT_CONFIGS } from "../AnimalVariants";
import type { VariantType, VariantConfig } from "../AnimalVariants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a deterministic RNG that always returns the given value [0,1). */
function fixedRng(value: number): () => number {
  return () => value;
}

/**
 * Collect variant distribution over many rolls at a given level.
 * Uses evenly-spaced rng values so the distribution exactly mirrors bucket sizes.
 */
function sampleDistribution(
  level: number,
  sampleCount: number,
): Record<VariantType, number> {
  const counts: Record<VariantType, number> = {
    normal: 0,
    rare: 0,
    golden: 0,
    shadow: 0,
  };
  for (let i = 0; i < sampleCount; i++) {
    const rngValue = i / sampleCount;
    counts[rollVariant(level, fixedRng(rngValue))]++;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// VARIANT_CONFIGS validation
// ---------------------------------------------------------------------------

describe("AnimalVariants", () => {
  describe("VARIANT_CONFIGS", () => {
    const allVariants = Object.entries(VARIANT_CONFIGS) as [
      Exclude<VariantType, "normal">,
      VariantConfig,
    ][];

    it("contains exactly the three special variant types", () => {
      const keys = Object.keys(VARIANT_CONFIGS).sort();
      expect(keys).toEqual(["golden", "rare", "shadow"]);
    });

    it("has correct minLevel values", () => {
      expect(VARIANT_CONFIGS.rare.minLevel).toBe(3);
      expect(VARIANT_CONFIGS.golden.minLevel).toBe(8);
      expect(VARIANT_CONFIGS.shadow.minLevel).toBe(15);
    });

    it("has expected spawn weights", () => {
      expect(VARIANT_CONFIGS.rare.spawnWeight).toBe(10);
      expect(VARIANT_CONFIGS.golden.spawnWeight).toBe(4);
      expect(VARIANT_CONFIGS.shadow.spawnWeight).toBe(1);
    });

    it("all variants have scoreMultiplier > 0", () => {
      for (const [variant, config] of allVariants) {
        expect(
          config.scoreMultiplier,
          `${variant} scoreMultiplier should be > 0`,
        ).toBeGreaterThan(0);
      }
    });

    it("all variants have scoreMultiplier > 1 (better than normal)", () => {
      for (const [variant, config] of allVariants) {
        expect(
          config.scoreMultiplier,
          `${variant} scoreMultiplier should exceed 1`,
        ).toBeGreaterThan(1);
      }
    });

    it("all variants have spawnWeight > 0", () => {
      for (const [variant, config] of allVariants) {
        expect(
          config.spawnWeight,
          `${variant} spawnWeight should be > 0`,
        ).toBeGreaterThan(0);
      }
    });

    it("all variants have minLevel >= 1", () => {
      for (const [variant, config] of allVariants) {
        expect(
          config.minLevel,
          `${variant} minLevel should be >= 1`,
        ).toBeGreaterThanOrEqual(1);
      }
    });

    it("all color overlay channels are in [0, 1]", () => {
      for (const [variant, config] of allVariants) {
        const { r, g, b } = config.colorOverlay;
        expect(r, `${variant} red channel`).toBeGreaterThanOrEqual(0);
        expect(r, `${variant} red channel`).toBeLessThanOrEqual(1);
        expect(g, `${variant} green channel`).toBeGreaterThanOrEqual(0);
        expect(g, `${variant} green channel`).toBeLessThanOrEqual(1);
        expect(b, `${variant} blue channel`).toBeGreaterThanOrEqual(0);
        expect(b, `${variant} blue channel`).toBeLessThanOrEqual(1);
      }
    });

    it("total variant spawn weights do not exceed 100", () => {
      const totalWeight = allVariants.reduce(
        (sum, [, c]) => sum + c.spawnWeight,
        0,
      );
      expect(totalWeight).toBeLessThan(100);
    });

    it("golden has the highest scoreMultiplier", () => {
      expect(VARIANT_CONFIGS.golden.scoreMultiplier).toBeGreaterThan(
        VARIANT_CONFIGS.rare.scoreMultiplier,
      );
      expect(VARIANT_CONFIGS.golden.scoreMultiplier).toBeGreaterThan(
        VARIANT_CONFIGS.shadow.scoreMultiplier,
      );
    });
  });

  // -------------------------------------------------------------------------
  // rollVariant: Level gating
  // -------------------------------------------------------------------------

  describe("rollVariant – level gating", () => {
    it("returns normal at level 1 regardless of rng value", () => {
      // At levels below any minLevel, no variants are eligible.
      expect(rollVariant(1, fixedRng(0))).toBe("normal");
      expect(rollVariant(1, fixedRng(0.5))).toBe("normal");
      expect(rollVariant(1, fixedRng(0.99))).toBe("normal");
      expect(rollVariant(1, fixedRng(0.999))).toBe("normal");
    });

    it("returns normal at level 2 regardless of rng value", () => {
      expect(rollVariant(2, fixedRng(0))).toBe("normal");
      expect(rollVariant(2, fixedRng(0.5))).toBe("normal");
      expect(rollVariant(2, fixedRng(0.99))).toBe("normal");
      expect(rollVariant(2, fixedRng(0.999))).toBe("normal");
    });

    it("at level 1-2 only normal is possible across full rng range", () => {
      const steps = 1000;
      for (let level = 1; level <= 2; level++) {
        for (let i = 0; i < steps; i++) {
          const result = rollVariant(level, fixedRng(i / steps));
          expect(result).toBe("normal");
        }
      }
    });

    it("rare becomes eligible at level 3 (minLevel boundary)", () => {
      // At level 3: only rare eligible, normalWeight=90, totalWeight=100
      // Need roll >= 90 to get rare, i.e. rng >= 0.90
      expect(rollVariant(3, fixedRng(0.91))).toBe("rare");
    });

    it("rare is NOT eligible at level 2", () => {
      // Even with maximum rng, no variants should appear
      expect(rollVariant(2, fixedRng(0.999))).toBe("normal");
    });

    it("golden becomes eligible at level 8 (minLevel boundary)", () => {
      // At level 8: rare (10) + golden (4) = 14 variant weight
      // normalWeight=86, totalWeight=100
      // rare bucket: [86, 96), golden bucket: [96, 100)
      // rng = 0.97 => roll = 97, falls in golden bucket
      expect(rollVariant(8, fixedRng(0.97))).toBe("golden");
    });

    it("golden is NOT eligible at level 7", () => {
      // At level 7: only rare eligible, normalWeight=90
      // rng = 0.97 => roll = 97, still in rare bucket [90, 100)
      expect(rollVariant(7, fixedRng(0.97))).toBe("rare");
    });

    it("shadow becomes eligible at level 15 (minLevel boundary)", () => {
      // At level 15: rare (10) + golden (4) + shadow (1) = 15
      // normalWeight=85, totalWeight=100
      // shadow bucket: [99, 100)
      // rng = 0.995 => roll = 99.5, falls in shadow bucket
      expect(rollVariant(15, fixedRng(0.995))).toBe("shadow");
    });

    it("shadow is NOT eligible at level 14", () => {
      // At level 14: rare (10) + golden (4) = 14
      // normalWeight=86, totalWeight=100
      // rng = 0.995 => roll = 99.5
      // rare: [86, 96), golden: [96, 100)
      // 99.5 falls in golden bucket
      expect(rollVariant(14, fixedRng(0.995))).toBe("golden");
    });
  });

  // -------------------------------------------------------------------------
  // rollVariant: Weight distribution correctness
  // -------------------------------------------------------------------------

  describe("rollVariant – weight distribution", () => {
    it("at level 3: weights are 90 normal / 10 rare (sum = 100)", () => {
      // Only rare eligible at level 3
      const eligibleWeight = VARIANT_CONFIGS.rare.spawnWeight; // 10
      const normalWeight = 100 - eligibleWeight; // 90
      expect(normalWeight + eligibleWeight).toBe(100);
    });

    it("at level 8: weights are 86 normal / 10 rare / 4 golden (sum = 100)", () => {
      const eligibleWeight =
        VARIANT_CONFIGS.rare.spawnWeight + VARIANT_CONFIGS.golden.spawnWeight;
      const normalWeight = 100 - eligibleWeight; // 86
      expect(normalWeight + eligibleWeight).toBe(100);
      expect(normalWeight).toBe(86);
    });

    it("at level 15: weights are 85 normal / 10 rare / 4 golden / 1 shadow (sum = 100)", () => {
      const eligibleWeight =
        VARIANT_CONFIGS.rare.spawnWeight +
        VARIANT_CONFIGS.golden.spawnWeight +
        VARIANT_CONFIGS.shadow.spawnWeight;
      const normalWeight = 100 - eligibleWeight; // 85
      expect(normalWeight + eligibleWeight).toBe(100);
      expect(normalWeight).toBe(85);
    });

    it("distribution at level 3 matches expected proportions", () => {
      const dist = sampleDistribution(3, 10000);
      // Expected: ~90% normal, ~10% rare, 0% golden, 0% shadow
      expect(dist.normal).toBeGreaterThan(8500);
      expect(dist.rare).toBeGreaterThan(900);
      expect(dist.golden).toBe(0);
      expect(dist.shadow).toBe(0);
      // Exact ratio check: rare/normal should be close to 10/90
      const rareRatio = dist.rare / (dist.rare + dist.normal);
      expect(rareRatio).toBeCloseTo(0.1, 1);
    });

    it("distribution at level 8 matches expected proportions", () => {
      const dist = sampleDistribution(8, 10000);
      // Expected: ~86% normal, ~10% rare, ~4% golden, 0% shadow
      expect(dist.golden).toBeGreaterThan(300);
      expect(dist.shadow).toBe(0);
      const goldenRatio = dist.golden / 10000;
      expect(goldenRatio).toBeCloseTo(0.04, 1);
    });

    it("distribution at level 15 matches expected proportions", () => {
      const dist = sampleDistribution(15, 10000);
      // Expected: ~85% normal, ~10% rare, ~4% golden, ~1% shadow
      expect(dist.shadow).toBeGreaterThan(50);
      const shadowRatio = dist.shadow / 10000;
      expect(shadowRatio).toBeCloseTo(0.01, 1);
    });

    it("normal is always the most common variant at every level", () => {
      for (const level of [1, 2, 3, 5, 8, 10, 15, 20, 50, 100]) {
        const dist = sampleDistribution(level, 1000);
        const maxNonNormal = Math.max(dist.rare, dist.golden, dist.shadow);
        expect(
          dist.normal,
          `normal should dominate at level ${level}`,
        ).toBeGreaterThan(maxNonNormal);
      }
    });
  });

  // -------------------------------------------------------------------------
  // rollVariant: Boundary and edge-case behavior
  // -------------------------------------------------------------------------

  describe("rollVariant – boundary and edge cases", () => {
    it("rng returning 0 always yields normal at any level", () => {
      // roll = 0 * totalWeight = 0, always less than normalWeight (>= 85)
      for (const level of [1, 2, 3, 8, 15, 50, 100]) {
        expect(rollVariant(level, fixedRng(0))).toBe("normal");
      }
    });

    it("rng just below the normal/rare boundary yields normal", () => {
      // At level 3: normalWeight=90, totalWeight=100
      // Boundary: rng = 90/100 = 0.90
      // rng slightly less than 0.90 => roll < 90 => normal
      expect(rollVariant(3, fixedRng(0.8999))).toBe("normal");
    });

    it("rng at exactly the normal/rare boundary yields rare", () => {
      // At level 3: normalWeight=90, totalWeight=100
      // rng = 0.90 => roll = 90.0, which is NOT < 90 (normalWeight)
      // accumulated starts at 90, add rare(10) => 100, roll < 100 => rare
      expect(rollVariant(3, fixedRng(0.9))).toBe("rare");
    });

    it("rng just below the rare/golden boundary yields rare at level 8", () => {
      // At level 8: normalWeight=86, totalWeight=100
      // rare bucket: [86, 96), golden bucket: [96, 100)
      // rng = 0.959 => roll = 95.9, 95.9 < 96 => rare
      expect(rollVariant(8, fixedRng(0.959))).toBe("rare");
    });

    it("rng at the rare/golden boundary yields golden at level 8", () => {
      // rng = 0.96 => roll = 96.0
      // accumulated after rare = 86+10 = 96, roll < 96 is false
      // accumulated after golden = 100, roll < 100 => golden
      expect(rollVariant(8, fixedRng(0.96))).toBe("golden");
    });

    it("rng at golden/shadow boundary yields shadow at level 15", () => {
      // At level 15: normalWeight=85, totalWeight=100
      // rare: [85, 95), golden: [95, 99), shadow: [99, 100)
      // rng = 0.99 => roll = 99.0
      // accumulated after rare = 95 (99 >= 95), after golden = 99 (99 >= 99)
      // after shadow = 100 (99 < 100) => shadow
      expect(rollVariant(15, fixedRng(0.99))).toBe("shadow");
    });

    it("rng approaching 1.0 returns a valid variant or normal", () => {
      // rng = 0.9999 at level 15 => roll = 99.99 => shadow bucket [99, 100)
      const result = rollVariant(15, fixedRng(0.9999));
      expect(result).toBe("shadow");
    });

    it("returns normal when roll lands in normal bucket at high levels", () => {
      // At level 15: normalWeight=85, totalWeight=100
      // rng = 0.5 => roll = 50, which is < 85 => normal
      expect(rollVariant(15, fixedRng(0.5))).toBe("normal");
    });

    it("handles very high levels correctly (weights are static)", () => {
      // At level 1000, the same three variants are eligible
      // Weights should be identical to level 15
      const dist = sampleDistribution(1000, 10000);
      const dist15 = sampleDistribution(15, 10000);
      // Distributions should be identical since eligible variants are the same
      expect(dist.normal).toBe(dist15.normal);
      expect(dist.rare).toBe(dist15.rare);
      expect(dist.golden).toBe(dist15.golden);
      expect(dist.shadow).toBe(dist15.shadow);
    });

    it("rng is called exactly once per rollVariant call", () => {
      let callCount = 0;
      const countingRng = () => {
        callCount++;
        return 0.5;
      };
      rollVariant(15, countingRng);
      expect(callCount).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // rollVariant: Specific variant bucket targeting
  // -------------------------------------------------------------------------

  describe("rollVariant – bucket targeting at level 15", () => {
    // At level 15 all variants are eligible:
    //   normalWeight = 85, totalWeight = 100
    //   Buckets: normal [0, 85), rare [85, 95), golden [95, 99), shadow [99, 100)

    it("returns normal for rng in [0, 0.85)", () => {
      for (const rng of [0, 0.1, 0.42, 0.84, 0.849]) {
        expect(
          rollVariant(15, fixedRng(rng)),
          `rng=${rng} should yield normal`,
        ).toBe("normal");
      }
    });

    it("returns rare for rng in [0.85, 0.95)", () => {
      for (const rng of [0.85, 0.87, 0.90, 0.94, 0.949]) {
        expect(
          rollVariant(15, fixedRng(rng)),
          `rng=${rng} should yield rare`,
        ).toBe("rare");
      }
    });

    it("returns golden for rng in [0.95, 0.99)", () => {
      for (const rng of [0.95, 0.96, 0.97, 0.98, 0.989]) {
        expect(
          rollVariant(15, fixedRng(rng)),
          `rng=${rng} should yield golden`,
        ).toBe("golden");
      }
    });

    it("returns shadow for rng in [0.99, 1.0)", () => {
      for (const rng of [0.99, 0.993, 0.997, 0.999, 0.9999]) {
        expect(
          rollVariant(15, fixedRng(rng)),
          `rng=${rng} should yield shadow`,
        ).toBe("shadow");
      }
    });
  });

  // -------------------------------------------------------------------------
  // rollVariant: Return type correctness
  // -------------------------------------------------------------------------

  describe("rollVariant – return type", () => {
    it("always returns a valid VariantType", () => {
      const validTypes: VariantType[] = ["normal", "rare", "golden", "shadow"];
      for (const level of [1, 3, 8, 15, 50]) {
        for (let i = 0; i < 100; i++) {
          const result = rollVariant(level, fixedRng(i / 100));
          expect(validTypes).toContain(result);
        }
      }
    });
  });
});
