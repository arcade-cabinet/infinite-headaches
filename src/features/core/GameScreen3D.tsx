/**
 * GameScreen3D - Pure Babylon.js game screen
 * Manages Scene transitions and 3D Menu integration
 */

import { useCallback, useEffect, useState } from "react";
import { Engine } from "reactylon/web";
import { Vector3, HavokPlugin } from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import { type Achievement, checkAchievements, loadStats, saveStats } from "@/game/achievements";
import { AchievementToastList } from "@/game/components/AchievementToast";
import { GameStyles } from "@/game/components/GameStyles";
import { MainMenuBackground } from "@/game/components/MainMenuBackground";
import { CaptureBallButton } from "@/game/components/CaptureBallButton";
import { ScoreDisplay } from "@/game/components/ScoreDisplay";
import { hasCompletedTutorial, Tutorial } from "@/game/components/Tutorial";
import { LoadingScreen } from "@/game/components/LoadingScreen";
import { PerfectIndicator } from "@/game/components/PerfectIndicator";
import { ModeSelect } from "@/game/components/ModeSelect";
import { SettingsModal } from "@/game/components/SettingsModal";
import { UpgradeShop } from "@/game/components/UpgradeShop";
import { HelpModal } from "@/game/components/HelpModal";
import { CharacterSelect } from "@/features/menu/CharacterSelect";

import { useGameLogic } from "@/game/hooks/useGameLogic";
import { useHighScore } from "@/game/hooks/useHighScore";
import { useResponsiveScale } from "@/game/hooks/useResponsiveScale";
import { checkModeUnlocks, type GameModeType, saveUnlockedModes } from "@/game/modes/GameMode";
import { addCoins, calculateCoinsFromScore } from "@/game/progression/Upgrades";
import { GameOverScreen } from "@/features/gameplay/GameOverScreen";
import { GameScene } from "@/features/gameplay/scene/GameScene";
import { SplashScene } from "@/features/splash/SplashScene";
import { MainMenu3D } from "@/features/menu/MainMenu3D";
import { audioManager } from "@/game/audio";
import { useGraphics } from "@/graphics";

type ScreenState = "splash" | "menu" | "loading" | "playing" | "gameover";

const SPLASH_SHOWN_KEY = "homestead_splash_shown_session";

