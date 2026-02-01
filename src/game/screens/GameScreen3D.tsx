/**
 * GameScreen3D - Pure Babylon.js game screen
 * No 2D canvas - all rendering happens in the 3D scene
 */

import { useCallback, useEffect, useState } from "react";
import { type Achievement, checkAchievements, loadStats, saveStats } from "../achievements";
import { AchievementToastList } from "../components/AchievementToast";
import { GameStyles } from "../components/GameStyles";
import { PauseButton } from "../components/PauseButton";
import { PauseMenu } from "../components/PauseMenu";
import { PerfectIndicator } from "../components/PerfectIndicator";
import { CaptureBallButton } from "../components/CaptureBallButton";
import { ScoreDisplay } from "../components/ScoreDisplay";
import { hasCompletedTutorial, Tutorial } from "../components/Tutorial";
import { useGameLogic } from "../hooks/useGameLogic";
import { useHighScore } from "../hooks/useHighScore";
import { useResponsiveScale } from "../hooks/useResponsiveScale";
import { checkModeUnlocks, type GameModeType, saveUnlockedModes } from "../modes/GameMode";
import { addCoins, calculateCoinsFromScore } from "../progression/Upgrades";
import { GameOverScreen } from "./GameOverScreen";
import { MainMenu } from "./MainMenu";
import { GameScene3D } from "../scene/GameScene3D";
import { VideoSplash } from "../components/VideoSplash";
import { audioManager } from "../audio";

type ScreenState = "splash" | "menu" | "playing" | "gameover";

const SPLASH_SHOWN_KEY = "homestead_splash_shown_session";

