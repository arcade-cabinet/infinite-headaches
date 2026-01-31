/**
 * Truffle Pig Variant
 * Black pig with white spots that reveals hidden power-ups
 *
 * When poked, sniffs out and reveals hidden power-ups.
 * Creates a "truffle radar" circle that highlights any power-ups spawning in the next 5 seconds.
 * Cooldown: 12 seconds
 */

import { World } from "miniplex";
import type { Entity } from "../../../ecs/components";
import {
  type PigEntity,
  type TruffleRadarComponent,
  type RevealedPowerUpComponent,
  type PigParticleConfig,
  createPigVariantComponent,
  createPigAbilityComponent,
  createTruffleRadarComponent,
} from "../components";
import { TRUFFLE_PIG_CONFIG } from "../config";

/**
 * Scheduled power-up spawn info for radar detection
 */
export interface UpcomingPowerUpSpawn {
  type: string;
  x: number;
  spawnTime: number; // Time in ms until spawn
}

/**
 * Create a new Truffle Pig entity
 */
export function createTrufflePig(
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
    pigVariant: createPigVariantComponent("truffle_pig"),
    pigAbility: createPigAbilityComponent("truffle_radar", TRUFFLE_PIG_CONFIG.ability.cooldownMs),
  });

  return entity;
}

/**
 * Generate truffle sparkle particles
 */
export function generateTruffleSparkles(
  centerX: number,
  centerY: number,
  radius: number
): PigParticleConfig[] {
  const particles: PigParticleConfig[] = [];
  const colors = TRUFFLE_PIG_CONFIG.visuals.particleColors;
  const count = 20;

  // Spiral sparkles radiating outward
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 4; // Two full rotations
    const dist = (i / count) * radius;
    const startX = centerX + Math.cos(angle) * dist * 0.3;
    const startY = centerY + Math.sin(angle) * dist * 0.3;

    particles.push({
      type: "truffle_sparkle",
      startX,
      startY,
      velocityX: Math.cos(angle) * 1.5,
      velocityY: Math.sin(angle) * 1.5 - 0.5,
      lifetime: 1000 + Math.random() * 500,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 4,
      gravity: -0.02, // Float upward slightly
      rotationSpeed: (Math.random() - 0.5) * 0.3,
    });
  }

  // Nose sniff particles
  for (let i = 0; i < 5; i++) {
    particles.push({
      type: "truffle_sparkle",
      startX: centerX,
      startY: centerY + 20, // From nose
      velocityX: (Math.random() - 0.5) * 3,
      velocityY: -2 - Math.random() * 2,
      lifetime: 600 + Math.random() * 200,
      color: "#FFD700",
      size: 2 + Math.random() * 2,
      gravity: 0.02,
      rotationSpeed: 0,
    });
  }

  return particles;
}

/**
 * Activate truffle radar ability
 * Creates a radar that reveals upcoming power-ups
 */
export function activateTruffleRadar(
  world: World<Entity & PigEntity>,
  pigEntity: Entity & PigEntity,
  gameTime: number,
  upcomingPowerUps: UpcomingPowerUpSpawn[]
): { radar: TruffleRadarComponent; revealed: RevealedPowerUpComponent[] } | null {
  const ability = pigEntity.pigAbility;
  const position = pigEntity.position;

  if (!ability || !position) return null;

  // Check cooldown
  if (ability.cooldownRemaining > 0) return null;

  const x = (position as any).x ?? 0;
  const y = (position as any).y ?? 0;

  // Create radar
  const radar = createTruffleRadarComponent(
    x,
    y,
    TRUFFLE_PIG_CONFIG.ability.effectRadius,
    TRUFFLE_PIG_CONFIG.ability.durationMs
  );

  // Create radar entity
  const radarEntity = world.add({
    id: crypto.randomUUID(),
    truffleRadar: radar,
    pigAbilityVisual: {
      effectType: "truffle_radar",
      x,
      y,
      scale: 1,
      rotation: 0,
      opacity: 0.8,
      timeRemaining: TRUFFLE_PIG_CONFIG.ability.durationMs,
      params: {
        pulseSpeed: 0.01,
        ringCount: 3,
      },
    },
  });

  // Reveal power-ups within the reveal window
  const revealed: RevealedPowerUpComponent[] = [];
  const maxReveals = TRUFFLE_PIG_CONFIG.ability.params.maxPowerUpsRevealed;

  for (const powerUp of upcomingPowerUps) {
    if (revealed.length >= maxReveals) break;
    if (powerUp.spawnTime > TRUFFLE_PIG_CONFIG.ability.params.revealDuration) continue;

    const revealComponent: RevealedPowerUpComponent = {
      powerUpType: powerUp.type,
      spawnX: powerUp.x,
      spawnY: -50, // Off-screen spawn position
      timeUntilSpawn: powerUp.spawnTime,
      radarEntityId: radarEntity.id || "",
      previewOpacity: 0, // Will animate in
    };

    // Create revealed power-up preview entity
    world.add({
      id: crypto.randomUUID(),
      revealedPowerUp: revealComponent,
      pigAbilityVisual: {
        effectType: "truffle_radar",
        x: powerUp.x,
        y: -50,
        scale: 0.8,
        rotation: 0,
        opacity: 0,
        timeRemaining: powerUp.spawnTime + 1000,
        params: { isPreview: 1 },
      },
    });

    revealed.push(revealComponent);
    radar.revealedPowerUpIds.push(`${powerUp.type}-${powerUp.x}`);
  }

  // Generate visual particles
  const particles = generateTruffleSparkles(x, y, TRUFFLE_PIG_CONFIG.ability.effectRadius);

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
  ability.durationRemaining = TRUFFLE_PIG_CONFIG.ability.durationMs;
  ability.cooldownRemaining = TRUFFLE_PIG_CONFIG.ability.cooldownMs;

  // Mark pig as activated
  if (pigEntity.pigVariant) {
    pigEntity.pigVariant.activated = true;
    pigEntity.pigVariant.lastActivationTime = gameTime;
  }

  return { radar, revealed };
}

