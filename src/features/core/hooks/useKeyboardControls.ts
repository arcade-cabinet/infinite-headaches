/**
 * Global keyboard bindings scoped per screen.
 * - Menu: arrow keys cycle characters
 * - Playing: pause is handled by useGameLogic (Space/Escape/P)
 */

import { useEffect } from "react";
import type { ScreenState } from "./useSceneManager";

interface UseKeyboardControlsOptions {
  screen: ScreenState;
  isAnyModalOpen: boolean;
  onPrevCharacter: () => void;
  onNextCharacter: () => void;
}

export function useKeyboardControls({
  screen,
  isAnyModalOpen,
  onPrevCharacter,
  onNextCharacter,
}: UseKeyboardControlsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    isAnyModalOpen,
    onPrevCharacter,
    onNextCharacter,
  ]);
}
