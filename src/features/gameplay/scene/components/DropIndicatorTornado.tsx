/**
 * DropIndicatorTornado - Cartoon tornado indicator at the top of the game board.
 *
 * Shows where the next animal drop will come from. Patrols left-right at the top
 * of the board and accelerates toward the drop position when a spawn is imminent.
 *
 * Visual: twisted ribbon funnel with spiral bands and storm-colored particle debris.
 * Uses procedural CreateRibbon mesh + BabylonJS ParticleSystem.
 */

import { useEffect, useRef } from "react";
import { useScene } from "reactylon";
import {
  ParticleSystem,
  Texture,
  Vector3,
  Color4,
  MeshBuilder,
  Mesh,
  Scene,
  StandardMaterial,
  Color3,
  TransformNode,
} from "@babylonjs/core";

export interface DropIndicatorTornadoProps {
  /** Target X from DropController.getNextDropX() -- read per-frame. */
  getTargetX: () => number;
  /** Difficulty (0-1) for intensity scaling -- read per-frame. */
  getIntensity: () => number;
  /** True when spawn timer is close -- read per-frame. */
  getIsDropImminent: () => boolean;
  /** Only render during gameplay. */
  visible: boolean;
}

// ---------------------------------------------------------------------------
// Procedural mesh builders
// ---------------------------------------------------------------------------

/**
 * Creates a twisted funnel mesh using CreateRibbon.
 * Paths spiral from the wide bottom to the narrow top, producing a tornado shape.
 */
function createTornadoFunnel(scene: Scene): Mesh {
  const RINGS = 28;
  const POINTS_PER_RING = 18;
  const HEIGHT = 3.5;
  const CLOUD_RADIUS = 1.1;  // Wide end at top (cloud base)
  const TIP_RADIUS = 0.1;    // Narrow end at bottom (tornado tip)
  const TWIST = Math.PI * 5; // 2.5 full twists

  const paths: Vector3[][] = [];

  for (let i = 0; i <= POINTS_PER_RING; i++) {
    const path: Vector3[] = [];
    const baseAngle = (i / POINTS_PER_RING) * Math.PI * 2;

    for (let j = 0; j <= RINGS; j++) {
      const t = j / RINGS; // 0 = bottom (tip), 1 = top (cloud)
      const y = t * HEIGHT;

      // Funnel radius: narrow tip at bottom, wide cloud base at top
      const radius = TIP_RADIUS * Math.pow(1 - t, 0.6) + CLOUD_RADIUS * Math.pow(t, 0.6);

      // Twist increases from bottom to top
      const twist = baseAngle + t * TWIST;

      // Organic wobble: slight bulges along the funnel
      const wobble = 1 + Math.sin(t * Math.PI * 8) * 0.05 + Math.sin(t * Math.PI * 3) * 0.03;

      const r = radius * wobble;
      path.push(new Vector3(r * Math.cos(twist), y, r * Math.sin(twist)));
    }

    paths.push(path);
  }

  const mesh = MeshBuilder.CreateRibbon(
    "tornadoFunnel",
    {
      pathArray: paths,
      closeArray: true,
      closePath: false,
      sideOrientation: Mesh.DOUBLESIDE,
    },
    scene,
  );
  mesh.isPickable = false;
  return mesh;
}

/**
 * Creates a dark spiral band that wraps around the funnel.
 * Classic cartoon tornado look: visible dark streaks spiraling upward.
 */
function createSpiralBand(scene: Scene, index: number, totalBands: number): Mesh {
  const SEGMENTS = 50;
  const HEIGHT = 3.5;
  const CLOUD_RADIUS = 1.15;  // Wide at top (cloud base)
  const TIP_RADIUS = 0.13;    // Narrow at bottom (tip)
  const TWIST = Math.PI * 5;
  const BAND_WIDTH = 0.08;

  const bandOffset = (index / totalBands) * Math.PI * 2;

  const innerPath: Vector3[] = [];
  const outerPath: Vector3[] = [];

  for (let j = 0; j <= SEGMENTS; j++) {
    const t = j / SEGMENTS;
    const y = t * HEIGHT;
    const radius = TIP_RADIUS * Math.pow(1 - t, 0.6) + CLOUD_RADIUS * Math.pow(t, 0.6);
    const angle = bandOffset + t * TWIST;

    const r = radius;
    innerPath.push(new Vector3(r * Math.cos(angle), y, r * Math.sin(angle)));
    outerPath.push(
      new Vector3((r + BAND_WIDTH) * Math.cos(angle), y, (r + BAND_WIDTH) * Math.sin(angle)),
    );
  }

  const mesh = MeshBuilder.CreateRibbon(
    "tornadoBand" + index,
    {
      pathArray: [innerPath, outerPath],
      sideOrientation: Mesh.DOUBLESIDE,
    },
    scene,
  );
  mesh.isPickable = false;
  return mesh;
}

