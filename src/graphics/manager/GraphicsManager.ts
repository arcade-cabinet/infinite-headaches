/**
 * Graphics Manager
 * Central controller for graphics settings, applying them to Babylon.js and Canvas
 */

import type { Engine, Scene, ShadowGenerator, GlowLayer } from "@babylonjs/core";
import { deviceManager, type DeviceInfo, type DeviceType } from "../../platform/device";
import type {
  GraphicsSettings,
  GraphicsSettingsUpdate,
  GraphicsSettingsChangeEvent,
  GraphicsSettingsListener,
  PerformanceMetrics,
  DeviceCapabilities,
  QualityLevel,
  AdaptiveQualityConfig,
} from "../settings/types";
import {
  getPreset,
  getPresetWithAccessibility,
  DEFAULT_ADAPTIVE_CONFIG,
  getLowerQuality,
  getHigherQuality,
} from "../settings/presets";
import { loadSettings, saveSettings, hasStoredSettings } from "../settings/storage";

/**
 * Graphics Manager - Singleton class for managing graphics settings
 *
 * Responsibilities:
 * - Load/save settings to persistent storage
 * - Apply settings to Babylon.js engine and scene
 * - Auto-detect recommended quality based on device
 * - Emit change events for React integration
 * - Adaptive quality management based on performance
 */
class GraphicsManagerImpl {
  private _settings: GraphicsSettings | null = null;
  private _initialized: boolean = false;
  private _engine: Engine | null = null;
  private _scene: Scene | null = null;
  private _shadowGenerators: ShadowGenerator[] = [];
  private _glowLayers: GlowLayer[] = [];
  private _listeners: Set<GraphicsSettingsListener> = new Set();

  // Adaptive quality state
  private _adaptiveConfig: AdaptiveQualityConfig = DEFAULT_ADAPTIVE_CONFIG;
  private _fpsSamples: number[] = [];
  private _lastQualityChangeTime: number = 0;
  private _performanceObserver: (() => void) | null = null;

  // Device capabilities cache
  private _deviceCapabilities: DeviceCapabilities | null = null;

  /**
   * Initialize the graphics manager
   * Should be called early in app startup
   */
  async init(): Promise<GraphicsSettings> {
    if (this._initialized && this._settings) {
      return this._settings;
    }

    // Ensure device manager is initialized
    const deviceInfo = await deviceManager.init();

    // Detect device capabilities
    this._deviceCapabilities = this.assessDeviceCapabilities(deviceInfo);

    // Check for stored settings
    const hasStored = await hasStoredSettings();

    if (hasStored) {
      // Load existing settings
      this._settings = await loadSettings(deviceInfo.isReducedMotion);
    } else {
      // First time - auto-detect and create settings
      const recommendedQuality = this._deviceCapabilities.recommendedQuality;
      this._settings = getPresetWithAccessibility(recommendedQuality, deviceInfo.isReducedMotion);

      // Save initial settings
      await saveSettings(this._settings);
      console.log(`[GraphicsManager] Auto-detected quality: ${recommendedQuality}`);
    }

    // Listen for reduced motion preference changes
    this.setupReducedMotionListener();

    this._initialized = true;
    console.log("[GraphicsManager] Initialized with settings:", this._settings.quality);

    return this._settings;
  }

  /**
   * Get current settings (throws if not initialized)
   */
  get settings(): GraphicsSettings {
    if (!this._settings) {
      throw new Error("[GraphicsManager] Not initialized. Call init() first.");
    }
    return this._settings;
  }

  /**
   * Get settings or null if not initialized
   */
  getSettings(): GraphicsSettings | null {
    return this._settings;
  }

  /**
   * Check if manager is initialized
   */
  get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Get device capabilities
   */
  get deviceCapabilities(): DeviceCapabilities | null {
    return this._deviceCapabilities;
  }

  /**
   * Register Babylon.js engine for settings application
   */
  registerEngine(engine: Engine): void {
    this._engine = engine;

    if (this._settings) {
      this.applyEngineSettings(engine, this._settings);
    }

    // Start performance monitoring if adaptive quality is enabled
    if (this._settings?.adaptiveQuality) {
      this.startPerformanceMonitoring();
    }

    console.log("[GraphicsManager] Engine registered");
  }

  /**
   * Register Babylon.js scene for settings application
   */
  registerScene(scene: Scene): void {
    this._scene = scene;

    if (this._settings) {
      this.applySceneSettings(scene, this._settings);
    }

    console.log("[GraphicsManager] Scene registered");
  }

