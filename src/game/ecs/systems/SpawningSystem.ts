/**
 * SpawningSystem - ECS system for spawning falling animals
 *
 * Integrates with GameDirector to spawn animals based on:
 * 1. Game difficulty and timing
 * 2. Player position and stack height
 * 3. AI behavior types
 */

import { Vector3 } from "@babylonjs/core";
import { world } from "../world";
import { createAnimal } from "../archetypes";
import { GAME_CONFIG, AnimalType, ANIMAL_TYPES } from "../../config";
import { Entity, FallingComponent, WobbleComponent, EmotionComponent, SquishComponent } from "../components";
import type { SpawnDecision } from "../../ai/GameDirector";

const { spawning, animal: animalConfig } = GAME_CONFIG;

export interface SpawningSystemCallbacks {
  onSpawn?: (entity: Entity) => void;
}

/**
 * Creates a FallingComponent
 */
export function createFallingComponent(
  targetX: number,
  targetY: number,
  behaviorType: FallingComponent["behaviorType"],
  spawnX: number
): FallingComponent {
  return {
    targetX,
    targetY,
    behaviorType,
    spawnX,
    spawnTime: Date.now(),
  };
}

/**
 * Maps screen coordinates to world coordinates
 */
function mapToWorld(x: number, y: number, screenWidth: number, screenHeight: number): Vector3 {
  const visibleHeight = 10;
  const scale = visibleHeight / screenHeight;

  const centerX = screenWidth / 2;
  const centerY = screenHeight / 2;

  return new Vector3(
    (x - centerX) * scale,
    -(y - centerY) * scale + 5,
    0
  );
}

/**
 * Spawns an animal entity based on a spawn decision from GameDirector
 */
export function spawnAnimalFromDecision(
  decision: SpawnDecision,
  screenWidth: number,
  screenHeight: number,
  playerEntity: Entity | null,
  stackHeight: number
): Entity {
  // Validate that the animal type has a model
  const animalType = decision.duckType as AnimalType;
  const config = ANIMAL_TYPES[animalType];

  if (!config || !config.hasModel) {
    throw new Error(
      `Cannot spawn animal type "${animalType}" - no 3D model available. ` +
      `Valid spawnable types: ${Object.entries(ANIMAL_TYPES)
        .filter(([_, c]) => c.hasModel && c.spawnWeight > 0)
        .map(([t]) => t)
        .join(", ")}`
    );
  }

  // Create base ECS entity from archetype
  const worldPos = mapToWorld(decision.x, -animalConfig.height, screenWidth, screenHeight);
  const entity = createAnimal(animalType, worldPos);

  // Add to world
  world.add(entity);

  // Calculate target position
  const playerX = playerEntity?.position?.x ?? 0;
  const playerY = playerEntity?.position?.y ?? 0;
  const targetWorldPos = mapToWorld(
    decision.x * decision.targetBias + (playerX / 10 + 0.5) * screenWidth * (1 - decision.targetBias),
    screenHeight * GAME_CONFIG.layout.floorY - stackHeight * animalConfig.height * 0.5,
    screenWidth,
    screenHeight
  );

  // Add falling component
  entity.falling = createFallingComponent(
    targetWorldPos.x,
    targetWorldPos.y,
    decision.behaviorType as FallingComponent["behaviorType"],
    worldPos.x
  );

  // Set initial velocity
  const velocityX = decision.initialVelocityX * 0.01; // Scale for world coords
  const velocityY = decision.initialVelocityY * 0.01;
  entity.velocity = new Vector3(velocityX, velocityY, 0);

  // Add supporting components
  entity.wobble = {
    offset: 0,
    velocity: 0,
    damping: 0.9,
    springiness: 0.1,
  };

  entity.emotion = {
    isHeadache: false,
    isConfused: false,
    confusedTimer: 0,
  };

  entity.squish = {
    scaleX: 1,
    scaleY: 1,
    targetScaleX: 1,
    targetScaleY: 1,
    recoverySpeed: 0.12,
  };

  return entity;
}

/**
 * Gets a random spawnable animal type
 */
export function getRandomAnimalType(level: number): AnimalType {
  const rand = Math.random();
  let cumulative = 0;

  const levelBonus = level * GAME_CONFIG.difficulty.specialDuckLevelBonus;

  // Filter to only spawnable animals
  const spawnableTypes = Object.entries(ANIMAL_TYPES).filter(
    ([_, config]) => config.hasModel && config.spawnWeight > 0
  );

  if (spawnableTypes.length === 0) {
    throw new Error("No spawnable animal types configured!");
  }

  // Calculate total weight
  let totalWeight = 0;
  for (const [_, config] of spawnableTypes) {
    let weight = config.spawnWeight;
    if (config.ability) {
      weight += levelBonus;
    }
    totalWeight += weight;
  }

  const normalizedRand = rand * totalWeight;

  for (const [type, config] of spawnableTypes) {
    let weight = config.spawnWeight;
    if (config.ability) {
      weight += levelBonus;
    }
    cumulative += weight;
    if (normalizedRand < cumulative) {
      return type as AnimalType;
    }
  }

  return spawnableTypes[0][0] as AnimalType;
}

/**
 * SpawningSystem - Processes spawn decisions and creates entities
 *
 * Note: This system is typically called manually when GameDirector
 * decides to spawn, rather than running every frame.
 *
 * @param decision - Spawn decision from GameDirector
 * @param screenWidth - Screen width for coordinate mapping
 * @param screenHeight - Screen height for coordinate mapping
 * @param playerEntity - Player entity for targeting
 * @param stackHeight - Current stack height
 * @param callbacks - Optional callbacks
 */
export function SpawningSystem(
  decision: SpawnDecision | null,
  screenWidth: number,
  screenHeight: number,
  playerEntity: Entity | null,
  stackHeight: number,
  callbacks?: SpawningSystemCallbacks
): Entity | null {
  if (!decision || !decision.shouldSpawn) {
    return null;
  }

  const entity = spawnAnimalFromDecision(
    decision,
    screenWidth,
    screenHeight,
    playerEntity,
    stackHeight
  );

  callbacks?.onSpawn?.(entity);

  return entity;
}

/**
 * Query helper - get all falling entities
 */
export function getFallingEntities(): Entity[] {
  return Array.from(world.with("falling"));
}

/**
 * Query helper - get falling entities by behavior type
 */
export function getFallingEntitiesByBehavior(
  behaviorType: FallingComponent["behaviorType"]
): Entity[] {
  return Array.from(world.with("falling")).filter(
    (e) => e.falling!.behaviorType === behaviorType
  );
}

/**
 * Query helper - count active falling entities
 */
export function getActiveFallingCount(): number {
  return world.with("falling").size;
}

/**
 * Removes a falling entity (e.g., when caught or missed)
 */
export function removeFallingEntity(entity: Entity): void {
  world.remove(entity);
}
