/**
 * Unified Feedback System
 * Combines audio and haptic feedback for game events
 */

import { haptics } from "./haptics";
import { platformAudio } from "./audio";
import type { SoundType } from "@/game/audio";

/**
 * Feedback manager that coordinates audio and haptics
 */
class FeedbackManager {
  private hapticsEnabled = true;
  private audioEnabled = true;

  /**
   * Initialize the feedback system
   */
  async init(): Promise<void> {
    await platformAudio.init();
  }

  /**
   * Enable/disable haptics
   */
  setHapticsEnabled(enabled: boolean): void {
    this.hapticsEnabled = enabled;
  }

  /**
   * Enable/disable audio
   */
  setAudioEnabled(enabled: boolean): void {
    this.audioEnabled = enabled;
    platformAudio.setMuted(!enabled);
  }

  /**
   * Play feedback for a game event
   */
  async play(type: SoundType): Promise<void> {
    // Play audio
    if (this.audioEnabled) {
      platformAudio.play(type);
    }

    // Trigger haptics based on sound type
    if (this.hapticsEnabled) {
      switch (type) {
        case "drop":
          await haptics.light();
          break;
        case "land":
          await haptics.medium();
          break;
        case "perfect":
          await haptics.heavy();
          await haptics.success();
          break;
        case "fail":
          await haptics.error();
          await haptics.vibrate(200);
          break;
        case "powerup":
          await haptics.success();
          break;
        case "freeze":
          await haptics.medium();
          break;
        case "fireball":
          await haptics.heavy();
          break;
        case "levelup":
          await haptics.success();
          await haptics.heavy();
          break;
        case "lifeup":
          await haptics.success();
          break;
      }
    }
  }

  /**
   * Start background music
   */
  startMusic(): void {
    if (this.audioEnabled) {
      platformAudio.startMusic();
    }
  }

  /**
   * Stop background music
   */
  stopMusic(): void {
    platformAudio.stopMusic();
  }

  /**
   * Set music intensity (0-1)
   */
  setIntensity(intensity: number): void {
    platformAudio.setIntensity(intensity);
  }

  /**
   * Haptic feedback for UI interactions
   */
  async uiTap(): Promise<void> {
    if (this.hapticsEnabled) {
      await haptics.light();
    }
  }

  /**
   * Haptic feedback for selection changes
   */
  async uiSelection(): Promise<void> {
    if (this.hapticsEnabled) {
      await haptics.selection();
    }
  }

  /**
   * Haptic feedback for warnings (e.g., stack about to fall)
   */
  async warning(): Promise<void> {
    if (this.hapticsEnabled) {
      await haptics.warning();
    }
  }

  /**
   * Custom vibration pattern for danger state
   */
  async dangerPulse(): Promise<void> {
    if (this.hapticsEnabled) {
      await haptics.vibrate(50);
    }
  }

  /**
   * Get mute state
   */
  isMuted(): boolean {
    return platformAudio.isMuted();
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.audioEnabled = !muted;
    platformAudio.setMuted(muted);
  }

  /**
   * Clean up
   */
  dispose(): void {
    platformAudio.dispose();
  }
}

export const feedback = new FeedbackManager();
