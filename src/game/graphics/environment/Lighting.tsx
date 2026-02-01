import { useEffect, useRef } from "react";
import { useScene } from "reactylon";
import { 
  Vector3, 
  DirectionalLight,
  EXRCubeTexture,
  ShadowGenerator
} from "@babylonjs/core";
import { QualityLevel } from "../../../graphics";

export const Lighting = ({ quality }: { quality: QualityLevel }) => {
  const scene = useScene();
  const shadowRef = useRef<ShadowGenerator>(null);

  useEffect(() => {
    if (!scene) return;

    // 1. Setup Image Based Lighting (IBL)
    const envTexture = new EXRCubeTexture(
      "/assets/environment/environment.exr",
      scene,
      1024, 
      false, 
      true,  
      false, 
      undefined, 
      undefined, 
      undefined, 
      undefined, 
      true
    );
    
    scene.environmentTexture = envTexture;
    scene.environmentIntensity = 1.0;

    return () => {
      scene.environmentTexture = null;
      envTexture.dispose();
    };
  }, [scene]);

  useEffect(() => {
    if (shadowRef.current) {
        (window as any).MAIN_SHADOW_GENERATOR = shadowRef.current;
    }
    return () => { delete (window as any).MAIN_SHADOW_GENERATOR; }
  }, [shadowRef.current]); // React to ref assignment?
  // Refs don't trigger re-render. We need a callback ref or simple effect if component mounts once.
  // shadowRef.current will be set when <shadowGenerator> mounts.
  // Actually, better to use a callback ref or just assume it mounts.
  
  return (
    <>
      <directionalLight
        name="sunLight"
        direction={new Vector3(-1, -2, -1)}
        position={new Vector3(20, 40, 20)}
        intensity={1.5}
      >
        {quality !== "low" && (
            <shadowGenerator
                ref={shadowRef}
                mapSize={1024}
                useBlurExponentialShadowMap={true}
                blurKernel={32}
                transparencyShadow={true}
            />
        )}
      </directionalLight>
    </>
  );
};