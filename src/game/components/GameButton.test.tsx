/**
 * GameButton Component Tests
 * Tests for the styled game button component
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GameButton } from "./GameButton";

describe("GameButton", () => {
  describe("rendering", () => {
    it("renders children correctly", () => {
      render(<GameButton>Play Game</GameButton>);
      expect(screen.getByRole("button")).toHaveTextContent("Play Game");
    });

    it("renders with complex children", () => {
      render(
        <GameButton>
          <span data-testid="icon">Icon</span>
          <span data-testid="text">Button Text</span>
        </GameButton>
      );
      expect(screen.getByTestId("icon")).toBeInTheDocument();
      expect(screen.getByTestId("text")).toBeInTheDocument();
    });

    it("applies button element attributes", () => {
      render(
        <GameButton type="submit" aria-label="Submit form">
          Submit
        </GameButton>
      );
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "submit");
      expect(button).toHaveAttribute("aria-label", "Submit form");
    });
  });

  describe("click handling", () => {
    it("fires click handler when clicked", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<GameButton onClick={handleClick}>Click Me</GameButton>);

      await user.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("fires click handler multiple times on multiple clicks", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<GameButton onClick={handleClick}>Click Me</GameButton>);

      const button = screen.getByRole("button");
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    it("passes event to click handler", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<GameButton onClick={handleClick}>Click Me</GameButton>);

      await user.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe("disabled state", () => {
    it("prevents clicks when disabled", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <GameButton onClick={handleClick} disabled>
          Disabled Button
        </GameButton>
      );

      await user.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it("has disabled attribute when disabled prop is true", () => {
      render(<GameButton disabled>Disabled</GameButton>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("applies disabled styling classes", () => {
      render(<GameButton disabled>Disabled</GameButton>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("disabled:opacity-50");
      expect(button.className).toContain("disabled:cursor-not-allowed");
    });

    it("is not disabled by default", () => {
      render(<GameButton>Not Disabled</GameButton>);
      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });

  describe("variants", () => {
    it("applies primary variant styles by default", () => {
      render(<GameButton>Primary</GameButton>);
      const button = screen.getByRole("button");
      // Primary variant uses barn red
      expect(button.className).toContain("bg-[#b91c1c]");
      expect(button.className).toContain("text-[#fef9c3]");
    });

    it("applies primary variant styles explicitly", () => {
      render(<GameButton variant="primary">Primary</GameButton>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-[#b91c1c]");
    });

    it("applies secondary variant styles", () => {
      render(<GameButton variant="secondary">Secondary</GameButton>);
      const button = screen.getByRole("button");
      // Secondary variant uses weathered wood
      expect(button.className).toContain("bg-[#554730]");
      expect(button.className).toContain("text-[#fef9c3]");
    });

    it("primary and secondary have different background colors", () => {
      const { rerender } = render(<GameButton variant="primary">Test</GameButton>);
      const primaryButton = screen.getByRole("button");
      const primaryBg = primaryButton.className.includes("bg-[#b91c1c]");

      rerender(<GameButton variant="secondary">Test</GameButton>);
      const secondaryButton = screen.getByRole("button");
      const secondaryBg = secondaryButton.className.includes("bg-[#554730]");

      expect(primaryBg).toBe(true);
      expect(secondaryBg).toBe(true);
    });
  });

  describe("sizes", () => {
    it("applies medium size by default", () => {
      render(<GameButton>Medium</GameButton>);
      const button = screen.getByRole("button");
      // Medium size has specific padding and text size
      expect(button.className).toContain("py-3");
      expect(button.className).toContain("px-8");
    });

    it("applies small size styles", () => {
      render(<GameButton size="sm">Small</GameButton>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("py-2");
      expect(button.className).toContain("px-6");
    });

    it("applies large size styles", () => {
      render(<GameButton size="lg">Large</GameButton>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("py-4");
      expect(button.className).toContain("px-10");
    });
  });

  describe("styling", () => {
    it("applies custom className", () => {
      render(<GameButton className="custom-class">Custom</GameButton>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("custom-class");
    });

    it("applies custom style object", () => {
      render(<GameButton style={{ backgroundColor: "red" }}>Styled</GameButton>);
      const button = screen.getByRole("button");
      expect(button).toHaveStyle({ backgroundColor: "red" });
    });

    it("has game-font class for consistent typography", () => {
      render(<GameButton>Font Test</GameButton>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("game-font");
    });

    it("has rounded-full for pill shape", () => {
      render(<GameButton>Rounded</GameButton>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("rounded-full");
    });

    it("has uppercase text transform", () => {
      render(<GameButton>uppercase</GameButton>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("uppercase");
    });

    it("has touch-manipulation for mobile optimization", () => {
      render(<GameButton>Touch</GameButton>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("touch-manipulation");
    });
  });

  describe("accessibility", () => {
    it("is focusable", async () => {
      const user = userEvent.setup();
      render(<GameButton>Focusable</GameButton>);

      await user.tab();
      expect(screen.getByRole("button")).toHaveFocus();
    });

    it("can be activated with keyboard", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<GameButton onClick={handleClick}>Keyboard</GameButton>);

      const button = screen.getByRole("button");
      button.focus();
      await user.keyboard("{Enter}");

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("can be activated with space key", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<GameButton onClick={handleClick}>Space</GameButton>);

      const button = screen.getByRole("button");
      button.focus();
      await user.keyboard(" ");

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("has select-none to prevent text selection", () => {
      render(<GameButton>No Select</GameButton>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("select-none");
    });
  });
});
