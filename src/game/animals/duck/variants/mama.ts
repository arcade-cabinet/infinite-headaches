/**
 * Mama Duck Variant
 * Larger duck with pattern that attracts ducklings toward the stack
 *
 * Passive ability: attracts "duckling" animals (small animals gravitate slightly toward stack).
 * When poked, calls out and any ducklings on screen immediately fly to stack.
 * Cooldown: 15 seconds
 */

import { World } from "miniplex";
import type { Entity } from "../../../ecs/components";
import {
  type DuckEntity,
  type DucklingAttractionComponent,
  type DuckParticleConfig,
  createDuckVariantComponent,
  createDuckAbilityComponent,
  createDucklingAttractionComponent,
} from "../components";
import { MAMA_DUCK_CONFIG, isDucklingType, getAnimalSizeCategory } from "../config";

/**
 * Create a new Mama Duck entity
 */
export function createMamaDuck(
  world: World<Entity & DuckEntity>,
  x: number,
  y: number
): Entity & DuckEntity {
  const entity = world.add({
    id: crypto.randomUUID(),
    position: { x, y, z: 0 } as any,
    velocity: { x: 0, y: 0, z: 0 } as any,
    scale: { x: 1.2, y: 1.2, z: 1.2 } as any, // Larger than normal
    tag: { type: "animal", subtype: "duck" as any },
    duckVariant: createDuckVariantComponent("mama_duck"),
    duckAbility: createDuckAbilityComponent("duckling_call", MAMA_DUCK_CONFIG.ability.cooldownMs),
  });

  // Add passive attraction (always active)
  world.addComponent(entity, "ducklingAttraction", createDucklingAttractionComponent(
    x,
    y,
    0, // Active radius starts at 0 until ability is used
    MAMA_DUCK_CONFIG.ability.params.passiveAttractionRange,
    0, // Active strength starts at 0
    MAMA_DUCK_CONFIG.ability.params.passiveAttractionStrength,
    0 // No active duration initially
  ));

  return entity;
}

/**
 * Generate musical note particles for call effect
 */
export function generateCallNoteParticles(
  centerX: number,
  centerY: number
): DuckParticleConfig[] {
  const particles: DuckParticleConfig[] = [];
  const colors = MAMA_DUCK_CONFIG.visuals.particleColors;
  const noteShapes = ["note", "heart", "sparkle"];

  // Musical notes rising
  const noteCount = 8;
  for (let i = 0; i < noteCount; i++) {
    const offsetX = (Math.random() - 0.5) * 40;
    const delay = i * 0.1;

    particles.push({
      type: noteShapes[i % noteShapes.length] as any,
      startX: centerX + offsetX,
      startY: centerY - 10,
      velocityX: (Math.random() - 0.5) * 1.5,
      velocityY: -2 - Math.random() * 1.5,
      lifetime: 800 + Math.random() * 400 + delay * 200,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 4,
      gravity: -0.01, // Float upward
      rotationSpeed: (Math.random() - 0.5) * 0.15,
    });
  }

  // Sound wave rings
  for (let i = 0; i < 3; i++) {
    particles.push({
      type: "ripple",
      startX: centerX,
      startY: centerY - 15,
      velocityX: 0,
      velocityY: 0,
      lifetime: 600 + i * 150,
      color: `rgba(222, 184, 135, ${0.5 - i * 0.15})`,
      size: 15 + i * 25,
      gravity: 0,
      rotationSpeed: 0,
    });
  }

  return particles;
}

/**
 * Generate attraction line particles
 */
export function generateAttractionLineParticles(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): DuckParticleConfig[] {
  const particles: DuckParticleConfig[] = [];
  const colors = MAMA_DUCK_CONFIG.visuals.particleColors;

  // Dotted line effect
  const lineLength = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
  const dotCount = Math.max(3, Math.floor(lineLength / 30));

  for (let i = 0; i < dotCount; i++) {
    const t = i / (dotCount - 1);
    const x = fromX + (toX - fromX) * t;
    const y = fromY + (toY - fromY) * t;

    particles.push({
      type: "sparkle",
      startX: x,
      startY: y,
      velocityX: (toX - fromX) / lineLength * 0.5,
      velocityY: (toY - fromY) / lineLength * 0.5,
      lifetime: 300,
      color: colors[i % colors.length],
      size: 3 + (1 - t) * 2,
      gravity: 0,
      rotationSpeed: 0,
    });
  }

  // Hearts at attracted entity
  particles.push({
    type: "heart",
    startX: fromX,
    startY: fromY - 15,
    velocityX: 0,
    velocityY: -1,
    lifetime: 500,
    color: "#FFB6C1",
    size: 8,
    gravity: -0.01,
    rotationSpeed: 0,
  });

  return particles;
}

