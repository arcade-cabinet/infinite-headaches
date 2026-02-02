/**
 * AnimalVariants Unit Tests
 */
import { describe, it, expect } from "vitest";
import { rollVariant, VARIANT_CONFIGS } from "../AnimalVariants";
import type { VariantType } from "../AnimalVariants";

describe("AnimalVariants", () => {
  describe("VARIANT_CONFIGS", () => {
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

    it("has positive score multipliers", () => {
      expect(VARIANT_CONFIGS.rare.scoreMultiplier).toBeGreaterThan(1);
      expect(VARIANT_CONFIGS.golden.scoreMultiplier).toBeGreaterThan(1);
      expect(VARIANT_CONFIGS.shadow.scoreMultiplier).toBeGreaterThan(1);
    });
  });

  describe("rollVariant", () => {
    it("returns normal at level 1 (no variants eligible)", () => {
      const result = rollVariant(1, () => 0.5);
      expect(result).toBe("normal");
    });

    it("returns normal at level 2 (still no variants eligible)", () => {
      const result = rollVariant(2, () => 0.99);
      expect(result).toBe("normal");
    });

    it("at level 3, rare becomes eligible", () => {
      // At level 3, only rare is eligible (minLevel = 3).
      // totalVariantWeight = 10 (rare), normalWeight = 90, totalWeight = 100
      // With rng returning 0.95 => roll = 95, which is >= 90 (normalWeight)
      // So it should return "rare"
      const result = rollVariant(3, () => 0.95);
      expect(result).toBe("rare");
    });

    it("at level 8, golden becomes eligible", () => {
      // At level 8: rare (10) + golden (4) = 14 variant weight
      // normalWeight = 86, totalWeight = 100
      // rng = 0.95 => roll = 95
      // 95 >= 86 (not normal)
      // accumulated: 86 + 10 (rare) = 96 => 95 < 96 => "rare"
      // To get golden: need roll >= 96
      // rng = 0.97 => roll = 97, accumulated after rare = 96, after golden = 100
      // 97 >= 96 so not rare, 97 < 100 so golden
      const result = rollVariant(8, () => 0.97);
      expect(result).toBe("golden");
    });

    it("at level 15, shadow becomes eligible", () => {
      // At level 15: rare (10) + golden (4) + shadow (1) = 15 variant weight
      // normalWeight = 85, totalWeight = 100
      // To get shadow: need roll >= 85 + 10 + 4 = 99
      // rng = 0.995 => roll = 99.5
      // accumulated: 85 (normal), 95 (rare), 99 (golden), 100 (shadow)
      // 99.5 >= 99 so not golden, 99.5 < 100 so shadow
      const result = rollVariant(15, () => 0.995);
      expect(result).toBe("shadow");
    });

    it("with rng returning 0, always returns normal", () => {
      // roll = 0 * totalWeight = 0, which is < normalWeight (always >= 85)
      expect(rollVariant(1, () => 0)).toBe("normal");
      expect(rollVariant(3, () => 0)).toBe("normal");
      expect(rollVariant(8, () => 0)).toBe("normal");
      expect(rollVariant(15, () => 0)).toBe("normal");
      expect(rollVariant(50, () => 0)).toBe("normal");
    });

    it("with rng returning 0.99, returns a variant at high levels", () => {
      // At level 15: normalWeight=85, totalWeight=100, roll=99
      // 99 >= 85 (not normal), accumulated=95 (past rare), 99 (golden), 100 (shadow)
      // 99 >= 95 (not rare), 99 >= 99 (not golden?), actually: 99 < 99 is false,
      // so accumulated=99, roll=99, 99 < 99 is false. Next: accumulated=100, 99 < 100 => shadow
      const result = rollVariant(15, () => 0.99);
      expect(result).toBe("shadow");
    });

    it("returns normal when roll falls in the normal bucket at high levels", () => {
      // At level 15: normalWeight=85, totalWeight=100
      // rng = 0.5 => roll = 50, which is < 85 => normal
      const result = rollVariant(15, () => 0.5);
      expect(result).toBe("normal");
    });

    it("returns rare when roll falls in the rare bucket", () => {
      // At level 3: normalWeight=90, totalWeight=100
      // rng = 0.91 => roll = 91, 91 >= 90, accumulated = 90+10=100, 91 < 100 => rare
      const result = rollVariant(3, () => 0.91);
      expect(result).toBe("rare");
    });

    it("handles very high levels correctly", () => {
      // At level 100, variant weights are still the same (rare=10, golden=4, shadow=1)
      // normalWeight = 85, totalWeight = 100
      // The rng controls the outcome
      const results: VariantType[] = [];
      for (let i = 0; i < 100; i++) {
        let callCount = 0;
        const rng = () => {
          callCount++;
          return i / 100;
        };
        results.push(rollVariant(100, rng));
      }
      // Should have a mix of normal and variants
      expect(results.filter((r) => r === "normal").length).toBeGreaterThan(0);
      expect(results.filter((r) => r !== "normal").length).toBeGreaterThan(0);
    });
  });
});
