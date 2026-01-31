/**
 * Nebraska Homestead Theme Context
 *
 * React context for theme state management
 * Provides theme tokens, responsive scaling, and theming utilities
 * across the application
 */

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { colors, gameColors } from './tokens/colors';
import {
  fontFamilies,
  fontSizes,
  fontWeights,
  getResponsiveFontSizes,
  letterSpacings,
  lineHeights,
  textStyles,
} from './tokens/typography';
import {
  gameSpacing,
  getResponsiveGameSpacing,
  getResponsiveSpacing,
  spacing,
  spacingSemantics,
} from './tokens/spacing';

// ============================================================================
// Types
// ============================================================================

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
  /** Current theme mode */
  mode: ThemeMode;
  /** Resolved theme (light or dark, never system) */
  resolvedTheme: 'light' | 'dark';
  /** Set theme mode */
  setMode: (mode: ThemeMode) => void;
  /** Toggle between light and dark */
  toggleTheme: () => void;

  /** Color tokens */
  colors: typeof colors;
  /** Game-specific color mappings */
  gameColors: typeof gameColors;

  /** Typography tokens */
  typography: {
    fontFamilies: typeof fontFamilies;
    fontWeights: typeof fontWeights;
    fontSizes: typeof fontSizes;
    lineHeights: typeof lineHeights;
    letterSpacings: typeof letterSpacings;
    textStyles: typeof textStyles;
  };

  /** Spacing tokens */
  spacing: {
    scale: typeof spacing;
    semantic: typeof spacingSemantics;
    game: typeof gameSpacing;
  };

  /** Responsive scaling utilities */
  responsive: {
    /** Get responsive font sizes for a given scale factor */
    getFontSizes: (scaleFactor: number) => ReturnType<typeof getResponsiveFontSizes>;
    /** Get responsive spacing for a given scale factor */
    getSpacing: (scaleFactor: number) => ReturnType<typeof getResponsiveSpacing>;
    /** Get responsive game spacing for a given game scale */
    getGameSpacing: (gameScale: number) => ReturnType<typeof getResponsiveGameSpacing>;
  };

  /** CSS custom property utilities */
  cssVars: {
    /** Get a CSS variable reference string */
    get: (name: string) => string;
    /** Set a CSS variable on the document root */
    set: (name: string, value: string) => void;
  };
}

// ============================================================================
// Context
// ============================================================================

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ============================================================================
// Storage Key
// ============================================================================

const THEME_STORAGE_KEY = 'infinite-headaches-theme';

// ============================================================================
// Provider Component
// ============================================================================

export interface ThemeProviderProps {
  /** Child components */
  children: ReactNode;
  /** Default theme mode */
  defaultMode?: ThemeMode;
  /** Storage key for persisting theme preference */
  storageKey?: string;
  /** Force a specific theme (overrides user preference) */
  forcedTheme?: 'light' | 'dark';
  /** Disable system theme detection */
  disableSystemTheme?: boolean;
}

export function ThemeProvider({
  children,
  defaultMode = 'dark',
  storageKey = THEME_STORAGE_KEY,
  forcedTheme,
  disableSystemTheme = false,
}: ThemeProviderProps) {
  // Initialize mode from storage or default
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (forcedTheme) return forcedTheme;

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    }
    return defaultMode;
  });

  // Track system preference
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return 'dark';
  });

  // Calculate resolved theme
  const resolvedTheme = useMemo((): 'light' | 'dark' => {
    if (forcedTheme) return forcedTheme;
    if (mode === 'system' && !disableSystemTheme) return systemTheme;
    return mode === 'system' ? 'dark' : mode;
  }, [mode, systemTheme, forcedTheme, disableSystemTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (disableSystemTheme || typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [disableSystemTheme]);

  // Apply theme class to document
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Remove both classes first
    root.classList.remove('light', 'dark');

    // Add the resolved theme class
    root.classList.add(resolvedTheme);

    // Also set a data attribute for CSS targeting
    root.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  // Set mode with persistence
  const setMode = useCallback(
    (newMode: ThemeMode) => {
      if (forcedTheme) return; // Can't change if forced

      setModeState(newMode);

      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, newMode);
      }
    },
    [forcedTheme, storageKey]
  );

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    if (forcedTheme) return;

    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setMode(newTheme);
  }, [forcedTheme, resolvedTheme, setMode]);

  // CSS variable utilities
  const cssVars = useMemo(
    () => ({
      get: (name: string) => `var(--${name})`,
      set: (name: string, value: string) => {
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty(`--${name}`, value);
        }
      },
    }),
    []
  );

  // Responsive utilities
  const responsive = useMemo(
    () => ({
      getFontSizes: getResponsiveFontSizes,
      getSpacing: getResponsiveSpacing,
      getGameSpacing: getResponsiveGameSpacing,
    }),
    []
  );

  // Complete context value
  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedTheme,
      setMode,
      toggleTheme,
      colors,
      gameColors,
      typography: {
        fontFamilies,
        fontWeights,
        fontSizes,
        lineHeights,
        letterSpacings,
        textStyles,
      },
      spacing: {
        scale: spacing,
        semantic: spacingSemantics,
        game: gameSpacing,
      },
      responsive,
      cssVars,
    }),
    [mode, resolvedTheme, setMode, toggleTheme, responsive, cssVars]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Access the theme context
 * @throws If used outside of ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used within a ThemeProvider. ' +
        'Wrap your app with <ThemeProvider> to use theme features.'
    );
  }

  return context;
}

/**
 * Safe version of useTheme that returns null if outside provider
 * Useful for components that may render outside the theme context
 */
export function useThemeSafe(): ThemeContextValue | null {
  return useContext(ThemeContext);
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Get just the current resolved theme
 */
export function useResolvedTheme(): 'light' | 'dark' {
  const { resolvedTheme } = useTheme();
  return resolvedTheme;
}

/**
 * Check if current theme is dark
 */
export function useIsDarkTheme(): boolean {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'dark';
}

/**
 * Get color tokens
 */
export function useColors() {
  const { colors, gameColors } = useTheme();
  return { colors, gameColors };
}

/**
 * Get typography tokens
 */
export function useTypography() {
  const { typography } = useTheme();
  return typography;
}

/**
 * Get spacing tokens
 */
export function useSpacing() {
  const { spacing } = useTheme();
  return spacing;
}

/**
 * Get responsive utilities
 */
export function useResponsiveTheme() {
  const { responsive } = useTheme();
  return responsive;
}
