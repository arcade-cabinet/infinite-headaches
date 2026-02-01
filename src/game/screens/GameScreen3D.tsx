/**
 * GameScreen3D - Pure Babylon.js game screen
 * No 2D canvas - all rendering happens in the 3D scene
 */

import { useCallback, useEffect, useState } from "react";
import { type Achievement, checkAchievements, loadStats, saveStats } from "../achievements";
import { AchievementToastList } from "../components/AchievementToast";
import { GameStyles } from "../components/GameStyles";
import { MainMenuBackground } from "../components/MainMenuBackground";
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
import { LoadingScreen } from "../components/LoadingScreen";
import { VideoSplash } from "../components/VideoSplash";
import { audioManager } from "../audio";

type ScreenState = "splash" | "menu" | "loading" | "playing" | "gameover";

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
  const [selectedCharacter, setSelectedCharacter] = useState<"farmer_john" | "farmer_mary" | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [finalBanked, setFinalBanked] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  
  // Loading State
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("Initializing...");
  
  const { highScore, updateHighScore } = useHighScore();
  const { spacing } = useResponsiveScale();

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
      console.log("handleGameOver called", score, bankedAnimals);
      try {
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

        console.log("Setting screen to gameover");
        setScreen("gameover");
      } catch (e) {
        console.error("Error in handleGameOver:", e);
      }
    },
    [updateHighScore, currentMode]
  );

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
  } = useGameLogic({ onGameOver: handleGameOver });

  // Handle Loading Simulation
  useEffect(() => {
    if (screen === "loading") {
      setLoadingProgress(0);
      setLoadingStatus("Preparing Diorama...");

      const stages = [
        { progress: 20, text: "Planting Crops..." },
        { progress: 40, text: "Polishing Tractors..." },
        { progress: 60, text: "Waking up Roosters..." },
        { progress: 80, text: "Loading Farmers..." },
        { progress: 100, text: "Ready!" }
      ];

      let currentStage = 0;
      const interval = setInterval(() => {
        if (currentStage >= stages.length) {
          clearInterval(interval);
          
          // Transition to gameplay
          if (selectedCharacter) {
             setScreen("playing");
             setIsNewHighScore(false);
             setEarnedCoins(0);
             startGame(selectedCharacter);
          }
          return;
        }

        const stage = stages[currentStage];
        setLoadingProgress(stage.progress);
        setLoadingStatus(stage.text);
        currentStage++;

      }, 400); // Simulate 2s load time

      return () => clearInterval(interval);
    }
  }, [screen, selectedCharacter, startGame]);

  // Update screen dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      setScreenDimensions(window.innerWidth, window.innerHeight);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setScreenDimensions]);

  const handlePlay = useCallback(
    (mode: GameModeType, characterId: "farmer_john" | "farmer_mary") => {
      setSelectedCharacter(characterId);
      setCurrentMode(mode);

      if (!hasCompletedTutorial()) {
        setShowTutorial(true);
        return;
      }
      
      // Start Loading Sequence
      setScreen("loading");
    },
    []
  );

  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
    // After tutorial, go to loading
    setScreen("loading");
  }, []);

  const handleMainMenu = useCallback(() => {
    setScreen("menu");
    audioManager.playTrack("mainMenu");
  }, []);

  const handleRestart = useCallback(() => {
    if (!selectedCharacter) return;
    resumeGame();
    // Quick restart (skip full loading screen, or maybe show a fast one?)
    // For now, instant restart
    setScreen("playing");
    setIsNewHighScore(false);
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

  // Only render 3D scene during gameplay for performance
  // We ALSO render it during "loading" but hidden behind the overlay 
  // to ensure assets are actually in memory when the overlay vanishes.
  const showScene3D = screen === "playing" || screen === "loading";

  return (
    <div className="fixed inset-0 overflow-hidden select-none touch-none no-zoom safe-area-inset">
      <GameStyles />

      {/* Static background for menu/gameover/loading screens */}
      {(screen === "menu" || screen === "gameover" || screen === "loading") && <MainMenuBackground />}

      {/* 3D Game Scene - Pre-mount during loading */}
      {showScene3D && (
        <div className="absolute inset-0" style={{ zIndex: 1 }}>
          <GameScene3D
            inputCallbacks={inputCallbacks}
            inputEnabled={!isPaused && screen === "playing"}
            showGameplayElements={true}
          />
        </div>
      )}

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
            bankedAnimals={bankedAnimals}
            highScore={highScore}
            lives={lives}
            maxLives={maxLives}
            inDanger={inDanger}
          />
        )}

        {/* Loading Screen */}
        {screen === "loading" && (
          <LoadingScreen progress={loadingProgress} status={loadingStatus} />
        )}

        {/* Perfect Catch Indicator */}
        <PerfectIndicator show={showPerfect} animationKey={perfectKey} />

        {/* Good Catch Indicator */}
        {showGood && (
          <div className="absolute left-1/2 top-[30%] -translate-x-1/2 game-font text-green-300 animate-pulse">
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
            onRetry={handleRestart}
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
        {/* Pause button removed - tap anywhere to pause */}
      </div>

      {/* CaptureBall Bank Button */}
      {screen === "playing" && (
        <CaptureBallButton visible={canBank} stackCount={stackHeight} onClick={bankStack} />
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