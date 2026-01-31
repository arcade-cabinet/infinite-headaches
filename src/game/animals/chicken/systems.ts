/**
 * Chicken Variant ECS Systems
 *
 * Systems that process chicken-specific components and implement ability behaviors.
 * These systems are designed to be run each frame alongside the main game systems.
 */

import { Vector3 } from "@babylonjs/core";
import { World } from "miniplex";
import { Entity } from "../../ecs/components";
import {
  CORN_CHICKEN_CONFIG,
  EGG_CHICKEN_CONFIG,
  ROOSTER_CONFIG,
} from "./config";
import {
  type ChickenEntity,
  type CornKernelComponent,
  type EggComponent,
  type BabyChickComponent,
  type SoundWaveComponent,
  type CrowSlowedComponent,
  createCornKernelComponent,
  createEggComponent,
  createBabyChickComponent,
  createSoundWaveComponent,
  createCrowSlowedComponent,
} from "./components";

// ============================================================================
// CHICKEN ABILITY COOLDOWN SYSTEM
// ============================================================================

/**
 * Updates cooldown timers for all chicken abilities
 */
export function ChickenAbilityCooldownSystem(
  world: World<Entity & ChickenEntity>,
  deltaTimeMs: number
): void {
  const chickens = world.with("chickenAbility");

  for (const entity of chickens) {
    const ability = entity.chickenAbility!;

    if (ability.cooldownRemaining > 0) {
      ability.cooldownRemaining = Math.max(0, ability.cooldownRemaining - deltaTimeMs);
      ability.isReady = ability.cooldownRemaining <= 0;
    }

    // Reset activating state after a brief period
    if (ability.isActivating && Date.now() - ability.lastUsedAt > 500) {
      ability.isActivating = false;
    }
  }
}

// ============================================================================
// CORN CHICKEN SYSTEMS
// ============================================================================

/**
 * Spawns corn kernels when corn chicken ability is activated
 */
export function spawnCornKernels(
  world: World<Entity & ChickenEntity>,
  chickenEntity: Entity & ChickenEntity,
  nearestFallingAnimalPos: Vector3 | null
): void {
  if (!chickenEntity.position || !chickenEntity.chickenAbility) return;

  const config = CORN_CHICKEN_CONFIG.ability;
  const startPos = chickenEntity.position.clone();

  // Calculate base direction toward nearest falling animal or straight up
  let baseDirection: Vector3;
  if (nearestFallingAnimalPos) {
    baseDirection = nearestFallingAnimalPos.subtract(startPos).normalize();
  } else {
    baseDirection = new Vector3(0, 1, 0); // Default to up
  }

  // Spawn multiple kernels with spread
  const spreadRad = (config.spreadAngle * Math.PI) / 180;
  const halfSpread = spreadRad / 2;
  const kernelSpacing = spreadRad / Math.max(1, config.kernelCount - 1);

  for (let i = 0; i < config.kernelCount; i++) {
    // Calculate spread angle for this kernel
    const angleOffset = -halfSpread + i * kernelSpacing;

    // Rotate direction in XY plane
    const cos = Math.cos(angleOffset);
    const sin = Math.sin(angleOffset);
    const velocity = new Vector3(
      baseDirection.x * cos - baseDirection.y * sin,
      baseDirection.x * sin + baseDirection.y * cos,
      0
    ).scale(config.projectileSpeed);

    // Create kernel entity
    const kernelEntity: Entity & ChickenEntity = {
      id: crypto.randomUUID(),
      position: startPos.clone(),
      velocity: velocity.clone(),
      scale: new Vector3(0.15, 0.15, 0.15),
      cornKernel: createCornKernelComponent(
        velocity,
        config.magnetStrength,
        config.magnetDuration
      ),
    };

    world.add(kernelEntity);
  }

  // Set cooldown
  chickenEntity.chickenAbility.cooldownRemaining = config.cooldownMs;
  chickenEntity.chickenAbility.isReady = false;
  chickenEntity.chickenAbility.isActivating = true;
  chickenEntity.chickenAbility.lastUsedAt = Date.now();
}

