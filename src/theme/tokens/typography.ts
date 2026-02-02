/**
 * Nebraska Homestead Typography System
 *
 * Font families selected for a playful farm game aesthetic:
 * - Title: Fredoka - Rounded, playful, friendly display font perfect for game titles
 * - Body: Nunito - Clean, highly readable sans-serif with soft rounded terminals
 *
 * Integrates with Tailwind CSS 4 and the useResponsiveScale hook
 */

// ============================================================================
// Font Families
// ============================================================================

/**
 * Google Fonts configuration for preloading
 * Add to index.html:
 * <link rel="preconnect" href="https://fonts.googleapis.com">
 * <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
 * <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet">
 */
export const fontFamilies = {
  /** Playful rounded display font for titles and headings */
  title: '"Fredoka", "Comic Sans MS", cursive, sans-serif',
  /** Clean readable sans-serif for body text and UI */
  body: '"Nunito", "Segoe UI", Tahoma, sans-serif',
  /** Monospace for code and technical displays */
  mono: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
} as const;

// ============================================================================
// Font Weights
// ============================================================================

export const fontWeights = {
  /** Light - sparingly used for subtle text */
  light: 300,
  /** Regular - default body text weight */
  regular: 400,
  /** Medium - slightly emphasized text */
  medium: 500,
  /** Semibold - buttons, labels, emphasis */
  semibold: 600,
  /** Bold - headings, important UI elements */
  bold: 700,
  /** Extra bold - titles, hero text */
  extrabold: 800,
} as const;

// ============================================================================
// Font Size Scale
// ============================================================================

/**
 * Type-safe font size scale
 * Based on a 1.25 major third scale with adjustments for game UI
 * Designed to work with responsive scaling
 */
export const fontSizes = {
  /** 10px - Fine print, tooltips, badges */
  '2xs': '0.625rem',
  /** 12px - Small labels, captions */
  xs: '0.75rem',
  /** 14px - Secondary text, compact UI */
  sm: '0.875rem',
  /** 16px - Base body text */
  base: '1rem',
  /** 18px - Emphasized body text */
  md: '1.125rem',
  /** 20px - Small headings, lead text */
  lg: '1.25rem',
  /** 24px - Section headings */
  xl: '1.5rem',
  /** 30px - Page headings */
  '2xl': '1.875rem',
  /** 36px - Large headings */
  '3xl': '2.25rem',
  /** 48px - Display headings */
  '4xl': '3rem',
  /** 60px - Hero titles */
  '5xl': '3.75rem',
  /** 72px - Game over screens, achievements */
  '6xl': '4.5rem',
} as const;

// ============================================================================
// Line Heights
// ============================================================================

export const lineHeights = {
  /** 1 - Single line, icons, badges */
  none: '1',
  /** 1.25 - Tight headings */
  tight: '1.25',
  /** 1.375 - Default headings */
  snug: '1.375',
  /** 1.5 - Default body text */
  normal: '1.5',
  /** 1.625 - Relaxed reading */
  relaxed: '1.625',
  /** 2 - Loose, decorative */
  loose: '2',
} as const;

// ============================================================================
// Letter Spacing
// ============================================================================

export const letterSpacings = {
  /** -0.05em - Tight display text */
  tighter: '-0.05em',
  /** -0.025em - Headings */
  tight: '-0.025em',
  /** 0 - Default */
  normal: '0',
  /** 0.025em - Small text clarity */
  wide: '0.025em',
  /** 0.05em - Labels, buttons */
  wider: '0.05em',
  /** 0.1em - All caps, decorative */
  widest: '0.1em',
} as const;

// ============================================================================
// Text Styles (Semantic Combinations)
// ============================================================================

/**
 * Pre-defined text styles combining family, size, weight, and spacing
 * Use these for consistent typography across the game UI
 */
export const textStyles = {
  // Display & Hero
  hero: {
    fontFamily: fontFamilies.title,
    fontSize: fontSizes['5xl'],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  },
  display: {
    fontFamily: fontFamilies.title,
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  },

  // Headings
  h1: {
    fontFamily: fontFamilies.title,
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  },
  h2: {
    fontFamily: fontFamilies.title,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacings.tight,
  },
  h3: {
    fontFamily: fontFamilies.title,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacings.normal,
  },
  h4: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacings.normal,
  },

  // Body
  body: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  },
  bodyLarge: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.relaxed,
    letterSpacing: letterSpacings.normal,
  },
  bodySmall: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacings.wide,
  },

  // UI Elements
  button: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.none,
    letterSpacing: letterSpacings.wide,
  },
  buttonSmall: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.none,
    letterSpacing: letterSpacings.wide,
  },
  buttonLarge: {
    fontFamily: fontFamilies.title,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.none,
    letterSpacing: letterSpacings.wide,
  },
  label: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacings.wide,
  },
  caption: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacings.wide,
  },

  // Game-specific
  score: {
    fontFamily: fontFamilies.title,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.none,
    letterSpacing: letterSpacings.tight,
  },
  scoreSmall: {
    fontFamily: fontFamilies.title,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.none,
    letterSpacing: letterSpacings.tight,
  },
  gameTitle: {
    fontFamily: fontFamilies.title,
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.extrabold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  },
  achievement: {
    fontFamily: fontFamilies.title,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.normal,
  },
  tooltip: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacings.normal,
  },
} as const;

// ============================================================================
// Responsive Font Utilities
// ============================================================================

/**
 * Get responsive font sizes based on the scale factor from useResponsiveScale
 * @param scaleFactor - The base scale from useResponsiveScale (typically 0.6-1.5)
 */
export function getResponsiveFontSizes(scaleFactor: number) {
  const clampedScale = Math.max(0.6, Math.min(1.5, scaleFactor));

  return {
    '2xs': `${0.625 * clampedScale}rem`,
    xs: `${0.75 * clampedScale}rem`,
    sm: `${0.875 * clampedScale}rem`,
    base: `${1 * clampedScale}rem`,
    md: `${1.125 * clampedScale}rem`,
    lg: `${1.25 * clampedScale}rem`,
    xl: `${1.5 * clampedScale}rem`,
    '2xl': `${1.875 * clampedScale}rem`,
    '3xl': `${2.25 * clampedScale}rem`,
    '4xl': `${3 * clampedScale}rem`,
    '5xl': `${3.75 * clampedScale}rem`,
    '6xl': `${4.5 * clampedScale}rem`,
  } as const;
}

/**
 * Create a responsive text style by applying a scale factor
 * @param style - Base text style from textStyles
 * @param scaleFactor - Scale multiplier for font size
 */
export function createResponsiveTextStyle<
  T extends (typeof textStyles)[keyof typeof textStyles],
>(
  style: T,
  scaleFactor: number
): Omit<T, 'fontSize'> & { fontSize: string } {
  const baseSizeRem = Number.parseFloat(style.fontSize);
  const scaledSize = `${baseSizeRem * Math.max(0.6, Math.min(1.5, scaleFactor))}rem`;

  return {
    ...style,
    fontSize: scaledSize,
  };
}

// ============================================================================
// Type Exports
// ============================================================================

export type FontFamily = keyof typeof fontFamilies;
export type FontWeight = keyof typeof fontWeights;
export type FontSize = keyof typeof fontSizes;
export type LineHeight = keyof typeof lineHeights;
export type LetterSpacing = keyof typeof letterSpacings;
export type TextStyle = keyof typeof textStyles;
