/**
 * useGameLogic Hook
 * React hook for the pure logic game engine
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Vector3 } from "@babylonjs/core";
import { audioManager } from "../audio";
import { GAME_CONFIG } from "../config";
import { GameLogic } from "../engine/GameLogic";
import { deviceManager } from "../../platform/device";

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
  startGame: (characterId: "farmer_john" | "farmer_mary") => void;
  bankStack: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  handlePointerDown: (worldX: number) => void;
  handlePointerMove: (worldX: number) => void;
  handlePointerUp: () => void;
  setScreenDimensions: (width: number, height: number) => void;
}

export interface GameLogicCallbacks {
  onGameOver?: (score: number, bankedAnimals: number) => void;
}

export function useGameLogic(callbacks?: GameLogicCallbacks): UseGameLogicReturn {
  const engineRef = useRef<GameLogic | null>(null);
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [combo, setCombo] = useState(0);
  const [stackHeight, setStackHeight] = useState(0);
  const [bankedAnimals, setBankedAnimals] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState<number>(GAME_CONFIG.lives.starting);
  const [maxLives] = useState(GAME_CONFIG.lives.max);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [canBank, setCanBank] = useState(false);
  const [inDanger, setInDanger] = useState(false);
  const [screenShake, setScreenShake] = useState(0);
  const [perfectKey, setPerfectKey] = useState(0);
  const [showPerfect, setShowPerfect] = useState(false);
  const [showGood, setShowGood] = useState(false);

  useEffect(() => {
    const engine = new GameLogic({
      onScoreChange: (s, m, c) => { setScore(s); setMultiplier(m); setCombo(c); },
      onStackChange: (h, cb) => { setStackHeight(h); setCanBank(cb); },
      onLivesChange: (l) => { setLives(l); },
      onGameOver: (s, b) => { 
        setIsPlaying(false); 
        setIsGameOver(true);
        if (callbacks?.onGameOver) callbacks.onGameOver(s, b);
      },
      onPerfectCatch: () => { setPerfectKey(k => k + 1); setShowPerfect(true); setTimeout(() => setShowPerfect(false), 800); },
      onGoodCatch: () => { setShowGood(true); setTimeout(() => setShowGood(false), 600); },
      onMiss: () => {},
      onBankComplete: (t) => setBankedAnimals(t),
      onLevelUp: (l) => { setLevel(l); audioManager.play("levelup"); },
      onLifeEarned: () => audioManager.play("lifeup"),
      onDangerState: (d) => setInDanger(d),
      onStackTopple: () => {},
      onPowerUpCollected: () => {},
      onFireballShot: () => {},
      onAnimalFrozen: () => {},
      onScreenShake: (i) => setScreenShake(i),
      onParticleEffect: () => {},
    });
    engineRef.current = engine;
    return () => engine.destroy();
  }, []);

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
      
      // Toggle pause
      if (e.code === "Space" || e.code === "Escape" || e.code === "KeyP") {
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
      if ((e.code === "Enter" || e.code === "ArrowUp") && canBank && !isPaused) {
        engineRef.current?.bankStack();
      }
    };
    
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);

    const tick = () => {
      if (hasKeyboard && engineRef.current && !isPaused) {
        let dx = 0;
        // Tuning movement speed for keyboard
        const speed = 0.4; 
        if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= speed;
        if (keys.has("ArrowRight") || keys.has("KeyD")) dx += speed;
        
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

  const startGame = useCallback((characterId: "farmer_john" | "farmer_mary") => {
    setIsPlaying(true);
    setIsPaused(false);
    engineRef.current?.start(characterId);
  }, []);

  return {
    score, multiplier, combo, stackHeight, bankedAnimals, level, lives, maxLives,
    isPlaying, isGameOver, isPaused, canBank, inDanger, screenShake,
    perfectKey, showPerfect, showGood,
    startGame, bankStack: () => engineRef.current?.bankStack(),
    pauseGame: () => engineRef.current?.pause(),
    resumeGame: () => engineRef.current?.resume(),
    handlePointerDown: (x) => engineRef.current?.handlePointerDown(x),
    handlePointerMove: (x) => engineRef.current?.handlePointerMove(x),
    handlePointerUp: () => engineRef.current?.handlePointerUp(),
    setScreenDimensions: (w, h) => engineRef.current?.setScreenDimensions(w, h),
  };
}