/**
 * Activate duckling call ability
 */
export function activateDucklingCall(
  world: World<Entity & DuckEntity>,
  mamaDuck: Entity & DuckEntity,
  gameTime: number,
  onDucklingCalled?: (count: number) => void
): DucklingAttractionComponent | null {
  const ability = mamaDuck.duckAbility;
  const position = mamaDuck.position;
  let attraction = mamaDuck.ducklingAttraction;

  if (!ability || !position) return null;
  if (ability.cooldownRemaining > 0) return null;

  const x = (position as any).x ?? 0;
  const y = (position as any).y ?? 0;

  // Update or create attraction component with active settings
  if (attraction) {
    attraction.centerX = x;
    attraction.centerY = y;
    attraction.activeRadius = MAMA_DUCK_CONFIG.ability.effectRadius;
    attraction.activeStrength = MAMA_DUCK_CONFIG.ability.params.attractionStrength;
    attraction.activeTimeRemaining = MAMA_DUCK_CONFIG.ability.durationMs;
    attraction.isCallingAnimation = true;
    attraction.attractedEntityIds = [];
  } else {
    attraction = createDucklingAttractionComponent(
      x,
      y,
      MAMA_DUCK_CONFIG.ability.effectRadius,
      MAMA_DUCK_CONFIG.ability.params.passiveAttractionRange,
      MAMA_DUCK_CONFIG.ability.params.attractionStrength,
      MAMA_DUCK_CONFIG.ability.params.passiveAttractionStrength,
      MAMA_DUCK_CONFIG.ability.durationMs
    );
    world.addComponent(mamaDuck, "ducklingAttraction", attraction);
  }

  // Add call note visuals
  world.add({
    id: crypto.randomUUID(),
    duckAbilityVisual: {
      effectType: "call_notes",
      x,
      y,
      scale: 1,
      rotation: 0,
      opacity: 1,
      timeRemaining: 1000,
      params: {},
    },
  });

  // Generate call particles
  const callParticles = generateCallNoteParticles(x, y);
  world.add({
    id: crypto.randomUUID(),
    duckParticleEmitter: {
      particles: callParticles,
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
  ability.durationRemaining = MAMA_DUCK_CONFIG.ability.durationMs;
  ability.cooldownRemaining = MAMA_DUCK_CONFIG.ability.cooldownMs;

  // Mark duck as activated
  if (mamaDuck.duckVariant) {
    mamaDuck.duckVariant.activated = true;
    mamaDuck.duckVariant.lastActivationTime = gameTime;
  }

  return attraction;
}

/**
 * Calculate attraction force for a falling entity
 */
export function calculateAttractionForce(
  attraction: DucklingAttractionComponent,
  entityX: number,
  entityY: number,
  entityType: string,
  targetStackX: number
): { forceX: number; forceY: number; isAttracted: boolean } {
  const dx = entityX - attraction.centerX;
  const dy = entityY - attraction.centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Check if active or passive attraction applies
  const isActiveRange = attraction.activeTimeRemaining > 0 && distance <= attraction.activeRadius;
  const isPassiveRange = distance <= attraction.passiveRadius;

  if (!isActiveRange && !isPassiveRange) {
    return { forceX: 0, forceY: 0, isAttracted: false };
  }

  // Size category affects attraction strength
  const sizeCategory = getAnimalSizeCategory(entityType);
  if (sizeCategory === "large") {
    return { forceX: 0, forceY: 0, isAttracted: false }; // Large animals not attracted
  }

  const isDuckling = isDucklingType(entityType);
  const strengthMultiplier = isDuckling ? 1.5 : sizeCategory === "small" ? 1.2 : 0.8;

  // Use active or passive strength
  const baseStrength = isActiveRange
    ? attraction.activeStrength
    : attraction.passiveStrength;

  // Distance falloff
  const maxRange = isActiveRange ? attraction.activeRadius : attraction.passiveRadius;
  const distanceFactor = 1 - distance / maxRange;

  // Direction toward stack (not mama)
  const toStackX = targetStackX - entityX;
  const directionX = toStackX > 0 ? 1 : -1;

  const force = baseStrength * strengthMultiplier * distanceFactor;

  return {
    forceX: directionX * force * 0.15,
    forceY: force * 0.05, // Slight downward acceleration too
    isAttracted: true,
  };
}

/**
 * Update attraction effect
 */
export function updateAttractionEffect(
  attraction: DucklingAttractionComponent,
  deltaTime: number,
  mamaX: number,
  mamaY: number
): void {
  // Update position
  attraction.centerX = mamaX;
  attraction.centerY = mamaY;

  // Update active timer
  if (attraction.activeTimeRemaining > 0) {
    attraction.activeTimeRemaining -= deltaTime;

    // End calling animation after initial burst
    if (attraction.isCallingAnimation && attraction.activeTimeRemaining < MAMA_DUCK_CONFIG.ability.durationMs - 500) {
      attraction.isCallingAnimation = false;
    }
  }

  // Clear attracted list each frame (re-populated by system)
  if (attraction.activeTimeRemaining <= 0) {
    attraction.attractedEntityIds = [];
    attraction.isCallingAnimation = false;
    attraction.activeRadius = 0;
    attraction.activeStrength = 0;
  }
}

/**
 * Render attraction effect (for 2D canvas overlay)
 */
export function renderAttractionEffect(
  ctx: CanvasRenderingContext2D,
  attraction: DucklingAttractionComponent,
  attractedEntities: Array<{ x: number; y: number }>
): void {
  ctx.save();

  const { centerX, centerY, passiveRadius, activeRadius, activeTimeRemaining } = attraction;
  const isActive = activeTimeRemaining > 0;

  // Draw passive attraction range (always visible)
  ctx.strokeStyle = "rgba(222, 184, 135, 0.2)";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 10]);

  ctx.beginPath();
  ctx.arc(centerX, centerY, passiveRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw active attraction range when ability is active
  if (isActive) {
    const activeAlpha = Math.min(1, activeTimeRemaining / 500);

    // Pulsing active range
    const pulseScale = 1 + Math.sin(Date.now() * 0.01) * 0.05;
    const pulsedRadius = activeRadius * pulseScale;

    ctx.strokeStyle = `rgba(222, 184, 135, ${activeAlpha * 0.5})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(centerX, centerY, pulsedRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Glow effect
    const gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      pulsedRadius
    );
    gradient.addColorStop(0, `rgba(222, 184, 135, ${activeAlpha * 0.1})`);
    gradient.addColorStop(0.7, `rgba(222, 184, 135, ${activeAlpha * 0.05})`);
    gradient.addColorStop(1, "rgba(222, 184, 135, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulsedRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw attraction lines to entities
    for (const entity of attractedEntities) {
      ctx.strokeStyle = `rgba(255, 182, 193, ${activeAlpha * 0.4})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);

      ctx.beginPath();
      ctx.moveTo(entity.x, entity.y);
      ctx.lineTo(centerX, centerY);
      ctx.stroke();

      // Heart at entity
      ctx.fillStyle = `rgba(255, 182, 193, ${activeAlpha * 0.6})`;
      ctx.font = "12px Arial";
      ctx.fillText("\u2665", entity.x - 4, entity.y - 10); // Heart symbol
    }

    // Call indicator
    if (attraction.isCallingAnimation) {
      ctx.fillStyle = `rgba(222, 184, 135, ${activeAlpha})`;
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.fillText("QUACK!", centerX, centerY - 50);
    }
  }

  ctx.restore();
}

