/**
 * Diving Duck Variant
 * Blue-green duck that dives through the stack to stabilize it
 *
 * When poked, dives DOWN through the stack (phases through).
 * Reappears at bottom, stabilizing the entire stack (reduces all wobble by 50%).
 * Cooldown: 8 seconds
 */

import { World } from "miniplex";
import type { Entity } from "../../../ecs/components";
import {
  type DuckEntity,
  type DiveStabilizeComponent,
  type DuckParticleConfig,
  createDuckVariantComponent,
  createDuckAbilityComponent,
  createDiveStabilizeComponent,
} from "../components";
import { DIVING_DUCK_CONFIG } from "../config";

/**
 * Create a new Diving Duck entity
 */
export function createDivingDuck(
  world: World<Entity & DuckEntity>,
  x: number,
  y: number
): Entity & DuckEntity {
  const entity = world.add({
    id: crypto.randomUUID(),
    position: { x, y, z: 0 } as any,
    velocity: { x: 0, y: 0, z: 0 } as any,
    scale: { x: 1, y: 1, z: 1 } as any,
    tag: { type: "animal", subtype: "duck" as any },
    duckVariant: createDuckVariantComponent("diving_duck"),
    duckAbility: createDuckAbilityComponent("dive_stabilize", DIVING_DUCK_CONFIG.ability.cooldownMs),
  });

  return entity;
}

/**
 * Generate dive trail particles
 */
export function generateDiveTrailParticles(
  x: number,
  y: number,
  diveProgress: number
): DuckParticleConfig[] {
  const particles: DuckParticleConfig[] = [];
  const colors = DIVING_DUCK_CONFIG.visuals.particleColors;

  // Water ripple effect
  const rippleCount = 3;
  for (let i = 0; i < rippleCount; i++) {
    particles.push({
      type: "ripple",
      startX: x + (Math.random() - 0.5) * 20,
      startY: y,
      velocityX: (Math.random() - 0.5) * 0.5,
      velocityY: 0.2,
      lifetime: 400 + Math.random() * 200,
      color: colors[i % colors.length],
      size: 8 + Math.random() * 6,
      gravity: 0,
      rotationSpeed: 0,
    });
  }

  // Bubble trail
  const bubbleCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < bubbleCount; i++) {
    particles.push({
      type: "bubble",
      startX: x + (Math.random() - 0.5) * 15,
      startY: y + Math.random() * 10,
      velocityX: (Math.random() - 0.5) * 0.3,
      velocityY: -0.5 - Math.random() * 0.5,
      lifetime: 500 + Math.random() * 300,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 3,
      gravity: -0.01, // Float upward
      rotationSpeed: 0,
    });
  }

  // Splash particles during dive
  if (diveProgress < 0.3) {
    for (let i = 0; i < 4; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * 1; // Mostly upward
      particles.push({
        type: "splash",
        startX: x,
        startY: y,
        velocityX: Math.cos(angle) * (2 + Math.random() * 2),
        velocityY: Math.sin(angle) * (2 + Math.random() * 2),
        lifetime: 300 + Math.random() * 200,
        color: "#48D1CC",
        size: 4 + Math.random() * 3,
        gravity: 0.1,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
      });
    }
  }

  return particles;
}

/**
 * Generate stabilization aura particles
 */
export function generateStabilizeAuraParticles(
  centerX: number,
  centerY: number,
  stackHeight: number
): DuckParticleConfig[] {
  const particles: DuckParticleConfig[] = [];
  const colors = DIVING_DUCK_CONFIG.visuals.particleColors;

  // Vertical stability lines
  const lineCount = 4;
  for (let i = 0; i < lineCount; i++) {
    const offsetX = (i / (lineCount - 1) - 0.5) * 40;
    const startY = centerY - stackHeight * 30;

    for (let j = 0; j < 5; j++) {
      particles.push({
        type: "sparkle",
        startX: centerX + offsetX,
        startY: startY + j * (stackHeight * 30 / 5),
        velocityX: 0,
        velocityY: -0.5,
        lifetime: 800 + Math.random() * 400,
        color: colors[j % colors.length],
        size: 2 + Math.random() * 2,
        gravity: 0,
        rotationSpeed: 0,
      });
    }
  }

  // Shield-like ring at bottom
  const ringParticles = 12;
  for (let i = 0; i < ringParticles; i++) {
    const angle = (i / ringParticles) * Math.PI * 2;
    const radius = 35;
    particles.push({
      type: "sparkle",
      startX: centerX + Math.cos(angle) * radius,
      startY: centerY + Math.sin(angle) * radius * 0.3, // Ellipse
      velocityX: Math.cos(angle) * 0.2,
      velocityY: Math.sin(angle) * 0.1,
      lifetime: 600,
      color: "#00CED1",
      size: 3,
      gravity: 0,
      rotationSpeed: 0.05,
    });
  }

  return particles;
}