export function GameScreen3D() {
  const getInitialScreen = (): ScreenState => {
    if (typeof window !== "undefined" && sessionStorage.getItem(SPLASH_SHOWN_KEY)) {
      return "menu";
    }
    return "splash";
  };

  const [screen, setScreen] = useState<ScreenState>(getInitialScreen);
  const [havokPlugin, setHavokPlugin] = useState<HavokPlugin | null>(null);
  const [isPhysicsReady, setIsPhysicsReady] = useState(false);
  const [physicsError, setPhysicsError] = useState<string | null>(null);

  // Load Physics Engine
  useEffect(() => {
    (async () => {
      try {
        const havokInstance = await HavokPhysics({ locateFile: () => "./HavokPhysics.wasm" });
        setHavokPlugin(new HavokPlugin(true, havokInstance));
        setIsPhysicsReady(true);
      } catch (e) {
        console.error("Failed to load Havok Physics:", e);
        setPhysicsError("Failed to load Physics Engine. Please reload.");
      }
    })();
  }, []);

  const [currentMode, setCurrentMode] = useState<GameModeType>("endless");
  const [selectedCharacter, setSelectedCharacter] = useState<"farmer_john" | "farmer_mary" | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [finalBanked, setFinalBanked] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  
  // Menu Modals
  const [showShop, setShowShop] = useState(false);
  const [showModes, setShowModes] = useState(false);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("Initializing...");
  
  const { highScore, updateHighScore } = useHighScore();
  const { spacing } = useResponsiveScale();
  const { settings } = useGraphics();

  useEffect(() => {
    if (screen === "menu") {
      audioManager.playTrack("mainMenu");
    }
  }, [screen]);

  const handleSplashComplete = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SPLASH_SHOWN_KEY, "true");
    }
    setScreen("menu");
  }, []);

  const handleGameOver = useCallback(
    (score: number, bankedAnimals: number) => {
      try {
        setFinalScore(score);
        setFinalBanked(bankedAnimals);
        const isNew = updateHighScore(score);
        setIsNewHighScore(isNew);

        if (currentMode !== "zen") {
          const baseCoins = calculateCoinsFromScore(score);
          const coins = addCoins(baseCoins);
          setEarnedCoins(coins);
        } else {
          setEarnedCoins(0);
        }

        const stats = loadStats();
        stats.totalScore += score;
        stats.highScore = Math.max(stats.highScore, score);
        stats.totalGames += 1;
        stats.totalBanked += bankedAnimals;
        saveStats(stats);

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
      }, 400);

      return () => clearInterval(interval);
    }
  }, [screen, selectedCharacter, startGame]);

  useEffect(() => {
    const handleResize = () => {
      setScreenDimensions(window.innerWidth, window.innerHeight);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setScreenDimensions]);

  // Menu Callbacks
  const handleNewGameClick = useCallback(() => setShowModes(true), []);
  const handleUpgradesClick = useCallback(() => setShowShop(true), []);
  const handleSettingsClick = useCallback(() => setShowSettings(true), []);
  const handleHelpClick = useCallback(() => setShowHelp(true), []);

  const handleSelectMode = useCallback((mode: GameModeType) => {
    setCurrentMode(mode);
    setShowModes(false);
    setShowCharacterSelect(true);
  }, []);

  const handleSelectCharacter = useCallback((charId: string) => {
    setSelectedCharacter(charId as "farmer_john" | "farmer_mary");
    setShowCharacterSelect(false);
    
    if (!hasCompletedTutorial()) {
        setShowTutorial(true);
        return;
    }
    setScreen("loading");
  }, []);

  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
    setScreen("loading");
  }, []);

  const handleMainMenu = useCallback(() => {
    setScreen("menu");
    audioManager.playTrack("mainMenu");
  }, []);

  const handleRestart = useCallback(() => {
    if (!selectedCharacter) return;
    resumeGame();
    setScreen("playing");
    setIsNewHighScore(false);
    startGame(selectedCharacter);
  }, [resumeGame, startGame, selectedCharacter]);

  const handleDismissAchievement = useCallback((id: string) => {
    setUnlockedAchievements((prev) => prev.filter((a) => a.id !== id));
  }, []);

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

  const inputCallbacks = {
    onDragStart: handlePointerDown,
    onDrag: handlePointerMove,
    onDragEnd: handlePointerUp,
  };

  // Render GameScene for Menu, Loading, Playing (keeps context alive)
  const showGameScene = (screen === "menu" || screen === "loading" || screen === "playing" || screen === "gameover") && isPhysicsReady;

  return (
    <div className="fixed inset-0 overflow-hidden select-none touch-none no-zoom safe-area-inset">
      <GameStyles />

      {/* Background for GameOver (Menu now uses 3D background) */}
      {(screen === "gameover" || screen === "loading") && <MainMenuBackground />}
      
      {/* Show Loading Screen if Physics is initializing */}
      {!isPhysicsReady && screen !== "splash" && !physicsError && (
        <LoadingScreen progress={50} status="Initializing Physics Engine..." />
      )}
      
      {/* Error Screen */}
      {physicsError && (
        <div className="absolute inset-0 z-50 bg-black flex items-center justify-center text-red-500 font-bold p-4">
            {physicsError}
        </div>
      )}

      {/* Splash Scene Engine */}
      {screen === "splash" && (
        <div className="absolute inset-0 z-50 bg-black">
          <Engine 
            engineOptions={{ antialias: true, adaptToDeviceRatio: true }} 
            canvasId="splash-canvas"
          >
            <SplashScene onComplete={handleSplashComplete} />
          </Engine>
        </div>
      )}

      {/* Game Scene Engine (Persistent) */}
      {showGameScene && havokPlugin && (
        <div className="absolute inset-0" style={{ zIndex: 1 }}>
          <Engine 
            engineOptions={{ antialias: settings.antialiasing, adaptToDeviceRatio: true }} 
            canvasId="game-canvas"
          >
            <GameScene
              inputCallbacks={inputCallbacks}
              inputEnabled={!isPaused && screen === "playing"}
              showGameplayElements={screen === "playing"}
              havokPlugin={havokPlugin}
            >
                {screen === "menu" && (
                    <MainMenu3D 
                        onPlay={handleNewGameClick}
                        onUpgrades={handleUpgradesClick}
                        onSettings={handleSettingsClick}
                        highScore={highScore}
                    />
                )}
            </GameScene>
          </Engine>
        </div>
      )}

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center text-center z-20 safe-area-inset">
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

        {screen === "loading" && (
          <LoadingScreen progress={loadingProgress} status={loadingStatus} />
        )}

        <PerfectIndicator show={showPerfect} animationKey={perfectKey} />

        {showGood && (
          <div className="absolute left-1/2 top-[30%] -translate-x-1/2 game-font text-green-300 animate-pulse">
            NICE!
          </div>
        )}

        {/* Note: MainMenu (2D) removed, replaced by MainMenu3D inside Scene */}
        
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
      
      {/* Modals (Pointer Events Auto) */}
      <div className="absolute inset-0 z-30 pointer-events-none flex justify-center items-center">
          {showShop && <UpgradeShop onClose={() => setShowShop(false)} />}
          
          {showModes && (
            <ModeSelect onSelectMode={handleSelectMode} onClose={() => setShowModes(false)} />
          )}

          {showCharacterSelect && (
            <CharacterSelect
              onSelect={handleSelectCharacter}
              onBack={() => setShowCharacterSelect(false)}
            />
          )}

          {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

          {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </div>

      {screen === "playing" && (
        <CaptureBallButton visible={canBank} stackCount={stackHeight} onClick={bankStack} />
      )}

      {showTutorial && <Tutorial onComplete={handleTutorialComplete} />}

      <AchievementToastList
        achievements={unlockedAchievements}
        onDismiss={handleDismissAchievement}
      />
    </div>
  );
}

export default GameScreen3D;
