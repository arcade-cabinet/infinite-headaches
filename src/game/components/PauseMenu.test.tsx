/**
 * PauseMenu Component Tests
 * Tests for the pause menu overlay
 */

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PauseMenu } from "./PauseMenu";

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
  }),
}));

// Mock anime.js to avoid animation issues in tests
vi.mock("animejs", () => ({
  animate: vi.fn(),
}));

// Default props for PauseMenu
const defaultProps = {
  onResume: vi.fn(),
  onMainMenu: vi.fn(),
  onRestart: vi.fn(),
  score: 1500,
  level: 3,
};

describe("PauseMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders pause menu", () => {
      render(<PauseMenu {...defaultProps} />);
      expect(screen.getByText("PAUSED")).toBeInTheDocument();
    });

    it("renders Resume button", () => {
      render(<PauseMenu {...defaultProps} />);
      expect(screen.getByRole("button", { name: /resume/i })).toBeInTheDocument();
    });

    it("renders Main Menu button", () => {
      render(<PauseMenu {...defaultProps} />);
      expect(screen.getByRole("button", { name: /main menu/i })).toBeInTheDocument();
    });

    it("renders Restart button", () => {
      render(<PauseMenu {...defaultProps} />);
      expect(screen.getByRole("button", { name: /restart/i })).toBeInTheDocument();
    });

    it("displays all three action buttons", () => {
      render(<PauseMenu {...defaultProps} />);
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBe(3);
    });
  });

  describe("current score display", () => {
    it("displays current score", () => {
      render(<PauseMenu {...defaultProps} score={2500} />);
      expect(screen.getByText("2,500")).toBeInTheDocument();
    });

    it("displays score label", () => {
      render(<PauseMenu {...defaultProps} />);
      expect(screen.getByText(/Score:/)).toBeInTheDocument();
    });

    it("formats score with locale string", () => {
      render(<PauseMenu {...defaultProps} score={1234567} />);
      expect(screen.getByText("1,234,567")).toBeInTheDocument();
    });

    it("displays zero score", () => {
      render(<PauseMenu {...defaultProps} score={0} />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  describe("current level display", () => {
    it("displays current level", () => {
      render(<PauseMenu {...defaultProps} level={5} />);
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("displays level label", () => {
      render(<PauseMenu {...defaultProps} />);
      expect(screen.getByText(/Level:/)).toBeInTheDocument();
    });
  });

  describe("Resume button", () => {
    it("calls onResume when Resume button is clicked", async () => {
      const user = userEvent.setup();
      const onResume = vi.fn();

      render(<PauseMenu {...defaultProps} onResume={onResume} />);

      await user.click(screen.getByRole("button", { name: /resume/i }));
      expect(onResume).toHaveBeenCalledTimes(1);
    });

    it("Resume button is primary variant", () => {
      render(<PauseMenu {...defaultProps} />);
      const resumeButton = screen.getByRole("button", { name: /resume/i });
      // Primary buttons use barn red background
      expect(resumeButton.className).toContain("bg-[#b91c1c]");
    });
  });

  describe("Main Menu button", () => {
    it("calls onMainMenu when Main Menu button is clicked", async () => {
      const user = userEvent.setup();
      const onMainMenu = vi.fn();

      render(<PauseMenu {...defaultProps} onMainMenu={onMainMenu} />);

      await user.click(screen.getByRole("button", { name: /main menu/i }));
      expect(onMainMenu).toHaveBeenCalledTimes(1);
    });

    it("Main Menu button is secondary variant", () => {
      render(<PauseMenu {...defaultProps} />);
      const mainMenuButton = screen.getByRole("button", { name: /main menu/i });
      // Secondary buttons use weathered wood background
      expect(mainMenuButton.className).toContain("bg-[#554730]");
    });
  });

  describe("Restart button", () => {
    it("calls onRestart when Restart button is clicked", async () => {
      const user = userEvent.setup();
      const onRestart = vi.fn();

      render(<PauseMenu {...defaultProps} onRestart={onRestart} />);

      await user.click(screen.getByRole("button", { name: /restart/i }));
      expect(onRestart).toHaveBeenCalledTimes(1);
    });

    it("Restart button is secondary variant", () => {
      render(<PauseMenu {...defaultProps} />);
      const restartButton = screen.getByRole("button", { name: /restart/i });
      expect(restartButton.className).toContain("bg-[#554730]");
    });
  });

  describe("keyboard interactions", () => {
    it("calls onResume when Escape key is pressed", () => {
      const onResume = vi.fn();

      render(<PauseMenu {...defaultProps} onResume={onResume} />);

      fireEvent.keyDown(window, { key: "Escape" });
      expect(onResume).toHaveBeenCalledTimes(1);
    });

    it("only responds to Escape key, not other keys", () => {
      const onResume = vi.fn();

      render(<PauseMenu {...defaultProps} onResume={onResume} />);

      fireEvent.keyDown(window, { key: "Enter" });
      fireEvent.keyDown(window, { key: "Space" });
      fireEvent.keyDown(window, { key: "a" });

      expect(onResume).not.toHaveBeenCalled();
    });
  });

  describe("backdrop click", () => {
    it("calls onResume when clicking the backdrop", async () => {
      const user = userEvent.setup();
      const onResume = vi.fn();

      render(<PauseMenu {...defaultProps} onResume={onResume} />);

      // Click the backdrop (the fixed overlay)
      const backdrop = document.querySelector(".fixed.inset-0");
      if (backdrop) {
        await user.click(backdrop);
        expect(onResume).toHaveBeenCalledTimes(1);
      }
    });

    it("does not call onResume when clicking inside the menu card", async () => {
      const user = userEvent.setup();
      const onResume = vi.fn();

      render(<PauseMenu {...defaultProps} onResume={onResume} />);

      // Click on the title (inside the card)
      await user.click(screen.getByText("PAUSED"));
      expect(onResume).not.toHaveBeenCalled();
    });
  });

  describe("styling", () => {
    it("has fixed positioning for overlay", () => {
      render(<PauseMenu {...defaultProps} />);
      const overlay = document.querySelector(".fixed.inset-0");
      expect(overlay).toBeInTheDocument();
    });

    it("has z-50 for high stacking order", () => {
      render(<PauseMenu {...defaultProps} />);
      const overlay = document.querySelector(".z-50");
      expect(overlay).toBeInTheDocument();
    });

    it("has backdrop blur effect", () => {
      render(<PauseMenu {...defaultProps} />);
      const overlay = document.querySelector(".backdrop-blur-sm");
      expect(overlay).toBeInTheDocument();
    });

    it("has semi-transparent background", () => {
      render(<PauseMenu {...defaultProps} />);
      const overlay = document.querySelector(".bg-black\\/60");
      expect(overlay).toBeInTheDocument();
    });

    it("displays hint text about resuming", () => {
      render(<PauseMenu {...defaultProps} />);
      expect(screen.getByText(/Press ESC or tap outside to resume/i)).toBeInTheDocument();
    });
  });

  describe("button order", () => {
    it("displays Resume as the first/primary action", () => {
      render(<PauseMenu {...defaultProps} />);
      const buttons = screen.getAllByRole("button");
      expect(buttons[0]).toHaveTextContent(/resume/i);
    });

    it("displays buttons in correct order", () => {
      render(<PauseMenu {...defaultProps} />);
      const buttons = screen.getAllByRole("button");
      expect(buttons[0]).toHaveTextContent(/resume/i);
      expect(buttons[1]).toHaveTextContent(/restart/i);
      expect(buttons[2]).toHaveTextContent(/main menu/i);
    });
  });

  describe("accessibility", () => {
    it("all buttons are focusable", async () => {
      const user = userEvent.setup();
      render(<PauseMenu {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      for (const button of buttons) {
        await user.tab();
        // At least one button should have focus during tabbing
      }
      expect(document.activeElement?.tagName).toBe("BUTTON");
    });

    it("buttons can be activated with keyboard", async () => {
      const user = userEvent.setup();
      const onResume = vi.fn();

      render(<PauseMenu {...defaultProps} onResume={onResume} />);

      const resumeButton = screen.getByRole("button", { name: /resume/i });
      resumeButton.focus();
      await user.keyboard("{Enter}");

      expect(onResume).toHaveBeenCalledTimes(1);
    });
  });
});
