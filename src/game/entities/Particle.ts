/**
 * Particle Entity
 * Visual effect particles for perfect landings
 */

import { GAME_CONFIG } from "../config";

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 10;
    this.vy = (Math.random() - 0.5) * 10;
    this.life = 1.0;
    this.color = Math.random() > 0.5 ? "#FFF" : GAME_CONFIG.colors.duck.body;
    this.size = Math.random() * 5 + 2;
  }

  /**
   * Update particle position and life
   */
  update(): void {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= GAME_CONFIG.effects.particleDecay;
  }

  /**
   * Check if particle should be removed
   */
  isDead(): boolean {
    return this.life <= 0;
  }

  /**
   * Render particle to canvas
   */
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color;
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
