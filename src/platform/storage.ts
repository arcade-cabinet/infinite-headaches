/**
 * Platform Storage Abstraction
 * Uses Capacitor Preferences on native, localStorage on web
 */

import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

class StorageManager {
  private useNative = false;

  constructor() {
    this.useNative = Capacitor.isNativePlatform();
  }

  /**
   * Get a value from storage
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.useNative) {
        const { value } = await Preferences.get({ key });
        return value ? JSON.parse(value) : null;
      }
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set a value in storage
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (this.useNative) {
        await Preferences.set({ key, value: serialized });
      } else {
        localStorage.setItem(key, serialized);
      }
    } catch (error) {
      console.warn("[Storage] Failed to set value:", error);
    }
  }

  /**
   * Remove a value from storage
   */
  async remove(key: string): Promise<void> {
    try {
      if (this.useNative) {
        await Preferences.remove({ key });
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn("[Storage] Failed to remove value:", error);
    }
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    try {
      if (this.useNative) {
        await Preferences.clear();
      } else {
        localStorage.clear();
      }
    } catch (error) {
      console.warn("[Storage] Failed to clear:", error);
    }
  }

  /**
   * Get all keys in storage
   */
  async keys(): Promise<string[]> {
    try {
      if (this.useNative) {
        const { keys } = await Preferences.keys();
        return keys;
      }
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  }
}

export const storage = new StorageManager();

// Storage keys used throughout the app
export const STORAGE_KEYS = {
  HIGH_SCORE: "animal_high_score",
  ACHIEVEMENTS: "animal_achievements",
  STATS: "animal_stats",
  UPGRADES: "animal_upgrades",
  COINS: "animal_coins",
  UNLOCKED_MODES: "animal_unlocked_modes",
  TUTORIAL_COMPLETED: "animal_tutorial_completed",
  SOUND_MUTED: "animal_sound_muted",
  SETTINGS: "animal_settings",
  KEY_BINDINGS: "animal_key_bindings",
  MOTOR_SETTINGS: "animal_motor_settings",
  SESSION_HISTORY: "animal_session_history",
} as const;
