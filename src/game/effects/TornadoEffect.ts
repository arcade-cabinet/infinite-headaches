/**
 * TornadoEffect.ts
 * Procedural 3D tornado/vortex effect using Babylon.js particle systems
 *
 * The tornado represents the "Headache" mechanic that grows closer as the game progresses.
 * It creates a swirling vortex with multiple particle layers:
 * - Main funnel particles spiraling upward
 * - Debris particles (leaves, dust)
 * - Wind streaks
 * - Glow effect at the base
 */

import {
  Scene,
  ParticleSystem,
  Texture,
  Vector3,
  Color4,
  Color3,
  MeshBuilder,
  Mesh,
  GlowLayer,
  PointLight,
} from "@babylonjs/core";

export interface TornadoConfig {
  /** Position of the tornado base in world space */
  position: Vector3;
  /** Base radius of the tornado funnel */
  baseRadius: number;
  /** Top radius of the tornado funnel */
  topRadius: number;
  /** Height of the tornado */
  height: number;
  /** Number of particles in main funnel */
  particleCount: number;
  /** Color palette for the tornado */
  colors: {
    primary: Color4;
    secondary: Color4;
    debris: Color4;
    glow: Color4;
  };
}

const DEFAULT_CONFIG: TornadoConfig = {
  position: new Vector3(0, 0, 50), // Background position
  baseRadius: 2,
  topRadius: 15,
  height: 40,
  particleCount: 2000,
  colors: {
    // Stormy purple/grey palette as per VISION.md
    primary: new Color4(0.4, 0.35, 0.5, 0.8),
    secondary: new Color4(0.3, 0.3, 0.4, 0.6),
    debris: new Color4(0.5, 0.4, 0.3, 0.9),
    glow: new Color4(0.6, 0.5, 0.7, 0.4),
  },
};

/**
 * Creates and manages a procedural tornado effect
 */
export class TornadoEffect {
  private scene: Scene;
  private config: TornadoConfig;

  // Particle systems
  private funnelParticles: ParticleSystem | null = null;
  private debrisParticles: ParticleSystem | null = null;
  private windStreaks: ParticleSystem | null = null;
  private baseGlow: ParticleSystem | null = null;
  private dustCloud: ParticleSystem | null = null;

  // Meshes
  private emitterMesh: Mesh | null = null;
  private baseEmitter: Mesh | null = null;

  // Lighting
  private glowLayer: GlowLayer | null = null;
  private tornadoLight: PointLight | null = null;

  // State
  private _intensity: number = 0.5;
  private _isActive: boolean = false;
  private rotationAngle: number = 0;

  constructor(scene: Scene, config: Partial<TornadoConfig> = {}) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the tornado effect
   */
  public initialize(): void {
    this.createEmitters();
    this.createFunnelParticles();
    this.createDebrisParticles();
    this.createWindStreaks();
    this.createBaseGlow();
    this.createDustCloud();
    this.createLighting();
    this.setupAnimations();

    this._isActive = true;
  }

  /**
   * Create emitter meshes for particle systems
   */
  private createEmitters(): void {
    // Main tornado funnel emitter (cone shape)
    this.emitterMesh = MeshBuilder.CreateCylinder(
      "tornadoEmitter",
      {
        height: this.config.height,
        diameterBottom: this.config.baseRadius * 2,
        diameterTop: this.config.topRadius * 2,
        tessellation: 32,
      },
      this.scene
    );
    this.emitterMesh.position = this.config.position.clone();
    this.emitterMesh.position.y += this.config.height / 2;
    this.emitterMesh.isVisible = false;

    // Base emitter for ground effects
    this.baseEmitter = MeshBuilder.CreateDisc(
      "tornadoBaseEmitter",
      { radius: this.config.baseRadius * 3 },
      this.scene
    );
    this.baseEmitter.position = this.config.position.clone();
    this.baseEmitter.rotation.x = Math.PI / 2;
    this.baseEmitter.isVisible = false;
  }

