/**
 * EntityRenderer - Renders a single ECS entity as a 3D model with animations.
 *
 * This component:
 * 1. Loads GLB/GLTF models using Babylon.js SceneLoader
 * 2. Extracts AnimationGroups from loaded models
 * 3. Registers animations with the AnimationSystem
 * 4. Syncs entity position/rotation/scale with the mesh
 * 5. Handles character rotation based on movement direction
 * 6. Fixes PBR material settings for proper rendering (including Vertex Colors)
 */

import { useCallback, useEffect, useRef } from "react";
import { useScene } from "react-babylonjs";
import {
  Vector3,
  AbstractMesh,
  ISceneLoaderAsyncResult,
  PBRMaterial,
  Mesh,
  StandardMaterial,
  Color3,
  Texture,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { Entity } from "../../ecs/components";
import {
  registerEntityAnimations,
  unregisterEntityAnimations,
  createAnimationComponent,
} from "../../ecs/systems/AnimationSystem";

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
  const rotation = entity.modelRotation || Vector3.Zero(); // We will override Y if it's a character

  // Load model and extract animations
  const loadModel = useCallback(async () => {
    if (!scene || !entity.model || !entity.id) return;

    // Dispose previous model if it exists
    if (loadedModelRef.current) {
      unregisterEntityAnimations(entity.id);

      // Dispose all meshes
      for (const mesh of loadedModelRef.current.meshes) {
        mesh.dispose();
      }

      // Dispose all animation groups
      for (const group of loadedModelRef.current.animationGroups) {
        group.dispose();
      }

      loadedModelRef.current = null;
      meshRef.current = null;
    }

    try {
      // Parse model path to get root URL and filename
      const modelPath = entity.model;
      const lastSlash = modelPath.lastIndexOf("/");
      const rootUrl = lastSlash >= 0 ? modelPath.substring(0, lastSlash + 1) : "/";
      const filename = lastSlash >= 0 ? modelPath.substring(lastSlash + 1) : modelPath;

      // Load the GLB/GLTF model
      const result = await SceneLoader.ImportMeshAsync(
        "", // Load all meshes
        rootUrl,
        filename,
        scene
      );

      loadedModelRef.current = result;
      previousModelRef.current = entity.model;

      // Find the root mesh
      const rootMesh = result.meshes[0];
      meshRef.current = rootMesh;

      // Apply initial transforms
      if (rootMesh) {
        rootMesh.position = position.clone();
        rootMesh.scaling = scale.clone();
        rootMesh.rotation = rotation.clone();
      }

      // Load Skin Texture if present
      let skinTexture: Texture | null = null;
      if (entity.skinTexture) {
        try {
          // Load texture with inverted Y (standard for GLTF models usually requires flipped texture if UVs are standard, 
          // but Kenney skins are usually mapped 1:1. Babylon GLTF loader flips Y automatically. 
          // Manual texture load might need flipY = false for GLTF mapping. 
          // Usually: new Texture(url, scene, noMipmap, invertY). GLTF usually expects invertY = false.
          skinTexture = new Texture(entity.skinTexture, scene, false, false);
        } catch (e) {
          console.error("Failed to load skin:", entity.skinTexture);
        }
      }

      // Register for shadows
      const shadowGenerator = (window as any).MAIN_SHADOW_GENERATOR;
      
      // Fix PBR materials and Vertex Colors
      result.meshes.forEach((mesh) => {
        if (mesh instanceof Mesh) {
          // Force Vertex Colors (Kenney models use vertex colors OR texture)
          // If using skin texture, we might NOT want vertex colors mixing in?
          // Kenney's Animated Characters usually rely on the Texture Atlas, NOT vertex colors.
          // BUT "Vertex Color Fix" was for the previous models.
          // If `skinTexture` is present, we should probably prefer the texture.
          // I will set useVertexColors = false if skinTexture is present.
          mesh.useVertexColors = !skinTexture;
          
          // Add to shadow generator if it's a real mesh
          if (shadowGenerator && mesh.name !== "__root__") {
            shadowGenerator.addShadowCaster(mesh, true);
          }
        }

        if (mesh.material) {
          // Apply Skin Texture
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
             // For cloth/fabric materials (non-metallic), disable specular F0
            mesh.material.metallicF0Factor = 0;
            mesh.material.metallic = 0;
            mesh.material.roughness = 0.8;
            
            // Use scene environment texture if available for reflections
            if (scene.environmentTexture) {
              mesh.material.reflectionTexture = scene.environmentTexture;
              // reflectionIntensity might be on PBRBaseMaterial or require casting
              (mesh.material as any).reflectionIntensity = 0.5; 
            }

            mesh.material.albedoColor = Color3.White();

          } else if (mesh.material instanceof StandardMaterial) {
            mesh.material.diffuseColor = Color3.White();
            // mesh.material.useVertexColors does not exist, it's on the mesh
          }
        }
      });

      // Register animations with the AnimationSystem
      if (result.animationGroups.length > 0 && entity.id) {
        const availableAnimations = registerEntityAnimations(
          entity.id,
          result.animationGroups,
          rootMesh,
          scene
        );

        // Initialize animation component if entity has one or create a default
        if (entity.animation) {
          entity.animation.availableAnimations = availableAnimations;
        } else {
          // Optionally add animation component if model has animations
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

  // Load model when component mounts or model changes
  useEffect(() => {
    if (entity.model !== previousModelRef.current) {
      loadModel();
    }
  }, [entity.model, loadModel]);

  // Sync transforms with entity state via Render Loop
  useEffect(() => {
    if (!scene) return;

    const observer = scene.onBeforeRenderObservable.add(() => {
      if (meshRef.current && entity.position) {
        // Interpolate or direct copy? Direct copy for now, physics handles steps.
        meshRef.current.position.copyFrom(entity.position);
        
        if (entity.scale) {
          meshRef.current.scaling.copyFrom(entity.scale);
        }

        // Character rotation logic
        if (entity.tag?.type === "player" && entity.velocity) {
          if (Math.abs(entity.velocity.x) > 0.1) {
            const targetRotation = entity.velocity.x > 0 ? Math.PI / 2 : -Math.PI / 2;
            // Smooth rotation
            meshRef.current.rotation.y = Vector3.Lerp(
                new Vector3(0, meshRef.current.rotation.y, 0),
                new Vector3(0, targetRotation, 0),
                0.2
            ).y;
          } else {
             // Face front or keep last? Let's face front slowly
             meshRef.current.rotation.y = Vector3.Lerp(
                new Vector3(0, meshRef.current.rotation.y, 0),
                new Vector3(0, Math.PI, 0),
                0.1
            ).y;
          }
        } else if (entity.modelRotation) {
           // modelRotation override
           meshRef.current.rotation.copyFrom(entity.modelRotation);
        } else if (entity.physics && !entity.player) {
           // Physics rotation (tumbling) if we had angular velocity
           // For now, keep upright or use entity.rotation if it existed
        }
      }
    });

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
    };
  }, [scene, entity]);

  // Cleanup on unmount
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