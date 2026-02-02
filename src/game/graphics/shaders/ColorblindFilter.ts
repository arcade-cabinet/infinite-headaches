/**
 * Colorblind Post-Processing Filter
 * Uses Machado 2009 simulation matrices for protanopia/deuteranopia/tritanopia.
 * Applies as a BabylonJS PostProcess on the scene camera.
 */

import {
  Scene,
  PostProcess,
  Effect,
  Camera,
} from "@babylonjs/core";

export type ColorblindMode = "none" | "protanopia" | "deuteranopia" | "tritanopia";

/**
 * Machado 2009 colorblind simulation matrices (severity = 1.0).
 * Each is a 3x3 column-major matrix stored as Float32Array.
 */
export const COLORBLIND_MATRICES: Record<Exclude<ColorblindMode, "none">, Float32Array> = {
  protanopia: new Float32Array([
    0.152286, 0.114503, -0.003882,
    1.052583, 0.786281, -0.048116,
    -0.204868, 0.099216, 1.051998,
  ]),
  deuteranopia: new Float32Array([
    0.367322, 0.280085, -0.011820,
    0.860646, 0.672501, 0.042940,
    -0.227968, 0.047413, 0.968881,
  ]),
  tritanopia: new Float32Array([
    1.255528, -0.078411, 0.004733,
    -0.076749, 0.930809, 0.691367,
    -0.178779, 0.147602, 0.303900,
  ]),
};

const COLORBLIND_SHADER_NAME = "colorblindFilter";

// Register the shader with BabylonJS Effect store once
const fragmentSource = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform mat3 colorMatrix;

  void main(void) {
    vec4 c = texture2D(textureSampler, vUV);
    gl_FragColor = vec4(colorMatrix * c.rgb, c.a);
  }
`;

let shaderRegistered = false;

function ensureShaderRegistered(): void {
  if (shaderRegistered) return;
  Effect.ShadersStore[`${COLORBLIND_SHADER_NAME}FragmentShader`] = fragmentSource;
  shaderRegistered = true;
}

/**
 * Creates a BabylonJS PostProcess that applies a colorblind simulation matrix.
 * Returns null if mode is "none".
 */
export function createColorblindPostProcess(
  scene: Scene,
  mode: ColorblindMode,
  camera?: Camera,
): PostProcess | null {
  if (mode === "none") return null;

  ensureShaderRegistered();

  const matrix = COLORBLIND_MATRICES[mode];
  const targetCamera = camera ?? scene.activeCamera;
  if (!targetCamera) return null;

  const postProcess = new PostProcess(
    "colorblindPostProcess",
    COLORBLIND_SHADER_NAME,
    ["colorMatrix"],
    null,
    1.0,
    targetCamera,
  );

  postProcess.onApply = (effect) => {
    effect.setMatrix3x3("colorMatrix", matrix);
  };

  return postProcess;
}
