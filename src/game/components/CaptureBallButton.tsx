/**
 * CaptureBall Button Component
 * Animated captureball button for banking ducks
 */

import { animate } from "animejs";
import { useEffect, useRef } from "react";
import { GAME_CONFIG } from "../config";
import { useResponsiveScale } from "../hooks/useResponsiveScale";

interface CaptureBallButtonProps {
  visible: boolean;
  stackCount: number;
  onClick: () => void;
}

export function CaptureBallButton({ visible, stackCount, onClick }: CaptureBallButtonProps) {
  const { game, isMobile } = useResponsiveScale();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const size = Math.round((isMobile ? 60 : 80) * game);

  // Draw captureball
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 4;

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Outer circle shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.arc(cx + 2, cy + 2, radius, 0, Math.PI * 2);
    ctx.fill();

    // Top half (red)
    ctx.fillStyle = GAME_CONFIG.colors.captureball.top;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, 0);
    ctx.fill();

    // Bottom half (white)
    ctx.fillStyle = GAME_CONFIG.colors.captureball.bottom;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI);
    ctx.fill();

    // Black band
    ctx.fillStyle = GAME_CONFIG.colors.captureball.band;
    ctx.fillRect(cx - radius, cy - 4, radius * 2, 8);

    // Center button outline
    ctx.fillStyle = GAME_CONFIG.colors.captureball.band;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Center button
    ctx.fillStyle = GAME_CONFIG.colors.captureball.button;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.ellipse(
      cx - radius * 0.3,
      cy - radius * 0.4,
      radius * 0.2,
      radius * 0.15,
      -0.5,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Outline
    ctx.strokeStyle = GAME_CONFIG.colors.captureball.band;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }, [size]);

  // Entry/exit animation
  useEffect(() => {
    if (!buttonRef.current) return;

    if (visible) {
      animate(buttonRef.current, {
        scale: [0, 1.1, 1],
        rotate: ["0deg", "10deg", "0deg"],
        opacity: [0, 1],
        duration: 500,
        ease: "outBack",
      });
    } else {
      animate(buttonRef.current, {
        scale: [1, 0],
        opacity: [1, 0],
        duration: 300,
        ease: "inBack",
      });
    }
  }, [visible]);

  // Wobble animation when stack count changes
  useEffect(() => {
    if (!buttonRef.current || !visible) return;

    animate(buttonRef.current, {
      scale: [1, 1.15, 1],
      duration: 300,
      ease: "outElastic(1, .5)",
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      className="fixed z-30 transform -translate-x-1/2 cursor-pointer touch-manipulation"
      style={{
        left: "50%",
        bottom: `${20 + (isMobile ? 10 : 20)}px`,
        width: size,
        height: size,
        background: "transparent",
        border: "none",
        padding: 0,
        opacity: 0,
      }}
      aria-label={`Bank ${stackCount} ducks`}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
        }}
      />
      {/* Stack count badge */}
      <div
        className="absolute -top-1 -right-1 bg-yellow-400 text-black rounded-full flex items-center justify-center game-font"
        style={{
          width: size * 0.4,
          height: size * 0.4,
          fontSize: size * 0.22,
          border: "2px solid #000",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        {stackCount}
      </div>
    </button>
  );
}
