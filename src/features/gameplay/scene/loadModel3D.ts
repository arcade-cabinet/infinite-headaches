/**
 * Shared 3D model loading utility.
 *
 * Extracts the common GLB loading pipeline used by EntityRenderer,
 * MainMenu3D, and PeekingAnimal3D into a single function:
 *   - SceneLoader.ImportMeshAsync
 *   - PBR material cleanup (metallic → 0, roughness up, albedo white)
 *   - Root motion stripping (zeroes position keyframes on root bones)
 *   - Shadow caster registration
 *   - Optional skin texture application
 */

import {
  AbstractMesh,
  ISceneLoaderAsyncResult,
  PBRMaterial,
  StandardMaterial,
  Color3,
  Texture,
  Scene,
  Mesh,
  Vector3,
  AnimationGroup,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";

export interface LoadModel3DOptions {
  /** Full path to GLB, e.g. "assets/models/animals/cow.glb" */
  modelPath: string;
  scene: Scene;
  /** Optional skin texture URL to apply over albedo */
  skinTexture?: string;
  /** If true, register meshes as shadow casters (via window.MAIN_SHADOW_GENERATOR) */
  registerShadows?: boolean;
}

export interface LoadModel3DResult {
  result: ISceneLoaderAsyncResult;
  rootMesh: AbstractMesh;
  animationGroups: AnimationGroup[];
}

/**
 * Loads a GLB model, cleans up materials, strips root motion, and optionally
 * applies shadows and skin textures.
 */
export async function loadModel3D(options: LoadModel3DOptions): Promise<LoadModel3DResult> {
  const { modelPath, scene, skinTexture, registerShadows = false } = options;

  const lastSlash = modelPath.lastIndexOf("/");
  const rootUrl = lastSlash >= 0 ? modelPath.substring(0, lastSlash + 1) : "/";
  const filename = lastSlash >= 0 ? modelPath.substring(lastSlash + 1) : modelPath;

  const result = await SceneLoader.ImportMeshAsync("", rootUrl, filename, scene);
  const rootMesh = result.meshes[0];

  // ── Material cleanup ────────────────────────────────────
  let skinTex: Texture | null = null;
  if (skinTexture) {
    try {
      skinTex = new Texture(skinTexture, scene, false, false);
    } catch {
      // Skin texture missing – fall through to default
    }
  }

  const shadowGenerator = registerShadows
    ? (window as any).MAIN_SHADOW_GENERATOR
    : null;

  for (const mesh of result.meshes) {
    // Shadow casting
    if (shadowGenerator && mesh instanceof Mesh && mesh.name !== "__root__") {
      shadowGenerator.addShadowCaster(mesh, true);
    }

    // Vertex colours (disable when using a skin texture)
    if (mesh instanceof Mesh) {
      mesh.useVertexColors = !skinTex;
    }

    if (mesh.material) {
      // Apply skin texture if provided
      if (skinTex) {
        if (mesh.material instanceof PBRMaterial) {
          mesh.material.albedoTexture = skinTex;
          mesh.material.albedoColor = Color3.White();
        } else if (mesh.material instanceof StandardMaterial) {
          mesh.material.diffuseTexture = skinTex;
          mesh.material.diffuseColor = Color3.White();
        }
      }

      // PBR cleanup: remove metallic sheen, set cartoony diffuse
      if (mesh.material instanceof PBRMaterial) {
        mesh.material.metallicF0Factor = 0;
        mesh.material.metallic = 0;
        mesh.material.roughness = 0.8;
        mesh.material.albedoColor = Color3.White();
        if (scene.environmentTexture) {
          mesh.material.reflectionTexture = scene.environmentTexture;
          (mesh.material as any).reflectionIntensity = 0.5;
        }
      } else if (mesh.material instanceof StandardMaterial) {
        mesh.material.diffuseColor = Color3.White();
      }
    }
  }

  // ── Root motion stripping ───────────────────────────────
  for (const group of result.animationGroups) {
    group.enableBlending = true;

    for (const targeted of group.targetedAnimations) {
      const target = targeted.target;

      // Comprehensive root bone detection (covers Blender, Mixamo, etc.)
      const isRootBone =
        target === rootMesh ||
        (target?.parent === rootMesh &&
          target?.getChildMeshes?.()?.length > 0) ||
        target?.name === "root" ||
        target?.name === "Root" ||
        target?.name === "Armature" ||
        target?.name === "mixamorig:Hips";

      if (isRootBone && targeted.animation?.targetProperty === "position") {
        const keys = targeted.animation.getKeys();
        for (const key of keys) {
          key.value = Vector3.Zero();
        }
      }
    }
  }

  return {
    result,
    rootMesh,
    animationGroups: result.animationGroups || [],
  };
}

/**
 * Selects the best idle animation name from a list of available animations.
 * Avoids movement animations (walk/run) that would look wrong on idle characters.
 */
export function selectIdleAnimation(availableAnimations: string[]): string {
  const idlePriority = ["idle", "stand", "breathe", "rest", "wait"];
  for (const candidate of idlePriority) {
    if (availableAnimations.includes(candidate)) return candidate;
  }
  // Fallback: pick the first animation that is NOT a movement animation
  const movementNames = ["walk", "run", "sprint", "jog", "locomotion", "move"];
  const nonMovement = availableAnimations.find(
    (a) => !movementNames.some((m) => a.includes(m))
  );
  return nonMovement || availableAnimations[0] || "idle";
}

/**
 * Finds an idle AnimationGroup from raw BabylonJS groups (before normalization).
 * Use this in menu components that manage animations directly.
 */
export function findIdleAnimationGroup(groups: AnimationGroup[]): AnimationGroup | null {
  const idle = groups.find(
    (g) =>
      g.name.toLowerCase().includes("idle") ||
      g.name.toLowerCase().includes("stand") ||
      g.name.toLowerCase().includes("breathe")
  );
  return idle || groups[0] || null;
}

/**
 * Disposes all meshes and animation groups from a loader result.
 */
export function disposeModelResult(result: ISceneLoaderAsyncResult): void {
  for (const group of result.animationGroups) group.dispose();
  for (const mesh of result.meshes) mesh.dispose();
}
