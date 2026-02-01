/**
 * Loading Screen
 * Shown between Menu and Gameplay to mask asset loading.
 * Styled with barn/wood aesthetics.
 */

import { animate } from "animejs";
import { useEffect, useRef } from "react";
import { useResponsiveScale } from "../hooks/useResponsiveScale";
import { GameCard } from "./GameCard";

interface LoadingScreenProps {
  progress: number; // 0 to 100
  status: string;
}

export function LoadingScreen({ progress, status }: LoadingScreenProps) {
  const { fontSize, spacing, isMobile } = useResponsiveScale();
  const barRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  // Animate progress bar
  useEffect(() => {
    if (barRef.current) {
      animate(barRef.current, {
        width: `${progress}%`,
        duration: 300,
        easing: "easeOutQuad",
      });
    }
  }, [progress]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <GameCard
        className="text-center w-full max-w-md mx-4"
        style={{ padding: spacing.xl }}
      >
        <h2 
          className="game-font text-yellow-400 mb-6"
          style={{ 
            fontSize: fontSize.xl,
            textShadow: "2px 2px 0 #000"
          }}
        >
          LOADING...
        </h2>

        {/* Loading Bar Container */}
        <div className="w-full h-6 bg-amber-950/50 rounded-full border-2 border-amber-900 overflow-hidden mb-2 relative">
          {/* Fill */}
          <div 
            ref={barRef}
            className="h-full bg-yellow-400 absolute left-0 top-0"
            style={{ width: "0%" }}
          />
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
        </div>

        {/* Status Text */}
        <p 
          ref={textRef}
          className="game-font text-amber-200/80 uppercase tracking-widest"
          style={{ fontSize: fontSize.xs }}
        >
          {status}
        </p>
      </GameCard>
    </div>
  );
}
