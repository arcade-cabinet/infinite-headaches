/**
 * Flying Pig Variant
 * Pink pig with tiny wings - rare variant that floats and stabilizes
 *
 * When poked, briefly floats UP instead of adding wobble.
 * Reduces stack wobble by 30% for 3 seconds.
 * Rare variant - only 1% spawn chance.
 * Cooldown: 6 seconds
 */

import { World } from "miniplex";
import type { Entity } from "../../../ecs/components";
import {
  type PigEntity,
  type FloatStabilizeComponent,
  type WobbleReductionBuffComponent,
  type PigParticleConfig,
  createPigVariantComponent,
  createPigAbilityComponent,
  createFloatStabilizeComponent,
} from "../components";
import { FLYING_PIG_CONFIG } from "../config";

/**
 * Create a new Flying Pig entity
 */
export function createFlyingPig(
  world: World<Entity & PigEntity>,
  x: number,
  y: number
): Entity & PigEntity {
  const entity = world.add({
    id: crypto.randomUUID(),
    position: { x, y, z: 0 } as any,
    velocity: { x: 0, y: 0, z: 0 } as any,
    scale: { x: 1, y: 1, z: 1 } as any,
    tag: { type: "animal", subtype: "pig" as any },
    pigVariant: createPigVariantComponent("flying_pig"),
    pigAbility: createPigAbilityComponent("float_stabilize", FLYING_PIG_CONFIG.ability.cooldownMs),
  });

  return entity;
}

/**
 * Generate float sparkle particles
 */
export function generateFloatSparkles(
  centerX: number,
  centerY: number
): PigParticleConfig[] {
  const particles: PigParticleConfig[] = [];
  const colors = FLYING_PIG_CONFIG.visuals.particleColors;
  const count = 15;

  // Sparkles rising upward
  for (let i = 0; i < count; i++) {
    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = Math.random() * 20;

    particles.push({
      type: "sparkle",
      startX: centerX + offsetX,
      startY: centerY + offsetY,
      velocityX: (Math.random() - 0.5) * 1,
      velocityY: -2 - Math.random() * 2,
      lifetime: 800 + Math.random() * 400,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 3,
      gravity: -0.01, // Float upward
      rotationSpeed: (Math.random() - 0.5) * 0.2,
    });
  }

  // Feather particles from wings
  for (let i = 0; i < 4; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    particles.push({
      type: "feather",
      startX: centerX + side * 25,
      startY: centerY - 5,
      velocityX: side * (1 + Math.random()),
      velocityY: -1 - Math.random(),
      lifetime: 1200 + Math.random() * 400,
      color: "#FFFFFF",
      size: 6 + Math.random() * 4,
      gravity: 0.02,
      rotationSpeed: side * 0.1,
    });
  }

  return particles;
}

/**
 * Generate wing flap trail particles
 */
export function generateWingFlapTrail(
  centerX: number,
  centerY: number,
  flapPhase: number
): PigParticleConfig[] {
  const particles: PigParticleConfig[] = [];
  const colors = FLYING_PIG_CONFIG.visuals.particleColors;

  // Wing position based on flap phase
  const wingOffset = Math.sin(flapPhase) * 10;

  // Left wing sparkles
  particles.push({
    type: "sparkle",
    startX: centerX - 20,
    startY: centerY - 5 + wingOffset,
    velocityX: -1,
    velocityY: wingOffset > 0 ? -1 : 0.5,
    lifetime: 300,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 2,
    gravity: 0,
    rotationSpeed: 0,
  });

  // Right wing sparkles
  particles.push({
    type: "sparkle",
    startX: centerX + 20,
    startY: centerY - 5 + wingOffset,
    velocityX: 1,
    velocityY: wingOffset > 0 ? -1 : 0.5,
    lifetime: 300,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 2,
    gravity: 0,
    rotationSpeed: 0,
  });

  return particles;
}

/**
 * Activate float stabilize ability
 * Makes the pig float up and reduces stack wobble
 */
