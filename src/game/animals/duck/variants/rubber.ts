/**
 * Rubber Duck Variant
 * Bright yellow, squeaky rubber duck that bounces the stack
 *
 * When poked, SQUEAKS and bounces the entire stack slightly.
 * Any falling animals within bounce radius get "booped" sideways toward the stack.
 * Cooldown: 3 seconds
 */

import { World } from "miniplex";
import type { Entity } from "../../../ecs/components";
import {
  type DuckEntity,
  type SqueakBounceComponent,
  type DuckParticleConfig,
  createDuckVariantComponent,
  createDuckAbilityComponent,
  createSqueakBounceComponent,
} from "../components";
import { RUBBER_DUCK_CONFIG } from "../config";

/**
 * Create a new Rubber Duck entity
 */
export function createRubberDuck(
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
    duckVariant: createDuckVariantComponent("rubber_duck"),
    duckAbility: createDuckAbilityComponent("squeak_bounce", RUBBER_DUCK_CONFIG.ability.cooldownMs),
  });

  return entity;
}

/**
 * Generate squeak ring particles
 */
export function generateSqueakRingParticles(
  centerX: number,
  centerY: number
): DuckParticleConfig[] {
  const particles: DuckParticleConfig[] = [];
  const colors = RUBBER_DUCK_CONFIG.visuals.particleColors;

  // Expanding ring particles
  const ringCount = 3;
  for (let ring = 0; ring < ringCount; ring++) {
    const particleCount = 8 + ring * 4;
    const baseRadius = 20 + ring * 30;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      particles.push({
        type: "bubble",
        startX: centerX + Math.cos(angle) * baseRadius,
        startY: centerY + Math.sin(angle) * baseRadius,
        velocityX: Math.cos(angle) * (1 + ring * 0.5),
        velocityY: Math.sin(angle) * (1 + ring * 0.5),
        lifetime: 400 + ring * 100,
        color: colors[ring % colors.length],
        size: 4 + Math.random() * 3,
        gravity: 0,
        rotationSpeed: 0,
      });
    }
  }

  // Sound wave particles
  for (let i = 0; i < 6; i++) {
    const angle = (Math.random() - 0.5) * 1;
    particles.push({
      type: "sparkle",
      startX: centerX,
      startY: centerY - 20, // From beak area
      velocityX: Math.sin(angle) * 2,
      velocityY: -2 - Math.random() * 2,
      lifetime: 600 + Math.random() * 200,
      color: "#FFFF00",
      size: 3 + Math.random() * 2,
      gravity: -0.01,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
    });
  }

  return particles;
}

/**
 * Generate boop indicator particles
 */
export function generateBoopParticles(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): DuckParticleConfig[] {
  const particles: DuckParticleConfig[] = [];
  const colors = RUBBER_DUCK_CONFIG.visuals.particleColors;

  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const dirX = dx / dist;
  const dirY = dy / dist;

  // Arrow-like particles
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    particles.push({
      type: "sparkle",
      startX: fromX + dx * t,
      startY: fromY + dy * t,
      velocityX: dirX * 2,
      velocityY: dirY * 2,
      lifetime: 300,
      color: colors[i % colors.length],
      size: 4 - i * 0.5,
      gravity: 0,
      rotationSpeed: 0,
    });
  }

  return particles;
}

/**
 * Activate squeak bounce ability
 */
export function activateSqueakBounce(
  world: World<Entity & DuckEntity>,
  duckEntity: Entity & DuckEntity,
  gameTime: number,
  onBounce?: (force: number) => void,
  onSqueak?: () => void
): SqueakBounceComponent | null {
  const ability = duckEntity.duckAbility;
  const position = duckEntity.position;

  if (!ability || !position) return null;
  if (ability.cooldownRemaining > 0) return null;

  const x = (position as any).x ?? 0;
  const y = (position as any).y ?? 0;

  // Create squeak bounce component
  const bounce = createSqueakBounceComponent(
    x,
    y,
    RUBBER_DUCK_CONFIG.ability.effectRadius,
    RUBBER_DUCK_CONFIG.ability.params.boopDuration
  );

  // Create bounce entity
  world.add({
    id: crypto.randomUUID(),
    squeakBounce: bounce,
    duckAbilityVisual: {
      effectType: "squeak_rings",
      x,
      y,
      scale: 1,
      rotation: 0,
      opacity: 1,
      timeRemaining: RUBBER_DUCK_CONFIG.ability.durationMs,
      params: { ringCount: 3 },
    },
  });

  // Generate particles
  const particles = generateSqueakRingParticles(x, y);
  world.add({
    id: crypto.randomUUID(),
    duckParticleEmitter: {
      particles,
      x,
      y,
      isActive: true,
      emissionRate: 0,
      timeSinceEmission: 0,
    },
  });

  // Trigger callbacks
  if (onSqueak) onSqueak();
  if (onBounce) onBounce(RUBBER_DUCK_CONFIG.ability.params.bounceForce);

  // Update ability state
  ability.isActive = true;
  ability.activatedAt = gameTime;
  ability.durationRemaining = RUBBER_DUCK_CONFIG.ability.durationMs;
  ability.cooldownRemaining = RUBBER_DUCK_CONFIG.ability.cooldownMs;

  // Mark duck as activated
  if (duckEntity.duckVariant) {
    duckEntity.duckVariant.activated = true;
    duckEntity.duckVariant.lastActivationTime = gameTime;
  }

  return bounce;
}

