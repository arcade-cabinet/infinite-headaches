/**
 * useGameEngine Hook
 * React hook for managing the game engine lifecycle
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "../audio";
import { GAME_CONFIG } from "../config";
import { GameEngine } from "../engine/GameEngine";

export interface UseGameEngineReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
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
  perfectKey: number;
  showPerfect: boolean;
  showGood: boolean;
  inDanger: boolean;
  // Actions
  startGame: () => void;
  bankStack: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
}

interface UseGameEngineOptions {
  onGameOver?: (finalScore: number, bankedAnimals: number) => void;
  onLevelUp?: (level: number) => void;
  onLifeEarned?: () => void;
  onStackTopple?: () => void;
  onPowerUp?: (type: string) => void;
  onMerge?: (count: number) => void;
  onPerfectCatch?: () => void;
  onFireballShot?: () => void;
  onDuckFrozen?: () => void;
}

export function useGameEngine(options: UseGameEngineOptions = {}): UseGameEngineReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [combo, setCombo] = useState(0);
  const [stackHeight, setStackHeight] = useState(0);
  const [bankedAnimals, setBankedAnimals] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(GAME_CONFIG.lives.starting);
  const [maxLives] = useState(GAME_CONFIG.lives.max);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [canBank, setCanBank] = useState(false);
  const [perfectKey, setPerfectKey] = useState(0);
  const [showPerfect, setShowPerfect] = useState(false);
  const [showGood, setShowGood] = useState(false);
  const [inDanger, setInDanger] = useState(false);

  // Initialize engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, {
      onScoreChange: (newScore, newMultiplier, newCombo) => {
        setScore(newScore);
        setMultiplier(newMultiplier);
        setCombo(newCombo);
      },
      onStackChange: (height, canBankNow) => {
        setStackHeight(height);
        setCanBank(canBankNow);
      },
      onLivesChange: (newLives) => {
        setLives(newLives);
      },
      onGameOver: (finalScore, totalBanked) => {
        setIsPlaying(false);
        setIsGameOver(true);
        // Stop music on game over
        audioManager.stopMusic();
        options.onGameOver?.(finalScore, totalBanked);
      },
      onPerfectCatch: () => {
        setPerfectKey((prev) => prev + 1);
        setShowPerfect(true);
        setTimeout(() => setShowPerfect(false), 800);
        options.onPerfectCatch?.();
      },
      onGoodCatch: () => {
        setShowGood(true);
        setTimeout(() => setShowGood(false), 600);
      },
      onMiss: () => {
        // Could add miss animation here
      },
      onBankComplete: (total) => {
        setBankedAnimals(total);
      },
      onLevelUp: (newLevel) => {
        setLevel(newLevel);
        // Increase music intensity as level increases
        audioManager.setIntensity(Math.min(1, newLevel / 15));
        audioManager.play("levelup");
        options.onLevelUp?.(newLevel);
      },
      onLifeEarned: () => {
        audioManager.play("lifeup");
        options.onLifeEarned?.();
      },
      onDangerState: (danger) => {
        setInDanger(danger);
        // Increase music intensity when in danger (YUKA tension)
        if (danger) {
          audioManager.setIntensity(Math.min(1, 0.7 + Math.random() * 0.3));
        }
      },
      onStackTopple: () => {
        options.onStackTopple?.();
      },
      onPowerUpCollected: (type) => {
        audioManager.play("powerup");
        options.onPowerUp?.(type);
      },
      onMerge: (count) => {
        options.onMerge?.(count);
      },
      onFireballShot: () => {
        audioManager.play("fireball");
        options.onFireballShot?.();
      },
      onDuckFrozen: () => {
        audioManager.play("freeze");
        options.onDuckFrozen?.();
      },
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
    };
  }, [
    options.onGameOver,
    options.onLevelUp,
    options.onLifeEarned,
    options.onStackTopple,
    options.onDuckFrozen,
    options.onFireballShot,
    options.onMerge,
    options.onPerfectCatch,
    options.onPowerUp,
  ]);

  const startGame = useCallback(async () => {
    if (engineRef.current) {
      // Initialize and start audio/music
      await audioManager.init();

      // Check if user has muted sound
      const isMuted =
        typeof window !== "undefined" && localStorage.getItem("animal-muted") === "true";
      if (!isMuted) {
        audioManager.startMusic();
        audioManager.setIntensity(0.2); // Start with low intensity
      }

      setIsGameOver(false);
      setIsPlaying(true);
      setIsPaused(false);
      setScore(0);
      setMultiplier(1);
      setCombo(0);
      setStackHeight(0);
      setBankedAnimals(0);
      setLevel(1);
      setLives(GAME_CONFIG.lives.starting);
      setCanBank(false);
      setInDanger(false);
      engineRef.current.start();
    }
  }, []);

  const bankStack = useCallback(() => {
    if (engineRef.current && canBank) {
      engineRef.current.bankStack();
    }
  }, [canBank]);

  const pauseGame = useCallback(() => {
    if (engineRef.current && isPlaying && !isPaused) {
      engineRef.current.pause();
      setIsPaused(true);
      audioManager.stopMusic();
    }
  }, [isPlaying, isPaused]);

  const resumeGame = useCallback(() => {
    if (engineRef.current && isPaused) {
      engineRef.current.resume();
      setIsPaused(false);
      audioManager.startMusic();
    }
  }, [isPaused]);

  return {
    canvasRef,
    score,
    multiplier,
    combo,
    stackHeight,
    bankedAnimals,
    level,
    lives,
    maxLives,
    isPlaying,
    isGameOver,
    isPaused,
    canBank,
    perfectKey,
    showPerfect,
    showGood,
    inDanger,
    // Actions
    startGame,
    bankStack,
    pauseGame,
    resumeGame,
  };
}