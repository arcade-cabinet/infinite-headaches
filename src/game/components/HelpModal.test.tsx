/**
 * HelpModal Component Tests
 * Tests for the help/how-to-play modal
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HelpModal } from "./HelpModal";

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

// Mock platform module
vi.mock("../../platform", () => ({
  platform: {
    isNative: () => false,
  },
}));

// Mock anime.js to avoid animation issues in tests
vi.mock("animejs", () => ({
  animate: vi.fn((element, options) => {
    // Immediately call complete callback if provided
    if (options.complete) {
      options.complete();
    }
  }),
}));

describe("HelpModal", () => {
  describe("visibility", () => {
    it("renders when visible", () => {
      render(<HelpModal onClose={vi.fn()} />);
      expect(screen.getByText("HOW TO PLAY")).toBeInTheDocument();
    });

    it("displays the modal title", () => {
      render(<HelpModal onClose={vi.fn()} />);
      expect(screen.getByText("HOW TO PLAY")).toBeInTheDocument();
    });
  });

  describe("tab navigation", () => {
    it("renders all three tabs", () => {
      render(<HelpModal onClose={vi.fn()} />);
      expect(screen.getByRole("button", { name: /basics/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /controls/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /tips/i })).toBeInTheDocument();
    });

    it("starts with Basics tab active", () => {
      render(<HelpModal onClose={vi.fn()} />);
      // Basics content should be visible
      expect(screen.getByText(/The Storm is Coming/i)).toBeInTheDocument();
    });

    it("switches to Controls tab when clicked", async () => {
      const user = userEvent.setup();
      render(<HelpModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /controls/i }));

      // Controls content should be visible (keyboard or touch controls)
      expect(
        screen.getByText(/Keyboard Controls/i) || screen.getByText(/Touch Controls/i)
      ).toBeTruthy();
    });

    it("switches to Tips tab when clicked", async () => {
      const user = userEvent.setup();
      render(<HelpModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /tips/i }));

      // Tips content should be visible
      expect(screen.getByText(/Pro Tips/i)).toBeInTheDocument();
    });

    it("can switch between all tabs", async () => {
      const user = userEvent.setup();
      render(<HelpModal onClose={vi.fn()} />);

      // Start at Basics
      expect(screen.getByText(/The Storm is Coming/i)).toBeInTheDocument();

      // Go to Controls
      await user.click(screen.getByRole("button", { name: /controls/i }));
      expect(screen.queryByText(/The Storm is Coming/i)).not.toBeInTheDocument();

      // Go to Tips
      await user.click(screen.getByRole("button", { name: /tips/i }));
      expect(screen.getByText(/Pro Tips/i)).toBeInTheDocument();

      // Back to Basics
      await user.click(screen.getByRole("button", { name: /basics/i }));
      expect(screen.getByText(/The Storm is Coming/i)).toBeInTheDocument();
    });
  });

  describe("Basics tab content", () => {
    it("displays game objective", () => {
      render(<HelpModal onClose={vi.fn()} />);
      expect(screen.getByText(/tornado is threatening/i)).toBeInTheDocument();
    });

    it("displays stacking instructions", () => {
      render(<HelpModal onClose={vi.fn()} />);
      expect(screen.getByText(/Stacking/i)).toBeInTheDocument();
      expect(screen.getByText(/Move under falling critters/i)).toBeInTheDocument();
    });

    it("displays scoring information", () => {
      render(<HelpModal onClose={vi.fn()} />);
      expect(screen.getByText(/Scoring/i)).toBeInTheDocument();
      expect(screen.getByText(/earns base points/i)).toBeInTheDocument();
    });

    it("displays lives information", () => {
      render(<HelpModal onClose={vi.fn()} />);
      expect(screen.getByText(/Lives/i)).toBeInTheDocument();
      expect(screen.getByText(/start with 3 hearts/i)).toBeInTheDocument();
    });

    it("displays quick start instructions", () => {
      render(<HelpModal onClose={vi.fn()} />);
      expect(screen.getByText(/DRAG/i)).toBeInTheDocument();
      expect(screen.getByText(/TAP/i)).toBeInTheDocument();
    });
  });

  describe("Controls tab content", () => {
    it("displays keyboard controls for desktop", async () => {
      const user = userEvent.setup();
      render(<HelpModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /controls/i }));

      // Desktop controls
      expect(screen.getByText(/Keyboard Controls/i)).toBeInTheDocument();
      expect(screen.getByText(/^LEFT$/i)).toBeInTheDocument();
      expect(screen.getByText(/^RIGHT$/i)).toBeInTheDocument();
      expect(screen.getByText(/^SPACE$/i)).toBeInTheDocument();
      expect(screen.getByText(/^ESC$/i)).toBeInTheDocument();
    });

    it("displays mouse controls for desktop", async () => {
      const user = userEvent.setup();
      render(<HelpModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /controls/i }));

      expect(screen.getByText(/Mouse Controls/i)).toBeInTheDocument();
      expect(screen.getByText(/Click \+ Drag/i)).toBeInTheDocument();
    });
  });

  describe("Tips tab content", () => {
    it("displays pro tips", async () => {
      const user = userEvent.setup();
      render(<HelpModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /tips/i }));

      expect(screen.getByText(/Pro Tips/i)).toBeInTheDocument();
      expect(screen.getByText(/Balance is key/i)).toBeInTheDocument();
    });

    it("displays critter types information", async () => {
      const user = userEvent.setup();
      render(<HelpModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /tips/i }));

      expect(screen.getByText(/Critter Types/i)).toBeInTheDocument();
      expect(screen.getByText(/Normal/i)).toBeInTheDocument();
      expect(screen.getByText(/Golden/i)).toBeInTheDocument();
      expect(screen.getByText(/Ice/i)).toBeInTheDocument();
      expect(screen.getByText(/Heavy/i)).toBeInTheDocument();
    });

    it("displays upgrades information", async () => {
      const user = userEvent.setup();
      render(<HelpModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /tips/i }));

      expect(screen.getByText(/Upgrades/i)).toBeInTheDocument();
      expect(screen.getByText(/Upgrade Shop/i)).toBeInTheDocument();
    });
  });

  describe("close button", () => {
    it("renders close button", () => {
      render(<HelpModal onClose={vi.fn()} />);
      expect(screen.getByRole("button", { name: /close help/i })).toBeInTheDocument();
    });

    it("calls onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<HelpModal onClose={onClose} />);

      await user.click(screen.getByRole("button", { name: /close help/i }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    it("renders GOT IT button at the bottom", () => {
      render(<HelpModal onClose={vi.fn()} />);
      expect(screen.getByRole("button", { name: /got it/i })).toBeInTheDocument();
    });

    it("calls onClose when GOT IT button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<HelpModal onClose={onClose} />);

      await user.click(screen.getByRole("button", { name: /got it/i }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("backdrop click", () => {
    it("calls onClose when clicking the backdrop", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<HelpModal onClose={onClose} />);

      // Click the backdrop (the fixed overlay)
      const backdrop = document.querySelector(".fixed.inset-0");
      if (backdrop) {
        await user.click(backdrop);

        await waitFor(() => {
          expect(onClose).toHaveBeenCalledTimes(1);
        });
      }
    });

    it("does not call onClose when clicking inside the modal", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<HelpModal onClose={onClose} />);

      // Click on the title (inside the modal)
      await user.click(screen.getByText("HOW TO PLAY"));

      // Should not have been called
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("styling", () => {
    it("has fixed positioning for overlay", () => {
      render(<HelpModal onClose={vi.fn()} />);
      const overlay = document.querySelector(".fixed.inset-0");
      expect(overlay).toBeInTheDocument();
    });

    it("has z-50 for high stacking order", () => {
      render(<HelpModal onClose={vi.fn()} />);
      const overlay = document.querySelector(".z-50");
      expect(overlay).toBeInTheDocument();
    });

    it("has backdrop blur effect", () => {
      render(<HelpModal onClose={vi.fn()} />);
      const overlay = document.querySelector(".backdrop-blur-sm");
      expect(overlay).toBeInTheDocument();
    });

    it("has max-height constraint for scrolling", () => {
      render(<HelpModal onClose={vi.fn()} />);
      const scrollContainer = document.querySelector(".max-h-\\[85vh\\]");
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("close button has aria-label", () => {
      render(<HelpModal onClose={vi.fn()} />);
      expect(screen.getByRole("button", { name: /close help/i })).toHaveAttribute(
        "aria-label",
        "Close help"
      );
    });

    it("tabs are focusable", async () => {
      const user = userEvent.setup();
      render(<HelpModal onClose={vi.fn()} />);

      const basicsTab = screen.getByRole("button", { name: /basics/i });
      basicsTab.focus();
      expect(document.activeElement).toBe(basicsTab);

      await user.tab();
      // Next tab should be focused
      expect(document.activeElement?.tagName).toBe("BUTTON");
    });

    it("buttons can be activated with keyboard", async () => {
      const user = userEvent.setup();
      render(<HelpModal onClose={vi.fn()} />);

      const controlsTab = screen.getByRole("button", { name: /controls/i });
      controlsTab.focus();
      await user.keyboard("{Enter}");

      // Controls content should now be visible
      expect(
        screen.getByText(/Keyboard Controls/i) || screen.getByText(/Touch Controls/i)
      ).toBeTruthy();
    });
  });
});