/**
 * Calculate boop force for a falling entity
 */
export function calculateBoopForce(
  entityX: number,
  entityY: number,
  bounceX: number,
  bounceY: number,
  targetStackX: number,
  boopRadius: number
): { forceX: number; forceY: number; shouldBoop: boolean } {
  const dx = entityX - bounceX;
  const dy = entityY - bounceY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > boopRadius || distance < 10) {
    return { forceX: 0, forceY: 0, shouldBoop: false };
  }

  // Direction toward stack
  const toStackX = targetStackX - entityX;
  const boopDirection = toStackX > 0 ? 1 : -1;

  // Force decreases with distance from center
  const distanceFactor = 1 - distance / boopRadius;
  const baseForce = RUBBER_DUCK_CONFIG.ability.params.boopStrength;

  return {
    forceX: boopDirection * baseForce * distanceFactor,
    forceY: 0, // Only horizontal boop
    shouldBoop: true,
  };
}

/**
 * Render squeak bounce effect (for 2D canvas overlay)
 */
export function renderSqueakBounce(
  ctx: CanvasRenderingContext2D,
  bounce: SqueakBounceComponent
): void {
  ctx.save();

  const { centerX, centerY, bouncePhase, boopRadius } = bounce;
  const alpha = 1 - bouncePhase;

  // Draw expanding rings
  const ringCount = 3;
  for (let i = 0; i < ringCount; i++) {
    const ringProgress = Math.max(0, bouncePhase - i * 0.15);
    const ringRadius = ringProgress * boopRadius;
    const ringAlpha = alpha * (1 - i / ringCount);

    ctx.strokeStyle = `rgba(255, 215, 0, ${ringAlpha * 0.5})`;
    ctx.lineWidth = 3 - i;

    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Draw squeak indicator
  if (bouncePhase < 0.3) {
    const squeakScale = 1 + Math.sin(bouncePhase * 30) * 0.2;
    ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
    ctx.font = `bold ${14 * squeakScale}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("SQUEAK!", centerX, centerY - 40);
  }

  // Draw boop direction arrows
  if (bounce.boopedEntityIds.length > 0) {
    ctx.strokeStyle = `rgba(255, 165, 0, ${alpha * 0.7})`;
    ctx.lineWidth = 2;

    // Arrow pointing toward stack (simplified - left and right)
    const arrowLen = 20;
    const arrowY = centerY;

    // Left arrow
    ctx.beginPath();
    ctx.moveTo(centerX - boopRadius * 0.5, arrowY);
    ctx.lineTo(centerX - boopRadius * 0.5 - arrowLen, arrowY);
    ctx.moveTo(centerX - boopRadius * 0.5 - arrowLen + 8, arrowY - 5);
    ctx.lineTo(centerX - boopRadius * 0.5 - arrowLen, arrowY);
    ctx.lineTo(centerX - boopRadius * 0.5 - arrowLen + 8, arrowY + 5);
    ctx.stroke();

    // Right arrow
    ctx.beginPath();
    ctx.moveTo(centerX + boopRadius * 0.5, arrowY);
    ctx.lineTo(centerX + boopRadius * 0.5 + arrowLen, arrowY);
    ctx.moveTo(centerX + boopRadius * 0.5 + arrowLen - 8, arrowY - 5);
    ctx.lineTo(centerX + boopRadius * 0.5 + arrowLen, arrowY);
    ctx.lineTo(centerX + boopRadius * 0.5 + arrowLen - 8, arrowY + 5);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Get rubber duck visual modifiers for 3D rendering
 */
export function getRubberDuckVisualModifiers(): {
  colorTint: { r: number; g: number; b: number };
  tintIntensity: number;
  glossiness: number;
  emissiveColor: { r: number; g: number; b: number };
  emissiveIntensity: number;
} {
  const { primaryColor, tintIntensity } = RUBBER_DUCK_CONFIG.visuals;

  return {
    colorTint: { r: primaryColor.r, g: primaryColor.g, b: primaryColor.b },
    tintIntensity,
    glossiness: 0.8, // Shiny rubber finish
    emissiveColor: { r: 1, g: 0.92, b: 0 },
    emissiveIntensity: 0.1,
  };
}

/**
 * Get squeak sound parameters
 */
export function getSqueakSoundParams(): {
  pitch: number;
  duration: number;
  volume: number;
} {
  return {
    pitch: 800 + Math.random() * 400, // 800-1200 Hz squeak
    duration: 150,
    volume: RUBBER_DUCK_CONFIG.ability.params.squeakVolume,
  };
}
