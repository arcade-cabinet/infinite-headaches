/**
 * Help Modal
 * Shows game controls, instructions, and tips based on current platform/input method
 * Contains all instructional copy (moved from MainMenu for cleaner layout)
 */

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { GameCard } from "./GameCard";
import { GameButton } from "./GameButton";
import { useResponsiveScale } from "../hooks/useResponsiveScale";
import { platform } from "../../platform";
import { colors } from "@/theme/tokens/colors";

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  const { fontSize, spacing, isMobile } = useResponsiveScale();
  const [activeTab, setActiveTab] = useState<"basics" | "controls" | "tips">("basics");
  const modalRef = useRef<HTMLDivElement>(null);

  const isTouch = isMobile || platform.isNative();

  useEffect(() => {
    if (modalRef.current) {
      animate(modalRef.current, {
        opacity: [0, 1],
        scale: [0.9, 1],
        duration: 300,
        ease: "outBack",
      });
    }
  }, []);

  const handleClose = () => {
    if (modalRef.current) {
      animate(modalRef.current, {
        opacity: [1, 0],
        scale: [1, 0.9],
        duration: 200,
        ease: "inQuad",
        complete: onClose,
      });
    } else {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div ref={modalRef} className="opacity-0 w-full max-w-lg">
        <GameCard
          className="max-h-[85vh] overflow-auto"
          style={{ padding: spacing.lg }}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2
              className="game-font"
              style={{
                fontSize: fontSize.xl,
                textShadow: "2px 2px 0 #000",
                color: colors.wheat[400],
              }}
            >
              HOW TO PLAY
            </h2>
            <button
              onClick={handleClose}
              className="hover:text-white transition-colors text-2xl leading-none"
              style={{ color: colors.wheat[300] }}
              aria-label="Close help"
            >
              x
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4">
            {(["basics", "controls", "tips"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="game-font flex-1 py-2 px-3 rounded-lg transition-colors"
                style={{
                  fontSize: fontSize.sm,
                  backgroundColor: activeTab === tab ? colors.barnRed[500] : `${colors.soil[800]}80`,
                  color: activeTab === tab ? colors.white : colors.wheat[300],
                }}
              >
                {tab === "basics" && "Basics"}
                {tab === "controls" && "Controls"}
                {tab === "tips" && "Tips"}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="game-font" style={{ fontSize: fontSize.sm, color: colors.wheat[100] }}>
            {activeTab === "basics" && (
              <div className="space-y-4">
                {/* Quick Start Instructions - moved from MainMenu */}
                <div
                  className="p-4 rounded-lg text-center space-y-3"
                  style={{ backgroundColor: `${colors.soil[700]}40` }}
                >
                  <p>
                    <span style={{ color: colors.wheat[400] }}>DRAG</span>{" "}
                    <span style={{ color: colors.wheat[200] }}>to catch falling critters</span>
                  </p>
                  <p style={{ color: colors.wheat[200] }}>
                    Stack steady - too much{" "}
                    <span style={{ color: colors.barnRed[400] }}>sway</span> and down they go!
                  </p>
                  <p>
                    <span style={{ color: colors.wheat[400] }}>TAP</span>{" "}
                    <span style={{ color: colors.wheat[200] }}>critters to unleash their</span>{" "}
                    <span style={{ color: colors.sky[400] }}>abilities!</span>
                  </p>
                  <p style={{ color: colors.wheat[200] }}>
                    Stack 5+ animals? Hit the{" "}
                    <span style={{ color: colors.barnRed[500] }}>Barn</span> to save 'em!
                  </p>
                </div>

                <div>
                  <h3 className="font-bold" style={{ color: colors.wheat[300] }}>
                    The Storm is Coming!
                  </h3>
                  <p className="mt-1" style={{ color: colors.wheat[200] }}>
                    A tornado is threatening your Nebraska homestead! Catch falling farm critters
                    and stack them safely before the wind takes them away.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold" style={{ color: colors.wheat[300] }}>Stacking</h3>
                  <ul
                    className="list-disc list-inside space-y-1 mt-1"
                    style={{ color: colors.wheat[200] }}
                  >
                    <li>Move under falling critters to catch them</li>
                    <li>Animals land on top of your stack</li>
                    <li>Watch the wobble - too much wobble and they'll topple!</li>
                    <li>Poke your stack to reduce wobble</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold" style={{ color: colors.wheat[300] }}>Scoring</h3>
                  <ul
                    className="list-disc list-inside space-y-1 mt-1"
                    style={{ color: colors.wheat[200] }}
                  >
                    <li>Each critter caught earns base points</li>
                    <li>Higher stacks earn bonus multipliers</li>
                    <li>Stack 5+ animals then bank them at the Barn</li>
                    <li>Special critters give bonus effects and extra points</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold" style={{ color: colors.wheat[300] }}>Lives</h3>
                  <ul
                    className="list-disc list-inside space-y-1 mt-1"
                    style={{ color: colors.wheat[200] }}
                  >
                    <li>You start with 3 hearts</li>
                    <li>Missing a critter costs 1 heart</li>
                    <li>Stack collapse costs 1 heart</li>
                    <li>Game ends when all hearts are lost</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "controls" && (
              <div className="space-y-4">
                {isTouch ? (
                  <>
                    <h3 className="font-bold" style={{ color: colors.wheat[300] }}>
                      Touch Controls
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span
                          className="text-lg font-bold flex-shrink-0"
                          style={{ color: colors.wheat[400] }}
                        >
                          DRAG
                        </span>
                        <span style={{ color: colors.wheat[200] }}>
                          Slide your finger left/right to move your catcher
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span
                          className="text-lg font-bold flex-shrink-0"
                          style={{ color: colors.wheat[400] }}
                        >
                          TAP
                        </span>
                        <span style={{ color: colors.wheat[200] }}>
                          Touch a critter in your stack to poke it and calm the wobble
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span
                          className="text-lg font-bold flex-shrink-0"
                          style={{ color: colors.wheat[400] }}
                        >
                          SPECIAL
                        </span>
                        <span style={{ color: colors.wheat[200] }}>
                          Tap special animals to activate their unique powers
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span
                          className="text-lg font-bold flex-shrink-0"
                          style={{ color: colors.wheat[400] }}
                        >
                          BANK
                        </span>
                        <span style={{ color: colors.wheat[200] }}>
                          Tap the Barn when stacking 5+ critters to bank them safely
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold" style={{ color: colors.wheat[300] }}>
                      Keyboard Controls
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <kbd
                            className="px-2 py-1 rounded text-xs"
                            style={{ backgroundColor: colors.soil[700], color: colors.wheat[200] }}
                          >
                            LEFT
                          </kbd>
                          <kbd
                            className="px-2 py-1 rounded text-xs"
                            style={{ backgroundColor: colors.soil[700], color: colors.wheat[200] }}
                          >
                            RIGHT
                          </kbd>
                        </div>
                        <span style={{ color: colors.wheat[300] }}>or</span>
                        <div className="flex gap-1">
                          <kbd
                            className="px-2 py-1 rounded text-xs"
                            style={{ backgroundColor: colors.soil[700], color: colors.wheat[200] }}
                          >
                            A
                          </kbd>
                          <kbd
                            className="px-2 py-1 rounded text-xs"
                            style={{ backgroundColor: colors.soil[700], color: colors.wheat[200] }}
                          >
                            D
                          </kbd>
                        </div>
                        <span style={{ color: colors.wheat[200] }}>Move catcher</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <kbd
                          className="px-2 py-1 rounded text-xs"
                          style={{ backgroundColor: colors.soil[700], color: colors.wheat[200] }}
                        >
                          SPACE
                        </kbd>
                        <span style={{ color: colors.wheat[200] }}>
                          Poke critter / Activate power
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <kbd
                          className="px-2 py-1 rounded text-xs"
                          style={{ backgroundColor: colors.soil[700], color: colors.wheat[200] }}
                        >
                          ESC
                        </kbd>
                        <span style={{ color: colors.wheat[200] }}>Pause game</span>
                      </div>
                    </div>

                    <h3 className="font-bold mt-4" style={{ color: colors.wheat[300] }}>
                      Mouse Controls
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0" style={{ color: colors.wheat[400] }}>
                          Click + Drag
                        </span>
                        <span style={{ color: colors.wheat[200] }}>
                          Move your catcher left and right
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0" style={{ color: colors.wheat[400] }}>
                          Click
                        </span>
                        <span style={{ color: colors.wheat[200] }}>
                          Tap critters to poke them or activate powers
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "tips" && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold" style={{ color: colors.wheat[300] }}>Pro Tips</h3>
                  <ul
                    className="list-disc list-inside space-y-2 mt-2"
                    style={{ color: colors.wheat[200] }}
                  >
                    <li>
                      <strong style={{ color: colors.white }}>Balance is key</strong> - Move
                      smoothly to reduce wobble buildup
                    </li>
                    <li>
                      <strong style={{ color: colors.white }}>Bank early, bank often</strong> -
                      Don't get greedy with tall stacks
                    </li>
                    <li>
                      <strong style={{ color: colors.white }}>Watch the wind</strong> - Tornado
                      intensity affects how fast critters fall
                    </li>
                    <li>
                      <strong style={{ color: colors.white }}>Use powers wisely</strong> - Save
                      stabilize powers for emergencies
                    </li>
                    <li>
                      <strong style={{ color: colors.white }}>Center your catches</strong> -
                      Off-center catches add more wobble
                    </li>
                    <li>
                      <strong style={{ color: colors.white }}>Poke to stabilize</strong> - Tapping
                      your stack reduces wobble
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold mt-4" style={{ color: colors.wheat[300] }}>
                    Critter Types
                  </h3>
                  <ul className="space-y-2 mt-2">
                    <li className="flex items-center gap-2">
                      <span className="w-20" style={{ color: colors.white }}>
                        Normal
                      </span>
                      <span style={{ color: colors.wheat[200] }}>
                        Standard critters - easy to stack
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-20" style={{ color: colors.wheat[400] }}>
                        Golden
                      </span>
                      <span style={{ color: colors.wheat[200] }}>Bonus points when caught!</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-20" style={{ color: colors.sky[400] }}>
                        Ice
                      </span>
                      <span style={{ color: colors.wheat[200] }}>Freezes wobble temporarily</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-20" style={{ color: colors.barnRed[400] }}>
                        Heavy
                      </span>
                      <span style={{ color: colors.wheat[200] }}>
                        Adds more wobble but worth more
                      </span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold mt-4" style={{ color: colors.wheat[300] }}>Upgrades</h3>
                  <p className="mt-1" style={{ color: colors.wheat[200] }}>
                    Spend coins in the Upgrade Shop to unlock permanent bonuses like extra hearts,
                    reduced wobble, and better special critter spawn rates!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="mt-6 flex justify-center">
            <GameButton onClick={handleClose} variant="secondary">
              GOT IT!
            </GameButton>
          </div>
        </GameCard>
      </div>
    </div>
  );
}
