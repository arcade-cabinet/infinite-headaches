/**
 * useGameLogic Hook
 * React hook for the pure logic game engine
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "../audio";
import { GAME_CONFIG } from "../config";
import { GameLogic } from "../engine/GameLogic";
import { deviceManager } from "../../platform/device";
import { inputManager } from "../../platform/input";
import { recordSession } from "../analytics/SessionLog";
import { useAccessibilitySettings } from "@/graphics/hooks/useGraphics";
import type { GameModeType } from "../modes/GameMode";
import type { WeatherState } from "../systems/WeatherSystem";

export interface UseGameLogicReturn {
  score: number;
  multiplier: number;
  combo: number;
  stackHeight: number;
  bankedAnimals: number;
  level: number;
  lives: number;
  maxLives: number;
  isPlaying: boolean;
  isGameOver: boolean;
  isPaused: boolean;
  canBank: boolean;
  inDanger: boolean;
  screenShake: number;
  perfectKey: number;
  showPerfect: boolean;
  showGood: boolean;
  startGame: (characterId: "farmer_john" | "farmer_mary", mode?: GameModeType) => void;
  bankStack: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  handlePointerDown: (worldX: number) => void;
  handlePointerMove: (worldX: number) => void;
  handlePointerUp: () => void;
  setScreenDimensions: (width: number, height: number) => void;
  pokeDuck: (entityId: string) => void;
  /** Read per-frame tornado X position (world-space). Call inside useFrame/render loop. */
  getNextDropX: () => number;
  /** Read per-frame difficulty (0-1) for tornado intensity. */
  getDropDifficulty: () => number;
  /** Read per-frame drop imminence flag. */
  getIsDropImminent: () => boolean;
  /** Push a physics collision event from PhysicsCollisionBridge. */
  pushCollisionEvent: (event: import("../../features/gameplay/scene/components/PhysicsCollisionBridge").PhysicsCatchEvent) => void;
  weather: WeatherState | null;
  activePowerUps: { shield: boolean; slowMotion: boolean; scoreFrenzy: boolean };
}

export interface GameLogicCallbacks {
  onGameOver?: (score: number, bankedAnimals: number) => void;
}