// ---------------------------------------------------------------------------
// Procedural texture generators
// ---------------------------------------------------------------------------

function createDebrisTexture(scene: Scene): Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(90, 80, 65, 0.9)");
  gradient.addColorStop(0.5, "rgba(110, 95, 75, 0.5)");
  gradient.addColorStop(1, "rgba(130, 110, 85, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new Texture(canvas.toDataURL(), scene);
  texture.hasAlpha = true;
  return texture;
}

function createStrawTexture(scene: Scene): Texture {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(180, 155, 100, 1.0)");
  gradient.addColorStop(0.3, "rgba(160, 135, 80, 0.6)");
  gradient.addColorStop(1, "rgba(140, 115, 60, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new Texture(canvas.toDataURL(), scene);
  texture.hasAlpha = true;
  return texture;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DropIndicatorTornado = ({
  getTargetX,
  getIntensity,
  getIsDropImminent,
  visible,
}: DropIndicatorTornadoProps) => {
  const scene = useScene();
  const rootRef = useRef<TransformNode | null>(null);
  const emitterRef = useRef<Mesh | null>(null);
  const funnelRef = useRef<Mesh | null>(null);
  const bandsRef = useRef<Mesh[]>([]);
  const debrisRef = useRef<ParticleSystem | null>(null);
  const strawRef = useRef<ParticleSystem | null>(null);
  const animObserverRef = useRef<any>(null);
  const funnelMatRef = useRef<StandardMaterial | null>(null);
  const bandMatRef = useRef<StandardMaterial | null>(null);

  useEffect(() => {
    if (!scene) return;

    // Root transform — all tornado parts are children of this
    const root = new TransformNode("tornadoRoot", scene);
    root.position = new Vector3(0, 8.25, -0.1);
    rootRef.current = root;

    // Emitter mesh (invisible, used for particle origin at funnel mouth)
    const emitter = MeshBuilder.CreateBox("dropIndicatorEmitter", { size: 0.01 }, scene);
    emitter.position = new Vector3(0, -0.25, 0); // Relative to root (bottom of funnel)
    emitter.isVisible = false;
    emitter.isPickable = false;
    emitter.parent = root;
    emitterRef.current = emitter;

    // --- Twisted funnel mesh ---
    const funnel = createTornadoFunnel(scene);
    funnel.parent = root;

    const funnelMat = new StandardMaterial("tornadoFunnelMat", scene);
    funnelMat.diffuseColor = new Color3(0.35, 0.30, 0.24);
    funnelMat.emissiveColor = new Color3(0.10, 0.08, 0.06);
    funnelMat.alpha = 0.55;
    funnelMat.backFaceCulling = false;
    funnelMat.disableLighting = true;
    funnel.material = funnelMat;
    funnelRef.current = funnel;
    funnelMatRef.current = funnelMat;

    // --- Dark spiral bands ---
    const bandMat = new StandardMaterial("tornadoBandMat", scene);
    bandMat.diffuseColor = new Color3(0.18, 0.15, 0.12);
    bandMat.emissiveColor = new Color3(0.06, 0.05, 0.04);
    bandMat.alpha = 0.7;
    bandMat.backFaceCulling = false;
    bandMat.disableLighting = true;
    bandMatRef.current = bandMat;

    const bands: Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const band = createSpiralBand(scene, i, 3);
      band.parent = root;
      band.material = bandMat;
      bands.push(band);
    }
    bandsRef.current = bands;

    // --- Debris particles (storm colored, spiral) ---
    const debris = new ParticleSystem("tornadoDebris", 150, scene);
    debris.particleTexture = createDebrisTexture(scene);
    debris.emitter = emitter;

    debris.minEmitBox = new Vector3(-0.8, -0.5, -0.2);
    debris.maxEmitBox = new Vector3(0.8, 1.5, 0.2);

    // Spiral outward with slight upward pull
    debris.direction1 = new Vector3(-0.8, -0.3, -0.3);
    debris.direction2 = new Vector3(0.8, 1.8, 0.3);
    debris.gravity = new Vector3(0, -0.25, 0);

    debris.minSize = 0.15;
    debris.maxSize = 0.45;
    debris.minLifeTime = 0.3;
    debris.maxLifeTime = 0.8;
    debris.emitRate = 80;

    debris.color1 = new Color4(0.4, 0.35, 0.3, 0.7);
    debris.color2 = new Color4(0.5, 0.45, 0.35, 0.5);
    debris.colorDead = new Color4(0.3, 0.25, 0.2, 0);

    debris.minAngularSpeed = -4;
    debris.maxAngularSpeed = 4;
    debris.minEmitPower = 0.6;
    debris.maxEmitPower = 1.8;
    debris.updateSpeed = 0.01;
    debris.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    debrisRef.current = debris;

    // --- Straw/hay bits (lighter debris ring around mouth) ---
    const straw = new ParticleSystem("tornadoStraw", 50, scene);
    straw.particleTexture = createStrawTexture(scene);
    straw.emitter = emitter;

    straw.minEmitBox = new Vector3(-0.7, -0.4, -0.1);
    straw.maxEmitBox = new Vector3(0.7, 0.4, 0.1);
    straw.direction1 = new Vector3(-1.2, 0.2, 0);
    straw.direction2 = new Vector3(1.2, 1.0, 0);
    straw.gravity = new Vector3(0, -0.6, 0);

    straw.minSize = 0.06;
    straw.maxSize = 0.18;
    straw.minLifeTime = 0.2;
    straw.maxLifeTime = 0.6;
    straw.emitRate = 25;

    straw.color1 = new Color4(0.7, 0.6, 0.4, 0.8);
    straw.color2 = new Color4(0.6, 0.5, 0.3, 0.6);
    straw.colorDead = new Color4(0.5, 0.4, 0.2, 0);

    straw.minAngularSpeed = -6;
    straw.maxAngularSpeed = 6;
    straw.minEmitPower = 0.5;
    straw.maxEmitPower = 1.4;
    straw.updateSpeed = 0.01;
    straw.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    strawRef.current = straw;

    // --- Per-frame animation ---
    const observer = scene.onBeforeRenderObservable.add(() => {
      if (!root || root.isDisposed()) return;

      const targetX = getTargetX();
      const intensity = getIntensity();
      const imminent = getIsDropImminent();
      const time = performance.now() / 1000;

      // Position: smooth follow targetX with organic wobble
      const wobbleY = Math.sin(time * 3) * 0.08;
      const wobbleX = Math.sin(time * 5) * 0.05;
      root.position.x = targetX + wobbleX;
      root.position.y = 8.25 + wobbleY;

      // Spin the entire tornado: the twisted geometry rotates,
      // making it look like a spinning vortex
      const spinSpeed = imminent ? 6 : 2.5;
      root.rotation.y += spinSpeed * 0.016;

      // Slight sway (lean left/right) for organic motion
      root.rotation.z = Math.sin(time * 1.5) * 0.06;

      // Scale: grow when imminent
      const scaleFactor = imminent ? 1.2 : 1.0;
      root.scaling.setAll(scaleFactor);

      // Funnel opacity: pulse when imminent
      try {
        funnelMat.alpha = imminent ? 0.55 + Math.sin(time * 8) * 0.12 : 0.55;
        bandMat.alpha = imminent ? 0.8 : 0.65;
      } catch { /* disposed */ }

      // Scale emit rate and speed with intensity
      const baseEmitRate = 60 + intensity * 90;
      const strawRate = 15 + intensity * 35;
      const speedBoost = 1 + intensity * 0.8;
      const imminentFactor = imminent ? 1.6 : 1.0;

      if (debris && !debris.isDisposed) {
        debris.emitRate = baseEmitRate * imminentFactor;
        debris.minEmitPower = 0.6 * speedBoost * imminentFactor;
        debris.maxEmitPower = 1.8 * speedBoost * imminentFactor;
        debris.minAngularSpeed = -4 * speedBoost;
        debris.maxAngularSpeed = 4 * speedBoost;
      }

      if (straw && !straw.isDisposed) {
        straw.emitRate = strawRate * imminentFactor;
        straw.minEmitPower = 0.5 * speedBoost * imminentFactor;
        straw.maxEmitPower = 1.4 * speedBoost * imminentFactor;
        // When imminent, straw blasts downward (disgorging)
        if (imminent) {
          straw.direction1 = new Vector3(-1.5, -0.6, 0);
          straw.direction2 = new Vector3(1.5, 0.3, 0);
        } else {
          straw.direction1 = new Vector3(-1.2, 0.2, 0);
          straw.direction2 = new Vector3(1.2, 1.0, 0);
        }
      }
    });
    animObserverRef.current = observer;

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
      debris.dispose();
      straw.dispose();
      for (const b of bands) b.dispose();
      funnel.dispose();
      funnelMat.dispose();
      bandMat.dispose();
      emitter.dispose();
      root.dispose();
      rootRef.current = null;
      emitterRef.current = null;
      funnelRef.current = null;
      bandsRef.current = [];
      debrisRef.current = null;
      strawRef.current = null;
      funnelMatRef.current = null;
      bandMatRef.current = null;
      animObserverRef.current = null;
    };
  }, [scene]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start/stop particles + mesh visibility based on visible prop
  useEffect(() => {
    const debris = debrisRef.current;
    const straw = strawRef.current;
    const root = rootRef.current;

    if (!debris || !straw || !root) return;

    if (visible) {
      debris.start();
      straw.start();
      root.setEnabled(true);
    } else {
      debris.stop();
      straw.stop();
      root.setEnabled(false);
    }
  }, [visible]);

  return null;
};
