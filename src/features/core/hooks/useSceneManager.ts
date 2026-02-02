/**
 * Scene state machine - manages transitions between game screens.
 * Pure state + transition functions, no side effects beyond session storage.
 */

import { useState, useCallback } from "react";

export type ScreenState = "splash" | "menu" | "loading" | "playing" | "gameover";

const SPLASH_SHOWN_KEY = "homestead_splash_shown_session";

function getInitialScreen(): ScreenState {
  if (typeof window !== "undefined" && sessionStorage.getItem(SPLASH_SHOWN_KEY)) {
    return "menu";
  }
  return "splash";
}

export function useSceneManager() {
  const [screen, setScreen] = useState<ScreenState>(getInitialScreen);

  const handleSplashComplete = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SPLASH_SHOWN_KEY, "true");
    }
    setScreen("menu");
  }, []);

  const goToMenu = useCallback(() => setScreen("menu"), []);
  const goToLoading = useCallback(() => setScreen("loading"), []);
  const goToPlaying = useCallback(() => setScreen("playing"), []);
  const goToGameOver = useCallback(() => setScreen("gameover"), []);

  return {
    screen,
    handleSplashComplete,
    goToMenu,
    goToLoading,
    goToPlaying,
    goToGameOver,
  };
}
