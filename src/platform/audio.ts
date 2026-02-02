/**
 * Platform Audio Abstraction
 * Wraps the AudioManager for consistent cross-platform playback
 */

import { audioManager, type SoundEffect } from "@/game/audio";

class PlatformAudioManager {
  private initialized = false;

  /**
   * Initialize audio system
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    await audioManager.init();
    this.initialized = true;
  }

  /**
   * Play a sound effect
   */
  async play(type: SoundEffect): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
    return audioManager.play(type);
  }

  /**
   * Start background music
   */
  startMusic(): void {
    audioManager.startMusic();
  }

  /**
   * Stop background music
   */
  stopMusic(): void {
    audioManager.stopMusic();
  }

  /**
   * Set music intensity (0-1)
   */
  setIntensity(intensity: number): void {
    audioManager.setIntensity(intensity);
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    audioManager.setMuted(muted);
  }

  /**
   * Get mute state
   */
  isMuted(): boolean {
    return audioManager.isMuted();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    audioManager.dispose();
    this.initialized = false;
  }
}

export const platformAudio = new PlatformAudioManager();
