/**
 * Pause Menu Component
 * Overlay shown when game is paused
 */

import { animate } from "animejs";
import { useEffect, useRef } from "react";
import { useResponsiveScale } from "../hooks/useResponsiveScale";
import { GameButton } from "./GameButton";
import { GameCard } from "./GameCard";

interface PauseMenuProps {
  onResume: () => void;
  onMainMenu: () => void;
  onRestart: () => void;
  score: number;
  level: number;
}

export function PauseMenu({ onResume, onMainMenu, onRestart, score, level }: PauseMenuProps) {
  const { fontSize, spacing, isMobile } = useResponsiveScale();
  const containerRef = useRef<HTMLDivElement>(null);

  // Entrance animation
  useEffect(() => {
    if (!containerRef.current) return;

    animate(containerRef.current, {
      opacity: [0, 1],
      scale: [0.9, 1],
      duration: 300,
      ease: "outBack",
    });
  }, []);

  // Handle escape key to resume
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onResume();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onResume]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onResume}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-menu-title"
    >
      <div ref={containerRef} onClick={(e) => e.stopPropagation()} className="opacity-0">
        <GameCard
          className="text-center"
          style={{
            padding: spacing.lg,
            minWidth: isMobile ? "85vw" : "320px",
          }}
        >
          {/* Title */}
          <h2
            id="pause-menu-title"
            className="game-font text-yellow-400 mb-4"
            style={{
              fontSize: fontSize.xl,
              textShadow: "2px 2px 0 #000",
            }}
          >
            PAUSED
          </h2>

          {/* Current stats */}
          <div className="game-font text-amber-200 mb-6" style={{ fontSize: fontSize.sm }} role="status">
            <div>
              Score: <span className="text-white" aria-label={`Current Score: ${score}`}>{score.toLocaleString()}</span>
            </div>
            <div>
              Level: <span className="text-white" aria-label={`Current Level: ${level}`}>{level}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <GameButton onClick={onResume} variant="primary" style={{ fontSize: fontSize.md }}>
              RESUME
            </GameButton>

            <GameButton onClick={onRestart} variant="secondary" style={{ fontSize: fontSize.sm }}>
              RESTART
            </GameButton>

            <GameButton onClick={onMainMenu} variant="secondary" style={{ fontSize: fontSize.sm }}>
              MAIN MENU
            </GameButton>
          </div>

          {/* Hint */}
          <p className="game-font text-stone-400 mt-4" style={{ fontSize: fontSize.xs }}>
            Press ESC or tap outside to resume
          </p>
        </GameCard>
      </div>
    </div>
  );
}
