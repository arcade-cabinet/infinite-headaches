/**
 * Integration Tests for Theme System
 *
 * Tests the theme system including:
 * - Theme context provides correct colors
 * - Color tokens are valid hex/rgb
 * - Spacing tokens are consistent
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import {
  ThemeProvider,
  useTheme,
  useResolvedTheme,
  useIsDarkTheme,
  useColors,
  useTypography,
  useSpacing,
  useResponsiveTheme,
  useThemeSafe,
} from "@/theme/context";
import { colors, gameColors } from "@/theme/tokens/colors";
import {
  spacing,
  spacingSemantics,
  gameSpacing,
  getResponsiveSpacing,
  getResponsiveGameSpacing,
  spacingToPx,
  spacingToScaledPx,
} from "@/theme/tokens/spacing";
import {
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacings,
  textStyles,
  getResponsiveFontSizes,
} from "@/theme/tokens/typography";

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    _getStore: () => store,
  };
})();

describe("Theme System Integration", () => {
  beforeEach(() => {
    // Setup localStorage mock
    Object.defineProperty(window, "localStorage", { value: mockLocalStorage });
    mockLocalStorage.clear();

    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-color-scheme: dark"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Color Tokens", () => {
    describe("Base Color Palette", () => {
      it("should have barnRed color scale defined", () => {
        expect(colors.barnRed).toBeDefined();
        expect(colors.barnRed[500]).toBe("#b91c1c");
      });

      it("should have wheat color scale defined", () => {
        expect(colors.wheat).toBeDefined();
        expect(colors.wheat[500]).toBe("#eab308");
      });

      it("should have sky color scale defined", () => {
        expect(colors.sky).toBeDefined();
        expect(colors.sky[500]).toBe("#0ea5e9");
      });

      it("should have pasture color scale defined", () => {
        expect(colors.pasture).toBeDefined();
        expect(colors.pasture[500]).toBe("#22c55e");
      });

      it("should have soil color scale defined", () => {
        expect(colors.soil).toBeDefined();
        expect(colors.soil[500]).toBe("#8b7355");
      });

      it("should have wood color scale defined", () => {
        expect(colors.wood).toBeDefined();
        expect(typeof colors.wood[500]).toBe("string");
      });

      it("should have storm color scale defined", () => {
        expect(colors.storm).toBeDefined();
        expect(colors.storm[500]).toBe("#64748b");
      });
    });

    describe("Color Value Validation", () => {
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      const rgbaRegex = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/;

      function isValidColor(value: string): boolean {
        return hexColorRegex.test(value) || rgbaRegex.test(value);
      }

      it("should have valid hex colors for all color scales", () => {
        const colorScales = [
          colors.barnRed,
          colors.wheat,
          colors.sky,
          colors.pasture,
          colors.soil,
          colors.wood,
          colors.storm,
        ];

        for (const scale of colorScales) {
          for (const [key, value] of Object.entries(scale)) {
            expect(
              isValidColor(value),
              `Color ${key}: ${value} should be valid hex`
            ).toBe(true);
          }
        }
      });

      it("should have valid utility colors", () => {
        expect(colors.white).toBe("#ffffff");
        expect(colors.black).toBe("#000000");
      });

      it("should have valid semantic colors", () => {
        expect(isValidColor(colors.danger)).toBe(true);
        expect(isValidColor(colors.warning)).toBe(true);
        expect(isValidColor(colors.success)).toBe(true);
        expect(isValidColor(colors.info)).toBe(true);
      });
    });

    describe("Game Colors", () => {
      it("should have UI color mappings", () => {
        expect(gameColors.ui).toBeDefined();
        expect(gameColors.ui.primary).toBe(colors.barnRed[500]);
        expect(gameColors.ui.secondary).toBe(colors.wheat[500]);
      });

      it("should have game element colors", () => {
        expect(gameColors.game).toBeDefined();
        expect(gameColors.game.platform).toBeDefined();
        expect(gameColors.game.bankZone).toBeDefined();
        expect(gameColors.game.danger).toBeDefined();
      });

      it("should have animal colors defined", () => {
        expect(gameColors.animals).toBeDefined();
        expect(gameColors.animals.cow).toBeDefined();
        expect(gameColors.animals.pig).toBeDefined();
        expect(gameColors.animals.chicken).toBeDefined();
        expect(gameColors.animals.duck).toBeDefined();
        expect(gameColors.animals.sheep).toBeDefined();
      });

      it("should have effect colors defined", () => {
        expect(gameColors.effects).toBeDefined();
        expect(gameColors.effects.fire).toBeDefined();
        expect(gameColors.effects.ice).toBeDefined();
        expect(gameColors.effects.tornado).toBeDefined();
      });

      it("should have hearts colors defined", () => {
        expect(gameColors.hearts).toBeDefined();
        expect(gameColors.hearts.full).toBeDefined();
        expect(gameColors.hearts.empty).toBeDefined();
      });
    });
  });

  describe("Spacing Tokens", () => {
    describe("Base Spacing Scale", () => {
      it("should have spacing scale defined", () => {
        expect(spacing).toBeDefined();
        expect(spacing.none).toBe("0");
        expect(spacing.px).toBe("1px");
      });

      it("should have rem-based spacing values", () => {
        expect(spacing["1"]).toBe("0.25rem"); // 4px
        expect(spacing["2"]).toBe("0.5rem"); // 8px
        expect(spacing["4"]).toBe("1rem"); // 16px
        expect(spacing["8"]).toBe("2rem"); // 32px
      });

      it("should have progressive spacing values", () => {
        const spacingKeys = ["1", "2", "4", "8", "16"] as const;
        const pxValues = spacingKeys.map((key) => spacingToPx(key));

        // Each value should be larger than the previous
        for (let i = 1; i < pxValues.length; i++) {
          expect(pxValues[i]).toBeGreaterThan(pxValues[i - 1]);
        }
      });
    });

    describe("Semantic Spacing", () => {
      it("should have semantic spacing aliases", () => {
        expect(spacingSemantics).toBeDefined();
        expect(spacingSemantics.xs).toBeDefined();
        expect(spacingSemantics.sm).toBeDefined();
        expect(spacingSemantics.md).toBeDefined();
        expect(spacingSemantics.lg).toBeDefined();
        expect(spacingSemantics.xl).toBeDefined();
      });

      it("should have component-specific spacing", () => {
        expect(spacingSemantics.buttonPaddingX).toBeDefined();
        expect(spacingSemantics.buttonPaddingY).toBeDefined();
        expect(spacingSemantics.cardPadding).toBeDefined();
        expect(spacingSemantics.inputPaddingX).toBeDefined();
      });

      it("should have touch target minimum size", () => {
        expect(spacingSemantics.touchTarget).toBe(spacing["11"]); // 44px
      });
    });

    describe("Game Spacing", () => {
      it("should have game-specific spacing tokens", () => {
        expect(gameSpacing).toBeDefined();
        expect(gameSpacing.hudPadding).toBeDefined();
        expect(gameSpacing.scorePadding).toBeDefined();
        expect(gameSpacing.heartsGap).toBeDefined();
      });

      it("should have menu spacing", () => {
        expect(gameSpacing.menuItemGap).toBeDefined();
        expect(gameSpacing.menuPadding).toBeDefined();
      });

      it("should have tutorial spacing", () => {
        expect(gameSpacing.tutorialPadding).toBeDefined();
        expect(gameSpacing.tutorialStepGap).toBeDefined();
      });

      it("should have minimum touch size for accessibility", () => {
        expect(gameSpacing.minTouchSize).toBe(spacing["11"]); // 44px minimum
      });
    });

    describe("Spacing Utilities", () => {
      it("should convert spacing to pixels correctly", () => {
        expect(spacingToPx("none")).toBe(0);
        expect(spacingToPx("px")).toBe(1);
        expect(spacingToPx("1")).toBe(4); // 0.25rem * 16
        expect(spacingToPx("4")).toBe(16); // 1rem * 16
      });

      it("should scale spacing to pixels", () => {
        expect(spacingToScaledPx("4", 1)).toBe(16);
        expect(spacingToScaledPx("4", 2)).toBe(32);
        expect(spacingToScaledPx("4", 0.5)).toBe(8);
      });

      it("should generate responsive spacing", () => {
        const responsive = getResponsiveSpacing(1.0);

        expect(responsive.xs).toBeDefined();
        expect(responsive.md).toBeDefined();
        expect(responsive.xl).toBeDefined();
      });

      it("should clamp responsive spacing scale factor", () => {
        // Too low should be clamped
        const lowScale = getResponsiveSpacing(0.1);
        const normalScale = getResponsiveSpacing(0.6);

        // Both should be valid (clamped to min 0.6)
        expect(lowScale.md).toBe(normalScale.md);
      });

      it("should generate responsive game spacing", () => {
        const responsive = getResponsiveGameSpacing(1.0);

        expect(responsive.hudPadding).toBeDefined();
        expect(responsive.scorePadding).toBeDefined();
        expect(responsive.menuPadding).toBeDefined();
      });
    });
  });

  describe("Typography Tokens", () => {
    it("should have font families defined", () => {
      expect(fontFamilies).toBeDefined();
    });

    it("should have font sizes defined", () => {
      expect(fontSizes).toBeDefined();
      expect(fontSizes.xs).toBeDefined();
      expect(fontSizes.sm).toBeDefined();
      expect(fontSizes.base).toBeDefined();
      expect(fontSizes.lg).toBeDefined();
      expect(fontSizes.xl).toBeDefined();
    });

    it("should have font weights defined", () => {
      expect(fontWeights).toBeDefined();
      expect(fontWeights.normal).toBeDefined();
      expect(fontWeights.medium).toBeDefined();
      expect(fontWeights.bold).toBeDefined();
    });

    it("should have line heights defined", () => {
      expect(lineHeights).toBeDefined();
    });

    it("should have letter spacings defined", () => {
      expect(letterSpacings).toBeDefined();
    });

    it("should have text styles defined", () => {
      expect(textStyles).toBeDefined();
    });

    it("should generate responsive font sizes", () => {
      const responsive = getResponsiveFontSizes(1.0);

      expect(responsive).toBeDefined();
      expect(typeof responsive.base).toBe("string");
    });
  });

  describe("ThemeProvider Context", () => {
    function TestConsumer() {
      const theme = useTheme();
      return (
        <div>
          <span data-testid="mode">{theme.mode}</span>
          <span data-testid="resolved">{theme.resolvedTheme}</span>
          <span data-testid="has-colors">{String(!!theme.colors)}</span>
          <span data-testid="has-spacing">{String(!!theme.spacing)}</span>
          <span data-testid="has-typography">{String(!!theme.typography)}</span>
          <button onClick={theme.toggleTheme} data-testid="toggle">
            Toggle
          </button>
          <button onClick={() => theme.setMode("light")} data-testid="set-light">
            Light
          </button>
        </div>
      );
    }

    it("should provide default theme mode", () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("mode").textContent).toBe("dark");
    });

    it("should provide color tokens through context", () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("has-colors").textContent).toBe("true");
    });

    it("should provide spacing tokens through context", () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("has-spacing").textContent).toBe("true");
    });

    it("should provide typography tokens through context", () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("has-typography").textContent).toBe("true");
    });

    it("should toggle theme on toggleTheme call", () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );

      const initialTheme = screen.getByTestId("resolved").textContent;
      fireEvent.click(screen.getByTestId("toggle"));

      expect(screen.getByTestId("resolved").textContent).not.toBe(initialTheme);
    });

    it("should set theme mode via setMode", () => {
      render(
        <ThemeProvider defaultMode="dark">
          <TestConsumer />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByTestId("set-light"));

      expect(screen.getByTestId("mode").textContent).toBe("light");
    });

    it("should respect forcedTheme prop", () => {
      render(
        <ThemeProvider forcedTheme="light">
          <TestConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("resolved").textContent).toBe("light");

      // Toggle should not change forced theme
      fireEvent.click(screen.getByTestId("toggle"));
      expect(screen.getByTestId("resolved").textContent).toBe("light");
    });

    it("should persist theme choice to localStorage", () => {
      render(
        <ThemeProvider storageKey="test-theme">
          <TestConsumer />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByTestId("set-light"));

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith("test-theme", "light");
    });

    it("should load theme from localStorage", () => {
      mockLocalStorage.getItem.mockReturnValue("light");

      render(
        <ThemeProvider storageKey="test-theme">
          <TestConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("mode").textContent).toBe("light");
    });
  });

  describe("Theme Convenience Hooks", () => {
    function ResolvedThemeConsumer() {
      const resolved = useResolvedTheme();
      return <span data-testid="resolved">{resolved}</span>;
    }

    function IsDarkConsumer() {
      const isDark = useIsDarkTheme();
      return <span data-testid="is-dark">{String(isDark)}</span>;
    }

    function ColorsConsumer() {
      const { colors, gameColors } = useColors();
      return (
        <div>
          <span data-testid="has-colors">{String(!!colors)}</span>
          <span data-testid="has-game-colors">{String(!!gameColors)}</span>
        </div>
      );
    }

    function TypographyConsumer() {
      const typography = useTypography();
      return <span data-testid="has-typography">{String(!!typography)}</span>;
    }

    function SpacingConsumer() {
      const spacing = useSpacing();
      return <span data-testid="has-spacing">{String(!!spacing)}</span>;
    }

    function ResponsiveConsumer() {
      const responsive = useResponsiveTheme();
      return (
        <div>
          <span data-testid="has-font-sizes">{String(!!responsive.getFontSizes)}</span>
          <span data-testid="has-spacing">{String(!!responsive.getSpacing)}</span>
        </div>
      );
    }

    it("should provide resolved theme via useResolvedTheme", () => {
      render(
        <ThemeProvider defaultMode="dark">
          <ResolvedThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("resolved").textContent).toBe("dark");
    });

    it("should provide isDark boolean via useIsDarkTheme", () => {
      render(
        <ThemeProvider defaultMode="dark">
          <IsDarkConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("is-dark").textContent).toBe("true");
    });

    it("should provide colors via useColors", () => {
      render(
        <ThemeProvider>
          <ColorsConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("has-colors").textContent).toBe("true");
      expect(screen.getByTestId("has-game-colors").textContent).toBe("true");
    });

    it("should provide typography via useTypography", () => {
      render(
        <ThemeProvider>
          <TypographyConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("has-typography").textContent).toBe("true");
    });

    it("should provide spacing via useSpacing", () => {
      render(
        <ThemeProvider>
          <SpacingConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("has-spacing").textContent).toBe("true");
    });

    it("should provide responsive utilities via useResponsiveTheme", () => {
      render(
        <ThemeProvider>
          <ResponsiveConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("has-font-sizes").textContent).toBe("true");
      expect(screen.getByTestId("has-spacing").textContent).toBe("true");
    });
  });

  describe("Theme Error Handling", () => {
    it("should throw error when useTheme is used outside provider", () => {
      function TestComponent() {
        const theme = useTheme();
        return <div>{theme.mode}</div>;
      }

      expect(() => render(<TestComponent />)).toThrow();
    });

    it("should return null for useThemeSafe outside provider", () => {
      function TestComponent() {
        const theme = useThemeSafe();
        return <span data-testid="result">{String(theme === null)}</span>;
      }

      render(<TestComponent />);
      expect(screen.getByTestId("result").textContent).toBe("true");
    });
  });

  describe("CSS Variable Integration", () => {
    function CssVarsConsumer() {
      const theme = useTheme();
      const varRef = theme.cssVars.get("test-var");
      return <span data-testid="var-ref">{varRef}</span>;
    }

    it("should provide CSS variable getter", () => {
      render(
        <ThemeProvider>
          <CssVarsConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("var-ref").textContent).toBe("var(--test-var)");
    });
  });
});