/**
 * Updates corn kernel projectiles - movement, collision, and magnet effect
 */
export function CornKernelSystem(
  world: World<Entity & ChickenEntity>,
  deltaTimeMs: number,
  stackTopPosition: Vector3 | null
): void {
  const kernels = world.with("cornKernel", "position");
  const fallingAnimals = world.with("tag", "position", "velocity").where(
    (e) => e.tag?.type === "animal" && !e.cornMagnetTarget
  );

  const deltaSeconds = deltaTimeMs / 1000;

  for (const kernel of kernels) {
    const corn = kernel.cornKernel!;

    // Update lifetime
    corn.lifetime -= deltaTimeMs;
    if (corn.lifetime <= 0) {
      world.remove(kernel);
      continue;
    }

    if (!corn.isAttached) {
      // Move kernel
      kernel.position!.addInPlace(corn.velocity.scale(deltaSeconds));

      // Check collision with falling animals
      for (const animal of fallingAnimals) {
        if (!animal.position) continue;

        const dist = Vector3.Distance(kernel.position!, animal.position);
        if (dist < CORN_CHICKEN_CONFIG.ability.magnetRange * 0.1) {
          // Attach to this animal
          corn.isAttached = true;
          corn.targetEntityId = animal.id ?? null;
          corn.magnetTimeRemaining = corn.magnetDuration;

          // Add magnet target component to the animal
          if (animal.id && stackTopPosition) {
            (animal as ChickenEntity).cornMagnetTarget = {
              kernelEntityId: kernel.id!,
              originalFallSpeed: animal.velocity!.y,
              pullTarget: stackTopPosition.clone(),
              effectTimeRemaining: corn.magnetDuration,
            };
          }
          break;
        }
      }

      // Check if kernel went off-screen
      if (
        kernel.position!.y > 20 ||
        kernel.position!.y < -20 ||
        Math.abs(kernel.position!.x) > 20
      ) {
        world.remove(kernel);
        continue;
      }
    } else {
      // Kernel is attached - update magnet effect
      corn.magnetTimeRemaining -= deltaTimeMs;

      if (corn.magnetTimeRemaining <= 0 || !corn.targetEntityId) {
        world.remove(kernel);
      }
    }
  }
}

/**
 * Applies magnet pull effect to animals targeted by corn kernels
 */
export function CornMagnetTargetSystem(
  world: World<Entity & ChickenEntity>,
  deltaTimeMs: number,
  stackTopPosition: Vector3 | null
): void {
  if (!stackTopPosition) return;

  const targets = world.with("cornMagnetTarget", "position", "velocity");

  for (const target of targets) {
    const magnet = target.cornMagnetTarget!;
    magnet.effectTimeRemaining -= deltaTimeMs;

    if (magnet.effectTimeRemaining <= 0) {
      // Remove magnet effect, restore original velocity
      target.velocity!.y = magnet.originalFallSpeed;
      delete (target as ChickenEntity).cornMagnetTarget;
      continue;
    }

    // Update pull target to current stack position
    magnet.pullTarget = stackTopPosition.clone();

    // Calculate pull direction
    const pullDir = magnet.pullTarget.subtract(target.position!).normalize();

    // Apply pull force (stronger horizontal, weaker vertical to keep gameplay fair)
    const strength = CORN_CHICKEN_CONFIG.ability.magnetStrength;
    target.velocity!.x += pullDir.x * strength * 60; // Scale by ~60fps equivalent
    target.velocity!.y += pullDir.y * strength * 30; // Less vertical pull

    // Clamp horizontal velocity
    target.velocity!.x = Math.max(-8, Math.min(8, target.velocity!.x));
  }
}

// ============================================================================
// EGG CHICKEN SYSTEMS
// ============================================================================

/**
 * Spawns an egg when egg chicken ability is activated
 */