/**
 * Activate dive stabilize ability
 */
export function activateDiveStabilize(
  world: World<Entity & DuckEntity>,
  duckEntity: Entity & DuckEntity,
  gameTime: number,
  stackBottomY: number,
  onWobbleReduction?: (factor: number, duration: number) => void
): DiveStabilizeComponent | null {
  const ability = duckEntity.duckAbility;
  const position = duckEntity.position;

  if (!ability || !position) return null;
  if (ability.cooldownRemaining > 0) return null;

  const x = (position as any).x ?? 0;
  const y = (position as any).y ?? 0;

  // Create dive component
  const dive = createDiveStabilizeComponent(
    y,
    stackBottomY,
    DIVING_DUCK_CONFIG.ability.params.wobbleReduction,
    DIVING_DUCK_CONFIG.ability.params.stabilizeDuration
  );

  // Add to entity
  world.addComponent(duckEntity, "diveStabilize", dive);

  // Add visual effect
  world.add({
    id: crypto.randomUUID(),
    duckAbilityVisual: {
      effectType: "dive_trail",
      x,
      y,
      scale: 1,
      rotation: 0,
      opacity: 1,
      timeRemaining: DIVING_DUCK_CONFIG.ability.durationMs,
      params: {},
    },
  });

  // Generate initial splash particles
  const splashParticles = generateDiveTrailParticles(x, y, 0);
  world.add({
    id: crypto.randomUUID(),
    duckParticleEmitter: {
      particles: splashParticles,
      x,
      y,
      isActive: true,
      emissionRate: 0,
      timeSinceEmission: 0,
    },
  });

  // Trigger callback
  if (onWobbleReduction) {
    onWobbleReduction(
      DIVING_DUCK_CONFIG.ability.params.wobbleReduction,
      DIVING_DUCK_CONFIG.ability.params.stabilizeDuration
    );
  }

  // Update ability state
  ability.isActive = true;
  ability.activatedAt = gameTime;
  ability.durationRemaining = DIVING_DUCK_CONFIG.ability.durationMs;
  ability.cooldownRemaining = DIVING_DUCK_CONFIG.ability.cooldownMs;

  // Mark duck as activated
  if (duckEntity.duckVariant) {
    duckEntity.duckVariant.activated = true;
    duckEntity.duckVariant.lastActivationTime = gameTime;
  }

  return dive;
}

/**
 * Update dive animation
 * Returns current Y position and whether dive is complete
 */
export function updateDiveAnimation(
  dive: DiveStabilizeComponent,
  deltaTime: number
): { currentY: number; isComplete: boolean } {
  if (!dive.isDiving || dive.diveComplete) {
    return { currentY: dive.targetY, isComplete: dive.diveComplete };
  }

  const diveSpeed = DIVING_DUCK_CONFIG.ability.params.diveSpeed;
  const totalDistance = Math.abs(dive.targetY - dive.startY);

  // Update progress
  dive.diveProgress += (diveSpeed * deltaTime) / (totalDistance * 1000);
  dive.diveProgress = Math.min(1, dive.diveProgress);

  // Ease-in-out interpolation
  const easeProgress =
    dive.diveProgress < 0.5
      ? 2 * dive.diveProgress * dive.diveProgress
      : 1 - Math.pow(-2 * dive.diveProgress + 2, 2) / 2;

  const currentY = dive.startY + (dive.targetY - dive.startY) * easeProgress;

  // Check completion
  if (dive.diveProgress >= 1) {
    dive.diveComplete = true;
    dive.isDiving = false;
    dive.isPhasing = false;
  }

  return { currentY, isComplete: dive.diveComplete };
}

