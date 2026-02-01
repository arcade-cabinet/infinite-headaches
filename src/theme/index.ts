/**
 * Nebraska Homestead Theme System
 *
 * A comprehensive theming system for the Homestead Headaches game
 * featuring Nebraska farmland-inspired colors, playful typography,
 * and responsive design tokens.
 *
 * @example
 * ```tsx
 * import { ThemeProvider, useTheme, colors, fontFamilies } from '@/theme';
 *
 * function App() {
 *   return (
 *     <ThemeProvider>
 *       <Game />
 *     </ThemeProvider>
 *   );
 * }
 *
 * function Game() {
 *   const { colors, typography, spacing } = useTheme();
 *   // Use theme tokens...
 * }
 * ```
 */

// ============================================================================
// Theme Context & Provider
// ============================================================================
export {
  // Provider
  ThemeProvider,
  type ThemeProviderProps,
  // Main hook
  useTheme,
  useThemeSafe,
  // Convenience hooks
  useResolvedTheme,
  useIsDarkTheme,
  useColors,
  useTypography,
  useSpacing,
  useResponsiveTheme,
  // Types
  type ThemeMode,
  type ThemeContextValue,
} from './context';

// ============================================================================
// Design Tokens
// ============================================================================

// All tokens via barrel export
export * from './tokens';

// Direct token imports for convenience
export { colors, gameColors } from './tokens/colors';

export {
  fontFamilies,
  fontWeights,
  fontSizes,
  lineHeights,
  letterSpacings,
  textStyles,
  getResponsiveFontSizes,
  createResponsiveTextStyle,
} from './tokens/typography';

export {
  spacing,
  spacingSemantics,
  gameSpacing,
  getResponsiveSpacing,
  getResponsiveGameSpacing,
  spacingToPx,
  spacingToScaledPx,
} from './tokens/spacing';

// ============================================================================
// Theme Utilities
// ============================================================================

import { colors } from './tokens/colors';

/**
 * Create a CSS rgba color string from a hex color
 * @param hex - Hex color string (with or without #)
 * @param alpha - Alpha value (0-1)
 */
export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  const r = Number.parseInt(cleanHex.slice(0, 2), 16);
  const g = Number.parseInt(cleanHex.slice(2, 4), 16);
  const b = Number.parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Get a color value with alpha transparency
 * @param colorPath - Dot-notation path to color (e.g., 'barnRed.500')
 * @param alpha - Alpha value (0-1)
 */
export function getColorWithAlpha(colorPath: string, alpha: number): string {
  const parts = colorPath.split('.');
  let value: unknown = colors;

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      console.warn(`Color path "${colorPath}" not found`);
      return `rgba(0, 0, 0, ${alpha})`;
    }
  }

  if (typeof value === 'string') {
    return hexToRgba(value, alpha);
  }

  console.warn(`Color path "${colorPath}" did not resolve to a string`);
  return `rgba(0, 0, 0, ${alpha})`;
}

/**
 * CSS-in-JS style object type for theme styles
 */
export type ThemeStyles = React.CSSProperties;

/**
 * Create a style object with theme values
 * Useful for inline styles that need theme tokens
 */
export function createThemeStyles<T extends ThemeStyles>(styles: T): T {
  return styles;
}
