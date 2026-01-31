/**
 * Main Menu Screen
 * Immersive landing page with animated Animal and proper game title
 */

import { animate, Timeline } from "animejs";
import { useEffect, useRef, useState } from "react";
import { GameButton } from "../components/GameButton";
import { GameCard } from "../components/GameCard";
import { ModeSelect } from "../components/ModeSelect";
import { PeekingAnimal } from "../components/PeekingAnimal";
import { UpgradeShop } from "../components/UpgradeShop";
import { CharacterSelect } from "./CharacterSelect";
import { GAME_INFO } from "../config";
import { useResponsiveScale } from "../hooks/useResponsiveScale";
import type { GameModeType } from "../modes/GameMode";
import { getCoins } from "../progression/Upgrades";

interface MainMenuProps {
  onPlay: (mode?: GameModeType) => void;
  highScore: number;
}

export function MainMenu({ onPlay, highScore }: MainMenuProps) {
  const { fontSize, spacing, isMobile, game } = useResponsiveScale();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const floatAnimRef = useRef<ReturnType<typeof animate> | null>(null);

  const [showShop, setShowShop] = useState(false);
  const [showModes, setShowModes] = useState(false);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [coins, setCoins] = useState(0);

  // Load coins
  useEffect(() => {
    setCoins(getCoins());
  }, []);

  // Entrance animations
  useEffect(() => {
    const timeline = new Timeline({
      defaults: { ease: "outExpo" },
    });

    // Animate title
    if (titleRef.current) {
      timeline.add(titleRef.current, {
        opacity: [0, 1],
        translateY: [-50, 0],
        duration: 1000,
      });
    }

    // Animate subtitle
    if (subtitleRef.current) {
      timeline.add(
        subtitleRef.current,
        {
          opacity: [0, 1],
          translateY: [20, 0],
          duration: 800,
        },
        "-=600"
      );
    }

    // Animate content card
    if (contentRef.current) {
      timeline.add(
        contentRef.current,
        {
          opacity: [0, 1],
          scale: [0.9, 1],
          duration: 800,
        },
        "-=400"
      );
    }

    return () => {
      timeline.pause();
    };
  }, []);

  // Floating animation for title
  useEffect(() => {
    if (!titleRef.current) return;

    floatAnimRef.current = animate(titleRef.current, {
      translateY: [-8, 8],
      rotate: [-1, 1],
      duration: 3000,
      alternate: true,
      loop: true,
      ease: "inOutSine",
    });

    return () => {
      if (floatAnimRef.current) floatAnimRef.current.pause();
    };
  }, []);

  const handleSelectMode = (mode: GameModeType) => {
    setShowModes(false);
    onPlay(mode);
  };

  return (
    <>
      {/* Peeking Animal */}
      <PeekingAnimal scale={game * 1.2} />

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center w-full h-full px-4">
        {/* Title Section */}
        <div className="text-center mb-4 md:mb-8">
          <h1
            ref={titleRef}
            className="game-font text-yellow-400 leading-none opacity-0"
            style={{
              fontSize: `clamp(1.6rem, ${parseFloat(fontSize.title) * 0.7}px, 3.5rem)`,
              textShadow: `
                4px 4px 0 #000,
                -1px -1px 0 #000,
                1px -1px 0 #000,
                -1px 1px 0 #000,
                0 0 20px rgba(253, 216, 53, 0.5)
              `,
              filter: "drop-shadow(0 0 30px rgba(253, 216, 53, 0.3))",
            }}
          >
            {isMobile ? (
              <>
                HOMESTEAD
                <br />
                HEADACHES
              </>
            ) : (
              <>
                HOMESTEAD HEADACHES
              </>
            )}
          </h1>

          <p
            ref={subtitleRef}
            className="game-font text-purple-200 mt-2 md:mt-4 opacity-0"
            style={{
              fontSize: fontSize.md,
              textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            {GAME_INFO.tagline}
          </p>
        </div>

        {/* Game Card */}
        <div ref={contentRef} className="opacity-0">
          <GameCard
            className="backdrop-blur-sm"
            style={{
              padding: spacing.md,
              maxWidth: isMobile ? "92vw" : "30rem",
            }}
          >
            {/* Instructions */}
            <div
              className="game-font text-purple-100 mb-4 text-center leading-relaxed"
              style={{ fontSize: fontSize.sm }}
            >
              <p className="mb-2">
                <span className="text-yellow-300">DRAG</span> your Duck to catch falling ducks
              </p>
              <p className="mb-2">
                Stack carefully - too much <span className="text-red-300">wobble</span> and they'll
                topple!
              </p>
              <p className="mb-2">
                <span className="text-orange-300">TAP</span> special ducks to use their{" "}
                <span className="text-cyan-300">powers!</span>
              </p>
              <p>
                Stack 5+ ducks? Hit the <span className="text-pink-300">CaptureBall</span> to bank them
                safe!
              </p>
            </div>

            {/* High Score Display */}
            {highScore > 0 && (
              <div className="game-font text-center mb-4" style={{ fontSize: fontSize.sm }}>
                <span className="text-purple-300">YOUR BEST</span>
                <div className="text-orange-300 font-bold" style={{ fontSize: fontSize.lg }}>
                  {highScore.toLocaleString()} POINTS
                </div>
              </div>
            )}

            {/* Main Buttons */}
            <div className="flex flex-col gap-3">
              <GameButton
                onClick={() => setShowCharacterSelect(true)}
                style={{
                  fontSize: `clamp(1rem, ${parseFloat(fontSize.lg)}px, 1.5rem)`,
                  padding: `${spacing.sm} ${spacing.lg}`,
                }}
              >
                PLAY
              </GameButton>

              <div className="flex gap-2">
                <GameButton
                  onClick={() => setShowModes(true)}
                  variant="secondary"
                  className="flex-1"
                  style={{ fontSize: fontSize.sm }}
                >
                  🎮 MODES
                </GameButton>
                <GameButton
                  onClick={() => setShowShop(true)}
                  variant="secondary"
                  className="flex-1"
                  style={{ fontSize: fontSize.sm }}
                >
                  ⬆️ UPGRADES
                </GameButton>
              </div>
            </div>

            {/* Coins display */}
            {coins > 0 && (
              <div
                className="game-font text-center mt-3 text-yellow-400"
                style={{ fontSize: fontSize.xs }}
              >
                🪙 {coins.toLocaleString()} coins
              </div>
            )}

            {/* Controls hint */}
            <p
              className="game-font text-purple-400 text-center mt-3"
              style={{ fontSize: fontSize.xs }}
            >
              {isMobile
                ? "Drag to move • Tap stack to poke"
                : "Drag to move • Click ducks to poke them"}
            </p>
          </GameCard>
        </div>

        {/* Credits */}
        <p
          className="game-font text-purple-500/60 mt-4 text-center"
          style={{ fontSize: fontSize.xs }}
        >
          A tribute to the ultimate stack
        </p>
      </div>

      {/* Decorative psychic waves in background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute rounded-full opacity-10 animate-pulse"
          style={{
            width: "150vmax",
            height: "150vmax",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, rgba(239,83,80,0.3) 0%, transparent 70%)",
            animation: "pulse 4s ease-in-out infinite",
          }}
        />
      </div>

      {/* Upgrade Shop Modal */}
      {showShop && <UpgradeShop onClose={() => setShowShop(false)} />}

      {/* Mode Select Modal */}
      {showModes && (
        <ModeSelect onSelectMode={handleSelectMode} onClose={() => setShowModes(false)} />
      )}

      {/* Character Select Modal */}
      {showCharacterSelect && (
        <CharacterSelect 
          onSelect={(charId) => {
            setShowCharacterSelect(false);
            onPlay("endless");
          }} 
          onBack={() => setShowCharacterSelect(false)} 
        />
      )}
    </>
  );
}