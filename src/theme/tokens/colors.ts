/**
 * Nebraska Homestead Color Palette
 *
 * Inspired by:
 * - Golden wheat fields and hay bales
 * - Red barn siding and weathered wood
 * - Blue prairie skies and storm clouds
 * - Green pastures and corn fields
 * - Earth tones of Nebraska farmland
 */

// Base color palette - Nebraska Homestead theme
export const colors = {
  // Primary: Barn Red - the iconic color of American farms
  barnRed: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#b91c1c', // Primary barn red
    600: '#991b1b',
    700: '#7f1d1d',
    800: '#651a1a',
    900: '#450a0a',
  },

  // Secondary: Wheat Gold - Nebraska's golden harvest
  wheat: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308', // Primary wheat gold
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  },

  // Accent: Prairie Sky Blue
  sky: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Clear prairie sky
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Nature: Pasture Green
  pasture: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Lush pasture green
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Earth: Soil Brown - rich Nebraska earth
  soil: {
    50: '#fdf8f6',
    100: '#f2e8e5',
    200: '#eaddd7',
    300: '#d6c3b9',
    400: '#b89f94',
    500: '#8b7355', // Rich soil brown
    600: '#73604c',
    700: '#5d4d3d',
    800: '#4a3c30',
    900: '#382e25',
  },

  // Wood: Weathered Barn Wood
  wood: {
    50: '#faf8f5',
    100: '#f5f0e8',
    200: '#e8dfd0',
    300: '#d4c4ac',
    400: '#bfa885',
    500: '#a08b64', // Weathered wood
    600: '#857248',
    700: '#6b5a3a',
    800: '#554730',
    900: '#423728',
  },

  // Storm: Tornado/Storm grays
  storm: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b', // Storm gray
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Utility colors
  white: '#ffffff',
  black: '#000000',

  // Semantic colors
  danger: '#dc2626',  // Red for danger states
  warning: '#f59e0b', // Amber for warnings
  success: '#22c55e', // Green for success
  info: '#3b82f6',    // Blue for information
} as const;

// Game-specific color assignments
export const gameColors = {
  // UI Elements
  ui: {
    primary: colors.barnRed[500],
    primaryHover: colors.barnRed[600],
    primaryActive: colors.barnRed[700],

    secondary: colors.wheat[500],
    secondaryHover: colors.wheat[600],
    secondaryActive: colors.wheat[700],

    accent: colors.sky[500],
    accentHover: colors.sky[600],

    background: colors.soil[900],
    backgroundLight: colors.soil[800],
    surface: colors.wood[800],
    surfaceLight: colors.wood[700],

    text: colors.wheat[100],
    textMuted: colors.wheat[300],
    textDark: colors.soil[900],

    border: colors.wood[600],
    borderLight: colors.wood[500],
  },

  // Game elements
  game: {
    platform: colors.pasture[600],
    platformHighlight: colors.pasture[500],

    bankZone: colors.barnRed[600],
    bankZoneActive: colors.barnRed[500],

    danger: colors.danger,
    dangerGlow: 'rgba(220, 38, 38, 0.3)',

    warning: colors.warning,
    warningGlow: 'rgba(245, 158, 11, 0.3)',

    success: colors.success,
    successGlow: 'rgba(34, 197, 94, 0.3)',
  },

  // Animal colors (for 2D rendering fallback)
  animals: {
    cow: { primary: '#4a3728', spots: '#f5f5f5' },
    pig: { primary: '#f8a5b5', snout: '#ffcdd2' },
    chicken: { primary: '#ff8a65', comb: '#ef5350' },
    duck: { primary: '#fdd835', beak: '#ff8f00' },
    sheep: { primary: '#eceff1', face: '#37474f' },
    horse: { primary: '#8d6e63', mane: '#5d4037' },
    rabbit: { primary: '#bcaaa4', ears: '#ffcdd2' },
    chick: { primary: '#fff59d', beak: '#ff8f00' },
    penguin: { primary: '#37474f', belly: '#eceff1' }, // Ice special
    frog: { primary: '#81c784', belly: '#c8e6c9' },    // Fire special
  },

  // Special effects
  effects: {
    fire: {
      core: '#ffeb3b',
      mid: '#ff9800',
      outer: '#f44336',
      glow: 'rgba(255, 152, 0, 0.6)',
    },
    ice: {
      solid: 'rgba(129, 212, 250, 0.8)',
      crack: 'rgba(255, 255, 255, 0.9)',
      glow: 'rgba(129, 212, 250, 0.4)',
    },
    tornado: {
      debris: colors.soil[600],
      wind: 'rgba(100, 116, 139, 0.3)',
      core: colors.storm[700],
    },
  },

  // Environment
  environment: {
    skyDay: colors.sky[400],
    skyStorm: colors.storm[600],
    ground: colors.pasture[700],
    horizon: colors.wheat[300],
  },

  // Hearts/Lives
  hearts: {
    full: '#ef4444',
    empty: 'rgba(239, 68, 68, 0.3)',
    glow: 'rgba(239, 68, 68, 0.5)',
  },
} as const;

export type ColorToken = keyof typeof colors;
export type GameColorToken = keyof typeof gameColors;