export function spawnEgg(
  world: World<Entity & ChickenEntity>,
  chickenEntity: Entity & ChickenEntity
): void {
  if (!chickenEntity.position || !chickenEntity.chickenAbility) return;

  const config = EGG_CHICKEN_CONFIG.ability;
  const startPos = chickenEntity.position.clone();

  // Randomly choose which side the egg rolls off
  const rollDirection = Math.random() > 0.5 ? 1 : -1;

  // Create egg entity
  const eggEntity: Entity & ChickenEntity = {
    id: crypto.randomUUID(),
    position: new Vector3(startPos.x, startPos.y - 0.3, startPos.z),
    velocity: new Vector3(rollDirection * config.eggRollSpeed, -0.5, 0),
    scale: new Vector3(0.2, 0.25, 0.2),
    egg: createEggComponent(
      chickenEntity.id!,
      config.eggHatchTime,
      config.eggRollSpeed,
      rollDirection as 1 | -1
    ),
  };

  world.add(eggEntity);

  // Set cooldown
  chickenEntity.chickenAbility.cooldownRemaining = config.cooldownMs;
  chickenEntity.chickenAbility.isReady = false;
  chickenEntity.chickenAbility.isActivating = true;
  chickenEntity.chickenAbility.lastUsedAt = Date.now();
}

/**
 * Updates egg entities - rolling, falling, and hatching
 */
export function EggSystem(
  world: World<Entity & ChickenEntity>,
  deltaTimeMs: number
): void {
  const eggs = world.with("egg", "position", "velocity");
  const config = EGG_CHICKEN_CONFIG.ability;

  for (const eggEntity of eggs) {
    const egg = eggEntity.egg!;

    if (egg.hasHatched) {
      // Remove hatched egg after brief delay
      world.remove(eggEntity);
      continue;
    }

    // Apply gravity and movement
    eggEntity.velocity!.y -= 0.015; // Slight gravity
    eggEntity.position!.addInPlace(
      eggEntity.velocity!.scale(deltaTimeMs / 1000)
    );

    // Update hatch timer
    egg.hatchTimeRemaining -= deltaTimeMs;

    if (egg.hatchTimeRemaining <= 0 && !egg.isHatching) {
      // Start hatching
      egg.isHatching = true;

      // Spawn baby chick
      const chickEntity: Entity & ChickenEntity = {
        id: crypto.randomUUID(),
        position: eggEntity.position!.clone(),
        velocity: new Vector3(0, 0, 0),
        scale: new Vector3(0.15, 0.15, 0.15),
        babyChick: createBabyChickComponent(
          eggEntity.id!,
          config.chickLifetime,
          config.chickMoveSpeed,
          config.chickCatchRadius
        ),
      };

      world.add(chickEntity);
      egg.hasHatched = true;
    }

    // Remove egg if it falls too far
    if (eggEntity.position!.y < -15) {
      world.remove(eggEntity);
    }
  }
}

/**
 * Updates baby chick entities - targeting, chasing, and catching
 */