  /**
   * Register a shadow generator to be controlled by settings
   */
  registerShadowGenerator(generator: ShadowGenerator): void {
    this._shadowGenerators.push(generator);

    if (this._settings) {
      this.applyShadowSettings(generator, this._settings);
    }
  }

  /**
   * Unregister a shadow generator
   */
  unregisterShadowGenerator(generator: ShadowGenerator): void {
    const index = this._shadowGenerators.indexOf(generator);
    if (index !== -1) {
      this._shadowGenerators.splice(index, 1);
    }
  }

  /**
   * Register a glow layer to be controlled by settings
   */
  registerGlowLayer(layer: GlowLayer): void {
    this._glowLayers.push(layer);

    if (this._settings) {
      this.applyGlowSettings(layer, this._settings);
    }
  }

  /**
   * Unregister a glow layer
   */
  unregisterGlowLayer(layer: GlowLayer): void {
    const index = this._glowLayers.indexOf(layer);
    if (index !== -1) {
      this._glowLayers.splice(index, 1);
    }
  }

  /**
   * Update settings
   */
  async updateSettings(update: GraphicsSettingsUpdate): Promise<GraphicsSettings> {
    if (!this._settings) {
      throw new Error("[GraphicsManager] Not initialized. Call init() first.");
    }

    const previous = { ...this._settings };

    // Merge updates
    this._settings = {
      ...this._settings,
      ...update,
    };

    // Determine which keys changed
    const changedKeys = (Object.keys(update) as (keyof GraphicsSettings)[]).filter(
      (key) => previous[key] !== this._settings![key]
    );

    if (changedKeys.length === 0) {
      return this._settings;
    }

    // Apply changes
    this.applyAllSettings(this._settings);

    // Handle adaptive quality toggle
    if (changedKeys.includes("adaptiveQuality")) {
      if (this._settings.adaptiveQuality) {
        this.startPerformanceMonitoring();
      } else {
        this.stopPerformanceMonitoring();
      }
    }

    // Save to storage
    await saveSettings(this._settings);

    // Emit change event
    this.emitChange({ previous, current: this._settings, changedKeys });

    console.log("[GraphicsManager] Settings updated:", changedKeys);
    return this._settings;
  }

  /**
   * Set quality preset (convenience method)
   */
  async setQuality(level: QualityLevel): Promise<GraphicsSettings> {
    const preset = getPresetWithAccessibility(
      level,
      this._settings?.reducedMotion ?? false
    );
    return this.updateSettings(preset);
  }

  /**
   * Reset to recommended settings based on device
   */
  async resetToRecommended(): Promise<GraphicsSettings> {
    if (!this._deviceCapabilities) {
      const deviceInfo = await deviceManager.init();
      this._deviceCapabilities = this.assessDeviceCapabilities(deviceInfo);
    }

    const deviceInfo = deviceManager.getInfo();
    const preset = getPresetWithAccessibility(
      this._deviceCapabilities.recommendedQuality,
      deviceInfo?.isReducedMotion ?? false
    );

    return this.updateSettings(preset);
  }

