/**
 * Perfect Indicator Component
 * Animated text shown on perfect landings
 * With extra flair using anime.js
 */

import { animate } from "animejs";
import { useEffect, useRef } from "react";
import { useResponsiveScale } from "../hooks/useResponsiveScale";

interface PerfectIndicatorProps {
  show: boolean;
  animationKey: number;
}

const PERFECT_PHRASES = ["PERFECT!", "AMAZING!", "FLAWLESS!", "INCREDIBLE!", "PSY-YAI-YAI!"];

export function PerfectIndicator({ show, animationKey }: PerfectIndicatorProps) {
  const { fontSize } = useResponsiveScale();
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  // Get random phrase
  const phrase = PERFECT_PHRASES[animationKey % PERFECT_PHRASES.length];

  useEffect(() => {
    if (!show || !containerRef.current || !textRef.current) return;

    // Create starburst particles
    const particles: HTMLDivElement[] = [];
    const container = containerRef.current;

    for (let i = 0; i < 12; i++) {
      const particle = document.createElement("div");
      particle.className = "absolute w-2 h-2 rounded-full bg-yellow-300";
      particle.style.left = "50%";
      particle.style.top = "50%";
      particle.style.transform = "translate(-50%, -50%)";
      container.appendChild(particle);
      particles.push(particle);
    }

    // Animate particles outward
    animate(particles, {
      translateX: () => (Math.random() - 0.5) * 200,
      translateY: () => (Math.random() - 0.5) * 200,
      scale: [1, 0],
      opacity: [1, 0],
      duration: 800,
      ease: "outExpo",
      onComplete: () => {
        particles.forEach((p) => p.remove());
      },
    });

    // Animate text
    animate(textRef.current, {
      scale: [0.5, 1.2, 1],
      opacity: [0, 1, 1, 0],
      translateY: [0, -30, -60],
      rotate: ["-5deg", "5deg", "0deg"],
      duration: 1000,
      ease: "outBack",
    });

    return () => {
      particles.forEach((p) => p.remove());
    };
  }, [show]);

  if (!show) return null;

  return (
    <div
      ref={containerRef}
      className="absolute left-1/2 top-[25%] -translate-x-1/2 pointer-events-none z-40"
    >
      <div
        ref={textRef}
        className="game-font text-white whitespace-nowrap"
        style={{
          fontSize: `clamp(1.5rem, ${parseFloat(fontSize.title) * 0.5}px, 3rem)`,
          textShadow: `
            0 0 20px rgba(253, 216, 53, 1),
            0 0 40px rgba(253, 216, 53, 0.8),
            0 0 60px rgba(253, 216, 53, 0.6),
            3px 3px 0 #000
          `,
          filter: "drop-shadow(0 0 10px rgba(253, 216, 53, 0.8))",
        }}
      >
        {phrase}
      </div>
    </div>
  );
}
