/**
 * EntityRenderer - Renders a single ECS entity as a 3D model with animations and Physics.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useScene } from "reactylon";
import {
  Vector3,
  Color3,
  AbstractMesh,
  ISceneLoaderAsyncResult,
  PhysicsAggregate,
  PhysicsShapeType,
  PhysicsMotionType,
  PBRMaterial,
  StandardMaterial,
} from "@babylonjs/core";
import { Entity } from "@/game/ecs/components";
import {
  registerEntityAnimations,
  unregisterEntityAnimations,
  createAnimationComponent,
} from "@/game/ecs/systems/AnimationSystem";
import { loadModel3D, selectIdleAnimation, disposeModelResult } from "../loadModel3D";

interface EntityRendererProps {
  entity: Entity;
}

export const EntityRenderer = ({ entity }: EntityRendererProps) => {
  const scene = useScene();
  const meshRef = useRef<AbstractMesh | null>(null);
  const loadedModelRef = useRef<ISceneLoaderAsyncResult | null>(null);
  const previousModelRef = useRef<string | null>(null);
  const aggregateRef = useRef<PhysicsAggregate | null>(null);
  const lastMotionType = useRef<PhysicsMotionType>(PhysicsMotionType.DYNAMIC);

  const position = entity.position || Vector3.Zero();
  const scale = entity.scale || new Vector3(1, 1, 1);
  const rotation = entity.modelRotation || Vector3.Zero(); 

  const loadModelCb = useCallback(async () => {
    if (!scene || !entity.model || !entity.id) return;

    // Clean up previous model
    if (loadedModelRef.current) {
      if (aggregateRef.current) {
        aggregateRef.current.dispose();
        aggregateRef.current = null;
      }
      unregisterEntityAnimations(entity.id);
      disposeModelResult(loadedModelRef.current);
      loadedModelRef.current = null;
      meshRef.current = null;
    }

    try {
      // Shared model loading: materials, root motion stripping, shadows
      const { result, rootMesh, animationGroups } = await loadModel3D({
        modelPath: entity.model,
        scene,
        skinTexture: entity.skinTexture,
        registerShadows: true,
      });

      loadedModelRef.current = result;
      previousModelRef.current = entity.model;
      meshRef.current = rootMesh;

      if (rootMesh) {
        rootMesh.position = position.clone();
        rootMesh.scaling = scale.clone();
        rootMesh.rotation = rotation.clone();
      }

      // Animation Registration
      if (animationGroups.length > 0 && entity.id) {
        const availableAnimations = registerEntityAnimations(
          entity.id,
          animationGroups,
          rootMesh,
          scene
        );

        // Force root mesh back to ECS position after animation setup
        if (rootMesh) {
          rootMesh.position = position.clone();
        }

        if (entity.animation) {
          entity.animation.availableAnimations = availableAnimations;
        } else {
          entity.animation = createAnimationComponent({
            availableAnimations,
            currentAnimation: selectIdleAnimation(availableAnimations),
          });
        }
      }

      // --- PHYSICS INTEGRATION ---
      const COLLISION_GROUP_PLAYER  = 0x01;
      const COLLISION_GROUP_FALLING = 0x02;
      const COLLISION_GROUP_STACKED = 0x04;

      if (scene.getPhysicsEngine()) {
         const isPlayer = entity.tag?.type === 'player';
         const isKinematic = isPlayer || !!entity.stacked || !!entity.banking;
         const motionType = isKinematic ? PhysicsMotionType.ANIMATED : PhysicsMotionType.DYNAMIC;
         lastMotionType.current = motionType;

         const mass = isPlayer ? 10 : (entity.physics?.mass ?? 1);
         const restitution = isPlayer ? 0 : 0.1;
         const friction = isPlayer ? 1.0 : 0.8;

         const agg = new PhysicsAggregate(
            rootMesh,
            PhysicsShapeType.BOX,
            { mass, restitution, friction },
            scene
         );
         agg.body.setMotionType(motionType);
         agg.body.setMassProperties({ inertia: Vector3.Zero() });
         agg.body.setCollisionCallbackEnabled(true);

         const shape = agg.shape;
         if (shape) {
           if (isPlayer) {
             shape.filterMembershipMask = COLLISION_GROUP_PLAYER;
             shape.filterCollideMask = COLLISION_GROUP_FALLING;
           } else if (entity.physicsTag === 'falling') {
             shape.filterMembershipMask = COLLISION_GROUP_FALLING;
             shape.filterCollideMask = COLLISION_GROUP_PLAYER | COLLISION_GROUP_STACKED;
           } else if (entity.physicsTag === 'stacked') {
             shape.filterMembershipMask = COLLISION_GROUP_STACKED;
             shape.filterCollideMask = COLLISION_GROUP_FALLING;
           }
         }

         rootMesh.metadata = {
           ...(rootMesh.metadata || {}),
           entityId: entity.id,
           physicsTag: entity.physicsTag || entity.tag?.type,
         };

         aggregateRef.current = agg;
      }

      // Apply variant color overlay to materials
      if (entity.colorOverlay && rootMesh) {
        const overlay = entity.colorOverlay;
        const allMeshes = rootMesh.getChildMeshes(false);
        for (const mesh of allMeshes) {
          const mat = mesh.material;
          if (mat instanceof PBRMaterial) {
            mat.albedoColor = Color3.Lerp(
              mat.albedoColor || Color3.White(),
              overlay.color,
              0.4,
            );
            mat.emissiveColor = overlay.color.scale(overlay.intensity);
          } else if (mat instanceof StandardMaterial) {
            mat.diffuseColor = Color3.Lerp(
              mat.diffuseColor || Color3.White(),
              overlay.color,
              0.4,
            );
            mat.emissiveColor = overlay.color.scale(overlay.intensity);
          }
        }
      }

    } catch (error) {
      console.error(`Failed to load model ${entity.model}:`, error);
    }
  }, [scene, entity.model, entity.id]);

  useEffect(() => {
    if (entity.model !== previousModelRef.current) {
      loadModelCb();
    }
  }, [entity.model, loadModelCb]);

  useEffect(() => {
    if (!scene) return;

    const COLLISION_GROUP_PLAYER  = 0x01;
    const COLLISION_GROUP_FALLING = 0x02;
    const COLLISION_GROUP_STACKED = 0x04;

    const observer = scene.onBeforeRenderObservable.add(() => {
      if (!meshRef.current || !entity.position) return;

      const isKinematic = entity.tag?.type === 'player' || !!entity.stacked || !!entity.banking;
      const desiredType = isKinematic ? PhysicsMotionType.ANIMATED : PhysicsMotionType.DYNAMIC;

      // Update Motion Type if changed (e.g., falling -> stacked transition)
      if (aggregateRef.current && lastMotionType.current !== desiredType) {
          aggregateRef.current.body.setMotionType(desiredType);
          lastMotionType.current = desiredType;
          // If switching to Kinematic, reset velocity
          if (desiredType === PhysicsMotionType.ANIMATED) {
              aggregateRef.current.body.setLinearVelocity(Vector3.Zero());
              aggregateRef.current.body.setAngularVelocity(Vector3.Zero());
          }

          // Update collision groups when entity transitions (e.g., falling -> stacked)
          const shape = aggregateRef.current.shape;
          if (shape && entity.physicsTag === 'stacked') {
            shape.filterMembershipMask = COLLISION_GROUP_STACKED;
            shape.filterCollideMask = COLLISION_GROUP_FALLING;
          }
      }

      // Keep metadata in sync
      if (meshRef.current.metadata) {
        meshRef.current.metadata.physicsTag = entity.physicsTag || entity.tag?.type;
      }

      // Sync Logic
      if (desiredType === PhysicsMotionType.ANIMATED) {
          // ECS -> Mesh (Physics follows)
          meshRef.current.position.copyFrom(entity.position);
          // Lock Z to 0 for the game plane
          meshRef.current.position.z = 0;

          if (entity.tag?.type === "player" && entity.velocity) {
             const speed = Math.abs(entity.velocity.x);
             // GLB models face +Z (away from camera). Math.PI rotates them to face -Z (toward camera).
             if (speed > 2) {
                // Running - partial turn toward movement direction (offset from camera-facing)
                const turnOffset = entity.velocity.x > 0 ? -Math.PI / 4 : Math.PI / 4;
                const targetRotation = Math.PI + turnOffset;
                meshRef.current.rotation.y += (targetRotation - meshRef.current.rotation.y) * 0.15;
             } else if (speed > 0.1) {
                // Walking - slight turn toward movement direction
                const turnOffset = entity.velocity.x > 0 ? -Math.PI / 6 : Math.PI / 6;
                const targetRotation = Math.PI + turnOffset;
                meshRef.current.rotation.y += (targetRotation - meshRef.current.rotation.y) * 0.08;
             } else {
                // Idle - face camera smoothly (Math.PI = model faces camera)
                meshRef.current.rotation.y += (Math.PI - meshRef.current.rotation.y) * 0.12;
             }
          } else if (entity.modelRotation) {
             meshRef.current.rotation.copyFrom(entity.modelRotation);
          }
      } else {
          // DYNAMIC: Physics drives Mesh -> Sync Mesh to ECS
          entity.position.copyFrom(meshRef.current.position);
          if (entity.modelRotation) {
             entity.modelRotation.copyFrom(meshRef.current.rotationQuaternion?.toEulerAngles() || meshRef.current.rotation);
          }

          // Apply behavior forces for falling entities (physics-based behaviors)
          if (entity.falling && aggregateRef.current) {
            const body = aggregateRef.current.body;
            const behaviorType = entity.falling.behaviorType;
            const playerTargetX = entity.falling.targetX;
            const dx = playerTargetX - entity.position.x;
            const forceMagnitude = 2.0;

            switch (behaviorType) {
              case "seeker":
                // Gentle force toward player X
                body.applyForce(new Vector3(Math.sign(dx) * forceMagnitude * 0.8, 0, 0), entity.position);
                break;
              case "evader":
                // Force away from player X
                body.applyForce(new Vector3(-Math.sign(dx) * forceMagnitude * 0.6, 0, 0), entity.position);
                break;
              case "zigzag": {
                // Alternating horizontal force based on time
                const elapsed = (Date.now() - entity.falling.spawnTime) / 1000;
                const zigForce = Math.sin(elapsed * 4) * forceMagnitude;
                body.applyForce(new Vector3(zigForce, 0, 0), entity.position);
                break;
              }
              case "floater":
                // Upward force to slow descent
                body.applyForce(new Vector3(0, 6.0, 0), entity.position);
                break;
              case "dive":
                // Extra downward force for fast drops
                body.applyForce(new Vector3(0, -5.0, 0), entity.position);
                break;
              // "normal" and "swarm": no extra force, gravity only
            }

            // Lock Z position to game plane
            if (Math.abs(meshRef.current.position.z) > 0.01) {
              meshRef.current.position.z = 0;
              body.setLinearVelocity(
                new Vector3(
                  body.getLinearVelocity().x,
                  body.getLinearVelocity().y,
                  0
                )
              );
            }
          }
      }
    });

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
    };
  }, [scene, entity]);

  useEffect(() => {
    return () => {
      if (aggregateRef.current) {
        aggregateRef.current.dispose();
      }
      if (entity.id) {
        unregisterEntityAnimations(entity.id);
      }
      if (loadedModelRef.current) {
        disposeModelResult(loadedModelRef.current);
      }
    };
  }, [entity.id]);

  return null;
};