  /**
   * Subscribe to settings changes
   */
  onChange(listener: GraphicsSettingsListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics | null {
    if (!this._engine) {
      return null;
    }

    return {
      fps: this._engine.getFps(),
      frameTimeMs: 1000 / Math.max(this._engine.getFps(), 1),
      drawCalls: (this._scene?.getEngine() as Engine & { _drawCalls?: number })?._drawCalls ?? 0,
      activeParticles: this._scene?.particleSystems?.reduce(
        (sum, ps) => sum + ((ps as typeof ps & { isAlive?: () => boolean }).isAlive?.() ? ps.getActiveCount() : 0),
        0
      ) ?? 0,
    };
  }

  /**
   * Assess device capabilities and recommend quality level
   */
  private assessDeviceCapabilities(deviceInfo: DeviceInfo): DeviceCapabilities {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");

    // Check WebGL support
    const webgl2Support = !!canvas.getContext("webgl2");

    // Get max texture size
    let maxTextureSize = 2048;
    let instancedArraysSupport = false;

    if (gl) {
      maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;
      instancedArraysSupport =
        webgl2Support || !!gl.getExtension("ANGLE_instanced_arrays");
    }

    // Determine GPU tier based on device type and capabilities
    let gpuTier: 1 | 2 | 3 = 2;
    let memoryTier: "low" | "medium" | "high" = "medium";

    // Device type based assessment
    switch (deviceInfo.type) {
      case "phone":
        gpuTier = 1;
        memoryTier = "low";
        break;
      case "tablet":
      case "foldable":
        gpuTier = 2;
        memoryTier = "medium";
        break;
      case "desktop":
        gpuTier = 3;
        memoryTier = "high";
        break;
    }

    // Adjust based on pixel ratio (high DPI suggests better device)
    if (deviceInfo.pixelRatio >= 3) {
      gpuTier = Math.min(gpuTier + 1, 3) as 1 | 2 | 3;
    }

    // Adjust based on WebGL2 support
    if (!webgl2Support) {
      gpuTier = Math.max(gpuTier - 1, 1) as 1 | 2 | 3;
    }

    // Adjust based on max texture size
    if (maxTextureSize >= 8192) {
      gpuTier = Math.min(gpuTier + 1, 3) as 1 | 2 | 3;
    } else if (maxTextureSize < 4096) {
      gpuTier = Math.max(gpuTier - 1, 1) as 1 | 2 | 3;
    }

    // Map tier to recommended quality
    const recommendedQuality: QualityLevel =
      gpuTier === 1 ? "low" : gpuTier === 2 ? "medium" : "high";

    // Clean up
    canvas.remove();

    return {
      gpuTier,
      memoryTier,
      webgl2Support,
      maxTextureSize,
      instancedArraysSupport,
      recommendedQuality,
    };
  }

  /**
   * Apply all settings to registered components
   */
  private applyAllSettings(settings: GraphicsSettings): void {
    if (this._engine) {
      this.applyEngineSettings(this._engine, settings);
    }

    if (this._scene) {
      this.applySceneSettings(this._scene, settings);
    }

    for (const generator of this._shadowGenerators) {
      this.applyShadowSettings(generator, settings);
    }

    for (const layer of this._glowLayers) {
      this.applyGlowSettings(layer, settings);
    }
  }

  /**
   * Apply settings to Babylon.js engine
   */
  private applyEngineSettings(engine: Engine, settings: GraphicsSettings): void {
    // Hardware scaling (resolution)
    engine.setHardwareScalingLevel(settings.hardwareScalingLevel);

    // Target FPS (affects frame limiter if available)
    // Note: Babylon.js doesn't have a built-in frame limiter,
    // but we can use this in our render loop logic
    (engine as Engine & { _targetFPS?: number })._targetFPS = settings.targetFPS;
  }

  /**
   * Apply settings to Babylon.js scene
   */
  private applySceneSettings(scene: Scene, settings: GraphicsSettings): void {
    // Shadows
    scene.shadowsEnabled = settings.shadowsEnabled;

    // Particle systems
    for (const ps of scene.particleSystems || []) {
      // Scale emission rate based on particle count setting
      const originalRate = (ps as typeof ps & { _originalEmitRate?: number })._originalEmitRate;
      if (originalRate === undefined) {
        (ps as typeof ps & { _originalEmitRate?: number })._originalEmitRate = ps.emitRate;
      }
      const baseRate =
        (ps as typeof ps & { _originalEmitRate?: number })._originalEmitRate || ps.emitRate;
      ps.emitRate = baseRate * settings.particleCount;
    }

    // Reflections (affects standard materials with reflection textures)
    scene.environmentTexture = settings.reflectionsEnabled ? scene.environmentTexture : null;

    // Post-processing
    if (scene.postProcessRenderPipelineManager) {
      const pipelines = scene.postProcessRenderPipelineManager.supportedPipelines;
      for (const pipeline of pipelines) {
        const cameras = scene.cameras;
        if (settings.postProcessingEnabled) {
          scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(
            pipeline.name,
            cameras
          );
        } else {
          scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(
            pipeline.name,
            cameras
          );
        }
      }
    }
  }

  /**
   * Apply settings to shadow generator
   */
  private applyShadowSettings(generator: ShadowGenerator, settings: GraphicsSettings): void {
    if (!settings.shadowsEnabled) {
      // Disable shadow map generation
      generator.getShadowMap()!.refreshRate = 0;
      return;
    }

    // Re-enable if was disabled
    generator.getShadowMap()!.refreshRate = 1;

    // Update shadow map size
    generator.getShadowMap()!.resize(settings.shadowMapSize);

    // Quality settings based on level
    switch (settings.quality) {
      case "low":
        generator.useBlurExponentialShadowMap = false;
        generator.usePercentageCloserFiltering = false;
        break;
      case "medium":
        generator.useBlurExponentialShadowMap = true;
        generator.blurKernel = 16;
        break;
      case "high":
        generator.usePercentageCloserFiltering = true;
        generator.filteringQuality = 1; // High quality PCF
        break;
    }
  }

  /**
   * Apply settings to glow layer
   */
  private applyGlowSettings(layer: GlowLayer, settings: GraphicsSettings): void {
    if (!settings.glowLayerEnabled) {
      layer.intensity = 0;
      return;
    }

    // Adjust intensity based on quality
    switch (settings.quality) {
      case "low":
        layer.intensity = 0.3;
        layer.blurKernelSize = 16;
        break;
      case "medium":
        layer.intensity = 0.5;
        layer.blurKernelSize = 32;
        break;
      case "high":
        layer.intensity = 0.7;
        layer.blurKernelSize = 64;
        break;
    }
  }

  /**
   * Emit change event to all listeners
   */
  private emitChange(event: GraphicsSettingsChangeEvent): void {
    for (const listener of this._listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("[GraphicsManager] Listener error:", error);
      }
    }
  }

