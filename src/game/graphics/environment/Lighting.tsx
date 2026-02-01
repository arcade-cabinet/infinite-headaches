import { useEffect } from "react";
import { useScene } from "react-babylonjs";
import { 
  Vector3, 
  DirectionalLight,
  EXRCubeTexture,
  ShadowGenerator
} from "@babylonjs/core";
import { QualityLevel } from "../../../graphics";

export const Lighting = ({ quality }: { quality: QualityLevel }) => {
  const scene = useScene();

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
      undefined, // onLoad
      undefined, // onError
      true   // prefilterOnLoad
    );
    
    scene.environmentTexture = envTexture;
    scene.environmentIntensity = 1.0;

    // 2. Sun Light - Directional
    const dirLight = new DirectionalLight("sunLight", new Vector3(-1, -2, -1), scene);
    dirLight.position = new Vector3(20, 40, 20);
    dirLight.intensity = 1.5; 
    
    // 3. Shadows
    let shadowGenerator: ShadowGenerator | null = null;
    if (quality !== "low") {
      shadowGenerator = new ShadowGenerator(1024, dirLight);
      shadowGenerator.useBlurExponentialShadowMap = true;
      shadowGenerator.blurKernel = 32;
      shadowGenerator.transparencyShadow = true;
      
      // We'll need to add meshes to this generator in EntityRenderer
      (window as any).MAIN_SHADOW_GENERATOR = shadowGenerator;
    }

    return () => {
      scene.environmentTexture = null;
      envTexture.dispose();
      dirLight.dispose();
      if (shadowGenerator) shadowGenerator.dispose();
      delete (window as any).MAIN_SHADOW_GENERATOR;
    };
  }, [scene, quality]);

  return null;
};