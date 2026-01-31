/**
 * Hearts Display Component
 * Shows lives as animated hearts
 */

import { animate } from "animejs";
import { useEffect, useRef } from "react";
import { GAME_CONFIG } from "../config";
import { useResponsiveScale } from "../hooks/useResponsiveScale";

interface HeartsDisplayProps {
  lives: number;
  maxLives: number;
}

export function HeartsDisplay({ lives, maxLives }: HeartsDisplayProps) {
  const { spacing, game } = useResponsiveScale();
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLivesRef = useRef(lives);

  const heartSize = Math.round(24 * game);

  // Animate on lives change
  useEffect(() => {
    if (!containerRef.current) return;

    const hearts = containerRef.current.querySelectorAll(".heart");

    if (lives < prevLivesRef.current) {
      // Lost a life - shake and flash
      const lostIndex = lives;
      if (hearts[lostIndex]) {
        animate(hearts[lostIndex], {
          scale: [1.5, 0.8, 1],
          rotate: [0, -20, 20, 0],
          duration: 500,
          ease: "outElastic(1, 0.5)",
        });
      }
      // Shake remaining hearts
      animate(containerRef.current, {
        translateX: [-5, 5, -5, 5, 0],
        duration: 300,
        ease: "easeInOutSine",
      });
    } else if (lives > prevLivesRef.current) {
      // Gained a life - pop in
      const gainedIndex = lives - 1;
      if (hearts[gainedIndex]) {
        animate(hearts[gainedIndex], {
          scale: [0, 1.3, 1],
          rotate: [180, 0],
          duration: 600,
          ease: "outBack",
        });
      }
    }

    prevLivesRef.current = lives;
  }, [lives]);

  return (
    <div ref={containerRef} className="flex gap-1" style={{ padding: spacing.xs }}>
      {Array.from({ length: maxLives }).map((_, i) => (
        <Heart key={i} filled={i < lives} size={heartSize} />
      ))}
    </div>
  );
}

interface HeartProps {
  filled: boolean;
  size: number;
}

function Heart({ filled, size }: HeartProps) {
  return (
    <svg
      className="heart"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        filter: filled ? "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" : "none",
        transition: "filter 0.3s ease",
      }}
    >
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={filled ? GAME_CONFIG.colors.heart : GAME_CONFIG.colors.heartEmpty}
        stroke={filled ? "#C2185B" : "#616161"}
        strokeWidth="1"
      />
      {/* Shine effect for filled hearts */}
      {filled && (
        <ellipse
          cx="8"
          cy="8"
          rx="2"
          ry="1.5"
          fill="rgba(255,255,255,0.4)"
          transform="rotate(-30 8 8)"
        />
      )}
    </svg>
  );
}
