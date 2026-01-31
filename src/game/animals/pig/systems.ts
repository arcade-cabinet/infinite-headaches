/**
 * Pig Variant ECS Systems
 * Miniplex systems for processing pig variant behavior
 */

import { World } from "miniplex";
import type { Entity } from "../../ecs/components";
import {
  type PigEntity,
  type MudStickyZoneComponent,
  type TruffleRadarComponent,
  type FloatStabilizeComponent,
  type WobbleReductionBuffComponent,
  createMudStickyZoneComponent,
  createTruffleRadarComponent,
  createFloatStabilizeComponent,
} from "./components";
import {
  MUD_PIG_CONFIG,
  TRUFFLE_PIG_CONFIG,
  FLYING_PIG_CONFIG,
  type PigVariantId,
} from "./config";

/**
 * Extended world type that includes pig components
 */
type PigWorld = World<Entity & PigEntity>;

/**
 * Context needed for pig systems
 */
export interface PigSystemContext {
  /** Current game time (ms) */
  gameTime: number;
  /** Canvas/screen width */
  screenWidth: number;
  /** Canvas/screen height */
  screenHeight: number;
  /** Callback when mud zone is created */
  onMudZoneCreated?: (zone: MudStickyZoneComponent) => void;
  /** Callback when power-up is revealed */
  onPowerUpRevealed?: (powerUpType: string, x: number, y: number) => void;
  /** Callback when wobble reduction is applied */
  onWobbleReductionApplied?: (factor: number, duration: number) => void;
  /** Get falling animals for mud zone checks */
  getFallingEntities?: () => Array<{ id: string; x: number; y: number; velocityY: number }>;
  /** Apply wobble reduction to stack */
  applyStackWobbleReduction?: (factor: number) => void;
  /** Get upcoming power-up spawns for truffle radar */
  getUpcomingPowerUps?: () => Array<{ type: string; x: number; spawnTime: number }>;
}

/**
 * System: Process pig ability cooldowns
 * Updates cooldown timers for all pig abilities
 */
export function PigAbilityCooldownSystem(world: PigWorld, deltaTime: number): void {
  const entities = world.with("pigAbility");

  for (const entity of entities) {
    const ability = entity.pigAbility;
    if (!ability) continue;

    // Reduce cooldown
    if (ability.cooldownRemaining > 0) {
      ability.cooldownRemaining = Math.max(0, ability.cooldownRemaining - deltaTime);
    }

    // Reduce active duration
    if (ability.isActive && ability.durationRemaining > 0) {
      ability.durationRemaining = Math.max(0, ability.durationRemaining - deltaTime);

      // Deactivate when duration ends
      if (ability.durationRemaining <= 0) {
        ability.isActive = false;
      }
    }
  }
}

/**
 * System: Process mud sticky zones
 * Updates mud zones and checks for entities entering them
 */
export function MudStickyZoneSystem(
  world: PigWorld,
  deltaTime: number,
  context: PigSystemContext
): void {
  const zones = world.with("mudStickyZone");
  const stuckEntities = world.with("mudStuck");

  // Update zone timers
  for (const entity of zones) {
    const zone = entity.mudStickyZone;
    if (!zone || !zone.isActive) continue;

    zone.timeRemaining -= deltaTime;

    if (zone.timeRemaining <= 0) {
      zone.isActive = false;
      // Release all stuck entities
      zone.stuckEntityIds = [];
    }
  }

  // Update stuck entity timers
  for (const entity of stuckEntities) {
    const stuck = entity.mudStuck;
    if (!stuck) continue;

    stuck.stuckTimeRemaining -= deltaTime;

    if (stuck.stuckTimeRemaining <= 0) {
      // Release from mud - restore velocity
      if ("velocity" in entity && entity.velocity) {
        (entity.velocity as { y: number }).y = stuck.originalVelocityY * 0.5; // Reduced bounce
      }
      // Remove the stuck component
      world.removeComponent(entity, "mudStuck");
    }
  }

  // Check for falling entities entering zones
  if (context.getFallingEntities) {
    const fallingEntities = context.getFallingEntities();

    for (const falling of fallingEntities) {
      // Skip if already stuck
      const existingStuck = Array.from(stuckEntities).find(
        (e) => e.id === falling.id
      );
      if (existingStuck) continue;

      // Check against active zones
      for (const zoneEntity of zones) {
        const zone = zoneEntity.mudStickyZone;
        if (!zone || !zone.isActive) continue;

        const dx = falling.x - zone.centerX;
        const dy = falling.y - zone.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= zone.radius) {
          // Entity entered the zone - apply stick effect
          zone.stuckEntityIds.push(falling.id);

          // Find the entity in world and add stuck component
          const entityInWorld = Array.from(world).find((e) => e.id === falling.id);
          if (entityInWorld) {
            world.addComponent(entityInWorld, "mudStuck", {
              stuckTimeRemaining: MUD_PIG_CONFIG.ability.params.stickyDuration,
              originalVelocityY: falling.velocityY,
              zoneEntityId: zoneEntity.id || "",
            });

            // Stop the entity's vertical movement
            if ("velocity" in entityInWorld && entityInWorld.velocity) {
              (entityInWorld.velocity as { y: number }).y = 0;
            }
          }
        }
      }
    }
  }

  // Cleanup inactive zones
  for (const entity of zones) {
    const zone = entity.mudStickyZone;
    if (zone && !zone.isActive && zone.stuckEntityIds.length === 0) {
      world.remove(entity);
    }
  }
}

