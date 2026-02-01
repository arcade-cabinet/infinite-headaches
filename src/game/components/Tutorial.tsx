/**
 * Tutorial Component
 * First-time player onboarding overlay
 */

import { animate } from "animejs";
import { useEffect, useRef, useState } from "react";
import { useResponsiveScale } from "../hooks/useResponsiveScale";
import { GameButton } from "./GameButton";
import { GameCard } from "./GameCard";

interface TutorialProps {
  onComplete: () => void;
}

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
  highlight?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "DRAG TO CATCH",
    description: "Drag your Farmer left and right to catch falling animals!",
    icon: "👆",
    highlight: "Your farmer is at the bottom",
  },
  {
    title: "BUILD YOUR STACK",
    description: "Catch animals to stack them up. Higher stacks = more points!",
    icon: "📚",
  },
  {
    title: "WATCH THE WOBBLE",
    description: "Moving too fast makes the stack wobble. Too much wobble and it topples!",
    icon: "〰️",
    highlight: "Move smoothly",
  },
  {
    title: "SPECIAL ANIMALS",
    description:
      "🐸 Frogs - TAP to shoot fireballs!\n🐧 Penguins - TAP to freeze falling animals!\nAbilities have cooldowns - watch for the glow!",
    icon: "✨",
    highlight: "Tap special animals to activate powers",
  },
  {
    title: "BANK YOUR HERD",
    description: "Stack 5+ animals and a Lasso appears. Tap it to bank your herd safely!",
    icon: "🔴",
    highlight: "Banking saves progress",
  },
  {
    title: "COLLECT POWER-UPS",
    description:
      "🥚 Golden Egg merges your stack\n🥛 Milk Bottle heals hearts\n💊 Vitamin adds max health",
    icon: "🎁",
  },
];

export function Tutorial({ onComplete }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { fontSize, spacing, isMobile } = useResponsiveScale();
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  // Animate step change
  useEffect(() => {
    if (!contentRef.current) return;

    animate(contentRef.current, {
      opacity: [0, 1],
      translateX: [20, 0],
      duration: 400,
      ease: "outExpo",
    });
  }, []);

  // Entrance animation
  useEffect(() => {
    if (!cardRef.current) return;

    animate(cardRef.current, {
      opacity: [0, 1],
      scale: [0.8, 1],
      duration: 500,
      ease: "outBack",
    });
  }, []);

  const handleNext = () => {
    if (isLastStep) {
      // Mark tutorial as complete
      localStorage.setItem("animal-tutorial-complete", "true");
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("animal-tutorial-complete", "true");
    onComplete();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <div ref={cardRef} className="opacity-0">
        <GameCard
          className="text-center"
          style={{
            padding: spacing.lg,
            maxWidth: isMobile ? "90vw" : "400px",
          }}
        >
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-4" role="img" aria-label={`Step ${currentStep + 1} of ${TUTORIAL_STEPS.length}`}>
            {TUTORIAL_STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? "bg-yellow-400 w-3 h-3"
                    : i < currentStep
                      ? "bg-purple-400 w-2 h-2"
                      : "bg-purple-700 w-2 h-2"
                }`}
                aria-hidden="true"
              />
            ))}
          </div>

          {/* Content */}
          <div ref={contentRef}>
            {/* Icon */}
            <div
              className="mb-3"
              aria-hidden="true"
              style={{ fontSize: `clamp(2.5rem, ${parseFloat(fontSize.title) * 0.8}px, 4rem)` }}
            >
              {step.icon}
            </div>

            {/* Title */}
            <h3
              id="tutorial-title"
              className="game-font text-yellow-400 mb-3"
              style={{
                fontSize: fontSize.lg,
                textShadow: "2px 2px 0 #000",
              }}
            >
              {step.title}
            </h3>

            {/* Description */}
            <p
              className="game-font text-purple-100 mb-4 whitespace-pre-line"
              style={{ fontSize: fontSize.sm }}
            >
              {step.description}
            </p>

            {/* Highlight tip */}
            {step.highlight && (
              <div
                className="game-font text-cyan-300 bg-cyan-900/30 rounded-lg py-2 px-3 mb-4"
                style={{ fontSize: fontSize.xs }}
                role="status"
              >
                <span aria-hidden="true">💡</span> {step.highlight}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-center">
            {!isLastStep && (
              <GameButton
                onClick={handleSkip}
                variant="secondary"
                size="sm"
                style={{ fontSize: fontSize.sm }}
              >
                SKIP
              </GameButton>
            )}

            <GameButton onClick={handleNext} variant="primary" style={{ fontSize: fontSize.md }}>
              {isLastStep ? "LET'S GO!" : "NEXT"}
            </GameButton>
          </div>

          {/* Step counter */}
          <p className="game-font text-purple-500 mt-3" style={{ fontSize: fontSize.xs }}>
            {currentStep + 1} / {TUTORIAL_STEPS.length}
          </p>
        </GameCard>
      </div>
    </div>
  );
}

/**
 * Check if user has completed the tutorial
 */
export function hasCompletedTutorial(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("animal-tutorial-complete") === "true";
}

/**
 * Reset tutorial state (for testing)
 */
export function resetTutorial(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("animal-tutorial-complete");
  }
}
