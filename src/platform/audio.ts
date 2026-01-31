/**
 * Platform Audio Abstraction
 * Uses pre-rendered audio files for consistent cross-platform playback
 * Falls back to Tone.js for development/web when files don't exist
 */

import { Capacitor } from "@capacitor/core";
import type { SoundType } from "@/game/audio";

// Audio file paths
const AUDIO_BASE = "/assets/audio";

const SFX_FILES: Record<SoundType, string> = {
  drop: `${AUDIO_BASE}/sfx/drop.ogg`,
  land: `${AUDIO_BASE}/sfx/land.ogg`,
  perfect: `${AUDIO_BASE}/sfx/perfect.ogg`,
  fail: `${AUDIO_BASE}/sfx/fail.ogg`,
  powerup: `${AUDIO_BASE}/sfx/powerup.ogg`,
  freeze: `${AUDIO_BASE}/sfx/freeze.ogg`,
  fireball: `${AUDIO_BASE}/sfx/fireball.ogg`,
  levelup: `${AUDIO_BASE}/sfx/levelup.ogg`,
  lifeup: `${AUDIO_BASE}/sfx/lifeup.ogg`,
};

const MUSIC_FILES = {
  "intensity-0": `${AUDIO_BASE}/music/theme-intensity-0.ogg`,
  "intensity-25": `${AUDIO_BASE}/music/theme-intensity-25.ogg`,
  "intensity-50": `${AUDIO_BASE}/music/theme-intensity-50.ogg`,
  "intensity-75": `${AUDIO_BASE}/music/theme-intensity-75.ogg`,
  "intensity-100": `${AUDIO_BASE}/music/theme-intensity-100.ogg`,
} as const;

type IntensityLevel = keyof typeof MUSIC_FILES;

class PlatformAudioManager {
  private sfxCache: Map<string, HTMLAudioElement> = new Map();
  private musicTracks: Map<IntensityLevel, HTMLAudioElement> = new Map();
  private currentIntensity: IntensityLevel = "intensity-0";
  private musicPlaying = false;
  private muted = false;
  private initialized = false;
  private useNativeAudio = false;
  private filesAvailable = false;

  // Fallback to Tone.js manager
  private toneManager: typeof import("@/game/audio").audioManager | null = null;

  constructor() {
    this.useNativeAudio = Capacitor.isNativePlatform();
  }

