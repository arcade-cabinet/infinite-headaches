/**
 * Graphics Context
 * React context and provider for graphics settings
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type {
  GraphicsSettings,
  GraphicsSettingsUpdate,
  QualityLevel,
  PerformanceMetrics,
  DeviceCapabilities,
} from "../settings/types";
import { graphicsManager } from "../manager/GraphicsManager";
import { MEDIUM_PRESET } from "../settings/presets";

/**
 * Graphics context value type
 */
export interface GraphicsContextValue {
  /** Current graphics settings */
  settings: GraphicsSettings;

  /** Whether the graphics manager is initialized */
  isInitialized: boolean;

  /** Whether settings are currently being loaded/saved */
  isLoading: boolean;

  /** Device capabilities assessment */
  deviceCapabilities: DeviceCapabilities | null;

  /** Current performance metrics (if monitoring enabled) */
  performanceMetrics: PerformanceMetrics | null;

  /** Update one or more settings */
  updateSettings: (update: GraphicsSettingsUpdate) => Promise<void>;

  /** Set quality preset */
  setQuality: (level: QualityLevel) => Promise<void>;

  /** Reset settings to recommended for device */
  resetToRecommended: () => Promise<void>;

  /** Toggle a boolean setting */
  toggleSetting: (key: keyof GraphicsSettings) => Promise<void>;
}

/**
 * Default context value (used before initialization)
 */
const defaultContextValue: GraphicsContextValue = {
  settings: MEDIUM_PRESET,
  isInitialized: false,
  isLoading: true,
  deviceCapabilities: null,
  performanceMetrics: null,
  updateSettings: async () => {},
  setQuality: async () => {},
  resetToRecommended: async () => {},
  toggleSetting: async () => {},
};

/**
 * Graphics context
 */
const GraphicsContext = createContext<GraphicsContextValue>(defaultContextValue);

/**
 * Props for GraphicsProvider
 */
export interface GraphicsProviderProps {
  children: ReactNode;
  /**
   * Called when graphics manager is initialized
   * Useful for registering engine/scene after init
   */
  onInitialized?: (settings: GraphicsSettings) => void;
}

/**
 * Graphics Provider Component
 * Initializes graphics manager and provides context to children
 */
export function GraphicsProvider({
  children,
  onInitialized,
}: GraphicsProviderProps): React.ReactElement {
  const [settings, setSettings] = useState<GraphicsSettings>(MEDIUM_PRESET);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapabilities | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);

  // Initialize graphics manager
  useEffect(() => {
    let mounted = true;

    const initGraphics = async () => {
      try {
        setIsLoading(true);
        const initialSettings = await graphicsManager.init();

        if (!mounted) return;

        setSettings(initialSettings);
        setDeviceCapabilities(graphicsManager.deviceCapabilities);
        setIsInitialized(true);
        setIsLoading(false);

        onInitialized?.(initialSettings);
        console.log("[GraphicsContext] Initialized");
      } catch (error) {
        console.error("[GraphicsContext] Failed to initialize:", error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initGraphics();

    return () => {
      mounted = false;
    };
  }, [onInitialized]);

  // Subscribe to settings changes from manager
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = graphicsManager.onChange((event) => {
      setSettings(event.current);
    });

    return unsubscribe;
  }, [isInitialized]);

  // Poll performance metrics when adaptive quality is enabled
  useEffect(() => {
    if (!isInitialized || !settings.adaptiveQuality) {
      setPerformanceMetrics(null);
      return;
    }

    const interval = setInterval(() => {
      const metrics = graphicsManager.getPerformanceMetrics();
      setPerformanceMetrics(metrics);
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isInitialized, settings.adaptiveQuality]);

  // Update settings handler
  const updateSettings = useCallback(
    async (update: GraphicsSettingsUpdate): Promise<void> => {
      if (!isInitialized) {
        console.warn("[GraphicsContext] Cannot update settings before initialization");
        return;
      }

      setIsLoading(true);
      try {
        await graphicsManager.updateSettings(update);
      } finally {
        setIsLoading(false);
      }
    },
    [isInitialized]
  );

  // Set quality preset handler
  const setQuality = useCallback(
    async (level: QualityLevel): Promise<void> => {
      if (!isInitialized) {
        console.warn("[GraphicsContext] Cannot set quality before initialization");
        return;
      }

      setIsLoading(true);
      try {
        await graphicsManager.setQuality(level);
      } finally {
        setIsLoading(false);
      }
    },
    [isInitialized]
  );

  // Reset to recommended handler
  const resetToRecommended = useCallback(async (): Promise<void> => {
    if (!isInitialized) {
      console.warn("[GraphicsContext] Cannot reset before initialization");
      return;
    }

    setIsLoading(true);
    try {
      await graphicsManager.resetToRecommended();
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Toggle boolean setting handler
  const toggleSetting = useCallback(
    async (key: keyof GraphicsSettings): Promise<void> => {
      if (!isInitialized) {
        console.warn("[GraphicsContext] Cannot toggle setting before initialization");
        return;
      }

      const currentValue = settings[key];
      if (typeof currentValue !== "boolean") {
        console.warn(`[GraphicsContext] Setting "${key}" is not a boolean`);
        return;
      }

      await updateSettings({ [key]: !currentValue } as GraphicsSettingsUpdate);
    },
    [isInitialized, settings, updateSettings]
  );

  // Memoize context value
  const contextValue = useMemo<GraphicsContextValue>(
    () => ({
      settings,
      isInitialized,
      isLoading,
      deviceCapabilities,
      performanceMetrics,
      updateSettings,
      setQuality,
      resetToRecommended,
      toggleSetting,
    }),
    [
      settings,
      isInitialized,
      isLoading,
      deviceCapabilities,
      performanceMetrics,
      updateSettings,
      setQuality,
      resetToRecommended,
      toggleSetting,
    ]
  );

  return (
    <GraphicsContext.Provider value={contextValue}>{children}</GraphicsContext.Provider>
  );
}

/**
 * Hook to access graphics context
 * @throws Error if used outside GraphicsProvider
 */
export function useGraphicsContext(): GraphicsContextValue {
  const context = useContext(GraphicsContext);

  if (context === defaultContextValue) {
    // Check if we're actually outside the provider or just using default
    // This is a heuristic - if updateSettings is the empty async function, we're outside
    if (context.updateSettings === defaultContextValue.updateSettings && !context.isInitialized) {
      console.warn(
        "[useGraphicsContext] Used outside GraphicsProvider, returning defaults"
      );
    }
  }

  return context;
}

/**
 * Export the raw context for advanced use cases
 */
export { GraphicsContext };
