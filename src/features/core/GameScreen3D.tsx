/**
 * GameScreen3D - Thin orchestrator shell.
 *
 * All logic lives in hooks (TS, not TSX):
 *   usePhysicsEngine  - Havok init
 *   useSceneManager   - screen state machine
 *   useMenuState      - character selection, modals, coins
 *   useGameSession    - game-over scoring, achievements, mode
 *   useGameLogic      - core gameplay engine (pre-existing)
 *   useLoadingSimulation - fake loading progress
 *   useKeyboardControls  - global key bindings
 *
 * This file ONLY composes components. No business logic.
 */

import { useCallback, useEffect } from "react";
import { Engine } from "reactylon/web";

// Logic hooks (TS)
import { usePhysicsEngine } from "./hooks/usePhysicsEngine";
import { useSceneManager } from "./hooks/useSceneManager";
import { useMenuState } from "./hooks/useMenuState";
import { useGameSession } from "./hooks/useGameSession";
import { useLoadingSimulation } from "./hooks/useLoadingSimulation";
import { useKeyboardControls } from "./hooks/useKeyboardControls";
import { useGameLogic } from "@/game/hooks/useGameLogic";
import { useHighScore } from "@/game/hooks/useHighScore";
import { useResponsiveScale } from "@/game/hooks/useResponsiveScale";
import { useGraphics } from "@/graphics";

// UI Components
import { AchievementToastList } from "@/game/components/AchievementToast";
import { GameStyles } from "@/game/components/GameStyles";
import { MainMenuBackground } from "@/game/components/MainMenuBackground";
import { CaptureBallButton } from "@/game/components/CaptureBallButton";
import { ScoreDisplay } from "@/game/components/ScoreDisplay";
import { Tutorial } from "@/game/components/Tutorial";
import { LoadingScreen } from "@/game/components/LoadingScreen";
import { PerfectIndicator } from "@/game/components/PerfectIndicator";
import { ModeSelect } from "@/game/components/ModeSelect";
import { SettingsModal } from "@/game/components/SettingsModal";
import { UpgradeShop } from "@/game/components/UpgradeShop";
import { StatsModal } from "@/game/components/StatsModal";
import { HelpModal } from "@/game/components/HelpModal";
import { PauseMenu } from "@/game/components/PauseMenu";
import { GameOverScreen } from "@/features/gameplay/GameOverScreen";
import { GameScene } from "@/features/gameplay/scene/GameScene";
import { SplashScene } from "@/features/splash/SplashScene";
import { MainMenu3D } from "@/features/menu/MainMenu3D";
import { MainMenuOverlay } from "@/features/menu/MainMenuOverlay";
import { PeekingAnimal3D } from "@/features/menu/PeekingAnimal3D";
import { LevelUpFlash } from "@/game/components/LevelUpFlash";

