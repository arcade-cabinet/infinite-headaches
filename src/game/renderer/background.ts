/**
 * Background Renderer
 * Handles the psychedelic animated background
 */

import { GAME_CONFIG } from "../config";

const { colors } = GAME_CONFIG;

/**
 * Draw the animated psychedelic background
 */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rotation: number
): void {
  // Base color
  ctx.fillStyle = colors.background.primary;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(rotation);

  // Radial gradient
  const maxDim = Math.max(width, height) * 1.5;
  const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, maxDim);
  gradient.addColorStop(0, colors.background.secondary);
  gradient.addColorStop(0.5, colors.background.primary);
  gradient.addColorStop(1, colors.background.tertiary);
  ctx.fillStyle = gradient;
  ctx.fillRect(-maxDim, -maxDim, maxDim * 2, maxDim * 2);

  // Pulsing rings
  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  ctx.lineWidth = 40;

  const pulse = Math.sin(Date.now() / 1000) * 20;

  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    const radius = Math.max(0, i * 120 + pulse);
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw the platform at the bottom of the screen
 */
export function drawPlatform(
  ctx: CanvasRenderingContext2D,
  width: number,
  baseY: number,
  duckHeight: number
): void {
  ctx.fillStyle = colors.platform;
  ctx.fillRect(0, baseY + duckHeight / 2, width, 1000);
}
