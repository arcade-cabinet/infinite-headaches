/**
 * FrozenAnimal Entity
 * An animal encased in ice, suspended in the air
 *
 * LEGACY FILE - BLOCKED FROM DELETION
 * ECS replacement exists but GameEngine.ts still uses this class directly.
 *
 * ECS Replacement: src/game/ecs/systems/FreezeSystem.ts
 * - FrozenComponent in components/index.ts handles state
 * - FreezeSystem handles updates and state transitions
 * - Use freezeEntity() and thawEntity() for state management
 *
 * BLOCKING USAGES (must refactor these first):
 * - GameEngine.ts line 128: private frozenAnimals: FrozenDuck[] = [];
 * - GameEngine.ts line 549-559: activateFreeze() creates new FrozenDuck()
 * - GameEngine.ts line 1415-1427: update loop processes frozenAnimals
 *
 * To complete migration:
 * 1. Replace this.frozenAnimals array with ECS world.with("frozen") query
 * 2. Replace activateFreeze() to use freezeEntity() from FreezeSystem
 * 3. FreezeSystem already runs in runECSSystems() - just remove legacy loop
 * 4. Remove 2D draw() calls - 3D ice rendering handled by GameScene
 * 5. Delete this file
 */

import { GAME_CONFIG } from "../config";
import type { Animal } from "./Animal";

const { physics, colors, effects } = GAME_CONFIG;

export type FreezeState = "frozen" | "cracking" | "shattering" | "falling";

export class FrozenDuck { // keeping class name for now to minimize refactor, usually would be FrozenAnimal
  duck: Animal;
  x: number;
  y: number;

  // Freeze state
  state: FreezeState = "frozen";
  freezeTimer: number;
  thawProgress: number = 0;
  crackStage: number = 0;

  // Animation
  bobOffset: number = 0;
  bobTime: number = Math.random() * 100;
  iceRotation: number = (Math.random() - 0.5) * 0.3;

