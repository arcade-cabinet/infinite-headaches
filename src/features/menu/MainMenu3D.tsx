/**
 * MainMenu3D - 3D farmer carousel for the main menu.
 * Loads farmer GLB models, positions them on a turntable,
 * and allows cycling between characters with swipe/click.
 *
 * All text/buttons are handled by the HTML overlay in GameScreen3D.
 * This component ONLY renders 3D content inside the BabylonJS scene.
 *
 * Uses the shared loadModel3D utility for consistent model loading,
 * material cleanup, and root motion stripping across the entire app.
 */

import { useEffect, useRef, useState } from "react";
import { useScene } from "reactylon";
import {
  Vector3,
  AbstractMesh,
  ISceneLoaderAsyncResult,
  FreeCamera,
  DirectionalLight,
  HemisphericLight,
  Color3,
  AnimationGroup,
} from "@babylonjs/core";
import {
  loadModel3D,
  findIdleAnimationGroup,
  disposeModelResult,
} from "@/features/gameplay/scene/loadModel3D";

const CHARACTERS = [
  {
    id: "farmer_john" as const,
    name: "Farmer John",
    model: "assets/models/farmers/john.glb",
    scale: new Vector3(1.4, 1.4, 1.4),
  },
  {
    id: "farmer_mary" as const,
    name: "Farmer Mary",
    model: "assets/models/farmers/mary.glb",
    scale: new Vector3(1.3, 1.3, 1.3),
  },
];

/** Fixed position for menu characters — prevents animation drift. */
const MENU_POSITION = new Vector3(0, -0.5, 0);

interface MainMenu3DProps {
  onPlay: () => void;
  onSettings: () => void;
  onUpgrades: () => void;
  highScore: number;
  selectedCharacterIndex: number;
  onCharacterChange: (index: number) => void;
}

export const MainMenu3D = ({
  onPlay,
  onSettings,
  onUpgrades,
  highScore,
  selectedCharacterIndex,
  onCharacterChange,
}: MainMenu3DProps) => {
  const scene = useScene();
  const modelsRef = useRef<(ISceneLoaderAsyncResult | null)[]>([]);
  const rootMeshesRef = useRef<(AbstractMesh | null)[]>([]);
  const animGroupsRef = useRef<AnimationGroup[][]>([]);
  const lightRef = useRef<DirectionalLight | null>(null);
  const fillLightRef = useRef<HemisphericLight | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Set up menu camera and lighting
  useEffect(() => {
    if (!scene) return;

    const camera = scene.activeCamera as FreeCamera;
    if (camera) {
      camera.position.set(0, 1.5, -5);
      camera.setTarget(new Vector3(0, 1.2, 0));
    }

    const keyLight = new DirectionalLight("menuKeyLight", new Vector3(-0.5, -1, 1), scene);
    keyLight.intensity = 2.0;
    keyLight.position = new Vector3(3, 5, -3);
    lightRef.current = keyLight;

    const fillLight = new HemisphericLight("menuFillLight", new Vector3(0, 1, 0), scene);
    fillLight.intensity = 0.8;
    fillLight.groundColor = new Color3(0.3, 0.25, 0.2);
    fillLightRef.current = fillLight;

    return () => {
      keyLight.dispose();
      fillLight.dispose();
      lightRef.current = null;
      fillLightRef.current = null;
    };
  }, [scene]);

  // Load all farmer models using the shared pipeline
  useEffect(() => {
    if (!scene) return;

    const loadAllModels = async () => {
      const loaded: (ISceneLoaderAsyncResult | null)[] = [];
      const rootMeshes: (AbstractMesh | null)[] = [];
      const allAnimGroups: AnimationGroup[][] = [];

      for (let i = 0; i < CHARACTERS.length; i++) {
        const char = CHARACTERS[i];
        try {
          const { result, rootMesh, animationGroups } = await loadModel3D({
            modelPath: char.model,
            scene,
          });

          loaded.push(result);
          rootMeshes.push(rootMesh);

          if (rootMesh) {
            rootMesh.position = MENU_POSITION.clone();
            rootMesh.scaling = char.scale.clone();
            rootMesh.rotation = new Vector3(0, Math.PI, 0);
            rootMesh.setEnabled(i === selectedCharacterIndex);
          }

          allAnimGroups.push(animationGroups);

          // Stop all animations, then play idle on selected
          animationGroups.forEach((g) => g.stop());
          if (i === selectedCharacterIndex) {
            const idle = findIdleAnimationGroup(animationGroups);
            if (idle) idle.start(true);
          }
        } catch (error) {
          console.error(`Failed to load menu model ${char.model}:`, error);
          loaded.push(null);
          rootMeshes.push(null);
          allAnimGroups.push([]);
        }
      }

      modelsRef.current = loaded;
      rootMeshesRef.current = rootMeshes;
      animGroupsRef.current = allAnimGroups;
      setModelsLoaded(true);
    };

    loadAllModels();

    return () => {
      for (const result of modelsRef.current) {
        if (result) disposeModelResult(result);
      }
      modelsRef.current = [];
      rootMeshesRef.current = [];
      animGroupsRef.current = [];
    };
  }, [scene]);

  // Show/hide models and play animations when selection changes
  useEffect(() => {
    if (!modelsLoaded) return;

    for (let i = 0; i < CHARACTERS.length; i++) {
      const rootMesh = rootMeshesRef.current[i];
      const groups = animGroupsRef.current[i];
      if (!rootMesh) continue;

      const isSelected = i === selectedCharacterIndex;
      rootMesh.setEnabled(isSelected);

      groups.forEach((g) => g.stop());

      if (isSelected) {
        const idle = findIdleAnimationGroup(groups);
        if (idle) idle.start(true);
      }
    }
  }, [selectedCharacterIndex, modelsLoaded]);

  // Per-frame: gentle sway + position lock (prevents animation drift)
  useEffect(() => {
    if (!scene || !modelsLoaded) return;

    const observer = scene.onBeforeRenderObservable.add(() => {
      const rootMesh = rootMeshesRef.current[selectedCharacterIndex];
      if (!rootMesh) return;

      // Lock position — root motion is stripped but this is the safety net
      rootMesh.position.copyFrom(MENU_POSITION);

      // Gentle sway animation
      const time = performance.now() / 1000;
      const sway = Math.sin(time * 0.5) * 0.08;
      rootMesh.rotation.y = Math.PI + sway;
    });

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
    };
  }, [scene, selectedCharacterIndex, modelsLoaded]);

  // Expose E2E test API
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).GAME_MENU = {
        clickPlay: onPlay,
        clickUpgrades: onUpgrades,
        clickSettings: onSettings,
        nextCharacter: () => {
          const next = (selectedCharacterIndex + 1) % CHARACTERS.length;
          onCharacterChange(next);
        },
        prevCharacter: () => {
          const prev = (selectedCharacterIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
          onCharacterChange(prev);
        },
        getSelectedCharacter: () => CHARACTERS[selectedCharacterIndex]?.id,
      };
    }
    return () => {
      delete (window as any).GAME_MENU;
    };
  }, [onPlay, onSettings, onUpgrades, selectedCharacterIndex, onCharacterChange]);

  return null;
};

export const MENU_CHARACTERS = CHARACTERS;
export type MenuCharacterId = typeof CHARACTERS[number]["id"];
