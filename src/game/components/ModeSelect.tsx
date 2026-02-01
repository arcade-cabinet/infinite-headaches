/**
 * Mode Selection Component
 * Choose between different game modes
 */

import { animate } from "animejs";
import { useEffect, useRef } from "react";
import { useResponsiveScale } from "../hooks/useResponsiveScale";
import { GAME_MODES, type GameModeConfig, type GameModeType } from "../modes/GameMode";
import { GameButton } from "./GameButton";
import { GameCard } from "./GameCard";

interface ModeSelectProps {
  onSelectMode: (mode: GameModeType) => void;
  onClose: () => void;
}

export function ModeSelect({ onSelectMode, onClose }: ModeSelectProps) {
  const { fontSize, spacing, isMobile } = useResponsiveScale();
  const containerRef = useRef<HTMLDivElement>(null);

  // Entrance animation
  useEffect(() => {
    if (!containerRef.current) return;
    animate(containerRef.current, {
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 400,
      ease: "outBack",
    });
  }, []);

  const modes = Object.values(GAME_MODES);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        className="opacity-0 w-full max-w-lg"
      >
        <GameCard style={{ padding: spacing.lg }}>
          {/* Header */}
          <h2
            className="game-font text-yellow-400 text-center mb-4"
            style={{ fontSize: fontSize.xl, textShadow: "2px 2px 0 #000" }}
          >
            SELECT MODE
          </h2>

          {/* Mode cards */}
          <div className="space-y-3">
            {modes.map((mode) => (
              <ModeCard
                key={mode.id}
                mode={mode}
                onSelect={() => mode.unlocked && onSelectMode(mode.id)}
              />
            ))}
          </div>

          {/* Back button */}
          <div className="flex justify-center mt-4">
            <GameButton onClick={onClose} variant="secondary">
              BACK
            </GameButton>
          </div>
        </GameCard>
      </div>
    </div>
  );
}

interface ModeCardProps {
  mode: GameModeConfig;
  onSelect: () => void;
}

function ModeCard({ mode, onSelect }: ModeCardProps) {
  const { fontSize, spacing } = useResponsiveScale();
  const isLocked = !mode.unlocked;

  return (
    <button
      onClick={onSelect}
      disabled={isLocked}
      className={`
        w-full text-left rounded-xl p-4 transition-all duration-200
        ${
          isLocked
            ? "bg-gray-800/50 opacity-60 cursor-not-allowed"
            : "bg-amber-900/50 hover:bg-amber-800/50 hover:scale-[1.02] cursor-pointer"
        }
        border-2
        ${isLocked ? "border-gray-600/30" : "border-amber-600/40"}
      `}
      style={{ borderLeftColor: isLocked ? undefined : mode.color, borderLeftWidth: "4px" }}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className={`
            flex items-center justify-center w-14 h-14 rounded-xl
            ${isLocked ? "bg-gray-700/50" : "bg-amber-950/50"}
          `}
          style={{ fontSize: "1.8rem" }}
        >
          {isLocked ? "🔒" : mode.icon}
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`game-font ${isLocked ? "text-gray-400" : "text-white"}`}
              style={{ fontSize: fontSize.md }}
            >
              {mode.name}
            </span>

            {mode.scoreMultiplier !== 1 && !isLocked && (
              <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 text-xs">
                {mode.scoreMultiplier}x Score
              </span>
            )}
          </div>

          <p
            className={`${isLocked ? "text-gray-500" : "text-amber-200"} mt-1`}
            style={{ fontSize: fontSize.sm }}
          >
            {isLocked ? mode.unlockCondition : mode.description}
          </p>

          {/* Special rules preview */}
          {!isLocked && mode.specialRules && mode.specialRules.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {mode.specialRules.slice(0, 2).map((rule, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full bg-amber-950/50 text-amber-200"
                  style={{ fontSize: "10px" }}
                >
                  {rule}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Chevron or lock */}
        <div className={`text-2xl ${isLocked ? "text-gray-600" : "text-amber-400"}`}>
          {isLocked ? "" : "›"}
        </div>
      </div>
    </button>
  );
}
