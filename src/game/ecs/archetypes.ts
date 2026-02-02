import { Vector3, Color3 } from "@babylonjs/core";
import { world } from "./world";
import {
  Entity,
  FallingComponent,
  StackedComponent,
  FrozenComponent,
  GameProjectileComponent,
  AbilityComponent,
  BossComponent,
  EmotionComponent,
  SquishComponent,
  WobbleComponent,
} from "./components";
import { AnimalType, ANIMAL_TYPES, GAME_CONFIG } from "../config";
import { createAnimationComponent } from "./systems/AnimationSystem";

/**
 * Creates an animal entity for the ECS world
 * VALIDATES that the animal type has a model before creating
 */
export const createAnimal = (type: AnimalType, position: Vector3): Entity => {
  // Validate that this animal type has a model
  const config = ANIMAL_TYPES[type];
  if (!config) {
    throw new Error(
      `ANIMAL TYPE ERROR: "${type}" is not a valid AnimalType. ` +
      `Valid types: ${Object.keys(ANIMAL_TYPES).join(", ")}`
    );
  }
  if (!config.hasModel) {
    throw new Error(
      `ANIMAL MODEL ERROR: "${type}" does not have a 3D model (hasModel: false). ` +
      `Add a .glb file to public/assets/models/${type}.glb and set hasModel: true in config.`
    );
  }

  const modelPath = `assets/models/animals/${type}.glb`;
  const s = config.modelScale;

  return {
    id: crypto.randomUUID(),
    position,
    velocity: new Vector3(0, 0, 0),
    scale: new Vector3(s, s, s),
    model: modelPath,
    tag: { type: "animal", subtype: type },
    physics: { mass: config.weight, restitution: 0.2, friction: 0.5 },
    wobble: { offset: 0, velocity: 0, damping: 0.9, springiness: 0.1 },
    mergeable: { level: 1, mergeRadius: 1.5 },
    colorOverlay: { color: new Color3(1, 1, 1), intensity: 0 },
  };
};

type CharacterId = 'farmer_john' | 'farmer_ben' | 'farmer_mary' | 'farmhand_sue';

const CHARACTER_CONFIG: Record<CharacterId, {
  model: string;
  name: string;
  positiveTraits: string[];
  negativeTraits: string[];
  scale?: Vector3;
}> = {
  farmer_john: {
    model: "assets/models/farmers/john.glb",
    name: "Farmer John",
    positiveTraits: ["Steady Hands"],
    negativeTraits: ["Slow Walker"],
    scale: new Vector3(2.5, 2.5, 2.5),
  },
  farmer_ben: {
    model: "assets/models/farmers/john.glb", // Using John as placeholder for Ben
    name: "Farmer Ben",
    positiveTraits: ["Sprints"],
    negativeTraits: ["Low Stamina"],
    scale: new Vector3(2.5, 2.5, 2.5),
  },
  farmer_mary: {
    model: "assets/models/farmers/mary.glb",
    name: "Farmer Mary",
    positiveTraits: ["Fast Reflexes"],
    negativeTraits: ["Easily Startled"],
    scale: new Vector3(2.3, 2.3, 2.3),
  },
  farmhand_sue: {
    model: "assets/models/farmers/mary.glb", // Using Mary as placeholder for Sue
    name: "Farmhand Sue",
    positiveTraits: ["Animal Whisperer"],
    negativeTraits: ["Clumsy"],
    scale: new Vector3(2.1, 2.1, 2.1),
  },
};

export const createPlayer = (characterId: CharacterId, position: Vector3): Entity => {
  const config = CHARACTER_CONFIG[characterId];

  return {
    id: crypto.randomUUID(),
    position,
    velocity: new Vector3(0, 0, 0),
    scale: config.scale || new Vector3(2.5, 2.5, 2.5),
    // GLB models face +Z; rotate Math.PI around Y to face the camera (-Z)
    modelRotation: new Vector3(0, Math.PI, 0),
    model: config.model,
    // skinTexture removed as we use pre-baked unique GLBs
    tag: { type: "player", subtype: characterId },
    input: { speed: 10, smoothness: 0.1 },
    wobble: { offset: 0, velocity: 0, damping: 0.9, springiness: 0.05 },
    traits: {
      name: config.name,
      positiveTraits: config.positiveTraits,
      negativeTraits: config.negativeTraits,
    },
    player: {
      characterId,
      isDragging: false,
      lastDragX: 0,
      smoothedVelocity: 0,
    },
    animation: createAnimationComponent(),
    physicsTag: 'player' as const,
  };
};

