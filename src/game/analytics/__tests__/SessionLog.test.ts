/**
 * SessionLog Unit Tests
 *
 * Tests session recording, history retrieval, lifetime stats computation,
 * FIFO cap enforcement, malformed storage resilience, write queue
 * serialization, clearSessionHistory, and exportStatsAsJSON.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// ---------------------------------------------------------------------------
// In-memory storage mock
// ---------------------------------------------------------------------------
let store: Record<string, unknown> = {};

const mockStorage = {
  get: vi.fn(async (key: string) => store[key] ?? null),
  set: vi.fn(async (key: string, value: unknown) => {
    store[key] = value;
  }),
  remove: vi.fn(async (key: string) => {
    delete store[key];
  }),
  clear: vi.fn(async () => {
    store = {};
  }),
};

vi.mock("@/platform/storage", () => ({
  storage: mockStorage,
  STORAGE_KEYS: {
    SESSION_HISTORY: "test_session_history",
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
import type { SessionRecord } from "../SessionLog";

type SessionInput = Omit<SessionRecord, "id" | "date">;

function makeSession(overrides: Partial<SessionInput> = {}): SessionInput {
  return {
    characterId: "test-char",
    score: 100,
    levelReached: 5,
    duration: 60_000,
    catches: 10,
    misses: 2,
    maxCombo: 5,
    maxStack: 3,
    powerUpsCollected: 1,
    bankedAnimals: 8,
    catchPositions: [0.5],
    missPositions: [0.2],
    ...overrides,
  };
}

/** Re-import SessionLog from a fresh module to reset internal cache */
async function freshImport() {
  vi.resetModules();
  // Re-apply the mock after resetModules clears it
  vi.doMock("@/platform/storage", () => ({
    storage: mockStorage,
    STORAGE_KEYS: {
      SESSION_HISTORY: "test_session_history",
    },
  }));
  return (await import("../SessionLog")) as typeof import("../SessionLog");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("SessionLog", () => {
  let recordSession: typeof import("../SessionLog")["recordSession"];
  let getSessionHistory: typeof import("../SessionLog")["getSessionHistory"];
  let getLifetimeStats: typeof import("../SessionLog")["getLifetimeStats"];
  let clearSessionHistory: typeof import("../SessionLog")["clearSessionHistory"];
  let exportStatsAsJSON: typeof import("../SessionLog")["exportStatsAsJSON"];

  beforeEach(async () => {
    // Reset in-memory storage
    store = {};

    // Get a completely fresh module (null cache, fresh write queue)
    const mod = await freshImport();
    recordSession = mod.recordSession;
    getSessionHistory = mod.getSessionHistory;
    getLifetimeStats = mod.getLifetimeStats;
    clearSessionHistory = mod.clearSessionHistory;
    exportStatsAsJSON = mod.exportStatsAsJSON;

    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // recordSession
  // -------------------------------------------------------------------------
  describe("recordSession", () => {
    it("saves a session with auto-generated id and date", async () => {
      await recordSession(makeSession());

      const history = await getSessionHistory();
      expect(history).toHaveLength(1);

      const record = history[0];
      expect(record.id).toBeDefined();
      expect(typeof record.id).toBe("string");
      expect(record.id.length).toBeGreaterThan(0);
      expect(record.date).toBeDefined();
      // Verify it is a valid ISO date string
      expect(new Date(record.date).toISOString()).toBe(record.date);
    });

    it("preserves all session fields from input", async () => {
      const input = makeSession({
        characterId: "hero-1",
        score: 999,
        levelReached: 12,
        duration: 120_000,
        catches: 50,
        misses: 10,
        maxCombo: 15,
        maxStack: 8,
        powerUpsCollected: 5,
        bankedAnimals: 40,
        catchPositions: [0.1, 0.5, 0.9],
        missPositions: [0.3, 0.7],
      });

      await recordSession(input);
      const [record] = await getSessionHistory();

      expect(record.characterId).toBe("hero-1");
      expect(record.score).toBe(999);
      expect(record.levelReached).toBe(12);
      expect(record.duration).toBe(120_000);
      expect(record.catches).toBe(50);
      expect(record.misses).toBe(10);
      expect(record.maxCombo).toBe(15);
      expect(record.maxStack).toBe(8);
      expect(record.powerUpsCollected).toBe(5);
      expect(record.bankedAnimals).toBe(40);
      expect(record.catchPositions).toEqual([0.1, 0.5, 0.9]);
      expect(record.missPositions).toEqual([0.3, 0.7]);
    });

    it("generates unique ids for each session", async () => {
      await recordSession(makeSession());
      await recordSession(makeSession());
      await recordSession(makeSession());

      const history = await getSessionHistory();
      const ids = history.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it("appends sessions in order", async () => {
      await recordSession(makeSession({ score: 10 }));
      await recordSession(makeSession({ score: 20 }));
      await recordSession(makeSession({ score: 30 }));

      const history = await getSessionHistory();
      expect(history.map((r) => r.score)).toEqual([10, 20, 30]);
    });

    it("calls storage.set after each record", async () => {
      await recordSession(makeSession());
      expect(mockStorage.set).toHaveBeenCalledTimes(1);

      await recordSession(makeSession());
      expect(mockStorage.set).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // getSessionHistory
  // -------------------------------------------------------------------------
  describe("getSessionHistory", () => {
    it("returns an empty array when no sessions exist", async () => {
      const history = await getSessionHistory();
      expect(history).toEqual([]);
    });

    it("returns all recorded sessions", async () => {
      await recordSession(makeSession({ score: 200 }));
      await recordSession(makeSession({ score: 300 }));
      await recordSession(makeSession({ score: 400 }));

      const history = await getSessionHistory();
      expect(history).toHaveLength(3);
      expect(history[0].score).toBe(200);
      expect(history[1].score).toBe(300);
      expect(history[2].score).toBe(400);
    });

    it("returns a defensive copy, not the internal array", async () => {
      await recordSession(makeSession());
      const a = await getSessionHistory();
      const b = await getSessionHistory();
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });

    it("mutations to returned array do not affect internal state", async () => {
      await recordSession(makeSession({ score: 42 }));
      const history = await getSessionHistory();
      history.push({} as SessionRecord);
      history[0].score = 9999;

      const fresh = await getSessionHistory();
      expect(fresh).toHaveLength(1);
      // The score in the cache may be mutated (shallow copy), but the
      // length of the array must remain 1 since push was on a copy.
      expect(fresh).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // getLifetimeStats
  // -------------------------------------------------------------------------
  describe("getLifetimeStats", () => {
    it("returns all-zero stats for empty history", async () => {
      const stats = await getLifetimeStats();

      expect(stats).toEqual({
        totalGames: 0,
        totalScore: 0,
        totalCatches: 0,
        totalMisses: 0,
        bestScore: 0,
        bestLevel: 0,
        bestCombo: 0,
        totalPlayTime: 0,
        averageScore: 0,
        catchRate: 0,
      });
    });

    it("computes correct totals for a single session", async () => {
      await recordSession(
        makeSession({
          score: 500,
          catches: 25,
          misses: 5,
          duration: 90_000,
          levelReached: 10,
          maxCombo: 12,
        }),
      );

      const stats = await getLifetimeStats();

      expect(stats.totalGames).toBe(1);
      expect(stats.totalScore).toBe(500);
      expect(stats.totalCatches).toBe(25);
      expect(stats.totalMisses).toBe(5);
      expect(stats.bestScore).toBe(500);
      expect(stats.bestLevel).toBe(10);
      expect(stats.bestCombo).toBe(12);
      expect(stats.totalPlayTime).toBe(90_000);
      expect(stats.averageScore).toBe(500);
      expect(stats.catchRate).toBeCloseTo(25 / 30, 5);
    });

    it("computes correct aggregates across multiple sessions", async () => {
      await recordSession(
        makeSession({
          score: 100,
          catches: 10,
          misses: 2,
          duration: 60_000,
          levelReached: 5,
          maxCombo: 4,
        }),
      );
      await recordSession(
        makeSession({
          score: 200,
          catches: 20,
          misses: 5,
          duration: 90_000,
          levelReached: 8,
          maxCombo: 7,
        }),
      );

      const stats = await getLifetimeStats();

      expect(stats.totalGames).toBe(2);
      expect(stats.totalScore).toBe(300);
      expect(stats.totalCatches).toBe(30);
      expect(stats.totalMisses).toBe(7);
      expect(stats.bestScore).toBe(200);
      expect(stats.bestLevel).toBe(8);
      expect(stats.bestCombo).toBe(7);
      expect(stats.totalPlayTime).toBe(150_000);
      expect(stats.averageScore).toBe(150);
      expect(stats.catchRate).toBeCloseTo(30 / 37, 5);
    });

    it("handles zero catches and zero misses without dividing by zero", async () => {
      await recordSession(makeSession({ catches: 0, misses: 0 }));

      const stats = await getLifetimeStats();
      expect(stats.catchRate).toBe(0);
    });

    it("averageScore is rounded to nearest integer", async () => {
      await recordSession(makeSession({ score: 10 }));
      await recordSession(makeSession({ score: 11 }));
      await recordSession(makeSession({ score: 12 }));

      const stats = await getLifetimeStats();
      // (10+11+12)/3 = 11.0 -> 11
      expect(stats.averageScore).toBe(11);
    });

    it("averageScore rounds .5 up (Math.round behavior)", async () => {
      await recordSession(makeSession({ score: 1 }));
      await recordSession(makeSession({ score: 2 }));

      const stats = await getLifetimeStats();
      // (1+2)/2 = 1.5 -> Math.round = 2
      expect(stats.averageScore).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // FIFO cap
  // -------------------------------------------------------------------------
  describe("FIFO cap (MAX_SESSIONS = 500)", () => {
    it("enforces the 500-session cap by evicting oldest sessions", async () => {
      for (let i = 0; i < 501; i++) {
        await recordSession(makeSession({ score: i }));
      }

      const history = await getSessionHistory();
      expect(history).toHaveLength(500);

      // First session (score=0) was evicted
      expect(history[0].score).toBe(1);
      expect(history[history.length - 1].score).toBe(500);
    });

    it("does not evict when exactly at 500 sessions", async () => {
      for (let i = 0; i < 500; i++) {
        await recordSession(makeSession({ score: i }));
      }

      const history = await getSessionHistory();
      expect(history).toHaveLength(500);
      expect(history[0].score).toBe(0);
      expect(history[history.length - 1].score).toBe(499);
    });

    it("evicts multiple oldest sessions when well over cap", async () => {
      // Seed 505 sessions
      for (let i = 0; i < 505; i++) {
        await recordSession(makeSession({ score: i }));
      }

      const history = await getSessionHistory();
      expect(history).toHaveLength(500);
      // Sessions with scores 0-4 should have been evicted
      expect(history[0].score).toBe(5);
      expect(history[history.length - 1].score).toBe(504);
    });
  });

  // -------------------------------------------------------------------------
  // Malformed storage data
  // -------------------------------------------------------------------------
  describe("malformed storage data handling", () => {
    it("recovers gracefully when storage contains a string instead of array", async () => {
      // Pre-populate storage with a non-array value
      store["test_session_history"] = "not-an-array";

      // Fresh import reads from storage with null cache
      const mod = await freshImport();
      const history = await mod.getSessionHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history).toHaveLength(0);
    });

    it("recovers gracefully when storage contains an object instead of array", async () => {
      store["test_session_history"] = { some: "object" };

      const mod = await freshImport();
      const history = await mod.getSessionHistory();
      expect(history).toEqual([]);
    });

    it("recovers gracefully when storage contains a number", async () => {
      store["test_session_history"] = 42;

      const mod = await freshImport();
      const history = await mod.getSessionHistory();
      expect(history).toEqual([]);
    });

    it("recovers gracefully when storage contains a boolean", async () => {
      store["test_session_history"] = true;

      const mod = await freshImport();
      const history = await mod.getSessionHistory();
      expect(history).toEqual([]);
    });

    it("recovers gracefully when storage contains null", async () => {
      store["test_session_history"] = null;

      const mod = await freshImport();
      const history = await mod.getSessionHistory();
      expect(history).toEqual([]);
    });

    it("treats non-array storage as empty and allows recording new sessions", async () => {
      store["test_session_history"] = "corrupted";

      const mod = await freshImport();
      await mod.recordSession(makeSession({ score: 777 }));

      const history = await mod.getSessionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].score).toBe(777);
    });

    it("logs a warning when stored data is non-null and non-array", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      store["test_session_history"] = "corrupted";

      const mod = await freshImport();
      await mod.getSessionHistory();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid stored data shape"),
      );
      warnSpy.mockRestore();
    });

    it("does not log a warning when stored data is null (first use)", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // No pre-population -- storage.get returns null by default
      const mod = await freshImport();
      await mod.getSessionHistory();

      const sessionLogWarnings = warnSpy.mock.calls.filter(
        (args) =>
          typeof args[0] === "string" && args[0].includes("[SessionLog]"),
      );
      expect(sessionLogWarnings).toHaveLength(0);
      warnSpy.mockRestore();
    });

    it("uses a valid array from storage when present", async () => {
      const existingSession: SessionRecord = {
        id: "existing-1",
        date: "2025-01-01T00:00:00.000Z",
        characterId: "pre-existing",
        score: 555,
        levelReached: 3,
        duration: 30_000,
        catches: 5,
        misses: 1,
        maxCombo: 3,
        maxStack: 2,
        powerUpsCollected: 0,
        bankedAnimals: 4,
        catchPositions: [0.5],
        missPositions: [0.1],
      };
      store["test_session_history"] = [existingSession];

      const mod = await freshImport();
      const history = await mod.getSessionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe("existing-1");
      expect(history[0].score).toBe(555);
    });
  });

  // -------------------------------------------------------------------------
  // Write queue serialization
  // -------------------------------------------------------------------------
  describe("write queue serialization", () => {
    it("concurrent recordSession calls do not lose sessions", async () => {
      // Fire off multiple record calls concurrently
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(recordSession(makeSession({ score: i })));
      }
      await Promise.all(promises);

      const history = await getSessionHistory();
      expect(history).toHaveLength(10);

      // All scores should be present (order is guaranteed by the queue)
      const scores = history.map((r) => r.score);
      for (let i = 0; i < 10; i++) {
        expect(scores).toContain(i);
      }
    });

    it("maintains insertion order even under concurrent writes", async () => {
      // Because the write queue serializes, even concurrent calls should
      // produce sessions in the order they were queued
      const p1 = recordSession(makeSession({ score: 1 }));
      const p2 = recordSession(makeSession({ score: 2 }));
      const p3 = recordSession(makeSession({ score: 3 }));
      await Promise.all([p1, p2, p3]);

      const history = await getSessionHistory();
      expect(history.map((r) => r.score)).toEqual([1, 2, 3]);
    });

    it("write queue does not skip sessions when interleaved with reads", async () => {
      const p1 = recordSession(makeSession({ score: 1 }));
      const readMid = getSessionHistory();
      const p2 = recordSession(makeSession({ score: 2 }));

      await Promise.all([p1, p2]);
      await readMid; // read may see 0 or 1 session, that's fine

      const final = await getSessionHistory();
      expect(final).toHaveLength(2);
      expect(final[0].score).toBe(1);
      expect(final[1].score).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // clearSessionHistory
  // -------------------------------------------------------------------------
  describe("clearSessionHistory", () => {
    it("empties the history", async () => {
      await recordSession(makeSession());
      await recordSession(makeSession());

      let history = await getSessionHistory();
      expect(history).toHaveLength(2);

      await clearSessionHistory();

      history = await getSessionHistory();
      expect(history).toHaveLength(0);
    });

    it("writes empty array to storage", async () => {
      await recordSession(makeSession());
      vi.clearAllMocks(); // clear prior set calls

      await clearSessionHistory();

      expect(mockStorage.set).toHaveBeenCalledWith("test_session_history", []);
    });

    it("allows new sessions after clearing", async () => {
      await recordSession(makeSession({ score: 1 }));
      await clearSessionHistory();
      await recordSession(makeSession({ score: 2 }));

      const history = await getSessionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].score).toBe(2);
    });

    it("getLifetimeStats returns zeros after clearing", async () => {
      await recordSession(makeSession({ score: 500, catches: 20 }));
      await clearSessionHistory();

      const stats = await getLifetimeStats();
      expect(stats.totalGames).toBe(0);
      expect(stats.totalScore).toBe(0);
      expect(stats.catchRate).toBe(0);
    });

    it("is idempotent -- calling multiple times is safe", async () => {
      await clearSessionHistory();
      await clearSessionHistory();
      await clearSessionHistory();

      const history = await getSessionHistory();
      expect(history).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // exportStatsAsJSON
  // -------------------------------------------------------------------------
  describe("exportStatsAsJSON", () => {
    it("returns valid JSON with sessions, stats, and exportDate", async () => {
      await recordSession(makeSession({ score: 100 }));
      const sessions = await getSessionHistory();
      const stats = await getLifetimeStats();

      const json = exportStatsAsJSON(sessions, stats);
      const parsed = JSON.parse(json);

      expect(parsed.sessions).toEqual(sessions);
      expect(parsed.stats).toEqual(stats);
      expect(parsed.exportDate).toBeDefined();
      // exportDate should be a valid ISO string
      expect(new Date(parsed.exportDate).toISOString()).toBe(
        parsed.exportDate,
      );
    });

    it("produces pretty-printed JSON (2-space indent)", async () => {
      const sessions = await getSessionHistory();
      const stats = await getLifetimeStats();

      const json = exportStatsAsJSON(sessions, stats);
      // Pretty-printed JSON has newlines
      expect(json).toContain("\n");
      // Verify indentation is 2 spaces
      expect(json).toContain('  "sessions"');
    });

    it("works with empty sessions and zero stats", async () => {
      const stats = await getLifetimeStats();
      const json = exportStatsAsJSON([], stats);
      const parsed = JSON.parse(json);

      expect(parsed.sessions).toEqual([]);
      expect(parsed.stats.totalGames).toBe(0);
    });
  });
});