export function GameScreen3D() {
  // ── Core services ──────────────────────────────────────
  const physics = usePhysicsEngine();
  const { highScore, updateHighScore } = useHighScore();
  const { settings } = useGraphics();
  useResponsiveScale();

  // ── Scene state machine ────────────────────────────────
  const scenes = useSceneManager();

  // ── Menu state (character, modals, coins) ──────────────
  const menu = useMenuState(scenes.screen);

  // ── Game session (mode, scoring, achievements) ─────────
  const session = useGameSession({
    updateHighScore,
    goToGameOver: scenes.goToGameOver,
    goToLoading: scenes.goToLoading,
  });

  // ── Gameplay engine ────────────────────────────────────
  const gameplay = useGameLogic({ onGameOver: session.handleGameOver });

  // ── Loading simulation ─────────────────────────────────
  const handleLoadingComplete = useCallback(() => {
    scenes.goToPlaying();
    session.resetForNewGame();
    gameplay.startGame(menu.selectedCharacterId, session.currentMode);
  }, [scenes.goToPlaying, session.resetForNewGame, gameplay.startGame, menu.selectedCharacterId, session.currentMode]);

  const loading = useLoadingSimulation(
    scenes.screen === "loading",
    handleLoadingComplete
  );

  // ── Keyboard controls ──────────────────────────────────
  useKeyboardControls({
    screen: scenes.screen,
    isAnyModalOpen: menu.isAnyModalOpen,
    onPrevCharacter: menu.handlePrevCharacter,
    onNextCharacter: menu.handleNextCharacter,
  });

  // ── Window resize ──────────────────────────────────────
  useEffect(() => {
    const onResize = () =>
      gameplay.setScreenDimensions(window.innerWidth, window.innerHeight);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [gameplay.setScreenDimensions]);

  // ── Thin action wrappers ───────────────────────────────
  const handleSelectMode = useCallback(
    (mode: Parameters<typeof session.handleSelectMode>[0]) => {
      menu.closeModes();
      session.handleSelectMode(mode);
    },
    [menu.closeModes, session.handleSelectMode]
  );

  const handleRestart = useCallback(() => {
    gameplay.resumeGame();
    scenes.goToPlaying();
    session.resetForNewGame();
    gameplay.startGame(menu.selectedCharacterId, session.currentMode);
  }, [
    gameplay.resumeGame,
    scenes.goToPlaying,
    session.resetForNewGame,
    gameplay.startGame,
    session.currentMode,
    menu.selectedCharacterId,
  ]);

  // ── Derived flags ──────────────────────────────────────
  const isMenu = scenes.screen === "menu";
  const isPlaying = scenes.screen === "playing";
  const isGameOver = scenes.screen === "gameover";
  const isLoading = scenes.screen === "loading";
  const isSplash = scenes.screen === "splash";
  const showBackground = isMenu || isGameOver || isLoading;
  const showEngine =
    (isMenu || isLoading || isPlaying || isGameOver) && physics.isReady;

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="fixed inset-0 overflow-hidden select-none touch-none no-zoom safe-area-inset">
      <GameStyles />

      {/* Farm background for non-gameplay screens */}
      {showBackground && <MainMenuBackground />}

      {/* Physics error */}
      {physics.error && (
        <div className="absolute inset-0 z-50 bg-black flex items-center justify-center text-red-500 font-bold p-4">
          {physics.error}
        </div>
      )}

      {/* Physics initializing */}
      {!physics.isReady && !isSplash && !physics.error && (
        <LoadingScreen progress={50} status="Initializing Physics Engine..." />
      )}

      {/* ── Splash Scene ── */}
      {isSplash && (
        <div className="absolute inset-0 z-50 bg-black">
          <Engine
            engineOptions={{ antialias: true, adaptToDeviceRatio: true }}
            canvasId="splash-canvas"
            forceWebGL={true}
          >
            <SplashScene onComplete={scenes.handleSplashComplete} />
          </Engine>
        </div>
      )}

      {/* ── Game Engine (persistent across menu → loading → playing → gameover) ── */}
      {showEngine && physics.havokPlugin && (
        <div className="absolute inset-0" style={{ zIndex: 1 }}>
          <Engine
            engineOptions={{
              antialias: settings.antialiasing,
              adaptToDeviceRatio: true,
            }}
            canvasId="game-canvas"
            forceWebGL={true}
          >
            <GameScene
              inputCallbacks={{
                onDragStart: gameplay.handlePointerDown,
                onDrag: gameplay.handlePointerMove,
                onDragEnd: gameplay.handlePointerUp,
              }}
              inputEnabled={!gameplay.isPaused && isPlaying}
              showGameplayElements={isPlaying}
              showEnvironment={isPlaying || isLoading}
              havokPlugin={physics.havokPlugin}
              tornadoGetters={{
                getNextDropX: gameplay.getNextDropX,
                getDropDifficulty: gameplay.getDropDifficulty,
                getIsDropImminent: gameplay.getIsDropImminent,
              }}
              onPhysicsCatch={gameplay.pushCollisionEvent}
              weather={gameplay.weather}
              reducedMotion={settings.reducedMotion}
              combo={gameplay.combo}
            >
              {isMenu && (
                <>
                  <MainMenu3D
                    onPlay={menu.openPlay}
                    onUpgrades={menu.openUpgrades}
                    onSettings={menu.openSettings}
                    highScore={highScore}
                    selectedCharacterIndex={menu.selectedCharacterIndex}
                    onCharacterChange={menu.handleCharacterChange}
                  />
                  <PeekingAnimal3D />
                </>
              )}
            </GameScene>
          </Engine>
        </div>
      )}

      {/* ── Menu HTML Overlay ── */}
      {isMenu && (
        <MainMenuOverlay
          highScore={highScore}
          coins={menu.coins}
          selectedCharacter={menu.selectedCharacter}
          onPrevCharacter={menu.handlePrevCharacter}
          onNextCharacter={menu.handleNextCharacter}
          onPlay={menu.openPlay}
          onModes={menu.openPlay}
          onUpgrades={menu.openUpgrades}
          onStats={menu.openStats}
          onSettings={menu.openSettings}
        />
      )}

      {/* ── Gameplay UI Overlay ── */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center text-center z-20 safe-area-inset">
        {isPlaying && (
          <ScoreDisplay
            score={gameplay.score}
            multiplier={gameplay.multiplier}
            combo={gameplay.combo}
            level={gameplay.level}
            stackHeight={gameplay.stackHeight}
            bankedAnimals={gameplay.bankedAnimals}
            highScore={highScore}
            lives={gameplay.lives}
            maxLives={gameplay.maxLives}
            inDanger={gameplay.inDanger}
            reducedMotion={settings.reducedMotion}
          />
        )}

        {isLoading && (
          <LoadingScreen progress={loading.progress} status={loading.status} />
        )}

        <PerfectIndicator
          show={gameplay.showPerfect}
          animationKey={gameplay.perfectKey}
        />

        <LevelUpFlash level={gameplay.level} reducedMotion={settings.reducedMotion} />

        {gameplay.showGood && (
          <div className="absolute left-1/2 top-[30%] -translate-x-1/2 game-font text-green-300 animate-pulse">
            NICE!
          </div>
        )}

        {isGameOver && (
          <GameOverScreen
            score={session.finalScore}
            bankedAnimals={session.finalBanked}
            highScore={highScore}
            isNewHighScore={session.isNewHighScore}
            earnedCoins={session.earnedCoins}
            onRetry={handleRestart}
            onMainMenu={scenes.goToMenu}
          />
        )}
      </div>

      {/* ── Modals ── */}
      <div className="absolute inset-0 z-30 pointer-events-none flex justify-center items-center">
        {menu.showShop && <UpgradeShop onClose={menu.closeShop} />}
        {menu.showModes && (
          <ModeSelect
            onSelectMode={handleSelectMode}
            onClose={menu.closeModes}
          />
        )}
        {menu.showHelp && <HelpModal onClose={menu.closeHelp} />}
      </div>

      {menu.showStats && (
        <div className="absolute inset-0 z-[55]">
          <StatsModal onClose={menu.closeStats} />
        </div>
      )}

      {/* ── Settings modal (z-60 so it renders above PauseMenu z-50) ── */}
      {menu.showSettings && (
        <div className="absolute inset-0 z-[60]">
          <SettingsModal onClose={menu.closeSettings} />
        </div>
      )}

      {/* ── Wobble warning overlay ── */}
      {isPlaying && gameplay.inDanger && !gameplay.isPaused && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
          <div
            className="game-font text-red-500 animate-pulse"
            style={{
              fontSize: "clamp(1.5rem, 5vw, 2.5rem)",
              textShadow:
                "0 0 20px rgba(244, 67, 54, 0.8), 3px 3px 0 #000",
              opacity: 0.9,
            }}
          >
            WOBBLE WARNING!
          </div>
        </div>
      )}

      {/* ── Pause menu overlay ── */}
      {isPlaying && gameplay.isPaused && (
        <PauseMenu
          onResume={gameplay.resumeGame}
          onMainMenu={() => {
            gameplay.resumeGame();
            scenes.goToMenu();
          }}
          onRestart={handleRestart}
          onSettings={menu.openSettings}
          score={gameplay.score}
          level={gameplay.level}
        />
      )}

      {/* ── Gameplay buttons ── */}
      {isPlaying && (
        <CaptureBallButton
          visible={gameplay.canBank}
          stackCount={gameplay.stackHeight}
          onClick={gameplay.bankStack}
        />
      )}

      {/* ── Tutorial ── */}
      {session.showTutorial && (
        <Tutorial onComplete={session.handleTutorialComplete} />
      )}

      {/* ── Achievement toasts ── */}
      <AchievementToastList
        achievements={session.unlockedAchievements}
        onDismiss={session.dismissAchievement}
      />
    </div>
  );
}

export default GameScreen3D;