/**
 * Update radar pulse animation
 */
export function updateRadarPulse(radar: TruffleRadarComponent, deltaTime: number): void {
  radar.pulsePhase += deltaTime * 0.008;

  // Pulsing radius animation
  const pulseOffset = Math.sin(radar.pulsePhase) * 0.15;
  radar.currentRadius = radar.maxRadius * (0.85 + pulseOffset);
}

/**
 * Render truffle radar effect (for 2D canvas overlay)
 */
export function renderTruffleRadar(
  ctx: CanvasRenderingContext2D,
  radar: TruffleRadarComponent,
  opacity: number = 1
): void {
  ctx.save();

  const { centerX, centerY, currentRadius, pulsePhase } = radar;

  // Draw radar rings
  const ringCount = 3;
  for (let i = 0; i < ringCount; i++) {
    const ringRadius = currentRadius * ((i + 1) / ringCount);
    const ringOpacity = (1 - i / ringCount) * 0.5 * opacity;

    ctx.strokeStyle = `rgba(255, 215, 0, ${ringOpacity})`;
    ctx.lineWidth = 2 - i * 0.5;
    ctx.setLineDash([10, 5]);
    ctx.lineDashOffset = -pulsePhase * 50;

    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Draw center glow
  const glowGradient = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    currentRadius * 0.3
  );
  glowGradient.addColorStop(0, `rgba(255, 215, 0, ${0.3 * opacity})`);
  glowGradient.addColorStop(1, "rgba(255, 215, 0, 0)");

  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, currentRadius * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Draw radar sweep line
  const sweepAngle = pulsePhase * 2;
  ctx.strokeStyle = `rgba(255, 215, 0, ${0.6 * opacity})`;
  ctx.lineWidth = 3;
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(
    centerX + Math.cos(sweepAngle) * currentRadius,
    centerY + Math.sin(sweepAngle) * currentRadius
  );
  ctx.stroke();

  // Draw dots at sweep tip
  const dotX = centerX + Math.cos(sweepAngle) * currentRadius;
  const dotY = centerY + Math.sin(sweepAngle) * currentRadius;

  ctx.fillStyle = `rgba(255, 255, 0, ${0.8 * opacity})`;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Render revealed power-up preview (for 2D canvas overlay)
 */
export function renderRevealedPowerUp(
  ctx: CanvasRenderingContext2D,
  revealed: RevealedPowerUpComponent
): void {
  if (revealed.previewOpacity <= 0) return;

  ctx.save();

  const { spawnX, spawnY, powerUpType, previewOpacity, timeUntilSpawn } = revealed;

  // Draw ghost preview of power-up
  ctx.globalAlpha = previewOpacity * 0.6;

  // Pulsing circle
  const pulseSize = 20 + Math.sin(Date.now() * 0.01) * 5;

  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);

  ctx.beginPath();
  ctx.arc(spawnX, 50, pulseSize, 0, Math.PI * 2); // Show near top of screen
  ctx.stroke();

  // Power-up type indicator
  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.fillText("?", spawnX, 55);

  // Countdown
  const secondsLeft = Math.ceil(timeUntilSpawn / 1000);
  ctx.font = "10px Arial";
  ctx.fillText(`${secondsLeft}s`, spawnX, 75);

  // Arrow pointing down
  ctx.beginPath();
  ctx.moveTo(spawnX, 85);
  ctx.lineTo(spawnX - 5, 80);
  ctx.lineTo(spawnX + 5, 80);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Get truffle pig visual modifiers for 3D rendering
 */
export function getTrufflePigVisualModifiers(): {
  colorTint: { r: number; g: number; b: number };
  tintIntensity: number;
  spotPattern: { color: { r: number; g: number; b: number }; coverage: number };
  emissiveColor: { r: number; g: number; b: number };
  emissiveIntensity: number;
} {
  const { primaryColor, secondaryColor, tintIntensity } = TRUFFLE_PIG_CONFIG.visuals;

  return {
    colorTint: { r: primaryColor.r, g: primaryColor.g, b: primaryColor.b },
    tintIntensity,
    spotPattern: {
      color: { r: secondaryColor.r, g: secondaryColor.g, b: secondaryColor.b },
      coverage: 0.3, // 30% white spots
    },
    emissiveColor: { r: 1, g: 0.84, b: 0 }, // Golden glow
    emissiveIntensity: 0.15,
  };
}

/**
 * Calculate radar effectiveness based on power-up distance
 * Closer power-ups are revealed more clearly
 */
export function calculateRevealClarity(
  radarX: number,
  radarY: number,
  powerUpX: number,
  powerUpY: number,
  maxRadius: number
): number {
  const dx = powerUpX - radarX;
  const dy = powerUpY - radarY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Full clarity within 50% of radius, fading to 0 at max radius
  if (distance <= maxRadius * 0.5) return 1;
  if (distance >= maxRadius) return 0;

  return 1 - (distance - maxRadius * 0.5) / (maxRadius * 0.5);
}
