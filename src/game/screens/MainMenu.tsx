/**
 * Main Menu Screen
 * Immersive landing page with animated title and proper game navigation
 *
 * Flow: NEW GAME → Mode Select → Character Select → Play
 */

import { animate, Timeline } from "animejs";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameButton } from "../components/GameButton";
import { GameCard } from "../components/GameCard";
import { HelpModal } from "../components/HelpModal";
import { ModeSelect } from "../components/ModeSelect";
import { PeekingAnimal } from "../components/PeekingAnimal";
import { SettingsModal } from "../components/SettingsModal";
import { GameTransition } from "../components/GameTransition";
import { UpgradeShop } from "../components/UpgradeShop";
import { CharacterSelect } from "./CharacterSelect";
import { GAME_INFO } from "../config";
import { useResponsiveScale } from "../hooks/useResponsiveScale";
import type { GameModeType } from "../modes/GameMode";
import { getCoins } from "../progression/Upgrades";

interface MainMenuProps {
  onPlay: (mode: GameModeType, characterId: "farmer_john" | "farmer_mary") => void;
  highScore: number;
}

export function MainMenu({ onPlay, highScore }: MainMenuProps) {
  const { fontSize, spacing, isMobile, game } = useResponsiveScale();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const floatAnimRef = useRef<ReturnType<typeof animate> | null>(null);

  const [showShop, setShowShop] = useState(false);
  const [showModes, setShowModes] = useState(false);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [coins, setCoins] = useState(0);
  const [selectedMode, setSelectedMode] = useState<GameModeType>("endless");
  const [selectedCharacter, setSelectedCharacter] = useState<"farmer_john" | "farmer_mary" | null>(null);
  const [showTransition, setShowTransition] = useState(false);

  // Load coins
  useEffect(() => {
    setCoins(getCoins());
  }, []);

  // Entrance animations
  useEffect(() => {
    const timeline = new Timeline({
      defaults: { ease: "outExpo" },
    });

    // Animate title
    if (titleRef.current) {
      timeline.add(titleRef.current, {
        opacity: [0, 1],
        translateY: [-50, 0],
        duration: 1000,
      });
    }

    // Animate subtitle
    if (subtitleRef.current) {
      timeline.add(
        subtitleRef.current,
        {
          opacity: [0, 1],
          translateY: [20, 0],
          duration: 800,
        },
        "-=600"
      );
    }

    // Animate content card
    if (contentRef.current) {
      timeline.add(
        contentRef.current,
        {
          opacity: [0, 1],
          scale: [0.9, 1],
          duration: 800,
        },
        "-=400"
      );
    }

    return () => {
      timeline.pause();
    };
  }, []);

  // Floating animation for title
  useEffect(() => {
    if (!titleRef.current) return;

    floatAnimRef.current = animate(titleRef.current, {
      translateY: [-8, 8],
      rotate: [-1, 1],
      duration: 3000,
      alternate: true,
      loop: true,
      ease: "inOutSine",
    });

    return () => {
      if (floatAnimRef.current) floatAnimRef.current.pause();
    };
  }, []);

  // NEW GAME flow: opens Mode Select first
  const handleNewGame = () => {
    setShowModes(true);
  };

  // After selecting mode, show character select
  const handleSelectMode = (mode: GameModeType) => {
    setSelectedMode(mode);
    setShowModes(false);
    setShowCharacterSelect(true);
  };

  // After selecting character, trigger transition
  const handleSelectCharacter = (charId: string) => {
    setShowCharacterSelect(false);
    setSelectedCharacter(charId as "farmer_john" | "farmer_mary");
    setShowTransition(true);
  };

  // When transition completes, start the game
  const handleTransitionComplete = useCallback(() => {
    setShowTransition(false);
    if (selectedCharacter) {
      onPlay(selectedMode, selectedCharacter);
    }
  }, [selectedMode, selectedCharacter, onPlay]);

  return (
    <main className="contents">
      {/* Main Content */}
      <div className="flex flex-col items-center justify-center w-full h-full px-4">
        {/* Title Section */}
        <div className="text-center mb-4 md:mb-8">
          <h1
            ref={titleRef}
            className="game-font text-[#eab308] leading-none opacity-0"
            style={{
              fontSize: `clamp(1.6rem, ${parseFloat(fontSize.title) * 0.7}px, 3.5rem)`,
              textShadow: `
                4px 4px 0 #7f1d1d,
                -1px -1px 0 #000,
                1px -1px 0 #000,
                -1px 1px 0 #000,
                0 0 20px rgba(234, 179, 8, 0.5)
              `,
              filter: "drop-shadow(0 0 30px rgba(234, 179, 8, 0.3))",
            }}
          >
            {isMobile ? (
              <>
                HOMESTEAD
                <br />
                HEADACHES
              </>
            ) : (
              <>
                HOMESTEAD HEADACHES
              </>
            )}
          </h1>

          <p
            ref={subtitleRef}
            className="game-font text-[#fef9c3] mt-2 md:mt-4 opacity-0"
            style={{
              fontSize: fontSize.md,
              textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            {GAME_INFO.tagline}
          </p>
        </div>

        {/* Game Card */}
        <div ref={contentRef} className="opacity-0 w-full" style={{ maxWidth: isMobile ? "92vw" : "28rem" }}>
          <GameCard
            className="backdrop-blur-sm"
            style={{
              padding: spacing.md,
            }}
          >
            {/* High Score Display */}
            {highScore > 0 && (
              <div className="game-font text-center mb-4" style={{ fontSize: fontSize.sm }} role="status">
                <span className="text-[#d4c4ac]">YOUR BEST</span>
                <div className="text-[#eab308] font-bold" style={{ fontSize: fontSize.lg }}>
                  {highScore.toLocaleString()} POINTS
                </div>
              </div>
            )}

            {/* Button Grid - 2x2 with Help below */}
            <nav className="grid grid-cols-2 gap-3" aria-label="Game Menu">
              {/* Left Column */}
              <div className="flex flex-col gap-3">
                <GameButton
                  onClick={handleNewGame}
                  style={{
                    fontSize: fontSize.md,
                    padding: `${spacing.sm} ${spacing.md}`,
                  }}
                >
                  NEW GAME
                </GameButton>
                <GameButton
                  onClick={() => {/* TODO: Continue from saved state */}}
                  variant="secondary"
                  aria-label="Continue Game (Coming Soon)"
                  style={{
                    fontSize: fontSize.sm,
                    padding: `${spacing.sm} ${spacing.md}`,
                  }}
                  disabled
                >
                  CONTINUE
                </GameButton>
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-3">
                <GameButton
                  onClick={() => setShowShop(true)}
                  variant="secondary"
                  style={{
                    fontSize: fontSize.sm,
                    padding: `${spacing.sm} ${spacing.md}`,
                  }}
                >
                  UPGRADES
                </GameButton>
                <GameButton
                  onClick={() => setShowSettings(true)}
                  variant="secondary"
                  style={{
                    fontSize: fontSize.sm,
                    padding: `${spacing.sm} ${spacing.md}`,
                  }}
                >
                  SETTINGS
                </GameButton>
              </div>
            </nav>

            {/* Help button - centered below */}
            <div className="flex justify-center mt-3">
              <GameButton
                onClick={() => setShowHelp(true)}
                variant="secondary"
                style={{
                  fontSize: fontSize.sm,
                  padding: `${spacing.xs} ${spacing.lg}`,
                }}
              >
                HELP
              </GameButton>
            </div>

            {/* Coins display */}
            {coins > 0 && (
              <div
                className="game-font text-center mt-3 text-[#eab308]"
                style={{ fontSize: fontSize.xs }}
                role="status"
              >
                {coins.toLocaleString()} coins
              </div>
            )}
          </GameCard>
        </div>

        {/* Credits */}
        <footer
          className="game-font text-[#6b5a3a] mt-4 text-center"
          style={{ fontSize: fontSize.xs }}
        >
          A Nebraska farm adventure
        </footer>
      </div>


      {/* Decorative warm glow in background - Nebraska sunset feel */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute rounded-full opacity-10 animate-pulse"
          style={{
            width: "150vmax",
            height: "150vmax",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, rgba(185,28,28,0.3) 0%, rgba(234,179,8,0.1) 40%, transparent 70%)",
            animation: "pulse 4s ease-in-out infinite",
          }}
        />
      </div>

      {/* Upgrade Shop Modal */}
      {showShop && <UpgradeShop onClose={() => setShowShop(false)} />}

      {/* Mode Select Modal - First step of NEW GAME flow */}
      {showModes && (
        <ModeSelect onSelectMode={handleSelectMode} onClose={() => setShowModes(false)} />
      )}

      {/* Character Select Modal - Second step of NEW GAME flow */}
      {showCharacterSelect && (
        <CharacterSelect
          onSelect={handleSelectCharacter}
          onBack={() => setShowCharacterSelect(false)}
        />
      )}

      {/* Help Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Game Transition - quality-tiered fade between menu and gameplay */}
      <GameTransition
        active={showTransition}
        onComplete={handleTransitionComplete}
      />
    </main>
  );
}