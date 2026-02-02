/**
 * Global keyboard bindings scoped per screen.
 * - Menu: arrow keys cycle characters
 * - Playing: Escape toggles pause
 */

import { useEffect } from "react";
import type { ScreenState } from "./useSceneManager";

interface UseKeyboardControlsOptions {
  screen: ScreenState;
  isPaused: boolean;
  pauseGame: () => void;
  resumeGame: () => void;
  isAnyModalOpen: boolean;
  onPrevCharacter: () => void;
  onNextCharacter: () => void;
}

export function useKeyboardControls({
  screen,
  isPaused,
  pauseGame,
  resumeGame,
  isAnyModalOpen,
  onPrevCharacter,
  onNextCharacter,
}: UseKeyboardControlsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Pause toggle during gameplay
      if (e.key === "Escape" && screen === "playing") {
        if (isPaused) resumeGame();
        else pauseGame();
      }

      // Character cycling in menu (when no modal is open)
      if (screen === "menu" && !isAnyModalOpen) {
        if (e.key === "ArrowLeft") onPrevCharacter();
        if (e.key === "ArrowRight") onNextCharacter();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    screen,
    isPaused,
    pauseGame,
    resumeGame,
    isAnyModalOpen,
    onPrevCharacter,
    onNextCharacter,
  ]);
}