// ============================================================
// NEW ARCHETYPE FUNCTIONS FOR ECS MIGRATION
// ============================================================

/**
 * Creates a falling animal entity with all required components
 */
export const createFallingAnimal = (
  type: AnimalType,
  position: Vector3,
  targetX: number,
  targetY: number,
  behaviorType: FallingComponent["behaviorType"] = "normal",
  initialVelocity?: Vector3
): Entity => {
  const config = ANIMAL_TYPES[type];
  if (!config || !config.hasModel) {
    throw new Error(`Cannot create falling animal: "${type}" has no 3D model`);
  }

  const modelPath = `assets/models/animals/${type}.glb`;
  const { physics } = GAME_CONFIG;
  const s = config.modelScale;

  const entity: Entity = {
    id: crypto.randomUUID(),
    position,
    velocity: initialVelocity ?? new Vector3(0, 0, 0),
    scale: new Vector3(s, s, s),
    model: modelPath,
    tag: { type: "animal", subtype: type },
    physics: { mass: config.weight, restitution: 0.2, friction: 0.5 },
    wobble: {
      offset: 0,
      velocity: 0,
      damping: physics.wobbleDamping,
      springiness: physics.wobbleSpringiness,
    },
    mergeable: { level: 1, mergeRadius: 1.5 },
    colorOverlay: { color: new Color3(1, 1, 1), intensity: 0 },
    falling: {
      targetX,
      targetY,
      behaviorType,
      spawnX: position.x,
      spawnTime: Date.now(),
    },
    emotion: {
      isHeadache: false,
      isConfused: false,
      confusedTimer: 0,
    },
    squish: {
      scaleX: 1,
      scaleY: 1,
      targetScaleX: 1,
      targetScaleY: 1,
      recoverySpeed: 0.12,
    },
    physicsTag: 'falling' as const,
  };

  // Add ability if animal type has one
  if (config.ability) {
    entity.ability = {
      abilityId: config.ability,
      cooldownMs: config.abilityCooldown || 3000,
      lastUsed: 0,
      isActive: false,
    };
  }

  return entity;
};

/**
 * Converts a falling entity to a stacked entity
 */
export const convertToStacked = (
  entity: Entity,
  stackIndex: number,
  stackOffset: number,
  baseEntityId: string
): void => {
  // Remove falling component
  world.removeComponent(entity, "falling");

  // Add stacked component
  world.addComponent(entity, "stacked", {
    stackIndex,
    stackOffset,
    baseEntityId,
  });

  // Update physics tag
  entity.physicsTag = 'stacked';

  // Reset velocity
  if (entity.velocity) {
    entity.velocity.set(0, 0, 0);
  }
};

/**
 * Converts a stacked entity to a banking entity
 */
export const convertToBanking = (
  entity: Entity,
  targetX: number,
  targetY: number
): void => {
  // Remove stacked component
  world.removeComponent(entity, "stacked");

  // Add banking component
  world.addComponent(entity, "banking", {
    targetX,
    targetY,
    startedAt: Date.now(),
  });

  // Update physics tag
  entity.physicsTag = 'banking';
};

/**
 * Converts stacked entities to scattering (for topple)
 */
export const convertToScattering = (entity: Entity): void => {
  // Remove stacked component
  world.removeComponent(entity, "stacked");

  // Add scattering component
  world.addComponent(entity, "scattering", {
    rotationVelocity: (Math.random() - 0.5) * 0.3,
    startedAt: Date.now(),
  });

  // Update physics tag
  entity.physicsTag = 'scattering';

  // Give random velocity
  if (entity.velocity) {
    entity.velocity.x = (Math.random() - 0.5) * 1.5;
    entity.velocity.y = -Math.random() * 0.8 - 0.5;
  }

  // Mark as headache
  if (entity.emotion) {
    entity.emotion.isHeadache = true;
  }
};

