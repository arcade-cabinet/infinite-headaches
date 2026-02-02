/**
 * Game session lifecycle - handles game-over scoring, achievements,
 * mode selection, tutorial gating, and coin rewards.
 */

import { useState, useCallback } from "react";
import {
  type Achievement,
  checkAchievements,
  loadStats,
  saveStats,
} from "@/game/achievements";
import {
  addCoins,
  calculateCoinsFromScore,
} from "@/game/progression/Upgrades";
import {
  checkModeUnlocks,
  type GameModeType,
  saveUnlockedModes,
} from "@/game/modes/GameMode";
import { hasCompletedTutorial } from "@/game/components/Tutorial";

interface UseGameSessionOptions {
  updateHighScore: (score: number) => boolean;
  goToGameOver: () => void;
  goToLoading: () => void;
}

export function useGameSession({
  updateHighScore,
  goToGameOver,
  goToLoading,
}: UseGameSessionOptions) {
  const [currentMode, setCurrentMode] = useState<GameModeType>("endless");
  const [finalScore, setFinalScore] = useState(0);
  const [finalBanked, setFinalBanked] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<
    Achievement[]
  >([]);

  const handleGameOver = useCallback(
    (score: number, bankedAnimals: number) => {
      try {
        setFinalScore(score);
        setFinalBanked(bankedAnimals);

        const isNew = updateHighScore(score);
        setIsNewHighScore(isNew);

        // Award coins (not in zen mode)
        if (currentMode !== "zen") {
          const baseCoins = calculateCoinsFromScore(score);
          setEarnedCoins(addCoins(baseCoins));
        } else {
          setEarnedCoins(0);
        }

        // Persist stats
        const stats = loadStats();
        stats.totalScore += score;
        stats.highScore = Math.max(stats.highScore, score);
        stats.totalGames += 1;
        stats.totalBanked += bankedAnimals;
        saveStats(stats);

        // Check for new mode unlocks
        const newModes = checkModeUnlocks({
          highScore: stats.highScore,
          totalGames: stats.totalGames,
        });
        if (newModes.length > 0) saveUnlockedModes();

        // Check for new achievements
        const newAchievements = checkAchievements(stats);
        if (newAchievements.length > 0) {
          setUnlockedAchievements((prev) => [...prev, ...newAchievements]);
        }

        goToGameOver();
      } catch (e) {
        console.error("Error in handleGameOver:", e);
      }
    },
    [updateHighScore, currentMode, goToGameOver]
  );

  /** Called when player picks a mode from ModeSelect */
  const handleSelectMode = useCallback(
    (mode: GameModeType) => {
      setCurrentMode(mode);
      if (!hasCompletedTutorial()) {
        setShowTutorial(true);
        return;
      }
      goToLoading();
    },
    [goToLoading]
  );

  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
    goToLoading();
  }, [goToLoading]);

  /** Reset transient per-game state before starting a new round */
  const resetForNewGame = useCallback(() => {
    setIsNewHighScore(false);
    setEarnedCoins(0);
  }, []);

  const dismissAchievement = useCallback((id: string) => {
    setUnlockedAchievements((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return {
    currentMode,
    finalScore,
    finalBanked,
    earnedCoins,
    isNewHighScore,
    showTutorial,
    unlockedAchievements,
    handleGameOver,
    handleSelectMode,
    handleTutorialComplete,
    resetForNewGame,
    dismissAchievement,
  };
}