export function BabyChickSystem(
  world: World<Entity & ChickenEntity>,
  deltaTimeMs: number
): void {
  const chicks = world.with("babyChick", "position");
  const fallingAnimals = world.with("tag", "position").where(
    (e) => e.tag?.type === "animal"
  );

  const deltaSeconds = deltaTimeMs / 1000;

  for (const chickEntity of chicks) {
    const chick = chickEntity.babyChick!;

    // Update lifetime
    chick.lifetime -= deltaTimeMs;
    if (chick.lifetime <= 0 || chick.hasCaught) {
      // Chick disappears after catching or timeout
      world.remove(chickEntity);
      continue;
    }

    // Find or update target
    if (!chick.targetEntityId) {
      chick.animationState = "idle";

      // Find nearest falling animal
      let nearestDist = Infinity;
      let nearestAnimal: (Entity & ChickenEntity) | null = null;

      for (const animal of fallingAnimals) {
        if (!animal.position) continue;
        const dist = Vector3.Distance(chickEntity.position!, animal.position);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestAnimal = animal;
        }
      }

      if (nearestAnimal && nearestAnimal.id) {
        chick.targetEntityId = nearestAnimal.id;
        chick.animationState = "chasing";
      }
    }

    // Chase target if we have one
    if (chick.targetEntityId) {
      // Find target entity
      let targetAnimal: (Entity & ChickenEntity) | null = null;
      for (const animal of fallingAnimals) {
        if (animal.id === chick.targetEntityId) {
          targetAnimal = animal;
          break;
        }
      }

      if (!targetAnimal || !targetAnimal.position) {
        // Target lost, find new one
        chick.targetEntityId = null;
        continue;
      }

      // Move toward target
      const toTarget = targetAnimal.position.subtract(chickEntity.position!);
      const dist = toTarget.length();

      if (dist < chick.catchRadius / 60) {
        // Convert catchRadius from pixels to world units approximately
        // Catch the animal!
        chick.hasCaught = true;
        chick.animationState = "catching";

        // The caught animal should be "collected" - mark it for removal or
        // directly handle in game engine. For now, we add a marker component.
        // The game engine should check for this and handle scoring.
        (targetAnimal as any).caughtByChick = true;
      } else {
        // Move toward target
        const moveDir = toTarget.normalize();
        const moveAmount = Math.min(dist, chick.moveSpeed * deltaSeconds);
        chickEntity.position!.addInPlace(moveDir.scale(moveAmount));
      }
    }
  }
}

// ============================================================================
// ROOSTER SYSTEMS
// ============================================================================

/**
 * Activates rooster crow ability - spawns sound waves and slows enemies
 */
export function activateRoosterCrow(
  world: World<Entity & ChickenEntity>,
  roosterEntity: Entity & ChickenEntity
): void {
  if (!roosterEntity.position || !roosterEntity.chickenAbility) return;

  const config = ROOSTER_CONFIG.ability;
  const origin = roosterEntity.position.clone();

  // Initialize crow state
  (roosterEntity as ChickenEntity).roosterCrow = {
    isCrowing: true,
    crowProgress: 0,
    soundWaveIds: [],
  };

  // Spawn sound waves with staggered timing
  for (let i = 0; i < config.waveCount; i++) {
    const waveEntity: Entity & ChickenEntity = {
      id: crypto.randomUUID(),
      position: origin.clone(),
      scale: new Vector3(0.1, 0.1, 0.1),
      soundWave: createSoundWaveComponent(
        origin,
        config.waveMaxRadius,
        config.waveExpandSpeed,
        i
      ),
    };

    // Delay spawn based on wave index
    setTimeout(() => {
      world.add(waveEntity);
      roosterEntity.roosterCrow?.soundWaveIds.push(waveEntity.id!);
    }, i * 150);
  }

  // Apply slow to all falling animals
  const fallingAnimals = world.with("tag", "velocity").where(
    (e) => e.tag?.type === "animal"
  );

  for (const animal of fallingAnimals) {
    if (!animal.velocity) continue;

    // Don't re-slow already slowed animals
    if ((animal as ChickenEntity).crowSlowed) continue;

    (animal as ChickenEntity).crowSlowed = createCrowSlowedComponent(
      1.0, // Original speed multiplier
      config.slowFactor,
      config.slowDuration,
      roosterEntity.id!
    );

    // Apply slow effect immediately
    animal.velocity.y *= config.slowFactor;
    animal.velocity.x *= config.slowFactor;
  }

  // Set cooldown
  roosterEntity.chickenAbility.cooldownRemaining = config.cooldownMs;
  roosterEntity.chickenAbility.isReady = false;
  roosterEntity.chickenAbility.isActivating = true;
  roosterEntity.chickenAbility.lastUsedAt = Date.now();
}

/**
 * Updates sound wave visual effects
 */
