import { useEffect, useRef, useState } from "react";
import { useScene } from "reactylon";
import {
  Vector3,
  DirectionalLight,
  HDRCubeTexture,
  ShadowGenerator,
  Texture
} from "@babylonjs/core";
import { QualityLevel } from "../../../graphics";

export const Lighting = ({ quality }: { quality: QualityLevel }) => {
  const scene = useScene();
  const [light, setLight] = useState<DirectionalLight | null>(null);
  const shadowRef = useRef<ShadowGenerator>(null);

  useEffect(() => {
    if (!scene) return;

    // Setup Image Based Lighting (IBL) using the environment dome JPG
    // as a basic environment texture for PBR reflections.
    // The EXR would be ideal for HDR IBL, but BabylonJS handles equirectangular
    // EXR via specialized loaders. Using createDefaultEnvironment for reliable IBL.
    const envHelper = scene.createDefaultEnvironment({
      createGround: false,
      createSkybox: false,
    });

    scene.environmentIntensity = 1.0;

    return () => {
      if (envHelper) envHelper.dispose();
    };
  }, [scene]);

  useEffect(() => {
    if (shadowRef.current) {
        (window as any).MAIN_SHADOW_GENERATOR = shadowRef.current;
    }
    return () => { delete (window as any).MAIN_SHADOW_GENERATOR; }
  }, [shadowRef.current, light]);

  return (
    <>
      <directionalLight
        name="sunLight"
        direction={new Vector3(-1, -2, -1)}
        position={new Vector3(20, 40, 20)}
        intensity={1.5}
        ref={setLight}
      />
      {light && quality !== "low" && (
        <shadowGenerator
            light={light}
            mapSize={1024}
            useBlurExponentialShadowMap={true}
            blurKernel={32}
            transparencyShadow={true}
            ref={shadowRef}
        />
      )}
    </>
  );
};
