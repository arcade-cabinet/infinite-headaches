/**
 * MainMenu Screen Tests
 * Tests for the main menu screen component
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MainMenu } from "./MainMenu";

// Mock the useResponsiveScale hook
vi.mock("../hooks/useResponsiveScale", () => ({
  useResponsiveScale: () => ({
    fontSize: {
      xs: "10px",
      sm: "12px",
      md: "14px",
      lg: "18px",
      xl: "24px",
      title: "48px",
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
  Timeline: vi.fn(() => ({
    add: vi.fn().mockReturnThis(),
    pause: vi.fn(),
  })),
}));

// Mock progression module
vi.mock("../progression/Upgrades", () => ({
  getCoins: vi.fn(() => 1000),
}));

// Mock child components to simplify testing
vi.mock("../components/UpgradeShop", () => ({
  UpgradeShop: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="upgrade-shop">
      <button onClick={onClose}>Close Shop</button>
    </div>
  ),
}));

vi.mock("../components/ModeSelect", () => ({
  ModeSelect: ({
    onSelectMode,
    onClose,
  }: {
    onSelectMode: (mode: string) => void;
    onClose: () => void;
  }) => (
    <div data-testid="mode-select">
      <button onClick={() => onSelectMode("endless")}>Select Endless</button>
      <button onClick={onClose}>Close Modes</button>
    </div>
  ),
}));

vi.mock("./CharacterSelect", () => ({
  CharacterSelect: ({
    onSelect,
    onBack,
  }: {
    onSelect: (charId: string) => void;
    onBack: () => void;
  }) => (
    <div data-testid="character-select">
      <button onClick={() => onSelect("farmer_john")}>Select John</button>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

vi.mock("../components/HelpModal", () => ({
  HelpModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="help-modal">
      <button onClick={onClose}>Close Help</button>
    </div>
  ),
}));

vi.mock("../components/SettingsModal", () => ({
  SettingsModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="settings-modal">
      <button onClick={onClose}>Close Settings</button>
    </div>
  ),
}));

vi.mock("../components/PeekingAnimal", () => ({
  PeekingAnimal: () => <div data-testid="peeking-animal" />,
}));

// Default props
const defaultProps = {
  onPlay: vi.fn(),
  highScore: 0,
};

describe("MainMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the game title", () => {
      render(<MainMenu {...defaultProps} />);
      expect(screen.getByText(/HOMESTEAD/i)).toBeInTheDocument();
      expect(screen.getByText(/HEADACHES/i)).toBeInTheDocument();
    });

    it("renders the tagline", () => {
      render(<MainMenu {...defaultProps} />);
      expect(screen.getByText(/Everyone has bad Mondays/i)).toBeInTheDocument();
    });

    it("renders NEW GAME button", () => {
      render(<MainMenu {...defaultProps} />);
      expect(screen.getByRole("button", { name: /new game/i })).toBeInTheDocument();
    });

    it("renders CONTINUE button", () => {
      render(<MainMenu {...defaultProps} />);
      expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
    });

    it("renders UPGRADES button", () => {
      render(<MainMenu {...defaultProps} />);
      expect(screen.getByRole("button", { name: /upgrades/i })).toBeInTheDocument();
    });

    it("renders SETTINGS button", () => {
      render(<MainMenu {...defaultProps} />);
      expect(screen.getByRole("button", { name: /settings/i })).toBeInTheDocument();
    });

    it("renders HELP button", () => {
      render(<MainMenu {...defaultProps} />);
      expect(screen.getByRole("button", { name: /help/i })).toBeInTheDocument();
    });

    it("renders peeking animal decoration", () => {
      render(<MainMenu {...defaultProps} />);
      expect(screen.getByTestId("peeking-animal")).toBeInTheDocument();
    });

    it("renders credits text", () => {
      render(<MainMenu {...defaultProps} />);
      expect(screen.getByText(/Nebraska tornado tale/i)).toBeInTheDocument();
    });
  });

  describe("NEW GAME flow", () => {
    it("opens mode select when NEW GAME is clicked", async () => {
      const user = userEvent.setup();
      render(<MainMenu {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /new game/i }));

      expect(screen.getByTestId("mode-select")).toBeInTheDocument();
    });

    it("opens character select after selecting mode", async () => {
      const user = userEvent.setup();
      render(<MainMenu {...defaultProps} />);

      // Click NEW GAME
      await user.click(screen.getByRole("button", { name: /new game/i }));

      // Select a mode
      await user.click(screen.getByText("Select Endless"));

      // Character select should appear
      expect(screen.getByTestId("character-select")).toBeInTheDocument();
    });

    it("calls onPlay with mode and character after full flow", async () => {
      const user = userEvent.setup();
      const onPlay = vi.fn();
      render(<MainMenu {...defaultProps} onPlay={onPlay} />);

      // Click NEW GAME
      await user.click(screen.getByRole("button", { name: /new game/i }));

      // Select a mode
      await user.click(screen.getByText("Select Endless"));

      // Select a character
      await user.click(screen.getByText("Select John"));

      expect(onPlay).toHaveBeenCalledWith("endless", "farmer_john");
    });

    it("can go back from character select to mode select", async () => {
      const user = userEvent.setup();
      render(<MainMenu {...defaultProps} />);

      // Click NEW GAME
      await user.click(screen.getByRole("button", { name: /new game/i }));

      // Select a mode
      await user.click(screen.getByText("Select Endless"));

      // Character select should appear
      expect(screen.getByTestId("character-select")).toBeInTheDocument();

      // Go back
      await user.click(screen.getByText("Back"));

      // Character select should be closed
      expect(screen.queryByTestId("character-select")).not.toBeInTheDocument();
    });

    it("can close mode select", async () => {
      const user = userEvent.setup();
      render(<MainMenu {...defaultProps} />);

      // Click NEW GAME
      await user.click(screen.getByRole("button", { name: /new game/i }));

      // Mode select should appear
      expect(screen.getByTestId("mode-select")).toBeInTheDocument();

      // Close it
      await user.click(screen.getByText("Close Modes"));

      // Should be closed
      expect(screen.queryByTestId("mode-select")).not.toBeInTheDocument();
    });
  });

  describe("CONTINUE button", () => {
    it("is disabled initially (no saved state)", () => {
      render(<MainMenu {...defaultProps} />);
      const continueButton = screen.getByRole("button", { name: /continue/i });
      expect(continueButton).toBeDisabled();
    });

    it("does not call onPlay when clicked while disabled", async () => {
      const user = userEvent.setup();
      const onPlay = vi.fn();
      render(<MainMenu {...defaultProps} onPlay={onPlay} />);

      await user.click(screen.getByRole("button", { name: /continue/i }));

      expect(onPlay).not.toHaveBeenCalled();
    });
  });

  describe("high score display", () => {
    it("displays high score when greater than 0", () => {
      render(<MainMenu {...defaultProps} highScore={5000} />);
      expect(screen.getByText(/YOUR BEST/i)).toBeInTheDocument();
      expect(screen.getByText(/5,000 POINTS/i)).toBeInTheDocument();
    });

    it("does not display high score section when score is 0", () => {
      render(<MainMenu {...defaultProps} highScore={0} />);
      expect(screen.queryByText(/YOUR BEST/i)).not.toBeInTheDocument();
    });

    it("formats high score with locale string", () => {
      render(<MainMenu {...defaultProps} highScore={1234567} />);
      expect(screen.getByText(/1,234,567 POINTS/i)).toBeInTheDocument();
    });
  });

  describe("coins display", () => {
    it("displays coins when greater than 0", () => {
      render(<MainMenu {...defaultProps} />);
      expect(screen.getByText(/1,000 coins/i)).toBeInTheDocument();
    });
  });

  describe("UPGRADES button", () => {
    it("opens upgrade shop when clicked", async () => {
      const user = userEvent.setup();
      render(<MainMenu {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /upgrades/i }));

      expect(screen.getByTestId("upgrade-shop")).toBeInTheDocument();
    });

    it("can close upgrade shop", async () => {
      const user = userEvent.setup();
      render(<MainMenu {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /upgrades/i }));
      await user.click(screen.getByText("Close Shop"));

      expect(screen.queryByTestId("upgrade-shop")).not.toBeInTheDocument();
    });
  });

  describe("SETTINGS button", () => {
    it("opens settings modal when clicked", async () => {
      const user = userEvent.setup();
      render(<MainMenu {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /settings/i }));

      expect(screen.getByTestId("settings-modal")).toBeInTheDocument();
    });

    it("can close settings modal", async () => {
      const user = userEvent.setup();
      render(<MainMenu {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /settings/i }));
      await user.click(screen.getByText("Close Settings"));

      expect(screen.queryByTestId("settings-modal")).not.toBeInTheDocument();
    });
  });

  describe("HELP button", () => {
    it("opens help modal when clicked", async () => {
      const user = userEvent.setup();
      render(<MainMenu {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /help/i }));

      expect(screen.getByTestId("help-modal")).toBeInTheDocument();
    });

    it("can close help modal", async () => {
      const user = userEvent.setup();
      render(<MainMenu {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /help/i }));
      await user.click(screen.getByText("Close Help"));

      expect(screen.queryByTestId("help-modal")).not.toBeInTheDocument();
    });
  });

  describe("button variants", () => {
    it("NEW GAME button is primary variant", () => {
      render(<MainMenu {...defaultProps} />);
      const newGameButton = screen.getByRole("button", { name: /new game/i });
      // Primary buttons have barn red background
      expect(newGameButton.className).toContain("bg-[#b91c1c]");
    });

    it("secondary buttons use secondary variant", () => {
      render(<MainMenu {...defaultProps} />);
      const continueButton = screen.getByRole("button", { name: /continue/i });
      const upgradesButton = screen.getByRole("button", { name: /upgrades/i });
      const settingsButton = screen.getByRole("button", { name: /settings/i });
      const helpButton = screen.getByRole("button", { name: /help/i });

      // Secondary buttons use weathered wood background
      expect(continueButton.className).toContain("bg-[#554730]");
      expect(upgradesButton.className).toContain("bg-[#554730]");
      expect(settingsButton.className).toContain("bg-[#554730]");
      expect(helpButton.className).toContain("bg-[#554730]");
    });
  });

  describe("layout", () => {
    it("renders buttons in a grid layout", () => {
      render(<MainMenu {...defaultProps} />);
      const grid = document.querySelector(".grid.grid-cols-2");
      expect(grid).toBeInTheDocument();
    });

    it("centers content vertically and horizontally", () => {
      render(<MainMenu {...defaultProps} />);
      const container = document.querySelector(".flex.flex-col.items-center.justify-center");
      expect(container).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("buttons are focusable", async () => {
      const user = userEvent.setup();
      render(<MainMenu {...defaultProps} />);

      await user.tab();

      // One of the buttons should be focused
      expect(document.activeElement?.tagName).toBe("BUTTON");
    });

    it("NEW GAME button can be activated with keyboard", async () => {
      const user = userEvent.setup();
      render(<MainMenu {...defaultProps} />);

      const newGameButton = screen.getByRole("button", { name: /new game/i });
      newGameButton.focus();
      await user.keyboard("{Enter}");

      // Mode select should appear
      expect(screen.getByTestId("mode-select")).toBeInTheDocument();
    });

    it("disabled CONTINUE button is not clickable via keyboard", async () => {
      const user = userEvent.setup();
      const onPlay = vi.fn();
      render(<MainMenu {...defaultProps} onPlay={onPlay} />);

      const continueButton = screen.getByRole("button", { name: /continue/i });
      continueButton.focus();
      await user.keyboard("{Enter}");

      expect(onPlay).not.toHaveBeenCalled();
    });
  });
});