/**
 * Get mama duck visual modifiers for 3D rendering
 */
export function getMamaDuckVisualModifiers(): {
  colorTint: { r: number; g: number; b: number };
  tintIntensity: number;
  scaleMultiplier: number;
  hasPattern: boolean;
  patternColor: { r: number; g: number; b: number };
  emissiveColor: { r: number; g: number; b: number };
  emissiveIntensity: number;
} {
  const { primaryColor, secondaryColor, tintIntensity } = MAMA_DUCK_CONFIG.visuals;

  return {
    colorTint: { r: primaryColor.r, g: primaryColor.g, b: primaryColor.b },
    tintIntensity,
    scaleMultiplier: 1.3, // Larger than normal
    hasPattern: true,
    patternColor: { r: secondaryColor.r, g: secondaryColor.g, b: secondaryColor.b },
    emissiveColor: { r: 0.87, g: 0.72, b: 0.53 },
    emissiveIntensity: 0.1,
  };
}

/**
 * Get list of animal types that are attracted as ducklings
 */
export function getAttractableDucklingTypes(): string[] {
  return ["duck", "chicken"]; // Small birds
}

/**
 * Check if mama duck has any active attraction
 */
export function hasActiveAttraction(attraction: DucklingAttractionComponent): boolean {
  return attraction.activeTimeRemaining > 0;
}

/**
 * Get call sound parameters
 */
export function getCallSoundParams(): {
  frequency: number;
  duration: number;
  pattern: number[];
} {
  return {
    frequency: 400, // Hz
    duration: 300, // ms per quack
    pattern: [1, 0.5, 1], // Quack pattern (relative volume/duration)
  };
}
