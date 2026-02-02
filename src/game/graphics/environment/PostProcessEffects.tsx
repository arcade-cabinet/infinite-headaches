import { useEffect } from "react";
import { useScene } from "reactylon";
import {
  DefaultRenderingPipeline,
  PostProcess,
} from "@babylonjs/core";
import { QualityLevel } from "../../../graphics";
import {
  createColorblindPostProcess,
  type ColorblindMode,
} from "../shaders/ColorblindFilter";

interface PostProcessEffectsProps {
  quality: QualityLevel;
  colorblindMode?: ColorblindMode;
}

export const PostProcessEffects = ({ quality, colorblindMode = "none" }: PostProcessEffectsProps) => {
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

    // 5. Tone Mapping
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.contrast = 1.2;
    pipeline.imageProcessing.exposure = 1.1;

    return () => pipeline.dispose();
  }, [scene, quality]);

  // Colorblind post-processing filter
  useEffect(() => {
    if (!scene || !scene.activeCamera || colorblindMode === "none") return;

    const postProcess = createColorblindPostProcess(scene, colorblindMode);
    return () => {
      postProcess?.dispose();
    };
  }, [scene, colorblindMode]);

  return null;
};