  // Ice shards for shattering
  shards: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    rotationSpeed: number;
    size: number;
    life: number;
  }[] = [];

  // Crack positions (random)
  cracks: { x1: number; y1: number; x2: number; y2: number }[] = [];

  constructor(animal: Animal, freezeDuration: number) {
    this.duck = animal; // Keeping property name 'duck' for compatibility with GameEngine
    this.x = animal.x;
    this.y = animal.y;
    this.freezeTimer = freezeDuration;

    // Generate random crack lines
    this.generateCracks();
  }

  private generateCracks(): void {
    const numCracks = 5 + Math.floor(Math.random() * 4);
    const w = GAME_CONFIG.animal.width;
    const h = GAME_CONFIG.animal.height;

    for (let i = 0; i < numCracks; i++) {
      // Start from edges or center
      const startFromCenter = Math.random() > 0.5;
      let x1, y1, x2, y2;

      if (startFromCenter) {
        x1 = (Math.random() - 0.5) * w * 0.3;
        y1 = (Math.random() - 0.5) * h * 0.3;
      } else {
        // Start from edge
        const side = Math.floor(Math.random() * 4);
        switch (side) {
          case 0:
            x1 = -w * 0.5;
            y1 = (Math.random() - 0.5) * h;
            break;
          case 1:
            x1 = w * 0.5;
            y1 = (Math.random() - 0.5) * h;
            break;
          case 2:
            x1 = (Math.random() - 0.5) * w;
            y1 = -h * 0.5;
            break;
          default:
            x1 = (Math.random() - 0.5) * w;
            y1 = h * 0.5;
            break;
        }
      }

      // End point - extend toward center or opposite edge
      const angle = Math.atan2(-y1, -x1) + (Math.random() - 0.5) * 1.5;
      const length = w * 0.3 + Math.random() * w * 0.4;
      x2 = x1 + Math.cos(angle) * length;
      y2 = y1 + Math.sin(angle) * length;

      this.cracks.push({ x1, y1, x2, y2 });
    }
  }

  update(deltaTime: number): void {
    switch (this.state) {
      case "frozen":
        this.updateFrozen(deltaTime);
        break;
      case "cracking":
        this.updateCracking(deltaTime);
        break;
      case "shattering":
        this.updateShattering(deltaTime);
        break;
      case "falling":
        this.updateFalling(deltaTime);
        break;
    }
  }

  private updateFrozen(deltaTime: number): void {
    // Bob gently
    this.bobTime += physics.ice.fallSpeed * 0.01 * deltaTime;
    this.bobOffset = Math.sin(this.bobTime) * 5;

    // Count down freeze timer
    this.freezeTimer -= deltaTime;

    if (this.freezeTimer <= GAME_CONFIG.physics.ice.crackStages * 400) {
      this.state = "cracking";
    }
  }

  private updateCracking(deltaTime: number): void {
    // Continue bobbing
    this.bobTime += physics.ice.fallSpeed * 0.015 * deltaTime;
    this.bobOffset = Math.sin(this.bobTime) * 3;

    // Progress cracking
    this.freezeTimer -= deltaTime;
    this.thawProgress = 1 - this.freezeTimer / (GAME_CONFIG.physics.ice.crackStages * 400);
    this.crackStage = Math.min(
      physics.ice.crackStages,
      Math.floor(this.thawProgress * physics.ice.crackStages)
    );

    // Shake as it cracks
    this.iceRotation = (Math.random() - 0.5) * 0.1 * this.thawProgress;

    if (this.freezeTimer <= 0) {
      this.shatter();
    }
  }

  private shatter(): void {
    this.state = "shattering";

    // Create ice shards
    const w = GAME_CONFIG.animal.width;
    const h = GAME_CONFIG.animal.height;

    for (let i = 0; i < effects.iceShardCount; i++) {
      this.shards.push({
        x: this.x + (Math.random() - 0.5) * w,
        y: this.y + this.bobOffset + (Math.random() - 0.5) * h,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 5 - 2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        size: 8 + Math.random() * 12,
        life: 1.0,
      });
    }
  }

  private updateShattering(_deltaTime: number): void {
    let allDead = true;

    for (const shard of this.shards) {
      shard.vy += 0.3; // Gravity
      shard.x += shard.vx;
      shard.y += shard.vy;
      shard.rotation += shard.rotationSpeed;
      shard.life -= 0.02;

      if (shard.life > 0) allDead = false;
    }

    if (allDead) {
      this.state = "falling";
      // Transfer back to normal animal physics
      this.duck.state = "falling";
      this.duck.x = this.x;
      this.duck.y = this.y + this.bobOffset;
      this.duck.velocityY = 2;
    }
  }

  private updateFalling(_deltaTime: number): void {
    // Animal is now free - handled by main game loop
  }

  /**
   * Check if the frozen animal is done (released)
   */
  isDone(): boolean {
    return this.state === "falling";
  }

  /**
   * Draw the frozen animal with ice
   */
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y + this.bobOffset);
    ctx.rotate(this.iceRotation);

    const w = GAME_CONFIG.animal.width;
    const h = GAME_CONFIG.animal.height;

    // Draw the animal inside (slightly blue tinted)
    ctx.save();
    ctx.globalAlpha = 0.85;
    this.duck.draw(ctx, 0);
    ctx.restore();

    // Draw ice block
    if (this.state !== "falling") {
      // Ice outer shape
      ctx.fillStyle = colors.ice.solid;
      ctx.beginPath();
      ctx.roundRect(-w * 0.6, -h * 0.6, w * 1.2, h * 1.2, 8);
      ctx.fill();

      // Ice highlights
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.ellipse(-w * 0.25, -h * 0.35, w * 0.2, h * 0.1, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Draw cracks based on crack stage
      if (this.crackStage > 0) {
        ctx.strokeStyle = colors.ice.crack;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";

        const cracksToShow = Math.ceil(
          (this.crackStage / physics.ice.crackStages) * this.cracks.length
        );

        for (let i = 0; i < cracksToShow; i++) {
          const crack = this.cracks[i];
          const progress = Math.min(
            1,
            (this.crackStage - (i / this.cracks.length) * physics.ice.crackStages) / 2
          );

          if (progress > 0) {
            ctx.beginPath();
            ctx.moveTo(crack.x1, crack.y1);
            ctx.lineTo(
              crack.x1 + (crack.x2 - crack.x1) * progress,
              crack.y1 + (crack.y2 - crack.y1) * progress
            );
            ctx.stroke();
          }
        }
      }

      // Frost particles
      ctx.fillStyle = colors.ice.shard;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + this.bobTime * 0.5;
        const dist = w * 0.5 + Math.sin(this.bobTime + i) * 5;
        ctx.beginPath();
        ctx.arc(
          Math.cos(angle) * dist,
          Math.sin(angle) * dist * 0.8,
          2 + Math.random(),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }

    ctx.restore();

    // Draw shards
    if (this.state === "shattering") {
      for (const shard of this.shards) {
        if (shard.life <= 0) continue;

        ctx.save();
        ctx.globalAlpha = shard.life;
        ctx.translate(shard.x, shard.y);
        ctx.rotate(shard.rotation);

        // Draw shard as irregular polygon
        ctx.fillStyle = colors.ice.shard;
        ctx.beginPath();
        ctx.moveTo(0, -shard.size / 2);
        ctx.lineTo(shard.size / 3, 0);
        ctx.lineTo(0, shard.size / 2);
        ctx.lineTo(-shard.size / 3, shard.size / 4);
        ctx.lineTo(-shard.size / 2, -shard.size / 4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }
  }
}