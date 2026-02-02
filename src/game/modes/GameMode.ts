/**
 * Game Mode System
 * Different ways to play the game
 */

export type GameModeType = "endless" | "time_attack" | "zen" | "boss_rush";

export interface GameModeConfig {
  id: GameModeType;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlockCondition?: string;
  unlocked: boolean;

  // Mode-specific settings
  hasLives: boolean;
  hasBanking: boolean;
  hasTimer: boolean;
  timerSeconds?: number;
  spawnRateMultiplier: number;
  scoreMultiplier: number;
  specialRules?: string[];
}

export const GAME_MODES: Record<GameModeType, GameModeConfig> = {
  endless: {
    id: "endless",
    name: "Endless",
    description: "Classic mode - survive as long as you can!",
    icon: "♾️",
    color: "#b91c1c",
    unlocked: true,
    hasLives: true,
    hasBanking: true,
    hasTimer: false,
    spawnRateMultiplier: 1,
    scoreMultiplier: 1,
  },

  time_attack: {
    id: "time_attack",
    name: "Time Attack",
    description: "Score as many points as possible in 90 seconds!",
    icon: "⏱️",
    color: "#eab308",
    unlockCondition: "Score 1000+ in Endless",
    unlocked: false,
    hasLives: false,
    hasBanking: true,
    hasTimer: true,
    timerSeconds: 90,
    spawnRateMultiplier: 1.3, // Faster spawns
    scoreMultiplier: 1.5,
    specialRules: [
      "No lives - drops don't end the game",
      "Faster animal spawns",
      "1.5x score multiplier",
    ],
  },

  zen: {
    id: "zen",
    name: "Zen Mode",
    description: "Relax and stack without pressure. No game over!",
    icon: "🧘",
    color: "#22c55e",
    unlockCondition: "Play 10 games",
    unlocked: false,
    hasLives: false,
    hasBanking: false,
    hasTimer: false,
    spawnRateMultiplier: 0.7, // Slower spawns
    scoreMultiplier: 0.5, // Reduced score (not competitive)
    specialRules: [
      "No lives or game over",
      "Slower, relaxed pace",
      "Scores don't count for achievements",
      "Perfect for practice!",
    ],
  },

  boss_rush: {
    id: "boss_rush",
    name: "Boss Rush",
    description: "Face increasingly powerful boss Animals!",
    icon: "👹",
    color: "#dc2626",
    unlockCondition: "Score 5000+ in Endless",
    unlocked: false,
    hasLives: true,
    hasBanking: true,
    hasTimer: false,
    spawnRateMultiplier: 0.5, // Fewer regular animals
    scoreMultiplier: 2,
    specialRules: [
      "Boss animals appear every 30 seconds",
      "Bosses require multiple catches",
      "Defeat bosses for huge bonuses",
      "2x score multiplier",
    ],
  },
};

/**
 * Check if a mode should be unlocked based on stats
 */
export function checkModeUnlocks(stats: { highScore: number; totalGames: number }): GameModeType[] {
  const newlyUnlocked: GameModeType[] = [];

  // Time Attack - unlock at 1000 score
  if (!GAME_MODES.time_attack.unlocked && stats.highScore >= 1000) {
    GAME_MODES.time_attack.unlocked = true;
    newlyUnlocked.push("time_attack");
  }

  // Zen - unlock after 10 games
  if (!GAME_MODES.zen.unlocked && stats.totalGames >= 10) {
    GAME_MODES.zen.unlocked = true;
    newlyUnlocked.push("zen");
  }

  // Boss Rush - unlock at 5000 score
  if (!GAME_MODES.boss_rush.unlocked && stats.highScore >= 5000) {
    GAME_MODES.boss_rush.unlocked = true;
    newlyUnlocked.push("boss_rush");
  }

  return newlyUnlocked;
}

/**
 * Save unlocked modes to localStorage
 */
export function saveUnlockedModes(): void {
  if (typeof window === "undefined") return;

  const unlocked = Object.entries(GAME_MODES)
    .filter(([_, mode]) => mode.unlocked)
    .map(([id]) => id);

  localStorage.setItem("animal-modes-unlocked", JSON.stringify(unlocked));
}

/**
 * Load unlocked modes from localStorage
 */
export function loadUnlockedModes(): void {
  if (typeof window === "undefined") return;

  try {
    const saved = localStorage.getItem("animal-modes-unlocked");
    if (saved) {
      const unlocked = JSON.parse(saved) as string[];
      for (const id of unlocked) {
        if (id in GAME_MODES) {
          GAME_MODES[id as GameModeType].unlocked = true;
        }
      }
    }
  } catch (e) {
    console.error("Failed to load unlocked modes:", e);
  }
}

// Load on module init
loadUnlockedModes();
