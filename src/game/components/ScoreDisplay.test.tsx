/**
 * ScoreDisplay Component Tests
 * Tests for the score, multiplier, combo, and lives display
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScoreDisplay } from "./ScoreDisplay";

// Mock the useResponsiveScale hook
vi.mock("../hooks/useResponsiveScale", () => ({
  useResponsiveScale: () => ({
    fontSize: {
      xs: "10px",
      sm: "12px",
      md: "14px",
      lg: "18px",
      xl: "24px",
      title: "32px",
    },
    spacing: {
      xs: "4px",
      sm: "8px",
      md: "12px",
      lg: "16px",
      xl: "24px",
    },
    isMobile: false,
    game: 1,
  }),
}));

// Mock anime.js to avoid animation issues in tests
vi.mock("animejs", () => ({
  animate: vi.fn(),
}));

// Default props for ScoreDisplay
const defaultProps = {
  score: 1000,
  multiplier: 1.0,
  combo: 1,
  level: 1,
  stackHeight: 3,
  bankedAnimals: 0,
  highScore: 5000,
  lives: 3,
  maxLives: 3,
  inDanger: false,
};

describe("ScoreDisplay", () => {
  describe("score display", () => {
    it("displays the score value", () => {
      render(<ScoreDisplay {...defaultProps} score={1234} />);
      expect(screen.getByText("1,234")).toBeInTheDocument();
    });

    it("formats large scores with locale string", () => {
      render(<ScoreDisplay {...defaultProps} score={1234567} />);
      expect(screen.getByText("1,234,567")).toBeInTheDocument();
    });

    it("displays zero score", () => {
      render(<ScoreDisplay {...defaultProps} score={0} />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("updates when score changes", () => {
      const { rerender } = render(<ScoreDisplay {...defaultProps} score={100} />);
      expect(screen.getByText("100")).toBeInTheDocument();

      rerender(<ScoreDisplay {...defaultProps} score={200} />);
      expect(screen.getByText("200")).toBeInTheDocument();
    });
  });

  describe("multiplier display", () => {
    it("displays multiplier when greater than 1", () => {
      render(<ScoreDisplay {...defaultProps} multiplier={2.5} />);
      expect(screen.getByText("×2.5")).toBeInTheDocument();
    });

    it("does not display multiplier when equal to 1", () => {
      render(<ScoreDisplay {...defaultProps} multiplier={1.0} />);
      expect(screen.queryByText(/×1/)).not.toBeInTheDocument();
    });

    it("formats multiplier with one decimal place", () => {
      render(<ScoreDisplay {...defaultProps} multiplier={3.0} />);
      expect(screen.getByText("×3.0")).toBeInTheDocument();
    });

    it("displays high multipliers correctly", () => {
      render(<ScoreDisplay {...defaultProps} multiplier={15.0} />);
      expect(screen.getByText("×15.0")).toBeInTheDocument();
    });
  });

  describe("combo display", () => {
    it("displays combo when greater than 1", () => {
      render(<ScoreDisplay {...defaultProps} combo={5} />);
      expect(screen.getByText("5× COMBO")).toBeInTheDocument();
    });

    it("does not display combo when equal to 1", () => {
      render(<ScoreDisplay {...defaultProps} combo={1} />);
      expect(screen.queryByText(/COMBO/)).not.toBeInTheDocument();
    });

    it("displays large combo values", () => {
      render(<ScoreDisplay {...defaultProps} combo={99} />);
      expect(screen.getByText("99× COMBO")).toBeInTheDocument();
    });

    it("updates when combo changes", () => {
      const { rerender } = render(<ScoreDisplay {...defaultProps} combo={2} />);
      expect(screen.getByText("2× COMBO")).toBeInTheDocument();

      rerender(<ScoreDisplay {...defaultProps} combo={5} />);
      expect(screen.getByText("5× COMBO")).toBeInTheDocument();
    });
  });

  describe("lives display", () => {
    it("renders HeartsDisplay component", () => {
      render(<ScoreDisplay {...defaultProps} lives={3} maxLives={3} />);
      // HeartsDisplay renders SVG hearts
      const hearts = document.querySelectorAll(".heart");
      expect(hearts.length).toBe(3);
    });

    it("displays correct number of hearts for maxLives", () => {
      render(<ScoreDisplay {...defaultProps} lives={2} maxLives={5} />);
      const hearts = document.querySelectorAll(".heart");
      expect(hearts.length).toBe(5);
    });

    it("shows filled hearts based on lives count", () => {
      render(<ScoreDisplay {...defaultProps} lives={2} maxLives={3} />);
      // Hearts component handles filled/empty state via props
      const hearts = document.querySelectorAll(".heart");
      expect(hearts.length).toBe(3);
    });

    it("handles zero lives", () => {
      render(<ScoreDisplay {...defaultProps} lives={0} maxLives={3} />);
      const hearts = document.querySelectorAll(".heart");
      expect(hearts.length).toBe(3);
    });
  });

  describe("level display", () => {
    it("displays the current level", () => {
      render(<ScoreDisplay {...defaultProps} level={5} />);
      expect(screen.getByText("LV.5")).toBeInTheDocument();
    });

    it("displays level 1", () => {
      render(<ScoreDisplay {...defaultProps} level={1} />);
      expect(screen.getByText("LV.1")).toBeInTheDocument();
    });

    it("displays high levels", () => {
      render(<ScoreDisplay {...defaultProps} level={25} />);
      expect(screen.getByText("LV.25")).toBeInTheDocument();
    });
  });

  describe("stack height display", () => {
    it("displays stack height", () => {
      render(<ScoreDisplay {...defaultProps} stackHeight={5} />);
      expect(screen.getByText("STACK: 5")).toBeInTheDocument();
    });

    it("displays zero stack height", () => {
      render(<ScoreDisplay {...defaultProps} stackHeight={0} />);
      expect(screen.getByText("STACK: 0")).toBeInTheDocument();
    });

    it("shows warning indicator when in danger", () => {
      render(<ScoreDisplay {...defaultProps} stackHeight={8} inDanger={true} />);
      expect(screen.getByText(/STACK: 8/)).toBeInTheDocument();
      // Warning emoji should be present when in danger
      expect(screen.getByText(/⚠️/)).toBeInTheDocument();
    });

    it("does not show warning indicator when not in danger", () => {
      render(<ScoreDisplay {...defaultProps} stackHeight={3} inDanger={false} />);
      expect(screen.getByText("STACK: 3")).toBeInTheDocument();
      expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument();
    });

    it("applies danger styling when in danger", () => {
      render(<ScoreDisplay {...defaultProps} inDanger={true} />);
      const stackText = screen.getByText(/STACK:/);
      expect(stackText.className).toContain("text-red-400");
    });

    it("applies normal styling when not in danger", () => {
      render(<ScoreDisplay {...defaultProps} inDanger={false} />);
      const stackText = screen.getByText(/STACK:/);
      expect(stackText.className).toContain("text-orange-300");
    });
  });

  describe("high score display", () => {
    it("displays high score", () => {
      render(<ScoreDisplay {...defaultProps} highScore={9999} />);
      expect(screen.getByText("BEST: 9,999")).toBeInTheDocument();
    });

    it("formats high score with locale string", () => {
      render(<ScoreDisplay {...defaultProps} highScore={1000000} />);
      expect(screen.getByText("BEST: 1,000,000")).toBeInTheDocument();
    });

    it("displays zero high score", () => {
      render(<ScoreDisplay {...defaultProps} highScore={0} />);
      expect(screen.getByText("BEST: 0")).toBeInTheDocument();
    });
  });

  describe("banked animals display", () => {
    it("displays banked animals when greater than 0", () => {
      render(<ScoreDisplay {...defaultProps} bankedAnimals={10} />);
      expect(screen.getByText("BANKED: 10")).toBeInTheDocument();
    });

    it("does not display banked animals when zero", () => {
      render(<ScoreDisplay {...defaultProps} bankedAnimals={0} />);
      expect(screen.queryByText(/BANKED/)).not.toBeInTheDocument();
    });

    it("displays large banked values", () => {
      render(<ScoreDisplay {...defaultProps} bankedAnimals={999} />);
      expect(screen.getByText("BANKED: 999")).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("has pointer-events-none for non-interactive display", () => {
      render(<ScoreDisplay {...defaultProps} />);
      const containers = document.querySelectorAll(".pointer-events-none");
      expect(containers.length).toBeGreaterThan(0);
    });

    it("has game-font class for consistent typography", () => {
      render(<ScoreDisplay {...defaultProps} />);
      const gameFont = document.querySelectorAll(".game-font");
      expect(gameFont.length).toBeGreaterThan(0);
    });

    it("positions elements absolutely in the UI", () => {
      render(<ScoreDisplay {...defaultProps} />);
      const absoluteElements = document.querySelectorAll(".absolute");
      expect(absoluteElements.length).toBeGreaterThan(0);
    });
  });
});
