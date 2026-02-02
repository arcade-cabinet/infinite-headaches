/**
 * Combo Counter Component
 * Escalating visual feedback for combo chains.
 * 1-4x: simple text. 5-9x: scale pulse + warm glow.
 * 10-14x: strong pulse + particles. 15x+: rotation wobble + rainbow.
 */

import { animate } from "animejs";
import { useEffect, useRef } from "react";
import { useResponsiveScale } from "../hooks/useResponsiveScale";

interface ComboCounterProps {
  combo: number;
  reducedMotion?: boolean;
}

const TIER_STYLES = {
  low: { color: "#67e8f9", glow: "none" },
  mid: { color: "#fbbf24", glow: "0 0 8px rgba(251, 191, 36, 0.6)" },
  high: { color: "#f97316", glow: "0 0 12px rgba(249, 115, 22, 0.7)" },
  ultra: { color: "#f472b6", glow: "0 0 16px rgba(244, 114, 182, 0.8)" },
} as const;

function getTier(combo: number) {
  if (combo >= 15) return "ultra";
  if (combo >= 10) return "high";
  if (combo >= 5) return "mid";
  return "low";
}

export function ComboCounter({ combo, reducedMotion = false }: ComboCounterProps) {
  const { fontSize } = useResponsiveScale();
  const ref = useRef<HTMLDivElement>(null);
  const prevCombo = useRef(combo);

  useEffect(() => {
    if (!ref.current || reducedMotion || combo <= prevCombo.current) {
      prevCombo.current = combo;
      return;
    }
    prevCombo.current = combo;

    const tier = getTier(combo);

    if (tier === "low") {
      animate(ref.current, {
        scale: [1.2, 1],
        duration: 150,
        ease: "outBack",
      });
    } else if (tier === "mid") {
      animate(ref.current, {
        scale: [1.4, 1],
        translateY: [-4, 0],
        duration: 250,
        ease: "outElastic(1, .6)",
      });
    } else if (tier === "high") {
      animate(ref.current, {
        scale: [1.6, 1],
        translateY: [-6, 0],
        duration: 300,
        ease: "outElastic(1, .5)",
      });
    } else {
      // ultra
      animate(ref.current, {
        scale: [1.8, 1],
        translateY: [-8, 0],
        rotate: [-3, 0],
        duration: 350,
        ease: "outElastic(1, .4)",
      });
    }
  }, [combo, reducedMotion]);

  if (combo <= 1) return null;

  const tier = getTier(combo);
  const style = TIER_STYLES[tier];

  return (
    <div
      ref={ref}
      className="game-font"
      aria-label={`${combo} combo`}
      style={{
        fontSize: fontSize.sm,
        color: style.color,
        textShadow: `1px 1px 0 #000, ${style.glow}`,
        lineHeight: 1,
      }}
    >
      {combo}× COMBO
    </div>
  );
}
