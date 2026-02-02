/**
 * GameElements3D - 3D Babylon.js renderers for game elements
 * Replaces 2D canvas rendering for power-ups, fireballs, particles, and UI indicators
 */

import { useEffect, useRef } from "react";
import { useScene } from "reactylon";
import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  Vector3,
  Mesh,
  ParticleSystem,
  Texture,
  Animation,
  PointLight,
} from "@babylonjs/core";
import type { PowerUpType } from "@/game/config";
import { POWER_UPS } from "@/game/config";

// ============================================================
// POWER-UP 3D RENDERER
// ============================================================

interface PowerUp3DData {
  type: PowerUpType;
  position: Vector3;
  id: string;
}

/**
 * Renders power-ups as 3D billboarded sprites or simple 3D shapes
 */
export const PowerUpRenderer = ({
  powerUps,
}: {
  powerUps: PowerUp3DData[];
}) => {
  const scene = useScene();
  const meshRefs = useRef<Map<string, { mesh: Mesh; light?: PointLight }>>(new Map());

  useEffect(() => {
    if (!scene) return;

    // Create/update meshes for each power-up
    const currentIds = new Set(powerUps.map((p) => p.id));

    // Remove old meshes
    meshRefs.current.forEach((ref, id) => {
      if (!currentIds.has(id)) {
        ref.mesh.dispose();
        ref.light?.dispose();
        meshRefs.current.delete(id);
      }
    });

    // Create new meshes
    powerUps.forEach((powerUp) => {
      if (!meshRefs.current.has(powerUp.id)) {
        const config = POWER_UPS[powerUp.type];

        // Create a glowing sphere for the power-up
        const mesh = MeshBuilder.CreateSphere(
          `powerUp-${powerUp.id}`,
          { diameter: 0.8 },
          scene
        );

        const material = new StandardMaterial(`powerUpMat-${powerUp.id}`, scene);

        // Parse color from config
        const colorMatch = config.color.match(/hsl\((\d+)/);
        const hue = colorMatch ? parseInt(colorMatch[1]) / 360 : 0.5;
        const color = Color3.FromHSV(hue, 0.8, 1);

        material.diffuseColor = color;
        material.emissiveColor = color.scale(0.5);
        material.specularColor = Color3.White();
        mesh.material = material;

        // Add a point light for glow effect
        const light = new PointLight(
          `powerUpLight-${powerUp.id}`,
          powerUp.position,
          scene
        );
        light.diffuse = color;
        light.intensity = 0.5;
        light.range = 3;

        mesh.position = powerUp.position.clone();

        // Add bob animation
        const bobAnimation = new Animation(
          "bob",
          "position.y",
          30,
          Animation.ANIMATIONTYPE_FLOAT,
          Animation.ANIMATIONLOOPMODE_CYCLE
        );
        bobAnimation.setKeys([
          { frame: 0, value: powerUp.position.y },
          { frame: 15, value: powerUp.position.y + 0.3 },
          { frame: 30, value: powerUp.position.y },
        ]);
        mesh.animations.push(bobAnimation);
        scene.beginAnimation(mesh, 0, 30, true);

        // Add rotation animation
        const rotateAnimation = new Animation(
          "rotate",
          "rotation.y",
          30,
          Animation.ANIMATIONTYPE_FLOAT,
          Animation.ANIMATIONLOOPMODE_CYCLE
        );
        rotateAnimation.setKeys([
          { frame: 0, value: 0 },
          { frame: 60, value: Math.PI * 2 },
        ]);
        mesh.animations.push(rotateAnimation);
        scene.beginAnimation(mesh, 0, 60, true);

        meshRefs.current.set(powerUp.id, { mesh, light });
      } else {
        // Update position
        const ref = meshRefs.current.get(powerUp.id)!;
        ref.mesh.position.x = powerUp.position.x;
        ref.mesh.position.z = powerUp.position.z;
        if (ref.light) {
          ref.light.position = powerUp.position.clone();
        }
      }
    });

    return () => {
      // Cleanup all meshes on unmount
      meshRefs.current.forEach((ref) => {
        ref.mesh.dispose();
        ref.light?.dispose();
      });
      meshRefs.current.clear();
    };
  }, [scene, powerUps]);

  return null;
};

// ============================================================
// FIREBALL 3D RENDERER
// ============================================================

interface Fireball3DData {
  id: string;
  position: Vector3;
  direction: 1 | -1;
}

/**
 * Renders fireballs as particle systems with glow
 */
export const FireballRenderer = ({
  fireballs,
}: {
  fireballs: Fireball3DData[];
}) => {
  const scene = useScene();
  const systemRefs = useRef<Map<string, ParticleSystem>>(new Map());

  useEffect(() => {
    if (!scene) return;

    const currentIds = new Set(fireballs.map((f) => f.id));

    // Remove old particle systems
    systemRefs.current.forEach((system, id) => {
      if (!currentIds.has(id)) {
        system.dispose();
        systemRefs.current.delete(id);
      }
    });

    // Create new particle systems
    fireballs.forEach((fireball) => {
      if (!systemRefs.current.has(fireball.id)) {
        const particleSystem = new ParticleSystem(
          `fireball-${fireball.id}`,
          100,
          scene
        );

        // Texture - use a simple flare
        particleSystem.particleTexture = new Texture(
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4yMfEgaZUAAAA7SURBVChTY/j///9/BgYGhv8gDAIfgfT/j2D6PwMUAwGYABKAKoRLQBWCJaAYJAClQBhKgwhgYYaBAQB3hg/BmLj9KQAAAABJRU5ErkJggg==",
          scene
        );

        // Emitter
        particleSystem.emitter = fireball.position.clone();
        particleSystem.minEmitBox = new Vector3(-0.1, -0.1, -0.1);
        particleSystem.maxEmitBox = new Vector3(0.1, 0.1, 0.1);

        // Colors - fire
        particleSystem.color1 = new Color4(1, 0.5, 0, 1);
        particleSystem.color2 = new Color4(1, 0.2, 0, 1);
        particleSystem.colorDead = new Color4(0.3, 0, 0, 0);

        // Size
        particleSystem.minSize = 0.3;
        particleSystem.maxSize = 0.8;

        // Life
        particleSystem.minLifeTime = 0.1;
        particleSystem.maxLifeTime = 0.3;

        // Emission
        particleSystem.emitRate = 200;

        // Direction - trail behind fireball
        particleSystem.direction1 = new Vector3(
          -fireball.direction * 0.5,
          -0.2,
          0
        );
        particleSystem.direction2 = new Vector3(
          -fireball.direction * 0.5,
          0.2,
          0
        );

        // Speed
        particleSystem.minEmitPower = 1;
        particleSystem.maxEmitPower = 2;

        // Gravity (slight upward drift for fire effect)
        particleSystem.gravity = new Vector3(0, 0.5, 0);

        // Blend mode for additive glow
        particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;

        particleSystem.start();
        systemRefs.current.set(fireball.id, particleSystem);
      } else {
        // Update position
        const system = systemRefs.current.get(fireball.id)!;
        (system.emitter as Vector3).copyFrom(fireball.position);
      }
    });

    return () => {
      systemRefs.current.forEach((system) => system.dispose());
      systemRefs.current.clear();
    };
  }, [scene, fireballs]);

  return null;
};

// ============================================================
// PARTICLE EFFECTS 3D
// ============================================================

type EffectType = "perfect" | "good" | "land" | "merge" | "bank" | "topple";

interface ParticleEffect {
  type: EffectType;
  position: Vector3;
  id: string;
}

/**
 * Manages one-shot particle effects triggered by game events
 */
export const ParticleEffectsManager = ({
  effects,
  onEffectComplete,
}: {
  effects: ParticleEffect[];
  onEffectComplete: (id: string) => void;
}) => {
  const scene = useScene();

  useEffect(() => {
    if (!scene) return;

    effects.forEach((effect) => {
      createParticleEffect(scene, effect.type, effect.position, () => {
        onEffectComplete(effect.id);
      });
    });
  }, [scene, effects, onEffectComplete]);

  return null;
};

function createParticleEffect(
  scene: import("@babylonjs/core").Scene,
  type: EffectType,
  position: Vector3,
  onComplete: () => void
) {
  const particleSystem = new ParticleSystem(`effect-${type}`, 50, scene);

  // Basic flare texture
  particleSystem.particleTexture = new Texture(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4yMfEgaZUAAAA7SURBVChTY/j///9/BgYGhv8gDAIfgfT/j2D6PwMUAwGYABKAKoRLQBWCJaAYJAClQBhKgwhgYYaBAQB3hg/BmLj9KQAAAABJRU5ErkJggg==",
    scene
  );

  particleSystem.emitter = position.clone();
  particleSystem.minEmitBox = new Vector3(-0.2, -0.2, -0.2);
  particleSystem.maxEmitBox = new Vector3(0.2, 0.2, 0.2);

  // Configure based on effect type
  switch (type) {
    case "perfect":
      particleSystem.color1 = new Color4(1, 0.84, 0, 1); // Gold
      particleSystem.color2 = new Color4(1, 0.65, 0, 1);
      particleSystem.minSize = 0.3;
      particleSystem.maxSize = 0.6;
      particleSystem.emitRate = 100;
      particleSystem.targetStopDuration = 0.3;
      break;

    case "good":
      particleSystem.color1 = new Color4(0.2, 1, 0.4, 1); // Green
      particleSystem.color2 = new Color4(0.4, 0.8, 0.2, 1);
      particleSystem.minSize = 0.2;
      particleSystem.maxSize = 0.4;
      particleSystem.emitRate = 50;
      particleSystem.targetStopDuration = 0.2;
      break;

    case "land":
      particleSystem.color1 = new Color4(0.8, 0.8, 0.8, 1); // Dust
      particleSystem.color2 = new Color4(0.6, 0.5, 0.4, 1);
      particleSystem.minSize = 0.1;
      particleSystem.maxSize = 0.3;
      particleSystem.emitRate = 30;
      particleSystem.targetStopDuration = 0.15;
      break;

    case "merge":
      particleSystem.color1 = new Color4(0.8, 0.4, 1, 1); // Purple
      particleSystem.color2 = new Color4(1, 0.6, 0.8, 1);
      particleSystem.minSize = 0.4;
      particleSystem.maxSize = 0.8;
      particleSystem.emitRate = 80;
      particleSystem.targetStopDuration = 0.4;
      break;

    case "bank":
      particleSystem.color1 = new Color4(0, 0.8, 1, 1); // Cyan
      particleSystem.color2 = new Color4(0.4, 1, 0.8, 1);
      particleSystem.minSize = 0.2;
      particleSystem.maxSize = 0.5;
      particleSystem.emitRate = 60;
      particleSystem.targetStopDuration = 0.3;
      break;

    case "topple":
      particleSystem.color1 = new Color4(1, 0.3, 0.2, 1); // Red
      particleSystem.color2 = new Color4(1, 0.5, 0.3, 1);
      particleSystem.minSize = 0.3;
      particleSystem.maxSize = 0.6;
      particleSystem.emitRate = 100;
      particleSystem.targetStopDuration = 0.5;
      break;
  }

  particleSystem.colorDead = new Color4(0, 0, 0, 0);
  particleSystem.minLifeTime = 0.3;
  particleSystem.maxLifeTime = 0.6;
  particleSystem.minEmitPower = 2;
  particleSystem.maxEmitPower = 4;
  particleSystem.gravity = new Vector3(0, -2, 0);
  particleSystem.direction1 = new Vector3(-1, 1, -1);
  particleSystem.direction2 = new Vector3(1, 2, 1);
  particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;

  particleSystem.disposeOnStop = true;
  particleSystem.onDisposeObservable.add(() => {
    onComplete();
  });

  particleSystem.start();
}

// ============================================================
// DANGER OVERLAY (Screen tint effect)
// ============================================================

/**
 * Creates a danger overlay using post-processing or screen tint
 * For now, we'll use a CSS-based overlay since it's simpler and works well
 */
export const DangerOverlay = ({
  active,
  intensity = 0.3,
}: {
  active: boolean;
  intensity?: number;
}) => {
  // This is handled via CSS in the React layer for simplicity
  // Return null - the overlay is rendered as a React component in GameScreen
  return null;
};