/**
 * Creates a frozen version of an entity
 */
export const freezeEntityArchetype = (
  entity: Entity,
  freezeDuration: number
): void => {
  const { physics, animal } = GAME_CONFIG;

  // Remove falling component
  world.removeComponent(entity, "falling");

  // Stop movement
  if (entity.velocity) {
    entity.velocity.set(0, 0, 0);
  }

  // Generate cracks
  const width = animal.width;
  const height = animal.height;
  const cracks: FrozenComponent["cracks"] = [];
  const numCracks = 5 + Math.floor(Math.random() * 4);

  for (let i = 0; i < numCracks; i++) {
    const startFromCenter = Math.random() > 0.5;
    let x1: number, y1: number;

    if (startFromCenter) {
      x1 = (Math.random() - 0.5) * width * 0.3;
      y1 = (Math.random() - 0.5) * height * 0.3;
    } else {
      const side = Math.floor(Math.random() * 4);
      switch (side) {
        case 0:
          x1 = -width * 0.5;
          y1 = (Math.random() - 0.5) * height;
          break;
        case 1:
          x1 = width * 0.5;
          y1 = (Math.random() - 0.5) * height;
          break;
        case 2:
          x1 = (Math.random() - 0.5) * width;
          y1 = -height * 0.5;
          break;
        default:
          x1 = (Math.random() - 0.5) * width;
          y1 = height * 0.5;
          break;
      }
    }

    const angle = Math.atan2(-y1, -x1) + (Math.random() - 0.5) * 1.5;
    const length = width * 0.3 + Math.random() * width * 0.4;
    const x2 = x1 + Math.cos(angle) * length;
    const y2 = y1 + Math.sin(angle) * length;

    cracks.push({ x1, y1, x2, y2 });
  }

  // Add frozen component
  world.addComponent(entity, "frozen", {
    freezeTimer: freezeDuration,
    thawProgress: 0,
    crackStage: 0,
    maxCrackStages: physics.ice.crackStages,
    bobOffset: 0,
    bobTime: Math.random() * 100,
    iceRotation: (Math.random() - 0.5) * 0.3,
    cracks,
  });
};

/**
 * Creates a fireball projectile entity
 */
export const createFireballEntity = (
  x: number,
  y: number,
  direction: -1 | 1
): Entity => {
  const { physics } = GAME_CONFIG;

  return {
    id: crypto.randomUUID(),
    position: new Vector3(x, y, 0),
    velocity: new Vector3(
      direction * physics.fireball.speed * 0.1,
      (Math.random() - 0.5) * 0.02,
      0
    ),
    gameProjectile: {
      type: "fireball",
      direction: new Vector3(direction, 0, 0),
      speed: physics.fireball.speed,
      lifetime: physics.fireball.duration,
      maxLifetime: physics.fireball.duration,
      size: physics.fireball.size,
      rotation: 0,
      trailParticles: [],
    },
    lifetime: {
      createdAt: Date.now(),
      duration: physics.fireball.duration,
    },
  };
};

/**
 * Boss type configuration
 */
const BOSS_CONFIG = {
  mega: {
    health: 3,
    size: 1.8,
    speed: 0.6,
    reward: 500,
  },
  shadow: {
    health: 5,
    size: 1.5,
    speed: 0.8,
    reward: 750,
  },
  golden: {
    health: 2,
    size: 1.4,
    speed: 1.2,
    reward: 1000,
  },
} as const;

/**
 * Creates a boss animal entity
 */
export const createBossAnimal = (
  type: AnimalType,
  bossType: BossComponent["bossType"],
  position: Vector3,
  targetX: number,
  targetY: number
): Entity => {
  const bossConfig = BOSS_CONFIG[bossType];
  const entity = createFallingAnimal(type, position, targetX, targetY, "normal");

  // Scale up for boss
  if (entity.scale) {
    entity.scale = entity.scale.scale(bossConfig.size);
  }

  // Add boss component
  entity.boss = {
    bossType,
    health: bossConfig.health,
    maxHealth: bossConfig.health,
    isPhasing: false,
    hitFlashTime: 0,
    pulsePhase: 0,
    reward: bossConfig.reward,
  };

  return entity;
};
