/**
 * Nebraska Homestead Spacing System
 *
 * Based on a 4px grid system for consistent visual rhythm
 * Integrates with Tailwind CSS 4 and the useResponsiveScale hook
 */

// ============================================================================
// Base Spacing Scale
// ============================================================================

/**
 * Core spacing scale based on 4px increments
 * Named semantically for easy mental mapping
 */
export const spacing = {
  /** 0px - No spacing */
  none: '0',
  /** 1px - Hairline borders, subtle separations */
  px: '1px',
  /** 2px - Micro spacing for dense UI */
  '0.5': '0.125rem',
  /** 4px - Base unit, tight spacing */
  '1': '0.25rem',
  /** 6px - Between tight and small */
  '1.5': '0.375rem',
  /** 8px - Small gaps, icon padding */
  '2': '0.5rem',
  /** 10px - Button padding vertical */
  '2.5': '0.625rem',
  /** 12px - Default small spacing */
  '3': '0.75rem',
  /** 14px - Button padding horizontal */
  '3.5': '0.875rem',
  /** 16px - Standard gap, card padding */
  '4': '1rem',
  /** 20px - Medium spacing */
  '5': '1.25rem',
  /** 24px - Section gaps */
  '6': '1.5rem',
  /** 28px - Larger gaps */
  '7': '1.75rem',
  /** 32px - Component margins */
  '8': '2rem',
  /** 36px - */
  '9': '2.25rem',
  /** 40px - Section padding */
  '10': '2.5rem',
  /** 44px - Touch target minimum */
  '11': '2.75rem',
  /** 48px - Large spacing */
  '12': '3rem',
  /** 56px - */
  '14': '3.5rem',
  /** 64px - Page margins */
  '16': '4rem',
  /** 80px - Large section spacing */
  '20': '5rem',
  /** 96px - Major section breaks */
  '24': '6rem',
  /** 112px - */
  '28': '7rem',
  /** 128px - Hero spacing */
  '32': '8rem',
  /** 144px - */
  '36': '9rem',
  /** 160px - */
  '40': '10rem',
  /** 192px - */
  '48': '12rem',
  /** 224px - */
  '56': '14rem',
  /** 256px - */
  '64': '16rem',
} as const;

// ============================================================================
// Semantic Spacing Aliases
// ============================================================================

/**
 * Semantic spacing tokens for common use cases
 * Maps to the numeric scale for consistency
 */
export const spacingSemantics = {
  // Size aliases (xs through 3xl)
  '3xs': spacing['0.5'], // 2px
  '2xs': spacing['1'], // 4px
  xs: spacing['2'], // 8px
  sm: spacing['3'], // 12px
  md: spacing['4'], // 16px
  lg: spacing['6'], // 24px
  xl: spacing['8'], // 32px
  '2xl': spacing['12'], // 48px
  '3xl': spacing['16'], // 64px

  // Component-specific
  /** Padding inside buttons */
  buttonPaddingX: spacing['4'], // 16px
  buttonPaddingY: spacing['2.5'], // 10px
  /** Padding inside small buttons */
  buttonSmallPaddingX: spacing['3'], // 12px
  buttonSmallPaddingY: spacing['2'], // 8px
  /** Padding inside large buttons */
  buttonLargePaddingX: spacing['6'], // 24px
  buttonLargePaddingY: spacing['3.5'], // 14px

  /** Card padding */
  cardPadding: spacing['4'], // 16px
  cardPaddingLarge: spacing['6'], // 24px

  /** Input field padding */
  inputPaddingX: spacing['3'], // 12px
  inputPaddingY: spacing['2.5'], // 10px

  /** Gap between form elements */
  formGap: spacing['4'], // 16px
  formGroupGap: spacing['6'], // 24px

  /** Gap between inline elements */
  inlineGap: spacing['2'], // 8px

  /** Standard icon spacing */
  iconGap: spacing['2'], // 8px

  /** Touch target size (minimum) */
  touchTarget: spacing['11'], // 44px

  /** Modal/dialog spacing */
  modalPadding: spacing['6'], // 24px
  modalGap: spacing['4'], // 16px

  /** Page layout */
  pagePaddingX: spacing['4'], // 16px
  pagePaddingY: spacing['6'], // 24px
  pageMaxWidth: spacing['64'], // 256px (use for max-width containers)

  /** Section spacing */
  sectionGap: spacing['8'], // 32px
  sectionPadding: spacing['6'], // 24px
} as const;

// ============================================================================
// Game-Specific Spacing
// ============================================================================

/**
 * Spacing tokens specifically for game UI elements
 */
