/**
 * Score Display Component
 * Shows current score, multiplier, combo, level, and lives
 */

import { animate } from "animejs";
import { useEffect, useRef } from "react";
import { useResponsiveScale } from "../hooks/useResponsiveScale";
import { HeartsDisplay } from "./HeartsDisplay";

interface ScoreDisplayProps {
  score: number;
  multiplier: number;
  combo: number;
  level: number;
  stackHeight: number;
  bankedAnimals: number;
  highScore: number;
  lives: number;
  maxLives: number;
  inDanger: boolean;
}

export function ScoreDisplay({
  score,
  multiplier,
  combo,
  level,
  stackHeight,
  bankedAnimals,
  highScore,
  lives,
  maxLives,
  inDanger,
}: ScoreDisplayProps) {
  const { fontSize, spacing, isMobile } = useResponsiveScale();
  const scoreRef = useRef<HTMLDivElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef<HTMLDivElement>(null);
  const prevScoreRef = useRef(score);
  const prevLevelRef = useRef(level);
  const prevComboRef = useRef(combo);

  // Animate score change
  useEffect(() => {
    if (score !== prevScoreRef.current && scoreRef.current) {
      animate(scoreRef.current, {
        scale: [1.15, 1],
        duration: 150,
        ease: "outBack",
      });
      prevScoreRef.current = score;
    }
  }, [score]);

  // Animate level up
  useEffect(() => {
    if (level !== prevLevelRef.current && levelRef.current) {
      animate(levelRef.current, {
        scale: [1.4, 1],
        color: ["#FFD700", "#FFF"],
        duration: 400,
        ease: "outElastic(1, .6)",
      });
      prevLevelRef.current = level;
    }
  }, [level]);

  // Animate combo change
  useEffect(() => {
    if (combo > prevComboRef.current && comboRef.current && combo > 1) {
      animate(comboRef.current, {
        scale: [1.3, 1],
        translateY: [-5, 0],
        duration: 200,
        ease: "outBack",
      });
    }
    prevComboRef.current = combo;
  }, [combo]);

  return (
    <header className="contents">
      {/* Top left - Lives and Score */}
      <div
        className="absolute pointer-events-none z-30"
        style={{
          top: `calc(${spacing.sm} + env(safe-area-inset-top, 0px))`,
          left: spacing.sm,
        }}
        role="status"
        aria-live="polite"
      >
        {/* Lives */}
        <HeartsDisplay lives={lives} maxLives={maxLives} />

        {/* Score */}
        <div
          ref={scoreRef}
          className="game-font text-white"
          aria-label={`Score: ${score}`}
          style={{
            fontSize: `clamp(1.3rem, ${parseFloat(fontSize.title) * 0.45}px, 2.5rem)`,
            textShadow: "2px 2px 0 #000",
            lineHeight: 1,
            marginTop: spacing.xs,
          }}
        >
          {score.toLocaleString()}
        </div>

        {/* Multiplier */}
        {multiplier > 1 && (
          <div
            className="game-font text-yellow-300"
            aria-label={`Multiplier: ${multiplier.toFixed(1)}`}
            style={{
              fontSize: fontSize.sm,
              textShadow: "1px 1px 0 #000",
            }}
          >
            ×{multiplier.toFixed(1)}
          </div>
        )}

        {/* Combo */}
        {combo > 1 && (
          <div
            ref={comboRef}
            className="game-font text-cyan-300"
            aria-label={`${combo} combo`}
            style={{
              fontSize: fontSize.sm,
              textShadow: "1px 1px 0 #000",
            }}
          >
            {combo}× COMBO
          </div>
        )}

        {/* High score */}
        <div
          className="game-font text-amber-200"
          aria-label={`High score: ${highScore}`}
          style={{
            fontSize: fontSize.xs,
            textShadow: "1px 1px 0 #000",
            marginTop: spacing.xs,
            opacity: 0.8,
          }}
        >
          BEST: {highScore.toLocaleString()}
        </div>
      </div>

      {/* Top right - Level and Stack */}
      <div
        className="absolute pointer-events-none z-30 text-right"
        style={{
          top: `calc(${spacing.sm} + env(safe-area-inset-top, 0px))`,
          right: `calc(${spacing.sm} + 65px)`, // Account for bank zone
        }}
        role="status"
      >
        {/* Level */}
        <div
          ref={levelRef}
          className="game-font text-white"
          aria-label={`Level ${level}`}
          style={{
            fontSize: fontSize.md,
            textShadow: "2px 2px 0 #000",
          }}
        >
          LV.{level}
        </div>

        {/* Stack height with danger indicator */}
        <div
          className={`game-font ${inDanger ? "text-red-400" : "text-orange-300"}`}
          aria-label={`Stack height: ${stackHeight}${inDanger ? ", Danger!" : ""}`}
          style={{
            fontSize: fontSize.sm,
            textShadow: "1px 1px 0 #000",
            animation: inDanger ? "pulse 0.5s ease-in-out infinite" : "none",
          }}
        >
          STACK: {stackHeight}
          {inDanger && <span aria-hidden="true"> ⚠️</span>}
        </div>

          {/* Banked animals */}
          {bankedAnimals > 0 && (
            <div
              className="game-font text-pink-300"
              aria-label={`Banked animals: ${bankedAnimals}`}
              style={{
                fontSize: fontSize.xs,
                textShadow: "1px 1px 0 #000",
              }}
            >
              BANKED: {bankedAnimals}
            </div>
          )}
      </div>
    </header>
  );
}
