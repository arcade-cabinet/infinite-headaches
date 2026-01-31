/**
 * Mud Pig Variant
 * Brown/muddy pig that splatters mud creating sticky zones
 *
 * When poked, splatters mud in a small radius.
 * Mud on the ground creates a "sticky zone" - falling animals that land in mud
 * stick to the ground briefly (1.5s) before bouncing, giving player time to position.
 * Cooldown: 5 seconds
 */

import { World } from "miniplex";
import type { Entity } from "../../../ecs/components";
import {
  type PigEntity,
  type MudStickyZoneComponent,
  type PigParticleConfig,
  createPigVariantComponent,
  createPigAbilityComponent,
  createMudStickyZoneComponent,
} from "../components";
import { MUD_PIG_CONFIG } from "../config";

/**
 * Create a new Mud Pig entity
 */
export function createMudPig(
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
    pigVariant: createPigVariantComponent("mud_pig"),
    pigAbility: createPigAbilityComponent("mud_splatter", MUD_PIG_CONFIG.ability.cooldownMs),
  });

  return entity;
}

/**
 * Generate mud splatter particles
 */
export function generateMudSplatterParticles(
  centerX: number,
  centerY: number,
  count: number
): PigParticleConfig[] {
  const particles: PigParticleConfig[] = [];
  const colors = MUD_PIG_CONFIG.visuals.particleColors;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const speed = 2 + Math.random() * 4;
    const size = 4 + Math.random() * 6;

    particles.push({
      type: "mud_drop",
      startX: centerX,
      startY: centerY,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed - 2, // Initial upward burst
      lifetime: 800 + Math.random() * 400,
      color: colors[Math.floor(Math.random() * colors.length)],
      size,
      gravity: 0.15,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
    });
  }

  // Add some drip particles for ground splash effect
  for (let i = 0; i < count / 2; i++) {
    const offsetX = (Math.random() - 0.5) * MUD_PIG_CONFIG.ability.params.mudPuddleRadius;
    particles.push({
      type: "mud_drop",
      startX: centerX + offsetX,
      startY: centerY + 30, // Ground level
      velocityX: (Math.random() - 0.5) * 2,
      velocityY: -3 - Math.random() * 2,
      lifetime: 600 + Math.random() * 300,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 4,
      gravity: 0.2,
      rotationSpeed: 0,
    });
  }

  return particles;
}

/**
 * Activate mud splatter ability
 * Creates a sticky zone below the pig
 */
export function activateMudSplatter(
  world: World<Entity & PigEntity>,
  pigEntity: Entity & PigEntity,
  gameTime: number
): { zone: MudStickyZoneComponent; particles: PigParticleConfig[] } | null {
  const ability = pigEntity.pigAbility;
  const position = pigEntity.position;

  if (!ability || !position) return null;

  // Check cooldown
  if (ability.cooldownRemaining > 0) return null;

  const x = (position as any).x ?? 0;
  const y = (position as any).y ?? 0;

  // Create mud zone below the pig
  const zoneY = y + 50; // Below the pig's position
  const zone = createMudStickyZoneComponent(
    x,
    zoneY,
    MUD_PIG_CONFIG.ability.params.mudPuddleRadius,
    MUD_PIG_CONFIG.ability.durationMs
  );

  // Create zone entity
  world.add({
    id: crypto.randomUUID(),
    mudStickyZone: zone,
    pigAbilityVisual: {
      effectType: "mud_splatter",
      x,
      y: zoneY,
      scale: 0.5, // Start small
      rotation: 0,
      opacity: 1,
      timeRemaining: MUD_PIG_CONFIG.ability.durationMs,
      params: {
        maxScale: 1.2,
        growthRate: 0.1,
      },
    },
  });

  // Generate splatter particles
  const particles = generateMudSplatterParticles(
    x,
    y,
    MUD_PIG_CONFIG.ability.params.splatterCount
  );

  // Create particle emitter
  world.add({
    id: crypto.randomUUID(),
    pigParticleEmitter: {
      particles,
      x,
      y,
      isActive: true,
      emissionRate: 0, // One-shot emission
      timeSinceEmission: 0,
    },
  });

  // Update ability state
  ability.isActive = true;
  ability.activatedAt = gameTime;
  ability.durationRemaining = MUD_PIG_CONFIG.ability.durationMs;
  ability.cooldownRemaining = MUD_PIG_CONFIG.ability.cooldownMs;

  // Mark pig as activated
  if (pigEntity.pigVariant) {
    pigEntity.pigVariant.activated = true;
    pigEntity.pigVariant.lastActivationTime = gameTime;
  }

  return { zone, particles };
}