/**
 * System: Process truffle radar effects
 * Animates radar and reveals upcoming power-ups
 */
export function TruffleRadarSystem(
  world: PigWorld,
  deltaTime: number,
  context: PigSystemContext
): void {
  const radars = world.with("truffleRadar");

  for (const entity of radars) {
    const radar = entity.truffleRadar;
    if (!radar) continue;

    // Update timer
    radar.timeRemaining -= deltaTime;

    // Animate radar pulse
    radar.pulsePhase += deltaTime * 0.01; // Pulse frequency
    const pulseScale = 0.8 + Math.sin(radar.pulsePhase) * 0.2;
    radar.currentRadius = radar.maxRadius * pulseScale;

    // Reveal power-ups if callback available
    if (
      context.getUpcomingPowerUps &&
      context.onPowerUpRevealed &&
      radar.revealedPowerUpIds.length < TRUFFLE_PIG_CONFIG.ability.params.maxPowerUpsRevealed
    ) {
      const upcomingPowerUps = context.getUpcomingPowerUps();

      for (const powerUp of upcomingPowerUps) {
        // Skip already revealed
        if (radar.revealedPowerUpIds.includes(`${powerUp.type}-${powerUp.x}-${powerUp.spawnTime}`)) {
          continue;
        }

        // Only reveal power-ups spawning within the radar duration
        if (powerUp.spawnTime <= radar.timeRemaining) {
          radar.revealedPowerUpIds.push(`${powerUp.type}-${powerUp.x}-${powerUp.spawnTime}`);
          context.onPowerUpRevealed(powerUp.type, powerUp.x, -50); // Spawn position
        }

        // Limit reveals
        if (radar.revealedPowerUpIds.length >= TRUFFLE_PIG_CONFIG.ability.params.maxPowerUpsRevealed) {
          break;
        }
      }
    }

    // Cleanup expired radars
    if (radar.timeRemaining <= 0) {
      world.remove(entity);
    }
  }

  // Update revealed power-up previews
  const revealedPowerUps = world.with("revealedPowerUp");
  for (const entity of revealedPowerUps) {
    const revealed = entity.revealedPowerUp;
    if (!revealed) continue;

    revealed.timeUntilSpawn -= deltaTime;

    // Fade in/out animation
    if (revealed.timeUntilSpawn > 1000) {
      revealed.previewOpacity = Math.min(0.6, revealed.previewOpacity + deltaTime * 0.002);
    } else {
      revealed.previewOpacity = Math.max(0, revealed.previewOpacity - deltaTime * 0.001);
    }

    if (revealed.timeUntilSpawn <= 0) {
      world.remove(entity);
    }
  }
}

/**
 * System: Process flying pig float and stabilize effect
 * Handles float animation and applies wobble reduction
 */
export function FloatStabilizeSystem(
  world: PigWorld,
  deltaTime: number,
  context: PigSystemContext
): void {
  const floatingPigs = world.with("floatStabilize", "position");

  for (const entity of floatingPigs) {
    const float = entity.floatStabilize;
    const position = entity.position;
    if (!float || !position) continue;

    // Handle float animation
    if (float.isFloating) {
      float.floatProgress = Math.min(1, float.floatProgress + deltaTime / FLYING_PIG_CONFIG.ability.params.floatDuration);

      // Ease-out float animation
      const easeProgress = 1 - Math.pow(1 - float.floatProgress, 3);
      const currentY = float.originalY + (float.floatTargetY - float.originalY) * easeProgress;

      // Update position
      if ("y" in position) {
        (position as { y: number }).y = currentY;
      }

      // End float when complete
      if (float.floatProgress >= 1) {
        float.isFloating = false;
      }
    }

    // Update stabilization duration
    float.stabilizeDurationRemaining -= deltaTime;

    // Apply wobble reduction to stack
    if (context.applyStackWobbleReduction && float.stabilizeDurationRemaining > 0) {
      context.applyStackWobbleReduction(float.wobbleReductionFactor);
    }

    // Cleanup when effect ends
    if (float.stabilizeDurationRemaining <= 0 && !float.isFloating) {
      world.removeComponent(entity, "floatStabilize");
    }
  }

  // Process stack-wide wobble reduction buffs
  const buffs = world.with("wobbleReductionBuff");
  for (const entity of buffs) {
    const buff = entity.wobbleReductionBuff;
    if (!buff) continue;

    buff.timeRemaining -= deltaTime;

    if (buff.timeRemaining <= 0) {
      world.remove(entity);
    }
  }
}

