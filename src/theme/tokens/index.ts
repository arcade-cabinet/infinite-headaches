/**
 * Nebraska Homestead Design Tokens
 *
 * Barrel export for all theme tokens
 * Import tokens from this file for convenient access to the complete design system
 */

// ============================================================================
// Color Tokens
// ============================================================================
export {
  colors,
  gameColors,
  type ColorToken,
  type GameColorToken,
} from './colors';

// ============================================================================
// Typography Tokens
// ============================================================================
export {
  // Font definitions
  fontFamilies,
  fontWeights,
  fontSizes,
  lineHeights,
  letterSpacings,
  // Pre-composed text styles
  textStyles,
  // Utility functions
  getResponsiveFontSizes,
  createResponsiveTextStyle,
  // Types
  type FontFamily,
  type FontWeight,
  type FontSize,
  type LineHeight,
  type LetterSpacing,
  type TextStyle,
} from './typography';

// ============================================================================
// Spacing Tokens
// ============================================================================
export {
  // Core spacing scale
  spacing,
  // Semantic aliases
  spacingSemantics,
  // Game-specific spacing
  gameSpacing,
  // Utility functions
  getResponsiveSpacing,
  getResponsiveGameSpacing,
  spacingToPx,
  spacingToScaledPx,
  // Types
  type SpacingKey,
  type SpacingSemanticKey,
  type GameSpacingKey,
} from './spacing';

// ============================================================================
// Combined Theme Token Object
// ============================================================================

import { colors, gameColors } from './colors';
import {
  fontFamilies,
  fontWeights,
  fontSizes,
  lineHeights,
  letterSpacings,
  textStyles,
} from './typography';
import { spacing, spacingSemantics, gameSpacing } from './spacing';

/**
 * Complete theme tokens object
 * Use this when you need access to the entire theme in one place
 */
export const tokens = {
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
} as const;

export type Tokens = typeof tokens;