  /**
   * Setup listener for reduced motion preference changes
   */
  private setupReducedMotionListener(): void {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mediaQuery) {
      mediaQuery.addEventListener("change", async (e) => {
        if (this._settings) {
          await this.updateSettings({
            reducedMotion: e.matches,
            motionBlur: e.matches ? false : this._settings.motionBlur,
            screenShake: e.matches ? false : this._settings.screenShake,
          });
        }
      });
    }
  }

  /**
   * Start monitoring performance for adaptive quality
   */
  private startPerformanceMonitoring(): void {
    if (this._performanceObserver) return;

    this._fpsSamples = [];
    this._lastQualityChangeTime = Date.now();

    const monitor = () => {
      if (!this._settings?.adaptiveQuality || !this._engine) {
        this.stopPerformanceMonitoring();
        return;
      }

      const fps = this._engine.getFps();
      this._fpsSamples.push(fps);

      // Keep only recent samples
      if (this._fpsSamples.length > this._adaptiveConfig.sampleCount) {
        this._fpsSamples.shift();
      }

      // Check if we should adjust quality
      if (this._fpsSamples.length >= this._adaptiveConfig.sampleCount) {
        this.checkAdaptiveQuality();
      }

      requestAnimationFrame(monitor);
    };

    this._performanceObserver = () => {
      this._performanceObserver = null;
    };

    requestAnimationFrame(monitor);
    console.log("[GraphicsManager] Started performance monitoring");
  }

  /**
   * Stop performance monitoring
   */
  private stopPerformanceMonitoring(): void {
    if (this._performanceObserver) {
      this._performanceObserver();
      this._performanceObserver = null;
    }
    this._fpsSamples = [];
    console.log("[GraphicsManager] Stopped performance monitoring");
  }

  /**
   * Check if quality should be adjusted based on performance
   */
  private async checkAdaptiveQuality(): Promise<void> {
    if (!this._settings) return;

    const now = Date.now();
    const timeSinceLastChange = now - this._lastQualityChangeTime;

    // Respect cooldown
    if (timeSinceLastChange < this._adaptiveConfig.cooldownMs) {
      return;
    }

    // Calculate average FPS
    const avgFps =
      this._fpsSamples.reduce((a, b) => a + b, 0) / this._fpsSamples.length;

    // Check if we need to reduce quality
    if (avgFps < this._adaptiveConfig.lowFpsThreshold) {
      const lowerQuality = getLowerQuality(this._settings.quality);
      if (lowerQuality) {
        console.log(
          `[GraphicsManager] Adaptive: Reducing quality from ${this._settings.quality} to ${lowerQuality} (avg FPS: ${avgFps.toFixed(1)})`
        );
        await this.setQuality(lowerQuality);
        this._lastQualityChangeTime = now;
        this._fpsSamples = [];
      }
      return;
    }

    // Check if we can increase quality
    if (avgFps > this._adaptiveConfig.highFpsThreshold) {
      const higherQuality = getHigherQuality(this._settings.quality);
      if (higherQuality) {
        console.log(
          `[GraphicsManager] Adaptive: Increasing quality from ${this._settings.quality} to ${higherQuality} (avg FPS: ${avgFps.toFixed(1)})`
        );
        await this.setQuality(higherQuality);
        this._lastQualityChangeTime = now;
        this._fpsSamples = [];
      }
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopPerformanceMonitoring();
    this._listeners.clear();
    this._shadowGenerators = [];
    this._glowLayers = [];
    this._engine = null;
    this._scene = null;
    this._settings = null;
    this._initialized = false;
    console.log("[GraphicsManager] Disposed");
  }
}

/**
 * Singleton instance
 */
export const graphicsManager = new GraphicsManagerImpl();

/**
 * Export class for testing
 */
export { GraphicsManagerImpl };