export const gameSpacing = {
  /** HUD element padding */
  hudPadding: spacing['3'], // 12px
  hudGap: spacing['4'], // 16px

  /** Score display padding */
  scorePadding: spacing['4'], // 16px

  /** Heart/lives indicator gap */
  heartsGap: spacing['1'], // 4px

  /** Achievement toast padding */
  toastPadding: spacing['4'], // 16px
  toastMargin: spacing['4'], // 16px

  /** Pause menu spacing */
  menuItemGap: spacing['3'], // 12px
  menuPadding: spacing['6'], // 24px

  /** Tutorial overlay padding */
  tutorialPadding: spacing['6'], // 24px
  tutorialStepGap: spacing['4'], // 16px

  /** Game over screen spacing */
  gameOverPadding: spacing['8'], // 32px
  gameOverGap: spacing['6'], // 24px

  /** Character select grid gap */
  characterGridGap: spacing['4'], // 16px

  /** Safe area minimum */
  safeAreaMin: spacing['4'], // 16px

  /** Minimum button touch area (accessibility) */
  minTouchSize: spacing['11'], // 44px

  /** Floating action button spacing from edges */
  fabOffset: spacing['4'], // 16px
} as const;

// ============================================================================
// Responsive Spacing Utilities
// ============================================================================

/**
 * Get responsive spacing values based on scale factor from useResponsiveScale
 * @param scaleFactor - The base scale (typically 0.6-1.5)
 */
export function getResponsiveSpacing(scaleFactor: number) {
  const clampedScale = Math.max(0.6, Math.min(1.5, scaleFactor));

  // Convert rem values to scaled versions
  const scaleRem = (remStr: string): string => {
    if (remStr === '0' || remStr === '1px') return remStr;
    const value = Number.parseFloat(remStr);
    return `${(value * clampedScale).toFixed(3)}rem`;
  };

  return {
    '3xs': scaleRem(spacingSemantics['3xs']),
    '2xs': scaleRem(spacingSemantics['2xs']),
    xs: scaleRem(spacingSemantics.xs),
    sm: scaleRem(spacingSemantics.sm),
    md: scaleRem(spacingSemantics.md),
    lg: scaleRem(spacingSemantics.lg),
    xl: scaleRem(spacingSemantics.xl),
    '2xl': scaleRem(spacingSemantics['2xl']),
    '3xl': scaleRem(spacingSemantics['3xl']),
  } as const;
}

/**
 * Get responsive game spacing based on game scale
 * @param gameScale - The game scale from useResponsiveScale (typically 0.5-1.3)
 */
export function getResponsiveGameSpacing(gameScale: number) {
  const clampedScale = Math.max(0.5, Math.min(1.3, gameScale));

  const scaleRem = (remStr: string): string => {
    if (remStr === '0' || remStr === '1px') return remStr;
    const value = Number.parseFloat(remStr);
    return `${(value * clampedScale).toFixed(3)}rem`;
  };

  return {
    hudPadding: scaleRem(gameSpacing.hudPadding),
    hudGap: scaleRem(gameSpacing.hudGap),
    scorePadding: scaleRem(gameSpacing.scorePadding),
    heartsGap: scaleRem(gameSpacing.heartsGap),
    toastPadding: scaleRem(gameSpacing.toastPadding),
    toastMargin: scaleRem(gameSpacing.toastMargin),
    menuItemGap: scaleRem(gameSpacing.menuItemGap),
    menuPadding: scaleRem(gameSpacing.menuPadding),
    tutorialPadding: scaleRem(gameSpacing.tutorialPadding),
    tutorialStepGap: scaleRem(gameSpacing.tutorialStepGap),
    gameOverPadding: scaleRem(gameSpacing.gameOverPadding),
    gameOverGap: scaleRem(gameSpacing.gameOverGap),
    characterGridGap: scaleRem(gameSpacing.characterGridGap),
    safeAreaMin: scaleRem(gameSpacing.safeAreaMin),
    // Touch sizes should not scale below accessibility minimums
    minTouchSize: `max(${gameSpacing.minTouchSize}, ${scaleRem(gameSpacing.minTouchSize)})`,
    fabOffset: scaleRem(gameSpacing.fabOffset),
  } as const;
}

/**
 * Create a spacing value in pixels
 * Useful for canvas/game rendering that requires numeric values
 * @param spacingKey - Key from the spacing scale
 */
export function spacingToPx(spacingKey: keyof typeof spacing): number {
  const value = spacing[spacingKey];
  if (value === '0') return 0;
  if (value === '1px') return 1;
  // Convert rem to px (assuming 16px base)
  return Number.parseFloat(value) * 16;
}

/**
 * Create scaled pixel value for game rendering
 * @param spacingKey - Key from the spacing scale
 * @param scale - Scale multiplier
 */
export function spacingToScaledPx(
  spacingKey: keyof typeof spacing,
  scale: number
): number {
  return Math.round(spacingToPx(spacingKey) * scale);
}

// ============================================================================
// Type Exports
// ============================================================================

export type SpacingKey = keyof typeof spacing;
export type SpacingSemanticKey = keyof typeof spacingSemantics;
export type GameSpacingKey = keyof typeof gameSpacing;
