/**
 * useGameLogic Hook
 * React hook for the pure logic game engine (no canvas dependency)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Vector3 } from "@babylonjs/core";
import { audioManager } from "../audio";
import { GAME_CONFIG } from "../config";
import { GameLogic, type GameLogicState, screenToWorld } from "../engine/GameLogic";

export interface UseGameLogicReturn {
  // State
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
  // Perfect/Good indicators
  perfectKey: number;
  showPerfect: boolean;
  showGood: boolean;
  // Actions
  startGame: (characterId?: "farmer_john" | "farmer_mary") => void;
  bankStack: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  // Input handlers (called by Babylon InputManager)
  handlePointerDown: (worldX: number) => void;
  handlePointerMove: (worldX: number) => void;
  handlePointerUp: () => void;
  // Screen dimension update
  setScreenDimensions: (width: number, height: number) => void;
}

interface UseGameLogicOptions {
  onGameOver?: (finalScore: number, bankedAnimals: number) => void;
  onLevelUp?: (level: number) => void;
  onLifeEarned?: () => void;
  onStackTopple?: () => void;
  onPowerUp?: (type: string) => void;
  onMerge?: (count: number) => void;
  onPerfectCatch?: () => void;
  onFireballShot?: () => void;
  onAnimalFrozen?: () => void;
}

export function useGameLogic(options: UseGameLogicOptions = {}): UseGameLogicReturn {
  const engineRef = useRef<GameLogic | null>(null);
  const characterRef = useRef<"farmer_john" | "farmer_mary">("farmer_john");

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
  const [inDanger, setInDanger] = useState(false);
  const [screenShake, setScreenShake] = useState(0);
  const [perfectKey, setPerfectKey] = useState(0);
  const [showPerfect, setShowPerfect] = useState(false);
  const [showGood, setShowGood] = useState(false);

  // Initialize engine
  useEffect(() => {
    const engine = new GameLogic({
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
        // Play game over voice
        audioManager.playVoice("gameover");
        options.onGameOver?.(finalScore, totalBanked);
      },
      onPerfectCatch: (_pos: Vector3) => {
        setPerfectKey((prev) => prev + 1);
        setShowPerfect(true);
        setTimeout(() => setShowPerfect(false), 800);
        audioManager.playWithVoice("perfect", "perfect");
        options.onPerfectCatch?.();
      },
      onGoodCatch: (_pos: Vector3) => {
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
        audioManager.setIntensity(Math.min(1, newLevel / 15));
        audioManager.playWithVoice("levelup", "levelup");
        options.onLevelUp?.(newLevel);
      },
      onLifeEarned: () => {
        audioManager.play("lifeup");
        options.onLifeEarned?.();
      },
      onDangerState: (danger) => {
        setInDanger(danger);
        if (danger) {
          audioManager.setIntensity(Math.min(1, 0.7 + Math.random() * 0.3));
          audioManager.playVoice("danger");
        }
      },
      onStackTopple: () => {
        options.onStackTopple?.();
      },
      onPowerUpCollected: (type) => {
        audioManager.playWithVoice("powerup", "powerup");
        options.onPowerUp?.(type);
      },
      onMerge: (count) => {
        options.onMerge?.(count);
      },
      onFireballShot: () => {
        audioManager.play("fireball");
        options.onFireballShot?.();
      },
      onAnimalFrozen: () => {
        audioManager.play("freeze");
        options.onAnimalFrozen?.();
      },
      onScreenShake: (intensity) => {
        setScreenShake(intensity);
      },
      onParticleEffect: (_type, _position) => {
        // Particle effects are handled by the 3D renderer
      },
    });

    engineRef.current = engine;

    // Set initial screen dimensions
    if (typeof window !== "undefined") {
      engine.setScreenDimensions(window.innerWidth, window.innerHeight);
    }

    return () => {
      engine.destroy();
    };
  }, [
    options.onGameOver,
    options.onLevelUp,
    options.onLifeEarned,
    options.onStackTopple,
    options.onAnimalFrozen,
    options.onFireballShot,
    options.onMerge,
    options.onPerfectCatch,
    options.onPowerUp,
  ]);

  const startGame = useCallback(
    async (characterId: "farmer_john" | "farmer_mary" = "farmer_john") => {
      if (!engineRef.current) return;

      characterRef.current = characterId;

      // Initialize audio
      await audioManager.init();

      // Set character voice (male for John, female for Mary)
      audioManager.setCharacterVoice(characterId === "farmer_mary" ? "female" : "male");

      // Check if user has muted sound
      const isMuted =
        typeof window !== "undefined" && localStorage.getItem("animal-muted") === "true";

      if (!isMuted) {
        // Play character-specific music track
        const trackName = characterId === "farmer_john" ? "farmerJohn" : "farmerMary";
        audioManager.playTrack(trackName);
        audioManager.setIntensity(0.2);
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
      setScreenShake(0);

      engineRef.current.start(characterId);
    },
    []
  );

  const bankStack = useCallback(() => {
    if (engineRef.current && canBank) {
      engineRef.current.bankStack();
    }
  }, [canBank]);

  const pauseGame = useCallback(() => {
    if (engineRef.current && isPlaying && !isPaused) {
      engineRef.current.pause();
      setIsPaused(true);
      audioManager.pauseMusic();
    }
  }, [isPlaying, isPaused]);

  const resumeGame = useCallback(() => {
    if (engineRef.current && isPaused) {
      engineRef.current.resume();
      setIsPaused(false);
      audioManager.resumeMusic();
    }
  }, [isPaused]);

  const handlePointerDown = useCallback((worldX: number) => {
    engineRef.current?.handlePointerDown(worldX);
  }, []);

  const handlePointerMove = useCallback((worldX: number) => {
    engineRef.current?.handlePointerMove(worldX);
  }, []);

  const handlePointerUp = useCallback(() => {
    engineRef.current?.handlePointerUp();
  }, []);

  const setScreenDimensions = useCallback((width: number, height: number) => {
    engineRef.current?.setScreenDimensions(width, height);
  }, []);

  return {
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
    inDanger,
    screenShake,
    perfectKey,
    showPerfect,
    showGood,
    // Actions
    startGame,
    bankStack,
    pauseGame,
    resumeGame,
    // Input handlers
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    // Screen dimensions
    setScreenDimensions,
  };
}
