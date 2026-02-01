import { useEffect } from "react";
import { useScene } from "reactylon";
import { 
  DefaultRenderingPipeline,  DepthOfFieldEffectBlurLevel } from "@babylonjs/core";
import { QualityLevel } from "../../../graphics";

export const PostProcessEffects = ({ quality }: { quality: QualityLevel }) => {
  const scene = useScene();

  useEffect(() => {
    if (!scene || !scene.activeCamera) return;

    const pipeline = new DefaultRenderingPipeline("pipeline", true, scene, [scene.activeCamera]);
    
    // 1. Sharpness: Enable MSAA (Multi-Sample Anti-Aliasing)
    // This is much sharper than FXAA and removes jagged edges without blurring.
    pipeline.samples = quality === "high" ? 4 : 2;
    
    // 2. Sharpen Effect: Makes diorama details pop
    pipeline.sharpenEnabled = true;
    pipeline.sharpen.edgeAmount = 0.3;
    pipeline.sharpen.colorAmount = 1.0;

    // 3. Disable Depth of Field - It was likely causing the "blurry" look the user mentioned.
    pipeline.depthOfFieldEnabled = false;

    // 4. Subtle Bloom - Adds "Morning Sky" glow without losing detail
    pipeline.bloomEnabled = quality !== "low";
    pipeline.bloomThreshold = 0.8;
    pipeline.bloomWeight = 0.15;
    pipeline.bloomScale = 0.5;

    // 4. Tone Mapping
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.contrast = 1.2;
    pipeline.imageProcessing.exposure = 1.1;

    return () => pipeline.dispose();
  }, [scene, quality]);

  return null;
};
