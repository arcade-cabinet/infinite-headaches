/**
 * Session Log - Records and persists game session history.
 * Capped at 500 sessions (FIFO).
 */

import { storage, STORAGE_KEYS } from "../../platform/storage";

export interface SessionRecord {
  id: string;
  date: string;
  characterId: string;
  score: number;
  levelReached: number;
  duration: number; // ms
  catches: number;
  misses: number;
  maxCombo: number;
  maxStack: number;
  powerUpsCollected: number;
  bankedAnimals: number;
  catchPositions: number[];
  missPositions: number[];
}

export interface LifetimeStats {
  totalGames: number;
  totalScore: number;
  totalCatches: number;
  totalMisses: number;
  bestScore: number;
  bestLevel: number;
  bestCombo: number;
  totalPlayTime: number;
  averageScore: number;
  catchRate: number;
}

const MAX_SESSIONS = 500;

let sessionCache: SessionRecord[] | null = null;
let sessionWriteQueue = Promise.resolve();

async function loadSessions(): Promise<SessionRecord[]> {
  if (sessionCache) return sessionCache;
  const stored = await storage.get<SessionRecord[]>(STORAGE_KEYS.SESSION_HISTORY);
  sessionCache = stored ?? [];
  return sessionCache;
}

async function saveSessions(sessions: SessionRecord[]): Promise<void> {
  sessionCache = sessions;
  await storage.set(STORAGE_KEYS.SESSION_HISTORY, sessions);
}

export async function recordSession(session: Omit<SessionRecord, "id" | "date">): Promise<void> {
  // Serialize writes to prevent race conditions
  sessionWriteQueue = sessionWriteQueue.then(async () => {
    const sessions = await loadSessions();
    const record: SessionRecord = {
      ...session,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: new Date().toISOString(),
    };

    sessions.push(record);

    // FIFO cap
    if (sessions.length > MAX_SESSIONS) {
      sessions.splice(0, sessions.length - MAX_SESSIONS);
    }

    await saveSessions(sessions);
  });
  await sessionWriteQueue;
}

export async function getSessionHistory(): Promise<SessionRecord[]> {
  return [...(await loadSessions())];
}

export async function getLifetimeStats(): Promise<LifetimeStats> {
  const sessions = await loadSessions();

  if (sessions.length === 0) {
    return {
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
    };
  }

  const totalScore = sessions.reduce((s, r) => s + r.score, 0);
  const totalCatches = sessions.reduce((s, r) => s + r.catches, 0);
  const totalMisses = sessions.reduce((s, r) => s + r.misses, 0);
  const totalPlayTime = sessions.reduce((s, r) => s + r.duration, 0);

  return {
    totalGames: sessions.length,
    totalScore,
    totalCatches,
    totalMisses,
    bestScore: sessions.reduce((max, r) => Math.max(max, r.score), 0),
    bestLevel: sessions.reduce((max, r) => Math.max(max, r.levelReached), 0),
    bestCombo: sessions.reduce((max, r) => Math.max(max, r.maxCombo), 0),
    totalPlayTime,
    averageScore: Math.round(totalScore / sessions.length),
    catchRate: totalCatches + totalMisses > 0 ? totalCatches / (totalCatches + totalMisses) : 0,
  };
}

export function exportStatsAsJSON(sessions: SessionRecord[], stats: LifetimeStats): string {
  return JSON.stringify({ sessions, stats, exportDate: new Date().toISOString() }, null, 2);
}

export async function clearSessionHistory(): Promise<void> {
  sessionCache = [];
  await storage.set(STORAGE_KEYS.SESSION_HISTORY, []);
}
