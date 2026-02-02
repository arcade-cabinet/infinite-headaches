/**
 * PeekingAnimal3D - 3D animals that peek up from the bottom of the screen.
 *
 * Replaces the old 2D sprite-based PeekingAnimal that peeked from the sides.
 * Loads random animal GLB models into the BabylonJS scene and animates them
 * rising from below the camera's viewport, holding briefly, then retreating.
 *
 * Uses the shared loadModel3D utility for consistent model loading,
 * material cleanup, and root motion stripping across the entire app.
 *
 * Runs inside the <Scene> context (returns null, purely imperative 3D).
 */

import { useEffect, useRef, useCallback } from "react";
import { useScene } from "reactylon";
import {
  Vector3,
  AbstractMesh,
  AnimationGroup,
  ISceneLoaderAsyncResult,
} from "@babylonjs/core";
import { ANIMAL_TYPES, type AnimalType } from "@/game/config";
import {
  loadModel3D,
  findIdleAnimationGroup,
  disposeModelResult,
} from "@/features/gameplay/scene/loadModel3D";

/** Animals available for the peeking effect. */
const PEEK_ANIMALS: { type: AnimalType; model: string }[] = [
  { type: "cow", model: "assets/models/animals/cow.glb" },
  { type: "pig", model: "assets/models/animals/pig.glb" },
  { type: "chicken", model: "assets/models/animals/chicken.glb" },
  { type: "duck", model: "assets/models/animals/duck.glb" },
  { type: "sheep", model: "assets/models/animals/sheep.glb" },
];

/**
 * Menu camera sits at (0, 1.5, -5) looking at (0, 1.2, 0).
 * With default FOV ~0.8 rad, the bottom of the viewport at Z=0 is ~ Y = -0.9.
 * Animals start below that and peek upward.
 */
const HIDDEN_Y = -2.5;
const PEEK_Y = -1.0;
const PEEK_DURATION = 900; // ms - rise up
const RETREAT_DURATION = 700; // ms - sink back down
const HOLD_MIN = 2000;
const HOLD_RANGE = 2500;
const REST_MIN = 3000;
const REST_RANGE = 4000;

export const PeekingAnimal3D = () => {
  const scene = useScene();
  const rootMeshRef = useRef<AbstractMesh | null>(null);
  const loadedResultRef = useRef<ISceneLoaderAsyncResult | null>(null);
  const peekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);
  /** Locked X position for this peek cycle — prevents animation drift. */
  const lockedXRef = useRef(0);

  /** Dispose the current animal model and its animations. */
  const cleanupModel = useCallback(() => {
    if (loadedResultRef.current) {
      disposeModelResult(loadedResultRef.current);
      loadedResultRef.current = null;
    }
    rootMeshRef.current = null;
  }, []);

  useEffect(() => {
    if (!scene) return;
    disposedRef.current = false;

    const loadAndPeek = async () => {
      if (disposedRef.current) return;

      // Clean up any previous model
      cleanupModel();

      // Pick a random animal
      const animal =
        PEEK_ANIMALS[Math.floor(Math.random() * PEEK_ANIMALS.length)];
      const config = ANIMAL_TYPES[animal.type];

      try {
        const { result, rootMesh } = await loadModel3D({
          modelPath: animal.model,
          scene,
        });

        if (disposedRef.current) {
          disposeModelResult(result);
          return;
        }

        rootMeshRef.current = rootMesh;
        loadedResultRef.current = result;

        // Random X position within visible range
        const xPos = Math.random() * 5 - 2.5;
        lockedXRef.current = xPos;

        // Scale: use config modelScale, slightly smaller for decorative peek
        const scale = config.modelScale * 0.7;
        rootMesh.scaling = new Vector3(scale, scale, scale);

        // Start hidden below the viewport
        rootMesh.position = new Vector3(xPos, HIDDEN_Y, 0);
        rootMesh.rotation = new Vector3(0, Math.PI, 0);

        // Play idle animation
        const groups = result.animationGroups;
        groups.forEach((g) => g.stop());
        const idle = findIdleAnimationGroup(groups);
        if (idle) idle.start(true);

        // Animate: peek -> hold -> retreat -> schedule next
        let startTime = performance.now();
        let phase: "peek" | "hold" | "retreat" = "peek";
        const holdDuration = HOLD_MIN + Math.random() * HOLD_RANGE;

        const observer = scene.onBeforeRenderObservable.add(() => {
          if (!rootMeshRef.current || disposedRef.current) {
            scene.onBeforeRenderObservable.remove(observer);
            return;
          }

          const elapsed = performance.now() - startTime;

          // Lock X position — prevents animation root motion from drifting
          rootMeshRef.current.position.x = lockedXRef.current;

          if (phase === "peek") {
            const t = Math.min(elapsed / PEEK_DURATION, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            rootMeshRef.current.position.y =
              HIDDEN_Y + (PEEK_Y - HIDDEN_Y) * eased;

            if (t >= 1) {
              phase = "hold";
              startTime = performance.now();
            }
          } else if (phase === "hold") {
            const bobT = elapsed / 1000;
            rootMeshRef.current.position.y =
              PEEK_Y + Math.sin(bobT * 2) * 0.04;

            if (elapsed >= holdDuration) {
              phase = "retreat";
              startTime = performance.now();
            }
          } else if (phase === "retreat") {
            const t = Math.min(elapsed / RETREAT_DURATION, 1);
            const eased = t * t;
            rootMeshRef.current.position.y =
              PEEK_Y + (HIDDEN_Y - PEEK_Y) * eased;

            if (t >= 1) {
              scene.onBeforeRenderObservable.remove(observer);
              cleanupModel();

              if (!disposedRef.current) {
                peekTimeoutRef.current = setTimeout(
                  loadAndPeek,
                  REST_MIN + Math.random() * REST_RANGE
                );
              }
            }
          }
        });
      } catch (error) {
        console.error("PeekingAnimal3D: Failed to load model:", error);
        if (!disposedRef.current) {
          peekTimeoutRef.current = setTimeout(loadAndPeek, 5000);
        }
      }
    };

    // First peek after a short delay
    peekTimeoutRef.current = setTimeout(loadAndPeek, 1500);

    return () => {
      disposedRef.current = true;
      if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
      cleanupModel();
    };
  }, [scene, cleanupModel]);

  return null;
};
