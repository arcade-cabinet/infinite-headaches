/**
 * Game Over Screen
 * Shown when player fails, displays score and retry option
 * With dramatic animations
 */

import { Timeline } from "animejs";
import { useEffect, useMemo, useRef } from "react";
import { GameButton } from "../../game/components/GameButton";
import { GameCard } from "../../game/components/GameCard";
import { FAIL_MESSAGES } from "../../game/config";
import { useResponsiveScale } from "../../game/hooks/useResponsiveScale";

interface GameOverScreenProps {
  score: number;
  bankedAnimals: number;
  highScore: number;
  isNewHighScore: boolean;
  earnedCoins: number;
  onRetry: () => void;
  onMainMenu: () => void;
}

export function GameOverScreen({
  score,
  bankedAnimals,
  highScore,
  isNewHighScore,
  earnedCoins = 0,
  onRetry,
  onMainMenu,
}: GameOverScreenProps) {
  const { fontSize, spacing, isMobile } = useResponsiveScale();
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);
  const highScoreRef = useRef<HTMLDivElement>(null);

  const failMessage = useMemo(() => {
    return FAIL_MESSAGES[Math.floor(Math.random() * FAIL_MESSAGES.length)];
  }, []);

  // Entrance animations
  useEffect(() => {
    console.log("GameOverScreen mounted");
    const timeline = new Timeline({
      defaults: { ease: "outExpo" },
    });

    // Card drops in
    if (cardRef.current) {
      timeline.add(cardRef.current, {
        translateY: [-100, 0],
        opacity: [0, 1],
        scale: [0.8, 1],
        duration: 600,
      });
    }

    // Title shakes
    if (titleRef.current) {
      timeline.add(
        titleRef.current,
        {
          translateX: [-10, 10, -10, 10, 0],
          duration: 400,
          ease: "inOutSine",
        },
        "-=200"
      );
    }

    // Score counts up
    if (scoreRef.current) {
      const scoreEl = scoreRef.current;
      const counter = { val: 0 };
      timeline.add(
        counter,
        {
          val: score,
          duration: 800,
          ease: "outExpo",
          onUpdate: () => {
            scoreEl.textContent = Math.round(counter.val).toLocaleString();
          },
        },
        "-=400"
      );
    }

    // High score celebration
    if (isNewHighScore && highScoreRef.current) {
      timeline.add(highScoreRef.current, {
        scale: [0.5, 1.2, 1],
        rotate: ["-10deg", "10deg", "0deg"],
        duration: 600,
        ease: "outBack",
      });
    }

    return () => {
      timeline.pause();
    };
  }, [score, isNewHighScore]);

  return (
    <div 
      ref={cardRef} 
      className="opacity-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
    >
      <GameCard
        style={{
          padding: spacing.lg,
          maxWidth: isMobile ? "90vw" : "28rem",
        }}
      >
        {/* Title */}
        <h1
          id="game-over-title"
          ref={titleRef}
          className="game-font text-yellow-400 text-center mb-2"
          style={{
            fontSize: `clamp(2rem, ${parseFloat(fontSize.title) * 0.7}px, 4rem)`,
            textShadow: "4px 4px 0 #000",
          }}
        >
          WOBBLED OUT!
        </h1>

        {/* Score */}
        <div className="text-center mb-4" role="status">
          <p className="game-font text-amber-300" style={{ fontSize: fontSize.md }}>
            FINAL SCORE
          </p>
          <div className="flex items-baseline justify-center gap-2">
            <span
              ref={scoreRef}
              className="game-font text-white"
              aria-label={`Final Score: ${score}`}
              style={{
                fontSize: `clamp(2.5rem, ${parseFloat(fontSize.title)}px, 5rem)`,
                textShadow: "3px 3px 0 #000",
              }}
            >
              0
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex justify-center gap-4 mb-4" role="group" aria-label="Game Stats">
          {/* Banked animals */}
          {bankedAnimals > 0 && (
            <div className="text-center py-2 px-4 bg-pink-500/20 rounded-xl border-2 border-pink-400">
              <p className="game-font text-pink-300" style={{ fontSize: fontSize.sm }}>
                <span aria-hidden="true">🏦</span> {bankedAnimals} BANKED
              </p>
            </div>
          )}

          {/* Earned coins */}
          {earnedCoins > 0 && (
            <div className="text-center py-2 px-4 bg-yellow-500/20 rounded-xl border-2 border-yellow-400">
              <p className="game-font text-yellow-300" style={{ fontSize: fontSize.sm }}>
                <span aria-hidden="true">🪙</span> +{earnedCoins.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* New High Score celebration */}
        {isNewHighScore && (
          <div
            ref={highScoreRef}
            className="text-center mb-4 py-2 px-4 bg-yellow-400/20 rounded-xl border-2 border-yellow-400"
          >
            <p
              className="game-font text-yellow-300 glow-animation"
              style={{
                fontSize: fontSize.lg,
                textShadow: "0 0 20px rgba(253, 216, 53, 0.8)",
              }}
            >
              NEW HIGH SCORE!
            </p>
          </div>
        )}

        {/* Previous high score if not new */}
        {!isNewHighScore && highScore > 0 && (
          <p
            className="game-font text-orange-300 text-center mb-2"
            style={{ fontSize: fontSize.sm }}
          >
            Your best: {highScore.toLocaleString()}
          </p>
        )}

        {/* Fail message */}
        <p className="game-font text-red-400 text-center mb-6" style={{ fontSize: fontSize.md }}>
          {failMessage}
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3 items-center">
          <GameButton onClick={onRetry} size={isMobile ? "md" : "lg"}>
            TRY AGAIN
          </GameButton>
          <button
            onClick={onMainMenu}
            className="game-font text-amber-300 hover:text-white transition-colors underline decoration-dotted"
            style={{ fontSize: fontSize.sm }}
          >
            Back to Menu
          </button>
        </div>

        {/* Tips based on performance */}
        <p
          className="game-font text-stone-400/60 text-center mt-4"
          style={{ fontSize: fontSize.xs }}
        >
          {bankedAnimals === 0 && score > 100
            ? "Try banking your herd for safety!"
            : score < 50
              ? "Drag smoothly to reduce wobble!"
              : "Well played!"}
        </p>
      </GameCard>
    </div>
  );
}