  /**
   * Create the main funnel particle system
   */
  private createFunnelParticles(): void {
    const capacity = this.config.particleCount;

    // Use CPU particle system for consistent API
    // GPU particles have a different interface and limited features
    const particles = new ParticleSystem("tornadoFunnel", capacity, this.scene);

    // Use procedural texture (circle)
    particles.particleTexture = this.createCircleTexture();

    // Emitter configuration
    particles.emitter = this.config.position.clone();
    particles.minEmitBox = new Vector3(-this.config.baseRadius, 0, -this.config.baseRadius);
    particles.maxEmitBox = new Vector3(this.config.baseRadius, this.config.height * 0.1, this.config.baseRadius);

    // Particle colors
    particles.color1 = this.config.colors.primary;
    particles.color2 = this.config.colors.secondary;
    particles.colorDead = new Color4(0.2, 0.2, 0.3, 0);

    // Particle sizes
    particles.minSize = 0.3;
    particles.maxSize = 1.2;
    particles.minScaleX = 0.5;
    particles.maxScaleX = 2.0;

    // Particle lifetime
    particles.minLifeTime = 2.0;
    particles.maxLifeTime = 4.0;

    // Emission rate
    particles.emitRate = capacity / 3;

    // Blend mode for soft particles
    particles.blendMode = ParticleSystem.BLENDMODE_STANDARD;

    // Gravity (slight upward pull)
    particles.gravity = new Vector3(0, 2, 0);

    // Initial velocity - upward spiral
    particles.direction1 = new Vector3(-2, 8, -2);
    particles.direction2 = new Vector3(2, 12, 2);

    // Angular speed for spiral effect
    particles.minAngularSpeed = 0.5;
    particles.maxAngularSpeed = 2.0;

    // Custom update function for spiral motion
    particles.updateFunction = (particles) => {
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];

        // Calculate spiral position based on age
        const age = particle.age / particle.lifeTime;
        const heightProgress = age;
        const currentHeight = heightProgress * this.config.height;

        // Expanding radius as particle rises
        const radiusProgress = this.config.baseRadius +
          (this.config.topRadius - this.config.baseRadius) * heightProgress;

        // Spiral motion
        const angle = this.rotationAngle + particle.age * 3 + (i * 0.1);
        const spiralX = Math.cos(angle) * radiusProgress * (0.3 + age * 0.7);
        const spiralZ = Math.sin(angle) * radiusProgress * (0.3 + age * 0.7);

        // Apply spiral offset
        particle.position.x = this.config.position.x + spiralX;
        particle.position.z = this.config.position.z + spiralZ;

        // Size increases then decreases
        const sizeCurve = Math.sin(age * Math.PI);
        particle.size = particle.size * (0.5 + sizeCurve * 0.5);
      }
    };

    this.funnelParticles = particles;
  }

  /**
   * Create debris particles (leaves, dust fragments)
   */
  private createDebrisParticles(): void {
    const particles = new ParticleSystem("tornadoDebris", 300, this.scene);

    particles.particleTexture = this.createDebrisTexture();

    particles.emitter = this.config.position.clone();
    particles.minEmitBox = new Vector3(-this.config.baseRadius * 2, 0, -this.config.baseRadius * 2);
    particles.maxEmitBox = new Vector3(this.config.baseRadius * 2, this.config.height * 0.5, this.config.baseRadius * 2);

    // Earth tones for debris
    particles.color1 = this.config.colors.debris;
    particles.color2 = new Color4(0.4, 0.3, 0.2, 0.8);
    particles.colorDead = new Color4(0.3, 0.2, 0.1, 0);

    particles.minSize = 0.2;
    particles.maxSize = 0.8;

    particles.minLifeTime = 1.5;
    particles.maxLifeTime = 3.5;

    particles.emitRate = 50;

    particles.gravity = new Vector3(0, 1, 0);

    particles.direction1 = new Vector3(-3, 5, -3);
    particles.direction2 = new Vector3(3, 10, 3);

    // More chaotic rotation for debris
    particles.minAngularSpeed = 2;
    particles.maxAngularSpeed = 6;

    // Add rotation on particle creation
    particles.minInitialRotation = 0;
    particles.maxInitialRotation = Math.PI * 2;

    this.debrisParticles = particles;
  }

  /**
   * Create wind streak particles
   */
  private createWindStreaks(): void {
    const particles = new ParticleSystem("tornadoWindStreaks", 200, this.scene);

    particles.particleTexture = this.createStreakTexture();

    particles.emitter = this.config.position.clone();
    particles.minEmitBox = new Vector3(-this.config.topRadius, this.config.height * 0.3, -this.config.topRadius);
    particles.maxEmitBox = new Vector3(this.config.topRadius, this.config.height, this.config.topRadius);

    // Semi-transparent white/grey for wind
    particles.color1 = new Color4(0.8, 0.8, 0.9, 0.3);
    particles.color2 = new Color4(0.6, 0.6, 0.7, 0.2);
    particles.colorDead = new Color4(0.5, 0.5, 0.6, 0);

    // Elongated particles for streaks
    particles.minSize = 0.1;
    particles.maxSize = 0.3;
    particles.minScaleX = 3;
    particles.maxScaleX = 8;

    particles.minLifeTime = 0.5;
    particles.maxLifeTime = 1.5;

    particles.emitRate = 80;

    particles.blendMode = ParticleSystem.BLENDMODE_ADD;

    // Fast horizontal movement
    particles.direction1 = new Vector3(-15, 2, -15);
    particles.direction2 = new Vector3(15, 5, 15);

    particles.minAngularSpeed = 0;
    particles.maxAngularSpeed = 0.5;

    // Billboard mode for proper streak orientation
    particles.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED;

    this.windStreaks = particles;
  }

  /**
   * Create base glow effect
   */
  private createBaseGlow(): void {
    const particles = new ParticleSystem("tornadoBaseGlow", 100, this.scene);

    particles.particleTexture = this.createGlowTexture();

    particles.emitter = this.baseEmitter!;

    // Ethereal purple glow
    particles.color1 = this.config.colors.glow;
    particles.color2 = new Color4(0.5, 0.4, 0.6, 0.3);
    particles.colorDead = new Color4(0.4, 0.3, 0.5, 0);

    particles.minSize = 2;
    particles.maxSize = 5;

    particles.minLifeTime = 1;
    particles.maxLifeTime = 2;

    particles.emitRate = 30;

    particles.blendMode = ParticleSystem.BLENDMODE_ADD;

    particles.gravity = new Vector3(0, 0.5, 0);

    particles.direction1 = new Vector3(-0.5, 0.5, -0.5);
    particles.direction2 = new Vector3(0.5, 1.5, 0.5);

    this.baseGlow = particles;
  }

  /**
   * Create dust cloud at the base
   */
  private createDustCloud(): void {
    const particles = new ParticleSystem("tornadoDust", 150, this.scene);

    particles.particleTexture = this.createSmokeTexture();

    particles.emitter = this.config.position.clone();
    particles.minEmitBox = new Vector3(-this.config.baseRadius * 4, 0, -this.config.baseRadius * 4);
    particles.maxEmitBox = new Vector3(this.config.baseRadius * 4, 2, this.config.baseRadius * 4);

    // Brown/tan dust colors
    particles.color1 = new Color4(0.5, 0.45, 0.35, 0.4);
    particles.color2 = new Color4(0.4, 0.35, 0.25, 0.3);
    particles.colorDead = new Color4(0.3, 0.25, 0.2, 0);

    particles.minSize = 3;
    particles.maxSize = 8;

    particles.minLifeTime = 2;
    particles.maxLifeTime = 4;

    particles.emitRate = 25;

    particles.blendMode = ParticleSystem.BLENDMODE_STANDARD;

    // Swirling outward motion
    particles.direction1 = new Vector3(-3, 0.2, -3);
    particles.direction2 = new Vector3(3, 1, 3);

    particles.minAngularSpeed = 0.1;
    particles.maxAngularSpeed = 0.5;

    this.dustCloud = particles;
  }

  /**
   * Create lighting effects for the tornado
   */
  private createLighting(): void {
    // Glow layer for additive particles
    this.glowLayer = new GlowLayer("tornadoGlow", this.scene, {
      blurKernelSize: 32,
    });
    this.glowLayer.intensity = 0.5;

    // Point light at tornado base for dramatic effect
    this.tornadoLight = new PointLight(
      "tornadoLight",
      this.config.position.clone(),
      this.scene
    );
    this.tornadoLight.diffuse = new Color3(0.5, 0.4, 0.6);
    this.tornadoLight.specular = new Color3(0.3, 0.2, 0.4);
    this.tornadoLight.intensity = 0.3;
    this.tornadoLight.range = this.config.height * 2;
  }

  /**
   * Setup rotation animations
   */
  private setupAnimations(): void {
    // Register before render to update rotation
    this.scene.registerBeforeRender(() => {
      if (!this._isActive) return;

      // Update rotation angle based on intensity
      const rotationSpeed = 0.02 + this._intensity * 0.03;
      this.rotationAngle += rotationSpeed;

      // Update particle system positions based on intensity
      this.updateIntensityEffects();
    });
  }

  /**
   * Update effects based on current intensity
   */
  private updateIntensityEffects(): void {
    if (this.funnelParticles) {
      this.funnelParticles.emitRate = (this.config.particleCount / 3) * this._intensity;
      this.funnelParticles.minSize = 0.3 * (0.5 + this._intensity * 0.5);
      this.funnelParticles.maxSize = 1.2 * (0.5 + this._intensity * 0.5);
    }

    if (this.debrisParticles) {
      this.debrisParticles.emitRate = 50 * this._intensity;
    }

    if (this.windStreaks) {
      this.windStreaks.emitRate = 80 * this._intensity;
    }

    if (this.baseGlow) {
      this.baseGlow.emitRate = 30 * this._intensity;
    }

    if (this.dustCloud) {
      this.dustCloud.emitRate = 25 * this._intensity;
    }

    if (this.tornadoLight) {
      this.tornadoLight.intensity = 0.3 * this._intensity;
    }

    if (this.glowLayer) {
      this.glowLayer.intensity = 0.5 * this._intensity;
    }
  }

  /**
   * Create a circular particle texture
   */
  private createCircleTexture(): Texture {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Radial gradient for soft circle
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.5)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new Texture(canvas.toDataURL(), this.scene);
    texture.hasAlpha = true;
    return texture;
  }

  /**
   * Create a debris/leaf particle texture
   */
  private createDebrisTexture(): Texture {
    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Simple leaf shape
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.ellipse(size / 2, size / 2, size / 3, size / 6, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    const texture = new Texture(canvas.toDataURL(), this.scene);
    texture.hasAlpha = true;
    return texture;
  }

  /**
   * Create a streak particle texture
   */
  private createStreakTexture(): Texture {
    const width = 64;
    const height = 8;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // Horizontal gradient for streak
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
    gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.8)");
    gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.8)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const texture = new Texture(canvas.toDataURL(), this.scene);
    texture.hasAlpha = true;
    return texture;
  }

  /**
   * Create a glow particle texture
   */
  private createGlowTexture(): Texture {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Soft radial gradient
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.4)");
    gradient.addColorStop(0.6, "rgba(255, 255, 255, 0.1)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new Texture(canvas.toDataURL(), this.scene);
    texture.hasAlpha = true;
    return texture;
  }

  /**
   * Create a smoke particle texture
   */
  private createSmokeTexture(): Texture {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Soft, irregular smoke shape
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.6)");
    gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.3)");
    gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.1)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    const texture = new Texture(canvas.toDataURL(), this.scene);
    texture.hasAlpha = true;
    return texture;
  }

  /**
   * Start all particle systems
   */
  public start(): void {
    this.funnelParticles?.start();
    this.debrisParticles?.start();
    this.windStreaks?.start();
    this.baseGlow?.start();
    this.dustCloud?.start();
    this._isActive = true;
  }

  /**
   * Stop all particle systems
   */
  public stop(): void {
    this.funnelParticles?.stop();
    this.debrisParticles?.stop();
    this.windStreaks?.stop();
    this.baseGlow?.stop();
    this.dustCloud?.stop();
    this._isActive = false;
  }

  /**
   * Get current intensity (0-1)
   */
  public get intensity(): number {
    return this._intensity;
  }

  /**
   * Set tornado intensity (0-1 scale)
   * Controls particle density, speed, and visual effects
   */
  public set intensity(value: number) {
    this._intensity = Math.max(0, Math.min(1, value));
    this.updateIntensityEffects();
  }

  /**
   * Check if tornado is active
   */
  public get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Set tornado position
   */
  public setPosition(position: Vector3): void {
    this.config.position = position.clone();

    if (this.emitterMesh) {
      this.emitterMesh.position = position.clone();
      this.emitterMesh.position.y += this.config.height / 2;
    }

    if (this.baseEmitter) {
      this.baseEmitter.position = position.clone();
    }

    if (this.funnelParticles) {
      this.funnelParticles.emitter = position.clone();
    }

    if (this.debrisParticles) {
      this.debrisParticles.emitter = position.clone();
    }

    if (this.dustCloud) {
      this.dustCloud.emitter = position.clone();
    }

    if (this.tornadoLight) {
      this.tornadoLight.position = position.clone();
    }
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.stop();

    this.funnelParticles?.dispose();
    this.debrisParticles?.dispose();
    this.windStreaks?.dispose();
    this.baseGlow?.dispose();
    this.dustCloud?.dispose();

    this.emitterMesh?.dispose();
    this.baseEmitter?.dispose();

    this.glowLayer?.dispose();
    this.tornadoLight?.dispose();

    this.funnelParticles = null;
    this.debrisParticles = null;
    this.windStreaks = null;
    this.baseGlow = null;
    this.dustCloud = null;
    this.emitterMesh = null;
    this.baseEmitter = null;
    this.glowLayer = null;
    this.tornadoLight = null;
  }
}

