/**
 * SettingsModal Component Tests
 * Tests for the settings modal with multiple tabs
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SettingsModal } from "./SettingsModal";

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
  animate: vi.fn((element, options) => {
    if (options.complete) {
      options.complete();
    }
  }),
}));

// Mock graphics hooks
vi.mock("@/graphics/hooks/useGraphics", () => ({
  useGraphics: () => ({
    settings: {
      quality: "medium",
    },
    setQuality: vi.fn(),
    toggleSetting: vi.fn(),
    deviceCapabilities: {
      recommendedQuality: "medium",
    },
    isLoading: false,
  }),
  useAccessibilitySettings: () => ({
    reducedMotion: false,
    screenShake: true,
  }),
}));

// Mock random module
vi.mock("@/random", () => ({
  useSeedName: () => "HAPPY-FARM-123",
  useRandomActions: () => ({
    shuffleSeed: vi.fn(),
  }),
}));

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn(function (this: typeof localStorageMock, key: string) {
    return this.store[key] || null;
  }),
  setItem: vi.fn(function (this: typeof localStorageMock, key: string, value: string) {
    this.store[key] = value;
  }),
  removeItem: vi.fn(function (this: typeof localStorageMock, key: string) {
    delete this.store[key];
  }),
  clear: vi.fn(function (this: typeof localStorageMock) {
    this.store = {};
  }),
};

// Bind the methods
localStorageMock.getItem = localStorageMock.getItem.bind(localStorageMock);
localStorageMock.setItem = localStorageMock.setItem.bind(localStorageMock);
localStorageMock.removeItem = localStorageMock.removeItem.bind(localStorageMock);
localStorageMock.clear = localStorageMock.clear.bind(localStorageMock);

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("SettingsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.store = {};
  });

  describe("rendering", () => {
    it("renders settings modal", () => {
      render(<SettingsModal onClose={vi.fn()} />);
      expect(screen.getByText("SETTINGS")).toBeInTheDocument();
    });

    it("has proper dialog role", () => {
      render(<SettingsModal onClose={vi.fn()} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("has aria-modal attribute", () => {
      render(<SettingsModal onClose={vi.fn()} />);
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });
  });

  describe("tab navigation", () => {
    it("renders all four tabs", () => {
      render(<SettingsModal onClose={vi.fn()} />);
      expect(screen.getByRole("button", { name: /graphics/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sound/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /access/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /seed/i })).toBeInTheDocument();
    });

    it("starts with Graphics tab active", () => {
      render(<SettingsModal onClose={vi.fn()} />);
      expect(screen.getByText(/Quality Preset/i)).toBeInTheDocument();
    });

    it("switches to Sound tab when clicked", async () => {
      render(<SettingsModal onClose={vi.fn()} />);

      const soundTab = screen.getByRole("button", { name: /sound/i });
      soundTab.click();

      await waitFor(() => {
        expect(screen.getByText(/Mute All/i)).toBeInTheDocument();
        expect(screen.getByText(/Master Volume/i)).toBeInTheDocument();
      });
    });

    it("switches to Accessibility tab when clicked", async () => {
      render(<SettingsModal onClose={vi.fn()} />);

      const accessTab = screen.getByRole("button", { name: /access/i });
      accessTab.click();

      await waitFor(() => {
        expect(screen.getByText(/Reduced Motion/i)).toBeInTheDocument();
        expect(screen.getByText(/Screen Shake/i)).toBeInTheDocument();
      });
    });

    it("switches to Seed tab when clicked", async () => {
      render(<SettingsModal onClose={vi.fn()} />);

      const seedTab = screen.getByRole("button", { name: /seed/i });
      seedTab.click();

      await waitFor(() => {
        expect(screen.getByText(/Current Seed/i)).toBeInTheDocument();
        expect(screen.getByText("HAPPY-FARM-123")).toBeInTheDocument();
      });
    });
  });

  describe("Graphics tab", () => {
    it("displays quality preset options", () => {
      render(<SettingsModal onClose={vi.fn()} />);
      expect(screen.getByText("Low")).toBeInTheDocument();
      expect(screen.getByText("Medium")).toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument();
    });

    it("has radio buttons for quality selection", () => {
      render(<SettingsModal onClose={vi.fn()} />);
      const radioButtons = screen.getAllByRole("radio");
      expect(radioButtons.length).toBe(3);
    });

    it("shows recommended badge for recommended quality", () => {
      render(<SettingsModal onClose={vi.fn()} />);
      expect(screen.getByText("Recommended")).toBeInTheDocument();
    });

    it("displays quality description", () => {
      render(<SettingsModal onClose={vi.fn()} />);
      expect(screen.getByText(/Quality affects shadows/i)).toBeInTheDocument();
    });
  });

  describe("Sound tab", () => {
    it("displays mute toggle", async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /sound/i }));

      expect(screen.getByText(/Mute All/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /mute all sounds/i })).toBeInTheDocument();
    });

    it("displays volume sliders", async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /sound/i }));

      expect(screen.getByText(/Master Volume/i)).toBeInTheDocument();
      expect(screen.getByText(/Music/i)).toBeInTheDocument();
      expect(screen.getByText(/Sound Effects/i)).toBeInTheDocument();
    });

    it("displays volume percentages", async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /sound/i }));

      // Default values
      expect(screen.getByText("80%")).toBeInTheDocument(); // Master
      expect(screen.getByText("70%")).toBeInTheDocument(); // Music
    });

    it("has range sliders for volume control", async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /sound/i }));

      const sliders = screen.getAllByRole("slider");
      expect(sliders.length).toBe(3);
    });
  });

  describe("Accessibility tab", () => {
    it("displays reduced motion toggle", async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /access/i }));

      expect(screen.getByText(/Reduced Motion/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /toggle reduced motion/i })
      ).toBeInTheDocument();
    });

    it("displays screen shake toggle", async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /access/i }));

      expect(screen.getByText(/Screen Shake/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /toggle screen shake/i })
      ).toBeInTheDocument();
    });

    it("displays accessibility descriptions", async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /access/i }));

      expect(screen.getByText(/Reduces animations and motion effects/i)).toBeInTheDocument();
      expect(screen.getByText(/Camera shake effects during impacts/i)).toBeInTheDocument();
    });
  });

  describe("Seed tab", () => {
    it("displays current seed name", async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /seed/i }));

      expect(screen.getByText("HAPPY-FARM-123")).toBeInTheDocument();
    });

    it("displays seed description", async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /seed/i }));

      expect(screen.getByText(/Seeds control the random elements/i)).toBeInTheDocument();
    });

    it("has Shuffle button", async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /seed/i }));

      expect(screen.getByRole("button", { name: /shuffle/i })).toBeInTheDocument();
    });

    it("has Copy button", async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /seed/i }));

      expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    });

    it("shows Copied feedback after clicking Copy", async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /seed/i }));
      await user.click(screen.getByRole("button", { name: /copy/i }));

      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  describe("settings persistence", () => {
    it("saves sound settings to localStorage", async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /sound/i }));

      // Toggle mute
      await user.click(screen.getByRole("button", { name: /mute all sounds/i }));

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("loads sound settings from localStorage on mount", () => {
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify({
          masterVolume: 50,
          musicVolume: 60,
          sfxVolume: 70,
          muted: false,
        })
      );

      render(<SettingsModal onClose={vi.fn()} />);

      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        "infinite-headaches-sound-settings"
      );
    });
  });

  describe("close functionality", () => {
    it("renders close button in header", () => {
      render(<SettingsModal onClose={vi.fn()} />);
      expect(screen.getByRole("button", { name: /close settings/i })).toBeInTheDocument();
    });

    it("calls onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<SettingsModal onClose={onClose} />);

      await user.click(screen.getByRole("button", { name: /close settings/i }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    it("renders DONE button at the bottom", () => {
      render(<SettingsModal onClose={vi.fn()} />);
      expect(screen.getByRole("button", { name: /done/i })).toBeInTheDocument();
    });

    it("calls onClose when DONE button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<SettingsModal onClose={onClose} />);

      await user.click(screen.getByRole("button", { name: /done/i }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    it("calls onClose when backdrop is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<SettingsModal onClose={onClose} />);

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

      render(<SettingsModal onClose={onClose} />);

      await user.click(screen.getByText("SETTINGS"));

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("styling", () => {
    it("has fixed positioning for overlay", () => {
      render(<SettingsModal onClose={vi.fn()} />);
      const overlay = document.querySelector(".fixed.inset-0");
      expect(overlay).toBeInTheDocument();
    });

    it("has z-50 for high stacking order", () => {
      render(<SettingsModal onClose={vi.fn()} />);
      const overlay = document.querySelector(".z-50");
      expect(overlay).toBeInTheDocument();
    });

    it("has backdrop blur effect", () => {
      render(<SettingsModal onClose={vi.fn()} />);
      const overlay = document.querySelector(".backdrop-blur-sm");
      expect(overlay).toBeInTheDocument();
    });

    it("has max-height constraint for scrolling", () => {
      render(<SettingsModal onClose={vi.fn()} />);
      const scrollContainer = document.querySelector(".max-h-\\[85vh\\]");
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has aria-labelledby for the dialog", () => {
      render(<SettingsModal onClose={vi.fn()} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby", "settings-modal-title");
    });

    it("title has correct id for aria-labelledby", () => {
      render(<SettingsModal onClose={vi.fn()} />);
      expect(document.getElementById("settings-modal-title")).toBeInTheDocument();
    });

    it("close button has aria-label", () => {
      render(<SettingsModal onClose={vi.fn()} />);
      expect(screen.getByRole("button", { name: /close settings/i })).toHaveAttribute(
        "aria-label",
        "Close settings"
      );
    });

    it("toggle switches have aria-pressed attribute", async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /sound/i }));

      const muteToggle = screen.getByRole("button", { name: /mute all sounds/i });
      expect(muteToggle).toHaveAttribute("aria-pressed");
    });

    it("toggle switches have aria-label", async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /access/i }));

      expect(
        screen.getByRole("button", { name: /toggle reduced motion/i })
      ).toHaveAttribute("aria-label", "Toggle reduced motion");
      expect(
        screen.getByRole("button", { name: /toggle screen shake/i })
      ).toHaveAttribute("aria-label", "Toggle screen shake");
    });
  });
});
