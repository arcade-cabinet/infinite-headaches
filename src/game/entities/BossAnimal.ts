/**
 * Boss Animal Entity
 * Large, powerful Animals that require multiple hits
 */

import { GAME_CONFIG } from "../config";
import { Animal } from "./Animal";

export type BossType = "mega" | "shadow" | "golden";

export interface BossConfig {
  name: string;
  health: number;
  size: number; // Scale multiplier
  speed: number; // Fall speed multiplier
  color: string;
  glowColor: string;
  ability?: string;
  reward: number; // Bonus points
}

export const BOSS_TYPES: Record<BossType, BossConfig> = {
  mega: {
    name: "Mega Beast",
    health: 3,
    size: 1.8,
    speed: 0.6,
    color: "#FFD54F",
    glowColor: "rgba(255, 213, 79, 0.6)",
    ability: "shockwave", // Pushes away nearby falling animals
    reward: 500,
  },
  shadow: {
    name: "Shadow Beast",
    health: 5,
    size: 1.5,
    speed: 0.8,
    color: "#37474F",
    glowColor: "rgba(55, 71, 79, 0.8)",
    ability: "phase", // Briefly becomes intangible
    reward: 750,
  },
  golden: {
    name: "Golden Beast",
    health: 2,
    size: 1.4,
    speed: 1.2, // Fast!
    color: "#FFD700",
    glowColor: "rgba(255, 215, 0, 0.8)",
    ability: "dodge", // Tries to avoid your animal
    reward: 1000,
  },
};

export class BossDuck extends Animal { // Keeping class name for compatibility with imports
  bossType: BossType;
  health: number;
  maxHealth: number;
  bossConfig: BossConfig;

  // Animation
  pulsePhase: number = 0;
  hitFlashTime: number = 0;

  // Ability state
  abilityTimer: number = 0;
  isPhasing: boolean = false;

  // Target tracking (for dodge ability)
  targetX: number = 0;

  constructor(x: number, y: number, bossType: BossType) {
    super(x, y, "falling", "cow"); // Use generic animal type for base

    this.bossType = bossType;
    this.bossConfig = BOSS_TYPES[bossType];
    this.health = this.bossConfig.health;
    this.maxHealth = this.bossConfig.health;

    // Scale up
    this.width = GAME_CONFIG.animal.width * this.bossConfig.size;
    this.height = GAME_CONFIG.animal.height * this.bossConfig.size;
  }

  update(deltaTime: number = 16): void {
    // Pulse animation
    this.pulsePhase += deltaTime * 0.005;

    // Hit flash decay
    if (this.hitFlashTime > 0) {
      this.hitFlashTime -= deltaTime;
    }

    // Ability cooldown
    if (this.abilityTimer > 0) {
      this.abilityTimer -= deltaTime;
    }

    // Phase ability (shadow boss)
    if (this.bossType === "shadow" && this.abilityTimer <= 0 && Math.random() < 0.002) {
      this.isPhasing = true;
      this.abilityTimer = 3000; // 3 second cooldown
      setTimeout(() => {
        this.isPhasing = false;
      }, 800);
    }

    // Fall with modified speed
    if (this.state === "falling") {
      this.velocityY = Math.min(
        this.velocityY + GAME_CONFIG.physics.gravity * 0.5,
        GAME_CONFIG.physics.maxFallSpeed * this.bossConfig.speed
      );
      this.y += this.velocityY;

      // Dodge ability (golden boss) - move away from target
      if (this.bossType === "golden" && this.abilityTimer <= 0) {
        const dx = this.x - this.targetX;
        if (Math.abs(dx) < this.width * 2) {
          this.x += Math.sign(dx) * 2; // Move away
        }
      }

      // Horizontal drift
      this.x += this.velocityX;
    }

    // Gentle rotation
    this.rotation = Math.sin(this.pulsePhase) * 0.05;
  }

  /**
   * Set the target X position (player's animal) for dodge ability
   */
  setTarget(x: number): void {
    this.targetX = x;
  }

  /**
   * Take a hit - returns true if boss is defeated
   */
  takeHit(): boolean {
    if (this.isPhasing) return false; // Can't hit while phasing

    this.health--;
    this.hitFlashTime = 200;
    this.scaleX = 1.2;
    this.scaleY = 0.8;

    return this.health <= 0;
  }

  /**
   * Check if boss can be hit (not phasing)
   */
  canBeHit(): boolean {
    return !this.isPhasing;
  }

  /**
   * Get health percentage
   */
  getHealthPercent(): number {
    return this.health / this.maxHealth;
  }

