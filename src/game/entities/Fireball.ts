/**
 * Fireball Entity
 * Projectile shot by Fire-type Ducks
 *
 * LEGACY FILE - BLOCKED FROM DELETION
 * ECS replacement exists but GameEngine.ts still uses this class directly.
 *
 * ECS Replacement: src/game/ecs/systems/ProjectileSystem.ts
 * - ProjectileComponent in components/index.ts handles state
 * - ProjectileSystem handles movement, collisions, and trails
 * - Use spawnFireballsFrom() to create fireballs
 *
 * BLOCKING USAGES (must refactor these first):
 * - GameEngine.ts line 126: private fireballs: Fireball[] = [];
 * - GameEngine.ts line 517-518: new Fireball() in shootFireball()
 * - GameEngine.ts line 1130-1163: checkFireballHits() method
 * - GameEngine.ts line 1478, 1617: fireball.draw() in update/render
 *
 * To complete migration:
 * 1. Replace this.fireballs array with ECS world.with("projectile") query
 * 2. Replace shootFireball() to use spawnFireballsFrom() from ProjectileSystem
 * 3. Remove checkFireballHits() - collision handled by ProjectileSystem
 * 4. Remove 2D draw calls - 3D rendering handled by GameScene
 * 5. Delete this file
 */

import { GAME_CONFIG } from "../config";

const { physics, colors } = GAME_CONFIG;

export class Fireball {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;

  // Animation
  size: number;
  life: number = 1.0;
  rotation: number = 0;
  trailParticles: { x: number; y: number; size: number; life: number }[] = [];

  // State
  active: boolean = true;
  createdAt: number;

  constructor(x: number, y: number, direction: -1 | 1) {
    this.x = x;
    this.y = y;
    this.velocityX = physics.fireball.speed * direction;
    this.velocityY = (Math.random() - 0.5) * 2; // Slight vertical variance
    this.size = physics.fireball.size;
    this.createdAt = Date.now();
  }

  update(_deltaTime: number): void {
    if (!this.active) return;

    // Move
    this.x += this.velocityX;
    this.y += this.velocityY;

    // Rotation
    this.rotation += 0.2 * Math.sign(this.velocityX);

    // Add trail particles
    if (Math.random() > 0.5) {
      this.trailParticles.push({
        x: this.x - this.velocityX * 0.5 + (Math.random() - 0.5) * 10,
        y: this.y + (Math.random() - 0.5) * 10,
        size: this.size * (0.3 + Math.random() * 0.3),
        life: 1.0,
      });
    }

    // Update trail
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      this.trailParticles[i].life -= 0.08;
      this.trailParticles[i].size *= 0.95;
      if (this.trailParticles[i].life <= 0) {
        this.trailParticles.splice(i, 1);
      }
    }

    // Check lifetime
    if (Date.now() - this.createdAt > physics.fireball.duration) {
      this.active = false;
    }
  }

  /**
   * Check if fireball hits a target
   */
  checkHit(targetX: number, targetY: number, targetRadius: number): boolean {
    if (!this.active) return false;

    const dx = this.x - targetX;
    const dy = this.y - targetY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    return dist < this.size / 2 + targetRadius;
  }

  /**
   * Check if off screen
   */
  isOffScreen(screenWidth: number): boolean {
    return this.x < -50 || this.x > screenWidth + 50;
  }

  /**
   * Destroy the fireball (on hit)
   */
  destroy(): void {
    this.active = false;
    // Create explosion particles
    for (let i = 0; i < 8; i++) {
      this.trailParticles.push({
        x: this.x + (Math.random() - 0.5) * 20,
        y: this.y + (Math.random() - 0.5) * 20,
        size: this.size * (0.4 + Math.random() * 0.4),
        life: 1.0,
      });
    }
  }

  /**
   * Draw the fireball
   */
  draw(ctx: CanvasRenderingContext2D): void {
    // Draw trail first
    for (const particle of this.trailParticles) {
      ctx.save();
      ctx.globalAlpha = particle.life * 0.7;

      // Gradient for trail
      const gradient = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.size
      );
      gradient.addColorStop(0, colors.fire.core);
      gradient.addColorStop(0.4, colors.fire.mid);
      gradient.addColorStop(1, "rgba(244, 67, 54, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Glow
    ctx.shadowColor = colors.fire.mid;
    ctx.shadowBlur = 20;

    // Outer flame
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
    gradient.addColorStop(0, colors.fire.core);
    gradient.addColorStop(0.5, colors.fire.mid);
    gradient.addColorStop(1, colors.fire.outer);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright core
    ctx.fillStyle = "#FFF";
    ctx.beginPath();
    ctx.arc(0, 0, this.size / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
