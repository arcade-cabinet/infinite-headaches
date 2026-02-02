import { describe, it, expect } from "vitest";
import {
  PLAYER_RAIL_CONFIG,
  TORNADO_RAIL_CONFIG,
  worldXToRailT,
  railTToWorldX,
  railTToWorldPos,
  clampToRail,
  createRail,
  getRailWidth,
  getRailY,
} from "./GameRails";

describe("GameRails", () => {
  // ---------------------------------------------------------------------------
  // Config constants
  // ---------------------------------------------------------------------------

  describe("Rail configs", () => {
    it("player rail spans -8 to +8 at Y=-2", () => {
      expect(PLAYER_RAIL_CONFIG.start.x).toBe(-8);
      expect(PLAYER_RAIL_CONFIG.end.x).toBe(8);
      expect(PLAYER_RAIL_CONFIG.start.y).toBe(-2);
      expect(PLAYER_RAIL_CONFIG.end.y).toBe(-2);
    });

    it("tornado rail spans -7.5 to +7.5 at Y=8.25", () => {
      expect(TORNADO_RAIL_CONFIG.start.x).toBe(-7.5);
      expect(TORNADO_RAIL_CONFIG.end.x).toBe(7.5);
      expect(TORNADO_RAIL_CONFIG.start.y).toBe(8.25);
      expect(TORNADO_RAIL_CONFIG.end.y).toBe(8.25);
    });

    it("both rails lie on Z=0 plane", () => {
      expect(PLAYER_RAIL_CONFIG.start.z).toBe(0);
      expect(PLAYER_RAIL_CONFIG.end.z).toBe(0);
      expect(TORNADO_RAIL_CONFIG.start.z).toBe(0);
      expect(TORNADO_RAIL_CONFIG.end.z).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // worldXToRailT / railTToWorldX round-trip
  // ---------------------------------------------------------------------------

  describe("worldXToRailT", () => {
    it("returns 0 at the left end of the player rail", () => {
      expect(worldXToRailT(-8, PLAYER_RAIL_CONFIG)).toBe(0);
    });

    it("returns 1 at the right end of the player rail", () => {
      expect(worldXToRailT(8, PLAYER_RAIL_CONFIG)).toBe(1);
    });

    it("returns 0.5 at the center of the player rail", () => {
      expect(worldXToRailT(0, PLAYER_RAIL_CONFIG)).toBe(0.5);
    });

    it("clamps values beyond the left end to 0", () => {
      expect(worldXToRailT(-20, PLAYER_RAIL_CONFIG)).toBe(0);
    });

    it("clamps values beyond the right end to 1", () => {
      expect(worldXToRailT(20, PLAYER_RAIL_CONFIG)).toBe(1);
    });

    it("works for tornado rail", () => {
      expect(worldXToRailT(-7.5, TORNADO_RAIL_CONFIG)).toBe(0);
      expect(worldXToRailT(0, TORNADO_RAIL_CONFIG)).toBe(0.5);
      expect(worldXToRailT(7.5, TORNADO_RAIL_CONFIG)).toBe(1);
    });
  });

  describe("railTToWorldX", () => {
    it("returns left end at T=0", () => {
      expect(railTToWorldX(0, PLAYER_RAIL_CONFIG)).toBe(-8);
    });

    it("returns right end at T=1", () => {
      expect(railTToWorldX(1, PLAYER_RAIL_CONFIG)).toBe(8);
    });

    it("returns center at T=0.5", () => {
      expect(railTToWorldX(0.5, PLAYER_RAIL_CONFIG)).toBe(0);
    });

    it("clamps T < 0", () => {
      expect(railTToWorldX(-0.5, PLAYER_RAIL_CONFIG)).toBe(-8);
    });

    it("clamps T > 1", () => {
      expect(railTToWorldX(1.5, PLAYER_RAIL_CONFIG)).toBe(8);
    });
  });

  describe("round-trip conversions", () => {
    const testValues = [-8, -4, 0, 4, 8];

    for (const x of testValues) {
      it(`player rail round-trip for X=${x}`, () => {
        const t = worldXToRailT(x, PLAYER_RAIL_CONFIG);
        const result = railTToWorldX(t, PLAYER_RAIL_CONFIG);
        expect(result).toBeCloseTo(x, 10);
      });
    }

    const tornadoValues = [-7.5, -3.75, 0, 3.75, 7.5];
    for (const x of tornadoValues) {
      it(`tornado rail round-trip for X=${x}`, () => {
        const t = worldXToRailT(x, TORNADO_RAIL_CONFIG);
        const result = railTToWorldX(t, TORNADO_RAIL_CONFIG);
        expect(result).toBeCloseTo(x, 10);
      });
    }
  });

  // ---------------------------------------------------------------------------
  // railTToWorldPos
  // ---------------------------------------------------------------------------

  describe("railTToWorldPos", () => {
    it("returns start position at T=0", () => {
      const pos = railTToWorldPos(0, PLAYER_RAIL_CONFIG);
      expect(pos.x).toBe(-8);
      expect(pos.y).toBe(-2);
      expect(pos.z).toBe(0);
    });

    it("returns end position at T=1", () => {
      const pos = railTToWorldPos(1, PLAYER_RAIL_CONFIG);
      expect(pos.x).toBe(8);
      expect(pos.y).toBe(-2);
      expect(pos.z).toBe(0);
    });

    it("returns midpoint at T=0.5", () => {
      const pos = railTToWorldPos(0.5, TORNADO_RAIL_CONFIG);
      expect(pos.x).toBeCloseTo(0);
      expect(pos.y).toBeCloseTo(8.25);
    });

    it("clamps T outside [0, 1]", () => {
      const posNeg = railTToWorldPos(-1, PLAYER_RAIL_CONFIG);
      expect(posNeg.x).toBe(-8);

      const posOver = railTToWorldPos(2, PLAYER_RAIL_CONFIG);
      expect(posOver.x).toBe(8);
    });
  });

  // ---------------------------------------------------------------------------
  // clampToRail
  // ---------------------------------------------------------------------------

  describe("clampToRail", () => {
    it("passes through values within range", () => {
      expect(clampToRail(0, PLAYER_RAIL_CONFIG)).toBe(0);
      expect(clampToRail(5, PLAYER_RAIL_CONFIG)).toBe(5);
      expect(clampToRail(-5, PLAYER_RAIL_CONFIG)).toBe(-5);
    });

    it("clamps values beyond left end", () => {
      expect(clampToRail(-10, PLAYER_RAIL_CONFIG)).toBe(-8);
    });

    it("clamps values beyond right end", () => {
      expect(clampToRail(10, PLAYER_RAIL_CONFIG)).toBe(8);
    });

    it("clamps to tornado rail bounds", () => {
      expect(clampToRail(-10, TORNADO_RAIL_CONFIG)).toBe(-7.5);
      expect(clampToRail(10, TORNADO_RAIL_CONFIG)).toBe(7.5);
    });
  });

  // ---------------------------------------------------------------------------
  // createRail (Path3D integration)
  // ---------------------------------------------------------------------------

  describe("createRail", () => {
    it("creates a Path3D for player rail", () => {
      const path = createRail(PLAYER_RAIL_CONFIG);
      const points = path.getPoints();
      expect(points.length).toBe(2);
      expect(points[0].x).toBe(-8);
      expect(points[1].x).toBe(8);
    });

    it("creates a Path3D for tornado rail", () => {
      const path = createRail(TORNADO_RAIL_CONFIG);
      const points = path.getPoints();
      expect(points.length).toBe(2);
      expect(points[0].y).toBe(8.25);
      expect(points[1].y).toBe(8.25);
    });

    it("Path3D endpoints match config", () => {
      const path = createRail(PLAYER_RAIL_CONFIG);
      const points = path.getPoints();
      expect(points[0].x).toBe(PLAYER_RAIL_CONFIG.start.x);
      expect(points[0].y).toBe(PLAYER_RAIL_CONFIG.start.y);
      expect(points[1].x).toBe(PLAYER_RAIL_CONFIG.end.x);
      expect(points[1].y).toBe(PLAYER_RAIL_CONFIG.end.y);
    });
  });

  // ---------------------------------------------------------------------------
  // Utility helpers
  // ---------------------------------------------------------------------------

  describe("getRailWidth", () => {
    it("player rail is 16 units wide", () => {
      expect(getRailWidth(PLAYER_RAIL_CONFIG)).toBe(16);
    });

    it("tornado rail is 15 units wide", () => {
      expect(getRailWidth(TORNADO_RAIL_CONFIG)).toBe(15);
    });
  });

  describe("getRailY", () => {
    it("player rail Y is -2", () => {
      expect(getRailY(PLAYER_RAIL_CONFIG)).toBe(-2);
    });

    it("tornado rail Y is 8.25", () => {
      expect(getRailY(TORNADO_RAIL_CONFIG)).toBe(8.25);
    });
  });
});