  /**
   * Draw the boss animal
   */
  draw(ctx: CanvasRenderingContext2D): void {
    // Override default draw to show boss appearance
    // This is temporary until we have boss sprites
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scaleX, this.scaleY);

    const w = this.width;
    const h = this.height;
    const pulse = 1 + Math.sin(this.pulsePhase * 2) * 0.05;

    // Phasing effect
    if (this.isPhasing) {
      ctx.globalAlpha = 0.3 + Math.sin(this.pulsePhase * 10) * 0.2;
    }

    // Hit flash
    if (this.hitFlashTime > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 30) * 0.5;
    }

    // Glow aura
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.8 * pulse);
    gradient.addColorStop(0, this.bossConfig.glowColor);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.8 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Simple boss representation for now
    ctx.fillStyle = this.bossConfig.color;
    ctx.strokeStyle = this.bossType === "shadow" ? "#1A237E" : "#3E2723";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eyes - menacing
    ctx.fillStyle = "#FFF";
    ctx.beginPath();
    ctx.ellipse(-w / 5, -h / 4, w / 6, h / 6, 0, 0, Math.PI * 2);
    ctx.ellipse(w / 5, -h / 4, w / 6, h / 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Red pupils for boss
    ctx.fillStyle = this.bossType === "golden" ? "#FFD700" : "#F44336";
    ctx.beginPath();
    ctx.arc(-w / 5, -h / 4, 5, 0, Math.PI * 2);
    ctx.arc(w / 5, -h / 4, 5, 0, Math.PI * 2);
    ctx.fill();

    // Crown/indicator for boss type
    this.drawBossIndicator(ctx, w, h);

    // Health bar
    this.drawHealthBar(ctx, w, h);

    ctx.restore();

    // Animate squish recovery
    this.scaleX += (1 - this.scaleX) * 0.1;
    this.scaleY += (1 - this.scaleY) * 0.1;
  }

  private drawBossIndicator(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.save();

    switch (this.bossType) {
      case "mega":
        // Crown
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.moveTo(-w * 0.25, -h * 0.6);
        ctx.lineTo(-w * 0.15, -h * 0.8);
        ctx.lineTo(0, -h * 0.65);
        ctx.lineTo(w * 0.15, -h * 0.8);
        ctx.lineTo(w * 0.25, -h * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#FFA000";
        ctx.lineWidth = 2;
        ctx.stroke();
        break;

      case "shadow": {
        // Dark aura wisps
        ctx.strokeStyle = "rgba(55, 71, 79, 0.6)";
        ctx.lineWidth = 2;
        const time = this.pulsePhase * 2;
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2 + time;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * w * 0.4, Math.sin(angle) * h * 0.4);
          ctx.lineTo(Math.cos(angle) * w * 0.6, Math.sin(angle) * h * 0.6);
          ctx.stroke();
        }
        break;
      }

      case "golden": {
        // Sparkles
        ctx.fillStyle = "#FFF";
        const sparkleTime = Date.now() / 100;
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + sparkleTime * 0.2;
          const dist = w * 0.5 + Math.sin(sparkleTime + i) * 5;
          const size = 3 + Math.sin(sparkleTime * 2 + i) * 2;
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, size, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
    }

    ctx.restore();
  }

  private drawHealthBar(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const barWidth = w * 0.8;
    const barHeight = 8;
    const barY = h / 2 + 15;

    // Background
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.roundRect(-barWidth / 2, barY, barWidth, barHeight, 4);
    ctx.fill();

    // Health fill
    const healthPercent = this.getHealthPercent();
    const healthColor =
      healthPercent > 0.5 ? "#4CAF50" : healthPercent > 0.25 ? "#FF9800" : "#F44336";
    ctx.fillStyle = healthColor;
    ctx.beginPath();
    ctx.roundRect(-barWidth / 2 + 1, barY + 1, (barWidth - 2) * healthPercent, barHeight - 2, 3);
    ctx.fill();

    // Health segments
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    for (let i = 1; i < this.maxHealth; i++) {
      const x = -barWidth / 2 + (barWidth / this.maxHealth) * i;
      ctx.beginPath();
      ctx.moveTo(x, barY);
      ctx.lineTo(x, barY + barHeight);
      ctx.stroke();
    }
  }
}

/**
 * Get a random boss type, weighted by difficulty
 */
export function getRandomBossType(wave: number): BossType {
  const rand = Math.random();

  // Golden is rare, shadow appears later, mega is common
  if (wave >= 3 && rand < 0.15) return "golden";
  if (wave >= 2 && rand < 0.4) return "shadow";
  return "mega";
}