/**
 * System: Process pig ability visuals
 * Updates visual effects for pig abilities
 */
export function PigAbilityVisualSystem(world: PigWorld, deltaTime: number): void {
  const visuals = world.with("pigAbilityVisual");

  for (const entity of visuals) {
    const visual = entity.pigAbilityVisual;
    if (!visual) continue;

    visual.timeRemaining -= deltaTime;

    // Fade out as time decreases
    const fadeStartTime = 500; // Start fading in last 500ms
    if (visual.timeRemaining < fadeStartTime) {
      visual.opacity = Math.max(0, visual.timeRemaining / fadeStartTime);
    }

    // Type-specific animations
    switch (visual.effectType) {
      case "mud_splatter":
        // Expand and fade
        visual.scale *= 1 + deltaTime * 0.002;
        break;

      case "truffle_radar":
        // Pulsing effect
        visual.scale = 1 + Math.sin(Date.now() * 0.01) * 0.1;
        visual.rotation += deltaTime * 0.001;
        break;

      case "float_sparkles":
        // Rise and sparkle
        visual.y -= deltaTime * 0.05;
        visual.opacity = 0.5 + Math.sin(Date.now() * 0.02) * 0.3;
        break;

      case "wing_flap":
        // Flapping animation
        visual.rotation = Math.sin(Date.now() * 0.03) * 0.3;
        break;
    }

    // Cleanup expired visuals
    if (visual.timeRemaining <= 0) {
      world.remove(entity);
    }
  }
}

/**
 * System: Process pig particle emitters
 * Spawns and updates particles for pig effects
 */
export function PigParticleSystem(world: PigWorld, deltaTime: number): void {
  const emitters = world.with("pigParticleEmitter");

  for (const entity of emitters) {
    const emitter = entity.pigParticleEmitter;
    if (!emitter || !emitter.isActive) continue;

    emitter.timeSinceEmission += deltaTime;

    // Emit new particles based on rate
    const emissionInterval = 1000 / emitter.emissionRate;
    while (emitter.timeSinceEmission >= emissionInterval) {
      emitter.timeSinceEmission -= emissionInterval;

      // Add particle to active list (handled by render system)
      // This is a simplified version - full implementation would create particle entities
    }

    // Update existing particles
    for (let i = emitter.particles.length - 1; i >= 0; i--) {
      const particle = emitter.particles[i];

      particle.lifetime -= deltaTime;
      if (particle.lifetime <= 0) {
        emitter.particles.splice(i, 1);
        continue;
      }

      // Apply physics
      particle.velocityY += particle.gravity;
      particle.startX += particle.velocityX;
      particle.startY += particle.velocityY;
    }

    // Deactivate emitter when all particles are gone
    if (emitter.particles.length === 0) {
      emitter.isActive = false;
    }
  }

  // Cleanup inactive emitters
  for (const entity of emitters) {
    const emitter = entity.pigParticleEmitter;
    if (emitter && !emitter.isActive && emitter.particles.length === 0) {
      world.remove(entity);
    }
  }
}

/**
 * Activate a pig variant's ability
 * Returns true if ability was successfully activated
 */