/**
 * Check if an entity should be stuck in a mud zone
 */
export function checkMudZoneCollision(
  zone: MudStickyZoneComponent,
  entityX: number,
  entityY: number,
  entityRadius: number = 20
): boolean {
  if (!zone.isActive) return false;

  const dx = entityX - zone.centerX;
  const dy = entityY - zone.centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance <= zone.radius + entityRadius;
}

/**
 * Apply mud stick effect to an entity
 */
export function applyMudStickEffect(
  world: World<Entity & PigEntity>,
  entity: Entity & PigEntity,
  zone: MudStickyZoneComponent,
  originalVelocityY: number
): void {
  // Add stuck component
  world.addComponent(entity, "mudStuck", {
    stuckTimeRemaining: MUD_PIG_CONFIG.ability.params.stickyDuration,
    originalVelocityY,
    zoneEntityId: "", // Would be set by system
  });

  // Stop vertical movement
  if (entity.velocity && "y" in entity.velocity) {
    (entity.velocity as any).y = 0;
  }

  // Track in zone
  zone.stuckEntityIds.push(entity.id || "");
}

/**
 * Release an entity from mud
 */
export function releaseMudStuckEntity(
  world: World<Entity & PigEntity>,
  entity: Entity & PigEntity
): void {
  const stuck = entity.mudStuck;
  if (!stuck) return;

  // Restore partial velocity (reduced bounce after being stuck)
  if (entity.velocity && "y" in entity.velocity) {
    (entity.velocity as any).y = stuck.originalVelocityY * 0.5;
  }

  // Remove stuck component
  world.removeComponent(entity, "mudStuck");
}

/**
 * Render mud zone effect (for 2D canvas overlay)
 */
export function renderMudZone(
  ctx: CanvasRenderingContext2D,
  zone: MudStickyZoneComponent,
  opacity: number = 1
): void {
  if (!zone.isActive) return;

  ctx.save();

  // Draw mud puddle base
  const gradient = ctx.createRadialGradient(
    zone.centerX,
    zone.centerY,
    0,
    zone.centerX,
    zone.centerY,
    zone.radius
  );
  gradient.addColorStop(0, `rgba(93, 58, 26, ${0.8 * opacity})`);
  gradient.addColorStop(0.5, `rgba(139, 69, 19, ${0.6 * opacity})`);
  gradient.addColorStop(1, `rgba(139, 69, 19, 0)`);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(zone.centerX, zone.centerY, zone.radius, zone.radius * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw mud ripples
  ctx.strokeStyle = `rgba(160, 82, 45, ${0.5 * opacity})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const rippleRadius = zone.radius * (0.3 + i * 0.25);
    ctx.beginPath();
    ctx.ellipse(zone.centerX, zone.centerY, rippleRadius, rippleRadius * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Draw splatter spots
  const splatterCount = 5;
  ctx.fillStyle = `rgba(93, 58, 26, ${0.7 * opacity})`;
  for (let i = 0; i < splatterCount; i++) {
    const angle = (i / splatterCount) * Math.PI * 2;
    const dist = zone.radius * (0.6 + Math.random() * 0.3);
    const spotX = zone.centerX + Math.cos(angle) * dist;
    const spotY = zone.centerY + Math.sin(angle) * dist * 0.4;
    const spotSize = 4 + Math.random() * 6;

    ctx.beginPath();
    ctx.ellipse(spotX, spotY, spotSize, spotSize * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Get mud pig visual modifiers for 3D rendering
 */
export function getMudPigVisualModifiers(): {
  colorTint: { r: number; g: number; b: number };
  tintIntensity: number;
  emissiveColor: { r: number; g: number; b: number };
  emissiveIntensity: number;
} {
  const { primaryColor, tintIntensity } = MUD_PIG_CONFIG.visuals;

  return {
    colorTint: { r: primaryColor.r, g: primaryColor.g, b: primaryColor.b },
    tintIntensity,
    emissiveColor: { r: 0.4, g: 0.26, b: 0.13 },
    emissiveIntensity: 0.1,
  };
}