/**
 * Factory function to create and initialize a tornado effect
 * @param scene - The Babylon.js scene
 * @param config - Optional configuration overrides
 * @returns Initialized TornadoEffect instance
 */
export function createTornadoEffect(
  scene: Scene,
  config: Partial<TornadoConfig> = {}
): TornadoEffect {
  const tornado = new TornadoEffect(scene, config);
  tornado.initialize();
  tornado.start();
  return tornado;
}

/**
 * Control function to adjust tornado intensity
 * Useful for game director AI to modulate threat level
 * @param tornado - The tornado effect instance
 * @param intensity - Value between 0 (calm) and 1 (maximum chaos)
 */
export function setTornadoIntensity(tornado: TornadoEffect, intensity: number): void {
  tornado.intensity = intensity;
}

/**
 * Storm atmosphere colors for scene lighting
 * Use these to update scene lighting as tornado approaches
 */
export const STORM_COLORS = {
  /** Calm sky (intensity 0-0.3) */
  calm: {
    ambient: new Color3(0.6, 0.65, 0.7),
    directional: new Color3(0.9, 0.85, 0.8),
    fog: new Color4(0.7, 0.75, 0.8, 1),
  },
  /** Approaching storm (intensity 0.3-0.6) */
  approaching: {
    ambient: new Color3(0.45, 0.45, 0.5),
    directional: new Color3(0.6, 0.55, 0.5),
    fog: new Color4(0.5, 0.5, 0.55, 1),
  },
  /** Full storm (intensity 0.6-1.0) */
  storm: {
    ambient: new Color3(0.3, 0.28, 0.35),
    directional: new Color3(0.4, 0.35, 0.4),
    fog: new Color4(0.35, 0.32, 0.4, 1),
  },
};