export function activatePigAbility(
  world: PigWorld,
  entity: Entity & PigEntity,
  context: PigSystemContext
): boolean {
  const pigVariant = entity.pigVariant;
  const ability = entity.pigAbility;
  const position = entity.position;

  if (!pigVariant || !ability || !position) return false;

  // Check cooldown
  if (ability.cooldownRemaining > 0) return false;

  // Already active
  if (ability.isActive) return false;

  const x = "x" in position ? (position as { x: number }).x : 0;
  const y = "y" in position ? (position as { y: number }).y : 0;

  switch (pigVariant.variantId) {
    case "mud_pig": {
      // Create mud sticky zone
      const zoneEntity = world.add({
        id: crypto.randomUUID(),
        mudStickyZone: createMudStickyZoneComponent(
          x,
          y + 50, // Below the pig
          MUD_PIG_CONFIG.ability.params.mudPuddleRadius,
          MUD_PIG_CONFIG.ability.durationMs
        ),
      });

      // Add visual effect
      world.add({
        id: crypto.randomUUID(),
        pigAbilityVisual: {
          effectType: "mud_splatter",
          x,
          y: y + 50,
          scale: 1,
          rotation: 0,
          opacity: 1,
          timeRemaining: MUD_PIG_CONFIG.ability.durationMs,
          params: { splatterCount: MUD_PIG_CONFIG.ability.params.splatterCount },
        },
      });

      if (context.onMudZoneCreated && zoneEntity.mudStickyZone) {
        context.onMudZoneCreated(zoneEntity.mudStickyZone);
      }
      break;
    }

    case "truffle_pig": {
      // Create truffle radar
      const radarEntity = world.add({
        id: crypto.randomUUID(),
        truffleRadar: createTruffleRadarComponent(
          x,
          y,
          TRUFFLE_PIG_CONFIG.ability.effectRadius,
          TRUFFLE_PIG_CONFIG.ability.durationMs
        ),
      });

      // Add visual effect
      world.add({
        id: crypto.randomUUID(),
        pigAbilityVisual: {
          effectType: "truffle_radar",
          x,
          y,
          scale: 1,
          rotation: 0,
          opacity: 0.8,
          timeRemaining: TRUFFLE_PIG_CONFIG.ability.durationMs,
          params: {},
        },
      });
      break;
    }

    case "flying_pig": {
      // Create float stabilize effect
      world.addComponent(entity, "floatStabilize", createFloatStabilizeComponent(
        y,
        FLYING_PIG_CONFIG.ability.params.floatHeight,
        FLYING_PIG_CONFIG.ability.params.wobbleReduction,
        FLYING_PIG_CONFIG.ability.durationMs
      ));

      // Create stack-wide wobble reduction buff
      world.add({
        id: crypto.randomUUID(),
        wobbleReductionBuff: {
          reductionFactor: FLYING_PIG_CONFIG.ability.params.wobbleReduction,
          timeRemaining: FLYING_PIG_CONFIG.ability.durationMs,
          sourceEntityId: entity.id || "",
        },
      });

      // Add visual effects
      world.add({
        id: crypto.randomUUID(),
        pigAbilityVisual: {
          effectType: "float_sparkles",
          x,
          y,
          scale: 1,
          rotation: 0,
          opacity: 1,
          timeRemaining: FLYING_PIG_CONFIG.ability.params.floatDuration,
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
          params: {},
        },
      });

      if (context.onWobbleReductionApplied) {
        context.onWobbleReductionApplied(
          FLYING_PIG_CONFIG.ability.params.wobbleReduction,
          FLYING_PIG_CONFIG.ability.durationMs
        );
      }
      break;
    }
  }

  // Set ability state
  ability.isActive = true;
  ability.activatedAt = context.gameTime;
  ability.durationRemaining = getPigConfig(pigVariant.variantId).ability.durationMs;
  ability.cooldownRemaining = getPigConfig(pigVariant.variantId).ability.cooldownMs;

  // Mark pig as activated
  pigVariant.activated = true;
  pigVariant.lastActivationTime = context.gameTime;

  return true;
}

/**
 * Get config for a pig variant
 */
function getPigConfig(variantId: PigVariantId) {
  switch (variantId) {
    case "mud_pig":
      return MUD_PIG_CONFIG;
    case "truffle_pig":
      return TRUFFLE_PIG_CONFIG;
    case "flying_pig":
      return FLYING_PIG_CONFIG;
  }
}

/**
 * Calculate total wobble reduction factor from all active buffs
 */
export function getTotalWobbleReduction(world: PigWorld): number {
  const buffs = world.with("wobbleReductionBuff");
  let totalReduction = 0;

  for (const entity of buffs) {
    const buff = entity.wobbleReductionBuff;
    if (buff && buff.timeRemaining > 0) {
      totalReduction = Math.max(totalReduction, buff.reductionFactor);
    }
  }

  return totalReduction;
}

/**
 * Check if a position is inside any active mud zone
 */
export function isInMudZone(world: PigWorld, x: number, y: number): boolean {
  const zones = world.with("mudStickyZone");

  for (const entity of zones) {
    const zone = entity.mudStickyZone;
    if (!zone || !zone.isActive) continue;

    const dx = x - zone.centerX;
    const dy = y - zone.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= zone.radius) {
      return true;
    }
  }

  return false;
}

/**
 * Run all pig systems in order
 */
export function runPigSystems(
  world: PigWorld,
  deltaTime: number,
  context: PigSystemContext
): void {
  PigAbilityCooldownSystem(world, deltaTime);
  MudStickyZoneSystem(world, deltaTime, context);
  TruffleRadarSystem(world, deltaTime, context);
  FloatStabilizeSystem(world, deltaTime, context);
  PigAbilityVisualSystem(world, deltaTime);
  PigParticleSystem(world, deltaTime);
}