/**
 * Calculate wobble reduction multiplier
 */
export function calculateWobbleReduction(dive: DiveStabilizeComponent): number {
  if (!dive.diveComplete || dive.stabilizeDurationRemaining <= 0) {
    return 1.0; // No reduction
  }

  // Fade out reduction near end
  const fadeOutDuration = 500;
  if (dive.stabilizeDurationRemaining < fadeOutDuration) {
    const fadeProgress = dive.stabilizeDurationRemaining / fadeOutDuration;
    return 1 - dive.wobbleReductionFactor * fadeProgress;
  }

  return 1 - dive.wobbleReductionFactor;
}

/**
 * Render dive effect (for 2D canvas overlay)
 */
export function renderDiveEffect(
  ctx: CanvasRenderingContext2D,
  dive: DiveStabilizeComponent,
  currentX: number,
  stackHeight: number
): void {
  ctx.save();

  // Draw phasing effect during dive
  if (dive.isDiving && dive.isPhasing) {
    const currentY =
      dive.startY + (dive.targetY - dive.startY) * dive.diveProgress;

    // Ghost trail
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = "#00CED1";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(currentX, dive.startY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    // Motion blur effect
    const blurCount = 3;
    for (let i = 0; i < blurCount; i++) {
      const blurY = currentY - i * 15;
      const blurAlpha = 0.2 * (1 - i / blurCount);
      ctx.globalAlpha = blurAlpha;
      ctx.fillStyle = "#48D1CC";
      ctx.beginPath();
      ctx.ellipse(currentX, blurY, 15, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw stabilization effect after dive
  if (dive.diveComplete && dive.stabilizeDurationRemaining > 0) {
    const stabilizeAlpha = Math.min(1, dive.stabilizeDurationRemaining / 500);

    // Stability aura
    const gradient = ctx.createLinearGradient(
      currentX - 30,
      dive.targetY - stackHeight * 50,
      currentX + 30,
      dive.targetY
    );
    gradient.addColorStop(0, `rgba(0, 206, 209, 0)`);
    gradient.addColorStop(0.5, `rgba(0, 206, 209, ${stabilizeAlpha * 0.3})`);
    gradient.addColorStop(1, `rgba(0, 206, 209, 0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(
      currentX - 30,
      dive.targetY - stackHeight * 50,
      60,
      stackHeight * 50
    );

    // Stability indicator
    ctx.globalAlpha = stabilizeAlpha;
    ctx.fillStyle = "#00CED1";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      `-${Math.round(DIVING_DUCK_CONFIG.ability.params.wobbleReduction * 100)}% WOBBLE`,
      currentX,
      dive.targetY + 30
    );

    // Progress bar
    const barWidth = 40;
    const progress =
      dive.stabilizeDurationRemaining /
      DIVING_DUCK_CONFIG.ability.params.stabilizeDuration;
    ctx.fillStyle = `rgba(0, 206, 209, ${stabilizeAlpha * 0.3})`;
    ctx.fillRect(currentX - barWidth / 2, dive.targetY + 35, barWidth, 4);
    ctx.fillStyle = `rgba(0, 206, 209, ${stabilizeAlpha})`;
    ctx.fillRect(currentX - barWidth / 2, dive.targetY + 35, barWidth * progress, 4);
  }

  ctx.restore();
}

/**
 * Get diving duck visual modifiers for 3D rendering
 */
export function getDivingDuckVisualModifiers(): {
  colorTint: { r: number; g: number; b: number };
  tintIntensity: number;
  streamlinedPose: boolean;
  emissiveColor: { r: number; g: number; b: number };
  emissiveIntensity: number;
} {
  const { primaryColor, tintIntensity } = DIVING_DUCK_CONFIG.visuals;

  return {
    colorTint: { r: primaryColor.r, g: primaryColor.g, b: primaryColor.b },
    tintIntensity,
    streamlinedPose: true, // Special dive animation
    emissiveColor: { r: 0, g: 0.8, b: 0.8 },
    emissiveIntensity: 0.15,
  };
}

/**
 * Check if diving duck should phase through other entities
 */
export function shouldPhaseThrough(dive: DiveStabilizeComponent): boolean {
  return dive.isDiving && dive.isPhasing && !dive.diveComplete;
}
