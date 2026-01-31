/**
 * PowerUp Entity
 * Collectible items that drop from above
 */

import { GAME_CONFIG, POWER_UPS, type PowerUpType } from "../config";

const { powerUps } = GAME_CONFIG;

export class PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  velocityY: number = powerUps.fallSpeed;

  // Animation
  bobOffset: number = 0;
  bobTime: number = Math.random() * 100;
  rotation: number = 0;
  scale: number = 1;
  glowIntensity: number = 0;

  // State
  collected: boolean = false;

  readonly width = 40;
  readonly height = 40;

  constructor(x: number, y: number, type: PowerUpType) {
    this.x = x;
    this.y = y;
    this.type = type;
  }

  get config() {
    return POWER_UPS[this.type];
  }

  update(deltaTime: number): void {
    if (this.collected) return;

    // Fall
    this.y += this.velocityY;

    // Bob animation
    this.bobTime += powerUps.bobSpeed * deltaTime;
    this.bobOffset = Math.sin(this.bobTime) * powerUps.bobAmount;

    // Gentle rotation
    this.rotation = Math.sin(this.bobTime * 0.5) * 0.2;

    // Pulsing glow
    this.glowIntensity = 0.5 + Math.sin(this.bobTime * 2) * 0.3;
  }

  /**
   * Check if collides with a point (for collection)
   */
  checkCollection(px: number, py: number): boolean {
    if (this.collected) return false;

    const dx = px - this.x;
    const dy = py - (this.y + this.bobOffset);
    const dist = Math.sqrt(dx * dx + dy * dy);

    return dist < powerUps.collectRadius;
  }

  /**
   * Mark as collected
   */
  collect(): void {
    this.collected = true;
    this.scale = 1.5; // Pop effect
  }

  /**
   * Check if off screen
   */
  isOffScreen(screenHeight: number): boolean {
    return this.y > screenHeight + 50;
  }

  /**
   * Draw the power-up
   */
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.collected && this.scale < 0.1) return;

    ctx.save();
    ctx.translate(this.x, this.y + this.bobOffset);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale, this.scale);

    const config = this.config;

    // Glow effect
    ctx.shadowColor = config.glowColor;
    ctx.shadowBlur = 15 * this.glowIntensity;

    // Draw based on type
    switch (this.type) {
      case "rare_candy":
        this.drawRareCandy(ctx);
        break;
      case "potion":
        this.drawPotion(ctx);
        break;
      case "max_up":
        this.drawMaxUp(ctx);
        break;
      case "great_ball":
        this.drawGreatBall(ctx);
        break;
      case "x_attack":
        this.drawXAttack(ctx);
        break;
      case "full_restore":
        this.drawFullRestore(ctx);
        break;
    }

    ctx.restore();

    // Decay scale if collected
    if (this.collected) {
      this.scale *= 0.85;
    }
  }

  private drawRareCandy(ctx: CanvasRenderingContext2D): void {
    // Rare Candy - wrapped candy shape
    const w = this.width;
    const h = this.height;

    // Wrapper
    ctx.fillStyle = "#E91E63";
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.35, h * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Twisted ends
    ctx.fillStyle = "#F48FB1";
    ctx.beginPath();
    ctx.moveTo(-w * 0.35, 0);
    ctx.lineTo(-w * 0.5, -h * 0.15);
    ctx.lineTo(-w * 0.5, h * 0.15);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.35, 0);
    ctx.lineTo(w * 0.5, -h * 0.15);
    ctx.lineTo(w * 0.5, h * 0.15);
    ctx.closePath();
    ctx.fill();

    // Star sparkle
    ctx.fillStyle = "#FFF";
    ctx.beginPath();
    ctx.arc(-w * 0.1, -h * 0.1, 3, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = "#AD1457";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.35, h * 0.25, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawPotion(ctx: CanvasRenderingContext2D): void {
    // Potion - bottle shape
    const w = this.width;
    const h = this.height;

    // Bottle body
    ctx.fillStyle = "#9C27B0";
    ctx.beginPath();
    ctx.roundRect(-w * 0.25, -h * 0.1, w * 0.5, h * 0.45, 5);
    ctx.fill();

    // Liquid inside (slightly lighter)
    ctx.fillStyle = "#BA68C8";
    ctx.beginPath();
    ctx.roundRect(-w * 0.2, h * 0.05, w * 0.4, h * 0.25, 3);
    ctx.fill();

    // Bottle neck
    ctx.fillStyle = "#9C27B0";
    ctx.fillRect(-w * 0.12, -h * 0.3, w * 0.24, h * 0.25);

    // Cork
    ctx.fillStyle = "#8D6E63";
    ctx.beginPath();
    ctx.roundRect(-w * 0.1, -h * 0.4, w * 0.2, h * 0.12, 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.ellipse(-w * 0.1, 0, w * 0.08, h * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Heart symbol
    ctx.fillStyle = "#E91E63";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("♥", 0, h * 0.2);
  }

  private drawMaxUp(ctx: CanvasRenderingContext2D): void {
    // HP Up - pill/capsule shape
    const w = this.width;
    const h = this.height;

    // Capsule
    ctx.fillStyle = "#4CAF50";
    ctx.beginPath();
    ctx.roundRect(-w * 0.3, -h * 0.2, w * 0.6, h * 0.4, 10);
    ctx.fill();

    // Top half (lighter)
    ctx.fillStyle = "#81C784";
    ctx.beginPath();
    ctx.roundRect(-w * 0.3, -h * 0.2, w * 0.6, h * 0.2, [10, 10, 0, 0]);
    ctx.fill();

    // Plus symbol
    ctx.fillStyle = "#FFF";
    ctx.fillRect(-w * 0.08, -h * 0.12, w * 0.16, h * 0.04);
    ctx.fillRect(-w * 0.02, -h * 0.18, w * 0.04, h * 0.16);

    // "UP" text
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("UP", 0, h * 0.12);

    // Shine
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.ellipse(-w * 0.15, -h * 0.1, w * 0.08, h * 0.06, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGreatBall(ctx: CanvasRenderingContext2D): void {
    // Great Ball - blue captureball style
    const w = this.width;
    const h = this.height;
    const r = Math.min(w, h) * 0.4;

    // Ball body
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.closePath();

    // Top half - blue
    ctx.fillStyle = "#2196F3";
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    // Bottom half - white
    ctx.fillStyle = "#FAFAFA";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI);
    ctx.closePath();
    ctx.fill();

    // Red stripe pattern
    ctx.fillStyle = "#F44336";
    ctx.fillRect(-r, -r * 0.15, r, r * 0.3);

    // Center band
    ctx.fillStyle = "#424242";
    ctx.fillRect(-r, -r * 0.12, r * 2, r * 0.24);

    // Center button
    ctx.fillStyle = "#FAFAFA";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#424242";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Magnetic waves
    const time = Date.now() / 200;
    ctx.strokeStyle = "rgba(33, 150, 243, 0.5)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const waveR = r * (1.2 + i * 0.2 + Math.sin(time + i) * 0.1);
      ctx.beginPath();
      ctx.arc(0, 0, waveR, -Math.PI * 0.3, Math.PI * 0.3);
      ctx.stroke();
    }
  }

  private drawXAttack(ctx: CanvasRenderingContext2D): void {
    // X Attack - orange X shape
    const w = this.width;
    const h = this.height;

    // Background circle
    ctx.fillStyle = "#FF5722";
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // X shape
    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-w * 0.15, -h * 0.15);
    ctx.lineTo(w * 0.15, h * 0.15);
    ctx.moveTo(w * 0.15, -h * 0.15);
    ctx.lineTo(-w * 0.15, h * 0.15);
    ctx.stroke();

    // "2X" text
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("2X", 0, h * 0.35);

    // Sparkles
    const time = Date.now() / 150;
    ctx.fillStyle = "#FFEB3B";
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + time * 0.2;
      const dist = w * 0.45;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawFullRestore(ctx: CanvasRenderingContext2D): void {
    // Full Restore - cyan spray bottle
    const w = this.width;
    const h = this.height;

    // Bottle body
    ctx.fillStyle = "#00BCD4";
    ctx.beginPath();
    ctx.roundRect(-w * 0.22, -h * 0.05, w * 0.44, h * 0.4, 5);
    ctx.fill();

    // Liquid shine
    ctx.fillStyle = "#4DD0E1";
    ctx.beginPath();
    ctx.roundRect(-w * 0.18, 0, w * 0.15, h * 0.3, 3);
    ctx.fill();

    // Spray nozzle
    ctx.fillStyle = "#00838F";
    ctx.fillRect(-w * 0.1, -h * 0.25, w * 0.2, h * 0.22);

    // Trigger
    ctx.fillStyle = "#00838F";
    ctx.beginPath();
    ctx.moveTo(w * 0.1, -h * 0.15);
    ctx.lineTo(w * 0.22, -h * 0.1);
    ctx.lineTo(w * 0.22, -h * 0.02);
    ctx.lineTo(w * 0.1, -h * 0.05);
    ctx.closePath();
    ctx.fill();

    // Cap
    ctx.fillStyle = "#E91E63";
    ctx.beginPath();
    ctx.roundRect(-w * 0.12, -h * 0.35, w * 0.24, h * 0.12, 2);
    ctx.fill();

    // Star burst effect
    const time = Date.now() / 100;
    ctx.strokeStyle = "rgba(0, 188, 212, 0.6)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + time * 0.1;
      const innerR = w * 0.3;
      const outerR = w * 0.45 + Math.sin(time + i) * 5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
      ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      ctx.stroke();
    }

    // Hearts around it
    ctx.fillStyle = "#E91E63";
    ctx.font = "10px sans-serif";
    ctx.fillText("♥", -w * 0.35, -h * 0.1);
    ctx.fillText("♥", w * 0.3, h * 0.1);
  }
}

/**
 * Randomly select a power-up type based on spawn weights
 */
export function getRandomPowerUpType(): PowerUpType {
  const rand = Math.random();
  let cumulative = 0;

  for (const [type, config] of Object.entries(POWER_UPS)) {
    cumulative += config.spawnWeight;
    if (rand < cumulative) {
      return type as PowerUpType;
    }
  }

  return "potion"; // Fallback
}