export function activateFloatStabilize(
  world: World<Entity & PigEntity>,
  pigEntity: Entity & PigEntity,
  gameTime: number
): { floatEffect: FloatStabilizeComponent; buff: WobbleReductionBuffComponent } | null {
  const ability = pigEntity.pigAbility;
  const position = pigEntity.position;

  if (!ability || !position) return null;

  // Check cooldown
  if (ability.cooldownRemaining > 0) return null;

  const x = (position as any).x ?? 0;
  const y = (position as any).y ?? 0;

  // Create float stabilize component on the pig
  const floatEffect = createFloatStabilizeComponent(
    y,
    FLYING_PIG_CONFIG.ability.params.floatHeight,
    FLYING_PIG_CONFIG.ability.params.wobbleReduction,
    FLYING_PIG_CONFIG.ability.durationMs
  );

  world.addComponent(pigEntity, "floatStabilize", floatEffect);

  // Create stack-wide wobble reduction buff
  const buff: WobbleReductionBuffComponent = {
    reductionFactor: FLYING_PIG_CONFIG.ability.params.wobbleReduction,
    timeRemaining: FLYING_PIG_CONFIG.ability.durationMs,
    sourceEntityId: pigEntity.id || "",
  };

  world.add({
    id: crypto.randomUUID(),
    wobbleReductionBuff: buff,
  });

  // Create visual effects
  world.add({
    id: crypto.randomUUID(),
    pigAbilityVisual: {
      effectType: "float_sparkles",
      x,
      y,
      scale: 1,
      rotation: 0,
      opacity: 1,
      timeRemaining: FLYING_PIG_CONFIG.ability.params.floatDuration + 500,
      params: {},
    },
  });

  world.add({
    id: crypto.randomUUID(),
    pigAbilityVisual: {
      effectType: "wing_flap",
      x,
      y,
      scale: 1,
      rotation: 0,
      opacity: 1,
      timeRemaining: FLYING_PIG_CONFIG.ability.params.floatDuration,
      params: { flapSpeed: 0.03 },
    },
  });

  // Generate sparkle particles
  const particles = generateFloatSparkles(x, y);

  world.add({
    id: crypto.randomUUID(),
    pigParticleEmitter: {
      particles,
      x,
      y,
      isActive: true,
      emissionRate: 0,
      timeSinceEmission: 0,
    },
  });

  // Update ability state
  ability.isActive = true;
  ability.activatedAt = gameTime;
  ability.durationRemaining = FLYING_PIG_CONFIG.ability.durationMs;
  ability.cooldownRemaining = FLYING_PIG_CONFIG.ability.cooldownMs;

  // Mark pig as activated
  if (pigEntity.pigVariant) {
    pigEntity.pigVariant.activated = true;
    pigEntity.pigVariant.lastActivationTime = gameTime;
  }

  return { floatEffect, buff };
}

/**
 * Update float animation
 * Returns the current Y position based on animation progress
 */
export function updateFloatAnimation(
  floatEffect: FloatStabilizeComponent,
  deltaTime: number
): number {
  if (!floatEffect.isFloating) {
    return floatEffect.originalY;
  }

  // Progress the float animation
  const floatDuration = FLYING_PIG_CONFIG.ability.params.floatDuration;
  floatEffect.floatProgress = Math.min(1, floatEffect.floatProgress + deltaTime / floatDuration);

  // Ease-out cubic for smooth float
  const easeProgress = 1 - Math.pow(1 - floatEffect.floatProgress, 3);

  // Calculate current Y
  const currentY =
    floatEffect.originalY +
    (floatEffect.floatTargetY - floatEffect.originalY) * easeProgress;

  // End float animation when complete
  if (floatEffect.floatProgress >= 1) {
    floatEffect.isFloating = false;
  }

  return currentY;
}

/**
 * Calculate wobble reduction multiplier
 * Returns a value to multiply wobble by (e.g., 0.7 for 30% reduction)
 */
export function calculateWobbleMultiplier(
  world: World<Entity & PigEntity>
): number {
  const buffs = world.with("wobbleReductionBuff");
  let maxReduction = 0;

  for (const entity of buffs) {
    const buff = entity.wobbleReductionBuff;
    if (buff && buff.timeRemaining > 0) {
      maxReduction = Math.max(maxReduction, buff.reductionFactor);
    }
  }

  return 1 - maxReduction; // 0.3 reduction -> 0.7 multiplier
}

/**
 * Render float effect (for 2D canvas overlay)
 */
