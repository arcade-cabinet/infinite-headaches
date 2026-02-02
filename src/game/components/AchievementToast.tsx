/**
 * Achievement Toast Component
 * Shows when an achievement is unlocked
 */

import { animate } from "animejs";
import { useEffect, useRef } from "react";
import type { Achievement } from "../achievements";
import { useResponsiveScale } from "../hooks/useResponsiveScale";

interface AchievementToastProps {
  achievement: Achievement;
  onComplete: () => void;
}

const TIER_COLORS = {
  bronze: {
    bg: "from-amber-700 to-amber-900",
    border: "border-amber-500",
    text: "text-amber-200",
  },
  silver: {
    bg: "from-gray-400 to-gray-600",
    border: "border-gray-300",
    text: "text-gray-100",
  },
  gold: {
    bg: "from-yellow-500 to-yellow-700",
    border: "border-yellow-300",
    text: "text-yellow-100",
  },
  platinum: {
    bg: "from-red-700 to-red-900",
    border: "border-red-400",
    text: "text-red-100",
  },
};

export function AchievementToast({ achievement, onComplete }: AchievementToastProps) {
  const { fontSize, spacing } = useResponsiveScale();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Slide in
    animate(containerRef.current, {
      translateY: [-100, 0],
      opacity: [0, 1],
      duration: 500,
      ease: "outBack",
    });

    // Hold and slide out
    const timeout = setTimeout(() => {
      if (containerRef.current) {
        animate(containerRef.current, {
          translateY: [0, -100],
          opacity: [1, 0],
          duration: 400,
          ease: "inBack",
        }).then(() => {
          onComplete();
        });
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [onComplete]);

  const colors = TIER_COLORS[achievement.tier];

  return (
    <div
      ref={containerRef}
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-50
        bg-gradient-to-r ${colors.bg}
        border-2 ${colors.border}
        rounded-xl shadow-xl
        flex items-center gap-3
        pointer-events-auto
        opacity-0
      `}
      style={{ padding: spacing.md }}
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center w-12 h-12 rounded-full bg-black/30"
        style={{ fontSize: "1.8rem" }}
      >
        {achievement.icon}
      </div>

      {/* Content */}
      <div>
        <div
          className="game-font text-white/60 uppercase tracking-wide"
          style={{ fontSize: fontSize.xs }}
        >
          Achievement Unlocked!
        </div>
        <div
          className={`game-font ${colors.text}`}
          style={{ fontSize: fontSize.md, textShadow: "1px 1px 0 rgba(0,0,0,0.5)" }}
        >
          {achievement.name}
        </div>
        <div className="text-white/70" style={{ fontSize: fontSize.xs }}>
          {achievement.description}
        </div>
      </div>

      {/* Tier badge */}
      <div
        className={`
          px-2 py-1 rounded-full 
          bg-black/30 
          game-font uppercase tracking-wide
          ${colors.text}
        `}
        style={{ fontSize: fontSize.xs }}
      >
        {achievement.tier}
      </div>
    </div>
  );
}

interface AchievementListProps {
  achievements: Achievement[];
  onDismiss: (id: string) => void;
}

export function AchievementToastList({ achievements, onDismiss }: AchievementListProps) {
  if (achievements.length === 0) return null;

  // Only show the first achievement, queue the rest
  const current = achievements[0];

  return (
    <AchievementToast
      key={current.id}
      achievement={current}
      onComplete={() => onDismiss(current.id)}
    />
  );
}