export function GameScreen3D() {
  // Check if splash was already shown this session
  const getInitialScreen = (): ScreenState => {
    if (typeof window !== "undefined" && sessionStorage.getItem(SPLASH_SHOWN_KEY)) {
      return "menu";
    }
    return "splash";
  };

  const [screen, setScreen] = useState<ScreenState>(getInitialScreen);
  const [currentMode, setCurrentMode] = useState<GameModeType>("endless");
  const [selectedCharacter, setSelectedCharacter] = useState<"farmer_john" | "farmer_mary">("farmer_john");
  const [finalScore, setFinalScore] = useState(0);
  const [finalBanked, setFinalBanked] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [stormIntensity, setStormIntensity] = useState(0.3);
  const { highScore, updateHighScore } = useHighScore();
  const { isMobile, fontSize, spacing } = useResponsiveScale();

  // Start main menu music when entering menu
  useEffect(() => {
    if (screen === "menu") {
      audioManager.playTrack("mainMenu");
    }
  }, [screen]);

  // Handle video splash completion
  const handleSplashComplete = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SPLASH_SHOWN_KEY, "true");
    }
    setScreen("menu");
  }, []);

  const handleGameOver = useCallback(
    (score: number, bankedAnimals: number) => {
      setFinalScore(score);
      setFinalBanked(bankedAnimals);
      const isNew = updateHighScore(score);
      setIsNewHighScore(isNew);

      // Award coins (except in Zen mode)
      if (currentMode !== "zen") {
        const baseCoins = calculateCoinsFromScore(score);
        const coins = addCoins(baseCoins);
        setEarnedCoins(coins);
      } else {
        setEarnedCoins(0);
      }

      // Update stats and check achievements
      const stats = loadStats();
      stats.totalScore += score;
      stats.highScore = Math.max(stats.highScore, score);
      stats.totalGames += 1;
      stats.totalBanked += bankedAnimals;
      saveStats(stats);

      // Check for mode unlocks
      const newModes = checkModeUnlocks({
        highScore: stats.highScore,
        totalGames: stats.totalGames,
      });
      if (newModes.length > 0) {
        saveUnlockedModes();
      }

      const newAchievements = checkAchievements(stats);
      if (newAchievements.length > 0) {
        setUnlockedAchievements((prev) => [...prev, ...newAchievements]);
      }

      setScreen("gameover");
    },
    [updateHighScore, currentMode]
  );

  const handleLevelUp = useCallback((level: number) => {
    // Increase storm intensity as level increases
    setStormIntensity(Math.min(0.9, 0.3 + level * 0.05));
  }, []);

  const handleLifeEarned = useCallback(() => {
    const stats = loadStats();
    stats.livesEarned += 1;
    saveStats(stats);
  }, []);

  const handleStackTopple = useCallback(() => {
    // Brief intensity spike on topple
    setStormIntensity((prev) => Math.min(1, prev + 0.2));
    setTimeout(() => {
      setStormIntensity((prev) => Math.max(0.3, prev - 0.2));
    }, 2000);
  }, []);

  const {
    score,
    multiplier,
    combo,
    stackHeight,
    bankedAnimals,
    level,
    lives,
    maxLives,
    canBank,
    perfectKey,
    showPerfect,
    showGood,
    inDanger,
    isPaused,
    startGame,
    bankStack,
    pauseGame,
    resumeGame,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    setScreenDimensions,
  } = useGameLogic({
    onGameOver: handleGameOver,
    onLevelUp: handleLevelUp,
    onLifeEarned: handleLifeEarned,
    onStackTopple: handleStackTopple,
  });

  // Update screen dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      setScreenDimensions(window.innerWidth, window.innerHeight);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setScreenDimensions]);

  // Track max stack for achievements
  useEffect(() => {
    if (screen === "playing" && stackHeight > 0) {
      const stats = loadStats();
      if (stackHeight > stats.maxStack) {
        stats.maxStack = stackHeight;
        saveStats(stats);
      }
    }
  }, [stackHeight, screen]);

  // Track max combo for achievements
  useEffect(() => {
    if (screen === "playing" && combo > 0) {
      const stats = loadStats();
      if (combo > stats.maxCombo) {
        stats.maxCombo = combo;
        saveStats(stats);
      }
    }
  }, [combo, screen]);

  const handlePlay = useCallback(
    (mode: GameModeType = "endless", characterId: "farmer_john" | "farmer_mary" = "farmer_john") => {
      setSelectedCharacter(characterId);

      if (!hasCompletedTutorial()) {
        setShowTutorial(true);
        setCurrentMode(mode);
        return;
      }

      setCurrentMode(mode);
      setScreen("playing");
      setIsNewHighScore(false);
      setEarnedCoins(0);
      setStormIntensity(0.3);
      startGame(characterId);
    },
    [startGame]
  );

  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
    setScreen("playing");
    setIsNewHighScore(false);
    startGame(selectedCharacter);
  }, [startGame, selectedCharacter]);

  const handleMainMenu = useCallback(() => {
    setScreen("menu");
    audioManager.playTrack("mainMenu");
  }, []);

  const handleRestart = useCallback(() => {
    resumeGame();
    setScreen("playing");
    setIsNewHighScore(false);
    setStormIntensity(0.3);
    startGame(selectedCharacter);
  }, [resumeGame, startGame, selectedCharacter]);

  const handleDismissAchievement = useCallback((id: string) => {
    setUnlockedAchievements((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Handle escape key for pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && screen === "playing") {
        if (isPaused) {
          resumeGame();
        } else {
          pauseGame();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [screen, isPaused, pauseGame, resumeGame]);

  // Input callbacks for Babylon scene
  const inputCallbacks = {
    onDragStart: handlePointerDown,
    onDrag: handlePointerMove,
    onDragEnd: handlePointerUp,
  };

  return (
    <div className="fixed inset-0 overflow-hidden select-none touch-none no-zoom safe-area-inset">
      <GameStyles />

      {/* 3D Game Scene - Full Screen */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        <GameScene3D
          inputCallbacks={inputCallbacks}
          inputEnabled={screen === "playing" && !isPaused}
          stormIntensity={stormIntensity}
          showGameplayElements={screen === "playing"}
        />
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center text-center z-20 safe-area-inset">
        {/* Score HUD */}
        {screen === "playing" && (
          <ScoreDisplay
            score={score}
            multiplier={multiplier}
            combo={combo}
            level={level}
            stackHeight={stackHeight}
            bankedDucks={bankedAnimals}
            highScore={highScore}
            lives={lives}
            maxLives={maxLives}
            inDanger={inDanger}
          />
        )}

        {/* Perfect Catch Indicator */}
        <PerfectIndicator show={showPerfect} animationKey={perfectKey} />

        {/* Good Catch Indicator */}
        {showGood && (
          <div
            className="absolute left-1/2 top-[30%] -translate-x-1/2 game-font text-green-300 animate-pulse"
            style={{
              fontSize: fontSize.lg,
              textShadow: "0 0 10px rgba(34, 197, 94, 0.8), 2px 2px 0 #000",
            }}
          >
            NICE!
          </div>
        )}

        {/* Menu Screens */}
        {screen === "menu" && <MainMenu onPlay={handlePlay} highScore={highScore} />}

        {screen === "gameover" && (
          <GameOverScreen
            score={finalScore}
            bankedAnimals={finalBanked}
            highScore={highScore}
            isNewHighScore={isNewHighScore}
            earnedCoins={earnedCoins}
            onRetry={() => handlePlay(currentMode)}
            onMainMenu={handleMainMenu}
          />
        )}
      </div>

      {/* Top right controls */}
      <div
        className="absolute z-40 flex gap-2 items-center"
        style={{
          top: `calc(${spacing.sm} + env(safe-area-inset-top, 0px))`,
          right: spacing.sm,
        }}
      >
        {screen === "playing" && !isPaused && <PauseButton onClick={pauseGame} />}
      </div>

      {/* CaptureBall Bank Button */}
      {screen === "playing" && (
        <CaptureBallButton visible={canBank} stackCount={stackHeight} onClick={bankStack} />
      )}

      {/* Gameplay hints */}
      {screen === "playing" && stackHeight === 0 && lives > 0 && !isPaused && (
        <div className="absolute bottom-28 left-0 right-16 text-center pointer-events-none z-10">
          <p className="game-font text-white/50 animate-pulse" style={{ fontSize: fontSize.sm }}>
            {isMobile ? "DRAG to catch falling animals!" : "DRAG to move • Catch falling animals!"}
          </p>
        </div>
      )}

      {/* Danger warning */}
      {screen === "playing" && inDanger && !isPaused && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
          <div
            className="game-font text-red-500 animate-pulse"
            style={{
              fontSize: `clamp(1.5rem, ${parseFloat(fontSize.title) * 0.4}px, 2.5rem)`,
              textShadow: "0 0 20px rgba(244, 67, 54, 0.8), 3px 3px 0 #000",
              opacity: 0.9,
            }}
          >
            WOBBLE WARNING!
          </div>
        </div>
      )}

      {/* Pause Menu */}
      {isPaused && (
        <PauseMenu
          onResume={resumeGame}
          onMainMenu={() => {
            resumeGame();
            handleMainMenu();
          }}
          onRestart={handleRestart}
          score={score}
          level={level}
        />
      )}

      {/* Tutorial Overlay */}
      {showTutorial && <Tutorial onComplete={handleTutorialComplete} />}

      {/* Achievement Toasts */}
      <AchievementToastList
        achievements={unlockedAchievements}
        onDismiss={handleDismissAchievement}
      />

      {/* Video Splash - plays on first load */}
      {screen === "splash" && <VideoSplash onComplete={handleSplashComplete} />}
    </div>
  );
}

export default GameScreen3D;