export function useGameLogic(callbacks?: GameLogicCallbacks): UseGameLogicReturn {
  const engineRef = useRef<GameLogic | null>(null);
  const { reducedMotion } = useAccessibilitySettings();
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [combo, setCombo] = useState(0);
  const [stackHeight, setStackHeight] = useState(0);
  const [bankedAnimals, setBankedAnimals] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState<number>(GAME_CONFIG.lives.starting);
  const [maxLives, setMaxLives] = useState<number>(GAME_CONFIG.lives.max);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [canBank, setCanBank] = useState(false);
  const [inDanger, setInDanger] = useState(false);
  const [screenShake, setScreenShake] = useState(0);
  const [perfectKey, setPerfectKey] = useState(0);
  const [showPerfect, setShowPerfect] = useState(false);
  const [showGood, setShowGood] = useState(false);
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [activePowerUps, setActivePowerUps] = useState<{ shield: boolean; slowMotion: boolean; scoreFrenzy: boolean }>({ shield: false, slowMotion: false, scoreFrenzy: false });

  useEffect(() => {
    const engine = new GameLogic({
      onScoreChange: (s, m, c) => { setScore(s); setMultiplier(m); setCombo(c); },
      onStackChange: (h, cb) => { setStackHeight(h); setCanBank(cb); },
      onLivesChange: (l, ml) => { setLives(l); setMaxLives(ml); },
      onGameOver: (s, b) => {
        setIsPlaying(false);
        setIsGameOver(true);
        // Record session analytics
        const sessionData = engine.getSessionData();
        recordSession(sessionData).catch(() => {/* storage write failed, non-critical */});
        if (callbacks?.onGameOver) callbacks.onGameOver(s, b);
      },
      onPerfectCatch: () => { setPerfectKey(k => k + 1); setShowPerfect(true); setTimeout(() => setShowPerfect(false), 800); },
      onGoodCatch: () => { setShowGood(true); setTimeout(() => setShowGood(false), 600); },
      onMiss: () => {},
      onBankComplete: (t) => { setBankedAnimals(t); audioManager.play("bank_fanfare"); },
      onLevelUp: (l) => { setLevel(l); audioManager.play("levelup"); },
      onLifeEarned: () => audioManager.play("lifeup"),
      onDangerState: (d) => setInDanger(d),
      onStackTopple: () => { setScreenShake(1); audioManager.play("topple"); },
      onPowerUpCollected: (type) => {
        audioManager.play("powerup");
        if (type === "shield" || type === "full_restore") audioManager.play("lifeup");
      },
      onFireballShot: () => { audioManager.play("fireball"); },
      onAnimalFrozen: () => { audioManager.play("freeze"); },
      onScreenShake: (i) => setScreenShake(i),
      onParticleEffect: () => {},
      onWeatherChange: (w) => {
        setWeather(w);
        if (w.type === "windy" || w.type === "stormy") audioManager.play("weather_wind");
        if (w.type === "rainy" || w.type === "stormy") audioManager.play("weather_rain");
      },
      onComboMilestone: (combo) => {
        if (combo === 5) audioManager.play("combo5");
        else if (combo === 10) audioManager.play("combo10");
        else if (combo >= 15) audioManager.play("combo15");
      },
      onPowerUpStateChange: (state) => setActivePowerUps(state),
    });
    engineRef.current = engine;
    return () => engine.destroy();
  }, []);

  // Sync reducedMotion preference to game engine
  useEffect(() => {
    engineRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  // Controls Detection
  useEffect(() => {
    // Only process input if playing (paused state handled inside handlers for unpause)
    if (!isPlaying) return;

    const hasKeyboard = deviceManager.hasKeyboard();
    const keys = new Set<string>();
    let frameId: number;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!hasKeyboard) return;
      keys.add(e.code);

      const km = inputManager.getKeyMappings();

      // Toggle pause
      if (km.pause.some((k) => k === e.code)) {
        if (isPaused) {
           engineRef.current?.resume();
           setIsPaused(false);
           audioManager.resumeMusic();
        } else {
           engineRef.current?.pause();
           setIsPaused(true);
           audioManager.pauseMusic();
        }
      }

      // Bank
      if (km.action.some((k) => k === e.code) && canBank && !isPaused) {
        engineRef.current?.bankStack();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);

    const tick = () => {
      if (hasKeyboard && engineRef.current && !isPaused) {
        const km = inputManager.getKeyMappings();
        let dx = 0;
        // Tuning movement speed for keyboard
        const speed = 0.4;
        if (km.left.some((k) => keys.has(k))) dx -= speed;
        if (km.right.some((k) => keys.has(k))) dx += speed;

        // Apply sensitivity from motor settings
        const sensitivity = inputManager.getMotorSettings().inputSensitivity;
        dx *= sensitivity;

        if (dx !== 0) engineRef.current.movePlayer(dx);
      }
      frameId = requestAnimationFrame(tick);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    frameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      cancelAnimationFrame(frameId);
    };
  }, [isPlaying, isPaused, canBank]);

  const startGame = useCallback((characterId: "farmer_john" | "farmer_mary", mode?: GameModeType) => {
    setIsPlaying(true);
    setIsPaused(false);
    setIsGameOver(false);
    engineRef.current?.start(characterId, mode);
  }, []);

  return {
    score, multiplier, combo, stackHeight, bankedAnimals, level, lives, maxLives,
    isPlaying, isGameOver, isPaused, canBank, inDanger, screenShake,
    perfectKey, showPerfect, showGood,
    startGame, bankStack: () => engineRef.current?.bankStack(),
    pauseGame: () => { engineRef.current?.pause(); setIsPaused(true); },
    resumeGame: () => { engineRef.current?.resume(); setIsPaused(false); },
    handlePointerDown: (x) => engineRef.current?.handlePointerDown(x),
    handlePointerMove: (x) => engineRef.current?.handlePointerMove(x),
    handlePointerUp: () => engineRef.current?.handlePointerUp(),
    setScreenDimensions: (w, h) => engineRef.current?.setScreenDimensions(w, h),
    pokeDuck: (entityId: string) => engineRef.current?.pokeDuck(entityId),
    getNextDropX: () => engineRef.current?.getNextDropX() ?? 0,
    getDropDifficulty: () => engineRef.current?.getDropDifficulty() ?? 0,
    getIsDropImminent: () => engineRef.current?.getIsDropImminent() ?? false,
    pushCollisionEvent: (event) => engineRef.current?.pushCollisionEvent(event),
    weather,
    activePowerUps,
  };
}