  /**
   * Initialize audio system - check for pre-rendered files, fallback to Tone.js
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // Check if audio files exist
    this.filesAvailable = await this.checkFilesExist();

    if (!this.filesAvailable) {
      // Fallback to Tone.js
      console.log("[Audio] Pre-rendered files not found, using Tone.js");
      const { audioManager } = await import("@/game/audio");
      this.toneManager = audioManager;
      await this.toneManager.init();
    } else {
      console.log("[Audio] Using pre-rendered audio files");
      await this.preloadSFX();
      await this.preloadMusic();
    }

    this.initialized = true;
  }

  /**
   * Check if audio files exist
   */
  private async checkFilesExist(): Promise<boolean> {
    try {
      const testFile = SFX_FILES.land;
      const response = await fetch(testFile, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Preload all SFX files
   */
  private async preloadSFX(): Promise<void> {
    const entries = Object.entries(SFX_FILES);
    await Promise.all(
      entries.map(async ([key, path]) => {
        try {
          const audio = new Audio(path);
          audio.preload = "auto";
          await new Promise<void>((resolve, reject) => {
            audio.addEventListener("canplaythrough", () => resolve(), { once: true });
            audio.addEventListener("error", reject, { once: true });
            audio.load();
          });
          this.sfxCache.set(key, audio);
        } catch (error) {
          console.warn(`[Audio] Failed to preload ${key}:`, error);
        }
      })
    );
  }

  /**
   * Preload music tracks
   */
  private async preloadMusic(): Promise<void> {
    const entries = Object.entries(MUSIC_FILES) as [IntensityLevel, string][];
    await Promise.all(
      entries.map(async ([key, path]) => {
        try {
          const audio = new Audio(path);
          audio.preload = "auto";
          audio.loop = true;
          audio.volume = 0;
          await new Promise<void>((resolve, reject) => {
            audio.addEventListener("canplaythrough", () => resolve(), { once: true });
            audio.addEventListener("error", reject, { once: true });
            audio.load();
          });
          this.musicTracks.set(key, audio);
        } catch (error) {
          console.warn(`[Audio] Failed to preload music ${key}:`, error);
        }
      })
    );
  }

  /**
   * Play a sound effect
   */
  async play(type: SoundType): Promise<void> {
    if (this.muted) return;

    if (!this.initialized) {
      await this.init();
    }

    // Use Tone.js fallback
    if (this.toneManager) {
      return this.toneManager.play(type);
    }

    // Use pre-rendered audio
    const cached = this.sfxCache.get(type);
    if (cached) {
      try {
        // Clone for overlapping sounds
        const audio = cached.cloneNode() as HTMLAudioElement;
        audio.volume = 0.7;
        await audio.play();
      } catch (error) {
        console.warn(`[Audio] Failed to play ${type}:`, error);
      }
    }
  }

  /**
   * Start background music
   */
  startMusic(): void {
    if (this.muted || this.musicPlaying) return;

    if (this.toneManager) {
      this.toneManager.startMusic();
      this.musicPlaying = true;
      return;
    }

    // Start all tracks, but only current intensity is audible
    for (const [key, track] of this.musicTracks) {
      track.volume = key === this.currentIntensity ? 0.5 : 0;
      track.currentTime = 0;
      track.play().catch(() => {});
    }
    this.musicPlaying = true;
  }

  /**
   * Stop background music
   */
  stopMusic(): void {
    if (!this.musicPlaying) return;

    if (this.toneManager) {
      this.toneManager.stopMusic();
      this.musicPlaying = false;
      return;
    }

    for (const track of this.musicTracks.values()) {
      track.pause();
      track.currentTime = 0;
    }
    this.musicPlaying = false;
  }

  /**
   * Set music intensity (0-1)
   */
  setIntensity(intensity: number): void {
    const clamped = Math.max(0, Math.min(1, intensity));

    if (this.toneManager) {
      this.toneManager.setIntensity(clamped);
      return;
    }

    // Determine which track should be active
    let level: IntensityLevel;
    if (clamped < 0.2) level = "intensity-0";
    else if (clamped < 0.4) level = "intensity-25";
    else if (clamped < 0.6) level = "intensity-50";
    else if (clamped < 0.8) level = "intensity-75";
    else level = "intensity-100";

    if (level !== this.currentIntensity) {
      // Crossfade between tracks
      const fadeTime = 500;
      const oldTrack = this.musicTracks.get(this.currentIntensity);
      const newTrack = this.musicTracks.get(level);

      if (oldTrack && newTrack) {
        this.crossfade(oldTrack, newTrack, fadeTime);
      }
      this.currentIntensity = level;
    }
  }

  /**
   * Crossfade between two audio tracks
   */
  private crossfade(from: HTMLAudioElement, to: HTMLAudioElement, duration: number): void {
    const steps = 20;
    const stepTime = duration / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      from.volume = Math.max(0, 0.5 * (1 - progress));
      to.volume = Math.min(0.5, 0.5 * progress);

      if (step >= steps) {
        clearInterval(interval);
      }
    }, stepTime);
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.toneManager) {
      this.toneManager.setMuted(muted);
    }
    if (muted) {
      this.stopMusic();
    }
  }

  /**
   * Get mute state
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopMusic();

    if (this.toneManager) {
      this.toneManager.dispose();
    }

    this.sfxCache.clear();
    this.musicTracks.clear();
    this.initialized = false;
  }
}

export const platformAudio = new PlatformAudioManager();
