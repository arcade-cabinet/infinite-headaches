/**
 * MainMenuOverlay - HTML overlay for the main menu
 *
 * This is the proper 3D expression of the old 2D MainMenu component.
 * Renders all text, buttons, and character info as HTML elements on top of
 * the BabylonJS canvas (which shows the 3D farmer carousel).
 *
 * Layout:
 * - Top: Title "HOMESTEAD HEADACHES" + tagline (animated entrance + float)
 * - Middle: Character name/traits + prev/next arrows (3D model visible behind)
 * - Bottom: GameCard with high score, PLAY, MODES, UPGRADES, coins, hint
 * - Decoration: PeekingAnimal from screen edges
 */

import { useEffect, useRef } from "react";
import { animate, Timeline } from "animejs";
import { GameButton } from "@/game/components/GameButton";
import { GameCard } from "@/game/components/GameCard";
import { GAME_INFO } from "@/game/config";
import { useResponsiveScale } from "@/game/hooks/useResponsiveScale";
import type { CharacterInfo } from "@/game/characters";

interface MainMenuOverlayProps {
  highScore: number;
  coins: number;
  selectedCharacter: CharacterInfo;
  onPrevCharacter: () => void;
  onNextCharacter: () => void;
  onPlay: () => void;
  onModes: () => void;
  onUpgrades: () => void;
  onStats: () => void;
  onSettings?: () => void;
}

export function MainMenuOverlay({
  highScore,
  coins,
  selectedCharacter,
  onPrevCharacter,
  onNextCharacter,
  onPlay,
  onModes,
  onUpgrades,
  onStats,
  onSettings,
}: MainMenuOverlayProps) {
  const { fontSize, spacing, isMobile } = useResponsiveScale();

  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const floatAnimRef = useRef<ReturnType<typeof animate> | null>(null);

  // Entrance animations
  useEffect(() => {
    const timeline = new Timeline({
      defaults: { ease: "outExpo" },
    });

    if (titleRef.current) {
      timeline.add(titleRef.current, {
        opacity: [0, 1],
        translateY: [-50, 0],
        duration: 1000,
      });
    }

    if (subtitleRef.current) {
      timeline.add(
        subtitleRef.current,
        { opacity: [0, 1], translateY: [20, 0], duration: 800 },
        "-=600"
      );
    }

    if (contentRef.current) {
      timeline.add(
        contentRef.current,
        { opacity: [0, 1], scale: [0.9, 1], duration: 800 },
        "-=400"
      );
    }

    return () => {
      timeline.pause();
    };
  }, []);

  // Floating title animation
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

  return (
    <>
      {/* Menu content overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-between py-4 md:py-8 safe-area-inset">

        {/* Title Section - top area */}
        <div className="text-center pointer-events-none">
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
              <>HOMESTEAD<br />HEADACHES</>
            ) : (
              <>HOMESTEAD HEADACHES</>
            )}
          </h1>

          <p
            ref={subtitleRef}
            className="game-font text-amber-200 mt-2 md:mt-3 opacity-0"
            style={{
              fontSize: fontSize.md,
              textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            {GAME_INFO.tagline}
          </p>
        </div>

        {/* Character Carousel Controls - middle area */}
        <div className="flex items-center justify-center gap-4 md:gap-8 pointer-events-auto">
          <button
            onClick={onPrevCharacter}
            className="text-4xl md:text-5xl text-white/80 hover:text-yellow-400 transition-colors drop-shadow-lg p-3 md:p-4 -m-3 md:-m-4"
            aria-label="Previous Character"
          >
            ‹
          </button>

          {/* Character info - semi-transparent card so text is readable over 3D */}
          <div className="text-center min-w-[200px] md:min-w-[260px] bg-black/40 backdrop-blur-sm rounded-xl px-4 py-3 md:px-6 md:py-4 border border-amber-900/30">
            <h3
              className="game-font text-white text-xl md:text-2xl"
              style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
            >
              {selectedCharacter.name}
            </h3>
            <p
              className="game-font text-amber-200 text-sm md:text-base"
              style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.8)" }}
            >
              {selectedCharacter.role}
            </p>
            <div className="mt-2 text-xs md:text-sm">
              <span
                className="text-green-400 block"
                style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.8)" }}
              >
                + {selectedCharacter.traits.positive}
              </span>
              <span
                className="text-red-400 block"
                style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.8)" }}
              >
                - {selectedCharacter.traits.negative}
              </span>
            </div>
          </div>

          <button
            onClick={onNextCharacter}
            className="text-4xl md:text-5xl text-white/80 hover:text-yellow-400 transition-colors drop-shadow-lg p-3 md:p-4 -m-3 md:-m-4"
            aria-label="Next Character"
          >
            ›
          </button>
        </div>

        {/* Bottom area - buttons and info */}
        <div ref={contentRef} className="opacity-0 pointer-events-auto px-4 w-full max-w-md">
          <GameCard
            className="backdrop-blur-sm"
            style={{ padding: spacing.md }}
          >
            {/* High Score Display */}
            {highScore > 0 && (
              <div className="game-font text-center mb-3" style={{ fontSize: fontSize.sm }}>
                <span className="text-amber-300">YOUR BEST</span>
                <div className="text-orange-300 font-bold" style={{ fontSize: fontSize.lg }}>
                  {highScore.toLocaleString()} POINTS
                </div>
              </div>
            )}

            {/* Main Buttons */}
            <div className="flex flex-col gap-3">
              <GameButton
                onClick={onPlay}
                style={{
                  fontSize: `clamp(1rem, ${parseFloat(fontSize.lg)}px, 1.5rem)`,
                  padding: `${spacing.sm} ${spacing.lg}`,
                }}
              >
                PLAY
              </GameButton>

              <div className="flex flex-wrap gap-2">
                <GameButton
                  onClick={onModes}
                  variant="secondary"
                  className="flex-1"
                  style={{ fontSize: fontSize.sm }}
                >
                  MODES
                </GameButton>
                <GameButton
                  onClick={onUpgrades}
                  variant="secondary"
                  className="flex-1"
                  style={{ fontSize: fontSize.sm }}
                >
                  UPGRADES
                </GameButton>
                <GameButton
                  onClick={onStats}
                  variant="secondary"
                  className="flex-1"
                  style={{ fontSize: fontSize.sm }}
                >
                  STATS
                </GameButton>
                {onSettings && (
                  <GameButton
                    onClick={onSettings}
                    variant="secondary"
                    className="flex-1"
                    style={{ fontSize: fontSize.sm }}
                  >
                    SETTINGS
                  </GameButton>
                )}
              </div>
            </div>

            {/* Coins display */}
            {coins > 0 && (
              <div
                className="game-font text-center mt-3 text-yellow-400"
                style={{ fontSize: fontSize.xs }}
              >
                {coins.toLocaleString()} coins
              </div>
            )}

            {/* Controls hint */}
            <p
              className="game-font text-stone-400 text-center mt-3"
              style={{ fontSize: fontSize.xs }}
            >
              {isMobile
                ? "Drag to move \u2022 Tap stack to poke"
                : "Drag to move \u2022 Click ducks to poke them"}
            </p>
          </GameCard>
        </div>
      </div>

      {/* Decorative psychic waves */}
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
    </>
  );
}
