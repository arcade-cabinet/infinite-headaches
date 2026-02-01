/**
 * EntityRenderer - Renders a single ECS entity as a 3D model with animations.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useScene } from "reactylon";
import { 
  Vector3, 
  MeshBuilder,
  AbstractMesh,
  ISceneLoaderAsyncResult,
  Texture,
  PBRMaterial,
  StandardMaterial,
  Color3,
  Mesh
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { Entity } from "@/game/ecs/components";
import {
  registerEntityAnimations,
  unregisterEntityAnimations,
  createAnimationComponent,
} from "@/game/ecs/systems/AnimationSystem";

interface EntityRendererProps {
  entity: Entity;
}

export const EntityRenderer = ({ entity }: EntityRendererProps) => {
  const scene = useScene();
  const meshRef = useRef<AbstractMesh | null>(null);
  const loadedModelRef = useRef<ISceneLoaderAsyncResult | null>(null);
  const previousModelRef = useRef<string | null>(null);

  const position = entity.position || Vector3.Zero();
  const velocity = entity.velocity || Vector3.Zero();
  const scale = entity.scale || new Vector3(1, 1, 1);
  const rotation = entity.modelRotation || Vector3.Zero(); 

  const loadModel = useCallback(async () => {
    if (!scene || !entity.model || !entity.id) return;

    if (loadedModelRef.current) {
      unregisterEntityAnimations(entity.id);
      for (const mesh of loadedModelRef.current.meshes) {
        mesh.dispose();
      }
      for (const group of loadedModelRef.current.animationGroups) {
        group.dispose();
      }
      loadedModelRef.current = null;
      meshRef.current = null;
    }

    try {
      const modelPath = entity.model;
      const lastSlash = modelPath.lastIndexOf("/");
      const rootUrl = lastSlash >= 0 ? modelPath.substring(0, lastSlash + 1) : "/";
      const filename = lastSlash >= 0 ? modelPath.substring(lastSlash + 1) : modelPath;

      const result = await SceneLoader.ImportMeshAsync(
        "", 
        rootUrl,
        filename,
        scene
      );

      loadedModelRef.current = result;
      previousModelRef.current = entity.model;

      const rootMesh = result.meshes[0];
      meshRef.current = rootMesh;

      if (rootMesh) {
        rootMesh.position = position.clone();
        rootMesh.scaling = scale.clone();
        rootMesh.rotation = rotation.clone();
      }

      let skinTexture: Texture | null = null;
      if (entity.skinTexture) {
        try {
          skinTexture = new Texture(entity.skinTexture, scene, false, false);
        } catch (e) {
          console.error("Failed to load skin:", entity.skinTexture);
        }
      }

      const shadowGenerator = (window as any).MAIN_SHADOW_GENERATOR;
      
      result.meshes.forEach((mesh) => {
        if (mesh instanceof Mesh) {
          mesh.useVertexColors = !skinTexture;
          
          if (shadowGenerator && mesh.name !== "__root__") {
            shadowGenerator.addShadowCaster(mesh, true);
          }
        }

        if (mesh.material) {
          if (skinTexture) {
             if (mesh.material instanceof PBRMaterial) {
                mesh.material.albedoTexture = skinTexture;
                mesh.material.albedoColor = Color3.White();
             } else if (mesh.material instanceof StandardMaterial) {
                mesh.material.diffuseTexture = skinTexture;
                mesh.material.diffuseColor = Color3.White();
             }
          }

          if (mesh.material instanceof PBRMaterial) {
            mesh.material.metallicF0Factor = 0;
            mesh.material.metallic = 0;
            mesh.material.roughness = 0.8;
            
            if (scene.environmentTexture) {
              mesh.material.reflectionTexture = scene.environmentTexture;
              (mesh.material as any).reflectionIntensity = 0.5; 
            }

            mesh.material.albedoColor = Color3.White();

          } else if (mesh.material instanceof StandardMaterial) {
            mesh.material.diffuseColor = Color3.White();
          }
        }
      });

      if (result.animationGroups.length > 0 && entity.id) {
        const availableAnimations = registerEntityAnimations(
          entity.id,
          result.animationGroups,
          rootMesh,
          scene
        );

        if (entity.animation) {
          entity.animation.availableAnimations = availableAnimations;
        } else {
          entity.animation = createAnimationComponent({
            availableAnimations,
            currentAnimation: availableAnimations.includes("idle")
              ? "idle"
              : availableAnimations[0] || "idle",
          });
        }
      }
    } catch (error) {
      console.error(`Failed to load model ${entity.model}:`, error);
    }
  }, [scene, entity.model, entity.id]);

  useEffect(() => {
    if (entity.model !== previousModelRef.current) {
      loadModel();
    }
  }, [entity.model, loadModel]);

  useEffect(() => {
    if (!scene) return;

    const observer = scene.onBeforeRenderObservable.add(() => {
      if (meshRef.current && entity.position) {
        meshRef.current.position.copyFrom(entity.position);
        
        if (entity.scale) {
          meshRef.current.scaling.copyFrom(entity.scale);
        }

        if (entity.tag?.type === "player" && entity.velocity) {
          if (Math.abs(entity.velocity.x) > 0.1) {
            const targetRotation = entity.velocity.x > 0 ? Math.PI / 2 : -Math.PI / 2;
            meshRef.current.rotation.y = Vector3.Lerp(
                new Vector3(0, meshRef.current.rotation.y, 0),
                new Vector3(0, targetRotation, 0),
                0.2
            ).y;
          } else {
             meshRef.current.rotation.y = Vector3.Lerp(
                new Vector3(0, meshRef.current.rotation.y, 0),
                new Vector3(0, Math.PI, 0),
                0.1
            ).y;
          }
        } else if (entity.modelRotation) {
           meshRef.current.rotation.copyFrom(entity.modelRotation);
        }
      }
    });

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
    };
  }, [scene, entity]);

  useEffect(() => {
    return () => {
      if (entity.id) {
        unregisterEntityAnimations(entity.id);
      }

      if (loadedModelRef.current) {
        for (const mesh of loadedModelRef.current.meshes) {
          mesh.dispose();
        }
        for (const group of loadedModelRef.current.animationGroups) {
          group.dispose();
        }
      }
    };
  }, [entity.id]);

  return null;
};
