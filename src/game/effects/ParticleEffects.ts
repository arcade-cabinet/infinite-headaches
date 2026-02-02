/**
 * Enhanced Particle Effects System
 * Dramatic visual effects for game events
 */

export interface ParticleConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  type: ParticleType;
  rotation?: number;
  rotationSpeed?: number;
  gravity?: number;
  friction?: number;
  fadeOut?: boolean;
  shrink?: boolean;
  glow?: boolean;
  trail?: boolean;
}

export type ParticleType =
  | "circle"
  | "star"
  | "spark"
  | "heart"
  | "coin"
  | "confetti"
  | "smoke"
  | "fire"
  | "ice"
  | "ring";

export type EffectType =
  | "merge"
  | "perfect"
  | "levelUp"
  | "lifeGain"
  | "coinCollect"
  | "powerUp"
  | "explosion"
  | "freeze"
  | "fire"
  | "achievement";

/**
 * Particle System for managing effects
 */
export class ParticleSystem {
  private particles: ParticleConfig[] = [];
  private maxParticles: number = 500;

  /**
   * Create particles for a specific effect
   */
  emit(
    type: EffectType,
    x: number,
    y: number,
    options?: Partial<{ count: number; color: string; scale: number }>
  ): void {
    const count = options?.count ?? this.getDefaultCount(type);
    const color = options?.color ?? this.getDefaultColor(type);
    const scale = options?.scale ?? 1;

    switch (type) {
      case "merge":
        this.emitMergeEffect(x, y, count, scale);
        break;
      case "perfect":
        this.emitPerfectEffect(x, y, count);
        break;
      case "levelUp":
        this.emitLevelUpEffect(x, y);
        break;
      case "lifeGain":
        this.emitLifeGainEffect(x, y);
        break;
      case "coinCollect":
        this.emitCoinEffect(x, y, count);
        break;
      case "powerUp":
        this.emitPowerUpEffect(x, y, color);
        break;
      case "explosion":
        this.emitExplosionEffect(x, y, count);
        break;
      case "freeze":
        this.emitFreezeEffect(x, y);
        break;
      case "fire":
        this.emitFireEffect(x, y);
        break;
      case "achievement":
        this.emitAchievementEffect(x, y);
        break;
    }
  }

  private getDefaultCount(type: EffectType): number {
    switch (type) {
      case "merge":
        return 50;
      case "perfect":
        return 20;
      case "levelUp":
        return 40;
      case "lifeGain":
        return 15;
      case "coinCollect":
        return 10;
      case "powerUp":
        return 25;
      case "explosion":
        return 30;
      case "freeze":
        return 20;
      case "fire":
        return 15;
      case "achievement":
        return 50;
      default:
        return 20;
    }
  }

  private getDefaultColor(type: EffectType): string {
    switch (type) {
      case "merge":
        return "#E91E63";
      case "perfect":
        return "#FFD700";
      case "levelUp":
        return "#4CAF50";
      case "lifeGain":
        return "#E91E63";
      case "coinCollect":
        return "#FFD700";
      case "powerUp":
        return "#9C27B0";
      case "explosion":
        return "#FF5722";
      case "freeze":
        return "#81D4FA";
      case "fire":
        return "#FF9800";
      case "achievement":
        return "#FFD700";
      default:
        return "#FFFFFF";
    }
  }

  /**
   * Merge effect - dramatic implosion then explosion
   */
  private emitMergeEffect(x: number, y: number, count: number, scale: number): void {
    const colors = ["#E91E63", "#F48FB1", "#FCE4EC", "#FFEB3B", "#FFF"];

    // Ring burst
    for (let i = 0; i < 3; i++) {
      const ringRadius = 30 + i * 20;
      this.addParticle({
        x,
        y,
        vx: 0,
        vy: 0,
        size: ringRadius * scale,
        color: colors[i % colors.length],
        life: 1,
        maxLife: 1,
        type: "ring",
        fadeOut: true,
      });
    }

    // Sparkle burst
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      const size = (3 + Math.random() * 5) * scale;

      this.addParticle({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        maxLife: 1,
        type: Math.random() > 0.5 ? "star" : "spark",
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        gravity: 0.1,
        friction: 0.98,
        fadeOut: true,
        shrink: true,
        glow: true,
      });
    }

