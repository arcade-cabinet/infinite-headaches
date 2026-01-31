/**
 * Platform Haptics Abstraction
 * Uses Capacitor Haptics on native, falls back to no-op on web
 */

import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

class HapticsManager {
  private available = false;

  constructor() {
    this.available = Capacitor.isNativePlatform();
  }

  /**
   * Light impact - for UI interactions (button taps, selections)
   */
  async light(): Promise<void> {
    if (!this.available) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Silently fail on web/unsupported
    }
  }

  /**
   * Medium impact - for game events (duck landing)
   */
  async medium(): Promise<void> {
    if (!this.available) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Silently fail
    }
  }

  /**
   * Heavy impact - for significant events (perfect stack, level up)
   */
  async heavy(): Promise<void> {
    if (!this.available) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {
      // Silently fail
    }
  }

  /**
   * Success notification - for achievements, power-ups
   */
  async success(): Promise<void> {
    if (!this.available) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      // Silently fail
    }
  }

  /**
   * Warning notification - for near-miss, life lost
   */
  async warning(): Promise<void> {
    if (!this.available) return;
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch {
      // Silently fail
    }
  }

  /**
   * Error notification - for game over, fail
   */
  async error(): Promise<void> {
    if (!this.available) return;
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch {
      // Silently fail
    }
  }

  /**
   * Selection changed - for scrolling through options
   */
  async selection(): Promise<void> {
    if (!this.available) return;
    try {
      await Haptics.selectionChanged();
    } catch {
      // Silently fail
    }
  }

  /**
   * Custom vibration pattern (Android only)
   */
  async vibrate(duration = 300): Promise<void> {
    if (!this.available) return;
    try {
      await Haptics.vibrate({ duration });
    } catch {
      // Silently fail
    }
  }
}

export const haptics = new HapticsManager();