export function SoundWaveSystem(
  world: World<Entity & ChickenEntity>,
  deltaTimeMs: number
): void {
  const waves = world.with("soundWave", "position", "scale");
  const deltaSeconds = deltaTimeMs / 1000;

  for (const waveEntity of waves) {
    const wave = waveEntity.soundWave!;

    // Expand wave
    wave.currentRadius += wave.expandSpeed * deltaSeconds;

    // Update visual scale
    const scaleFactor = wave.currentRadius / 100;
    waveEntity.scale!.x = scaleFactor;
    waveEntity.scale!.y = scaleFactor;
    waveEntity.scale!.z = scaleFactor;

    // Fade out as it expands
    wave.opacity = Math.max(0, 1 - wave.currentRadius / wave.maxRadius);

    // Remove when fully expanded
    if (wave.currentRadius >= wave.maxRadius) {
      world.remove(waveEntity);
    }
  }
}

/**
 * Updates crow slow effect on affected animals
 */
export function CrowSlowedSystem(
  world: World<Entity & ChickenEntity>,
  deltaTimeMs: number
): void {
  const slowed = world.with("crowSlowed", "velocity");

  for (const entity of slowed) {
    const slow = entity.crowSlowed!;
    slow.slowTimeRemaining -= deltaTimeMs;

    if (slow.slowTimeRemaining <= 0) {
      // Restore original speed
      if (slow.slowFactor > 0) {
        entity.velocity!.y /= slow.slowFactor;
        entity.velocity!.x /= slow.slowFactor;
      }

      // Clamp to prevent crazy values
      entity.velocity!.y = Math.min(entity.velocity!.y, 15);

      delete (entity as ChickenEntity).crowSlowed;
    }
  }
}

/**
 * Updates rooster crow animation state
 */
export function RoosterCrowAnimationSystem(
  world: World<Entity & ChickenEntity>,
  deltaTimeMs: number
): void {
  const roosters = world.with("roosterCrow");

  for (const rooster of roosters) {
    const crow = rooster.roosterCrow!;

    if (crow.isCrowing) {
      crow.crowProgress += deltaTimeMs / 1000;

      // Crow animation lasts about 1 second
      if (crow.crowProgress >= 1) {
        crow.isCrowing = false;
        crow.crowProgress = 1;
      }
    }
  }
}

// ============================================================================
// MASTER CHICKEN SYSTEM
// ============================================================================

/**
 * Master system that runs all chicken-related systems in the correct order.
 * Call this from the main game loop.
 */
export function ChickenVariantSystem(
  world: World<Entity & ChickenEntity>,
  deltaTimeMs: number,
  stackTopPosition: Vector3 | null
): void {
  // Update cooldowns first
  ChickenAbilityCooldownSystem(world, deltaTimeMs);

  // Corn chicken systems
  CornKernelSystem(world, deltaTimeMs, stackTopPosition);
  CornMagnetTargetSystem(world, deltaTimeMs, stackTopPosition);

  // Egg chicken systems
  EggSystem(world, deltaTimeMs);
  BabyChickSystem(world, deltaTimeMs);

  // Rooster systems
  SoundWaveSystem(world, deltaTimeMs);
  CrowSlowedSystem(world, deltaTimeMs);
  RoosterCrowAnimationSystem(world, deltaTimeMs);
}

// ============================================================================
// ABILITY TRIGGER FUNCTIONS
// ============================================================================

/**
 * Trigger ability for a chicken entity based on its variant type
 */
export function triggerChickenAbility(
  world: World<Entity & ChickenEntity>,
  chickenEntity: Entity & ChickenEntity,
  context: {
    nearestFallingAnimalPos?: Vector3 | null;
    stackTopPosition?: Vector3 | null;
  } = {}
): boolean {
  if (!chickenEntity.chickenVariant || !chickenEntity.chickenAbility) {
    return false;
  }

  if (!chickenEntity.chickenAbility.isReady) {
    return false;
  }

  const variant = chickenEntity.chickenVariant.variant;

  switch (variant) {
    case "corn":
      spawnCornKernels(
        world,
        chickenEntity,
        context.nearestFallingAnimalPos ?? null
      );
      return true;

    case "egg":
      spawnEgg(world, chickenEntity);
      return true;

    case "rooster":
      activateRoosterCrow(world, chickenEntity);
      return true;

    default:
      return false;
  }
}