export function renderFloatEffect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  floatEffect: FloatStabilizeComponent,
  gameTime: number
): void {
  ctx.save();

  // Draw stabilization aura
  const auraRadius = 50;
  const pulsePhase = gameTime * 0.003;
  const pulsedRadius = auraRadius + Math.sin(pulsePhase) * 5;

  const gradient = ctx.createRadialGradient(x, y, 0, x, y, pulsedRadius);
  gradient.addColorStop(0, "rgba(255, 182, 193, 0.3)");
  gradient.addColorStop(0.7, "rgba(255, 182, 193, 0.1)");
  gradient.addColorStop(1, "rgba(255, 182, 193, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, pulsedRadius, 0, Math.PI * 2);
  ctx.fill();

  // Draw tiny wings
  const wingFlapPhase = gameTime * 0.03;
  const wingAngle = Math.sin(wingFlapPhase) * 0.4;

  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.strokeStyle = "rgba(255, 182, 193, 0.8)";
  ctx.lineWidth = 1;

  // Left wing
  ctx.save();
  ctx.translate(x - 20, y - 5);
  ctx.rotate(-0.3 + wingAngle);
  drawWing(ctx, -1);
  ctx.restore();

  // Right wing
  ctx.save();
  ctx.translate(x + 20, y - 5);
  ctx.rotate(0.3 - wingAngle);
  drawWing(ctx, 1);
  ctx.restore();

  // Draw float indicator arrow
  if (floatEffect.isFloating) {
    ctx.fillStyle = "rgba(255, 182, 193, 0.6)";
    ctx.beginPath();
    ctx.moveTo(x, y - 40);
    ctx.lineTo(x - 8, y - 30);
    ctx.lineTo(x + 8, y - 30);
    ctx.closePath();
    ctx.fill();
  }

  // Draw stabilize icon
  if (floatEffect.stabilizeDurationRemaining > 0) {
    const iconOpacity = Math.min(1, floatEffect.stabilizeDurationRemaining / 500);
    ctx.fillStyle = `rgba(255, 215, 0, ${iconOpacity * 0.8})`;
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("STABLE", x, y - 50);

    // Progress bar
    const barWidth = 40;
    const progress = floatEffect.stabilizeDurationRemaining / FLYING_PIG_CONFIG.ability.durationMs;
    ctx.fillStyle = `rgba(255, 182, 193, ${iconOpacity * 0.5})`;
    ctx.fillRect(x - barWidth / 2, y - 45, barWidth, 4);
    ctx.fillStyle = `rgba(255, 182, 193, ${iconOpacity})`;
    ctx.fillRect(x - barWidth / 2, y - 45, barWidth * progress, 4);
  }

  ctx.restore();
}

/**
 * Draw a simple wing shape
 */
function drawWing(ctx: CanvasRenderingContext2D, direction: number): void {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(direction * 15, -10, direction * 20, 0);
  ctx.quadraticCurveTo(direction * 15, 5, 0, 0);
  ctx.fill();
  ctx.stroke();
}

/**
 * Render wobble reduction indicator on stack
 */
export function renderWobbleReductionIndicator(
  ctx: CanvasRenderingContext2D,
  stackBaseX: number,
  stackTopY: number,
  reductionFactor: number,
  timeRemaining: number
): void {
  if (reductionFactor <= 0) return;

  ctx.save();

  const opacity = Math.min(1, timeRemaining / 500);
  const percentage = Math.round(reductionFactor * 100);

  // Draw stability shield around stack
  ctx.strokeStyle = `rgba(255, 182, 193, ${opacity * 0.5})`;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 5]);

  ctx.beginPath();
  ctx.arc(stackBaseX, stackTopY + 30, 60, 0, Math.PI * 2);
  ctx.stroke();

  // Draw reduction percentage
  ctx.fillStyle = `rgba(255, 182, 193, ${opacity})`;
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`-${percentage}% WOBBLE`, stackBaseX, stackTopY - 10);

  ctx.restore();
}

/**
 * Get flying pig visual modifiers for 3D rendering
 */
export function getFlyingPigVisualModifiers(): {
  colorTint: { r: number; g: number; b: number };
  tintIntensity: number;
  hasWings: boolean;
  wingSize: number;
  emissiveColor: { r: number; g: number; b: number };
  emissiveIntensity: number;
} {
  const { primaryColor, tintIntensity } = FLYING_PIG_CONFIG.visuals;

  return {
    colorTint: { r: primaryColor.r, g: primaryColor.g, b: primaryColor.b },
    tintIntensity,
    hasWings: true,
    wingSize: 0.3, // Relative to pig size
    emissiveColor: { r: 1, g: 0.71, b: 0.76 }, // Pink glow
    emissiveIntensity: 0.2,
  };
}

/**
 * Check if flying pig should be considered "legendary"
 * for achievement tracking
 */
export function isFlyingPigLegendary(): boolean {
  // Flying pig is always legendary due to 1% spawn rate
  return true;
}

/**
 * Get flying pig spawn message
 */
export function getFlyingPigSpawnMessage(): string {
  const messages = [
    "When pigs fly... wait, is that a pig?!",
    "A rare Flying Pig appears!",
    "Pigasus descends from the clouds!",
    "The legendary Flying Pig has arrived!",
    "Oink oink... *flap flap*",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}