/**
 * Get interpolated storm colors based on intensity
 * @param intensity - Tornado intensity (0-1)
 * @returns Interpolated color set
 */
export function getStormColors(intensity: number): typeof STORM_COLORS.calm {
  const t = Math.max(0, Math.min(1, intensity));

  if (t < 0.3) {
    return STORM_COLORS.calm;
  } else if (t < 0.6) {
    // Interpolate between calm and approaching
    const localT = (t - 0.3) / 0.3;
    return {
      ambient: Color3.Lerp(STORM_COLORS.calm.ambient, STORM_COLORS.approaching.ambient, localT),
      directional: Color3.Lerp(STORM_COLORS.calm.directional, STORM_COLORS.approaching.directional, localT),
      fog: Color4.Lerp(STORM_COLORS.calm.fog, STORM_COLORS.approaching.fog, localT),
    };
  } else {
    // Interpolate between approaching and storm
    const localT = (t - 0.6) / 0.4;
    return {
      ambient: Color3.Lerp(STORM_COLORS.approaching.ambient, STORM_COLORS.storm.ambient, localT),
      directional: Color3.Lerp(STORM_COLORS.approaching.directional, STORM_COLORS.storm.directional, localT),
      fog: Color4.Lerp(STORM_COLORS.approaching.fog, STORM_COLORS.storm.fog, localT),
    };
  }
}
