/**
 * useHighScore Hook
 * Manages high score persistence with localStorage
 */

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "animal_highscore";

export interface UseHighScoreReturn {
  highScore: number;
  updateHighScore: (score: number) => boolean;
  resetHighScore: () => void;
}

export function useHighScore(): UseHighScoreReturn {
  const [highScore, setHighScore] = useState(() => {
    if (typeof window === "undefined") return 0;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  });

  // Sync with localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setHighScore(parseInt(stored, 10));
    }
  }, []);

  /**
   * Update high score if new score is higher
   * Returns true if high score was updated
   */
  const updateHighScore = useCallback(
    (score: number): boolean => {
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem(STORAGE_KEY, String(score));
        return true;
      }
      return false;
    },
    [highScore]
  );

  /**
   * Reset high score to zero
   */
  const resetHighScore = useCallback(() => {
    setHighScore(0);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    highScore,
    updateHighScore,
    resetHighScore,
  };
}