    // Hearts floating up
    for (let i = 0; i < 5; i++) {
      this.addParticle({
        x: x + (Math.random() - 0.5) * 60,
        y: y + Math.random() * 20,
        vx: (Math.random() - 0.5) * 1,
        vy: -2 - Math.random() * 2,
        size: 12 + Math.random() * 8,
        color: "#E91E63",
        life: 1,
        maxLife: 1,
        type: "heart",
        fadeOut: true,
        gravity: -0.02, // Float up
      });
    }
  }

  /**
   * Perfect catch effect
   */
  private emitPerfectEffect(x: number, y: number, count: number): void {
    const colors = ["#FFD700", "#FFF", "#FFEB3B"];

    // Star burst
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;

      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        maxLife: 1,
        type: "star",
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        gravity: 0.08,
        friction: 0.97,
        fadeOut: true,
        glow: true,
      });
    }
  }

  /**
   * Level up celebration
   */
  private emitLevelUpEffect(x: number, y: number): void {
    const colors = ["#4CAF50", "#8BC34A", "#CDDC39", "#FFF"];

    // Confetti shower
    for (let i = 0; i < 40; i++) {
      this.addParticle({
        x: x + (Math.random() - 0.5) * 200,
        y: y - 50 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 4,
        vy: 1 + Math.random() * 2,
        size: 6 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        maxLife: 1,
        type: "confetti",
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        gravity: 0.05,
        friction: 0.99,
        fadeOut: true,
      });
    }
  }

  /**
   * Life gain effect - hearts
   */
  private emitLifeGainEffect(x: number, y: number): void {
    for (let i = 0; i < 15; i++) {
      this.addParticle({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 2,
        vy: -3 - Math.random() * 2,
        size: 10 + Math.random() * 10,
        color: "#E91E63",
        life: 1,
        maxLife: 1,
        type: "heart",
        fadeOut: true,
        gravity: -0.03,
      });
    }
  }

  /**
   * Coin collect effect
   */
  private emitCoinEffect(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2 - 2,
        size: 8,
        color: "#FFD700",
        life: 1,
        maxLife: 1,
        type: "coin",
        rotation: 0,
        rotationSpeed: 0.2,
        gravity: 0.1,
        fadeOut: true,
        glow: true,
      });
    }
  }

  /**
   * Power-up collect effect
   */
  private emitPowerUpEffect(x: number, y: number, color: string): void {
    // Spiral burst
    for (let i = 0; i < 25; i++) {
      const angle = (i / 25) * Math.PI * 4;
      const dist = i * 2;

      this.addParticle({
        x: x + Math.cos(angle) * dist * 0.5,
        y: y + Math.sin(angle) * dist * 0.5,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        size: 5 + Math.random() * 3,
        color,
        life: 1,
        maxLife: 1,
        type: "spark",
        fadeOut: true,
        shrink: true,
        glow: true,
        trail: true,
      });
    }
  }

  /**
   * Explosion effect
   */
  private emitExplosionEffect(x: number, y: number, count: number): void {
    const colors = ["#FF5722", "#FF9800", "#FFEB3B", "#FFF"];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;

      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        maxLife: 1,
        type: Math.random() > 0.7 ? "fire" : "spark",
        gravity: 0.15,
        friction: 0.95,
        fadeOut: true,
        shrink: true,
      });
    }

    // Smoke
    for (let i = 0; i < 10; i++) {
      this.addParticle({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 1,
        vy: -1 - Math.random(),
        size: 15 + Math.random() * 15,
        color: "rgba(100,100,100,0.5)",
        life: 1,
        maxLife: 1,
        type: "smoke",
        fadeOut: true,
        gravity: -0.02,
      });
    }
  }

  /**
   * Freeze effect - ice shards
   */
  private emitFreezeEffect(x: number, y: number): void {
    const colors = ["#81D4FA", "#B3E5FC", "#E1F5FE", "#FFF"];

    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;

      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * (2 + Math.random() * 2),
        vy: Math.sin(angle) * (2 + Math.random() * 2),
        size: 6 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        maxLife: 1,
        type: "ice",
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        gravity: 0.1,
        fadeOut: true,
      });
    }
  }

  /**
   * Fire effect
   */
  private emitFireEffect(x: number, y: number): void {
    const colors = ["#FFEB3B", "#FF9800", "#FF5722", "#F44336"];

    for (let i = 0; i < 15; i++) {
      this.addParticle({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx: (Math.random() - 0.5) * 3,
        vy: -2 - Math.random() * 3,
        size: 8 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        maxLife: 1,
        type: "fire",
        fadeOut: true,
        shrink: true,
        gravity: -0.05,
      });
    }
  }

  /**
   * Achievement unlock effect
   */
  private emitAchievementEffect(x: number, y: number): void {
    const colors = ["#FFD700", "#FFC107", "#FFEB3B", "#FFF"];

    // Star burst
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const speed = 4 + Math.random() * 3;

      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        maxLife: 1,
        type: "star",
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0.1,
        gravity: 0.05,
        fadeOut: true,
        glow: true,
      });
    }

    // Confetti
    for (let i = 0; i < 20; i++) {
      this.addParticle({
        x: x + (Math.random() - 0.5) * 100,
        y: y - Math.random() * 50,
        vx: (Math.random() - 0.5) * 3,
        vy: 1 + Math.random() * 2,
        size: 8 + Math.random() * 4,
        color: ["#E91E63", "#9C27B0", "#2196F3", "#4CAF50"][Math.floor(Math.random() * 4)],
        life: 1,
        maxLife: 1,
        type: "confetti",
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        gravity: 0.03,
        fadeOut: true,
      });
    }
  }

  /**
   * Add a particle to the system
   */
  private addParticle(config: ParticleConfig): void {
    if (this.particles.length >= this.maxParticles) {
      // Remove oldest particles
      this.particles.splice(0, 10);
    }
    this.particles.push(config);
  }

  /**
   * Update all particles
   */
  update(deltaTime: number): void {
    const dt = deltaTime / 16.67; // Normalize to 60fps

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update life
      p.life -= 0.02 * dt;

      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Apply physics
      if (p.gravity !== undefined) {
        p.vy += p.gravity * dt;
      }

      if (p.friction !== undefined) {
        p.vx *= p.friction;
        p.vy *= p.friction;
      }

      // Update position
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Update rotation
      if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
        p.rotation += p.rotationSpeed * dt;
      }

      // Shrink
      if (p.shrink) {
        p.size *= 0.98;
      }
    }
  }

  /**
   * Render all particles to canvas
   */
  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.fadeOut ? p.life / p.maxLife : 1;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);

      if (p.rotation !== undefined) {
        ctx.rotate(p.rotation);
      }

      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size;
      }

      ctx.fillStyle = p.color;

      switch (p.type) {
        case "circle":
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;

        case "star":
          this.drawStar(ctx, p.size);
          break;

        case "spark":
          ctx.beginPath();
          ctx.moveTo(-p.size / 2, 0);
          ctx.lineTo(p.size / 2, 0);
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(0, p.size / 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.stroke();
          break;

        case "heart":
          this.drawHeart(ctx, p.size);
          break;

        case "coin":
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size / 2, p.size / 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#FFA000";
          ctx.lineWidth = 1;
          ctx.stroke();
          break;

        case "confetti":
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          break;

        case "smoke":
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;

        case "fire": {
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size / 2);
          gradient.addColorStop(0, p.color);
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case "ice":
          // Diamond shape
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 3, 0);
          ctx.lineTo(0, p.size / 2);
          ctx.lineTo(-p.size / 3, 0);
          ctx.closePath();
          ctx.fill();
          break;

        case "ring":
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.stroke();
          break;
      }

      ctx.restore();
    }
  }

  private drawStar(ctx: CanvasRenderingContext2D, size: number): void {
    const spikes = 5;
    const outerRadius = size / 2;
    const innerRadius = size / 4;

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, size: number): void {
    const s = size / 2;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(-s, -s * 0.3, -s, -s, 0, -s * 0.5);
    ctx.bezierCurveTo(s, -s, s, -s * 0.3, 0, s * 0.3);
    ctx.fill();
  }

  /**
   * Clear all particles
   */
  clear(): void {
    this.particles = [];
  }

  /**
   * Get particle count
   */
  get count(): number {
    return this.particles.length;
  }
}

// Global particle system instance
export const particleSystem = new ParticleSystem();
