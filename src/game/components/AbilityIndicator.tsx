/**
 * Ability Indicator Component
 * Shows cooldown progress for Fire and Ice duck abilities
 */

import { useResponsiveScale } from "../hooks/useResponsiveScale";

interface AbilityIndicatorProps {
  type: "fire" | "ice";
  cooldownPercent: number; // 0-1, where 1 = ready
  visible: boolean;
}

export function AbilityIndicator({ type, cooldownPercent, visible }: AbilityIndicatorProps) {
  const { game } = useResponsiveScale();

  if (!visible) return null;

  const clamped = Math.max(0, Math.min(1, cooldownPercent));
  const size = Math.round(40 * game);
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);

  const colors =
    type === "fire"
      ? { main: "#FF7043", glow: "rgba(255, 112, 67, 0.6)", icon: "🔥" }
      : { main: "#81D4FA", glow: "rgba(129, 212, 250, 0.6)", icon: "❄️" };

  const isReady = clamped >= 1;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: size,
        height: size,
        filter: isReady ? `drop-shadow(0 0 8px ${colors.glow})` : "none",
        animation: isReady ? "pulse 1s ease-in-out infinite" : "none",
      }}
    >
      {/* Background circle */}
      <svg
        className="absolute inset-0"
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="rgba(0,0,0,0.3)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.main}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: "stroke-dashoffset 0.1s ease-out",
          }}
        />
      </svg>

      {/* Icon */}
      <span
        role="img"
        aria-label={type === "fire" ? "Fire ability" : "Ice ability"}
        style={{
          fontSize: size * 0.5,
          opacity: isReady ? 1 : 0.5,
          filter: isReady ? "none" : "grayscale(0.5)",
        }}
      >
        {colors.icon}
      </span>

      {/* Ready pulse */}
      {isReady && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
            animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
          }}
        />
      )}
    </div>
  );
}

interface AbilityBarProps {
  fireReady: number; // 0-1
  iceReady: number; // 0-1
  hasFireDuck: boolean;
  hasIceDuck: boolean;
}

export function AbilityBar({ fireReady, iceReady, hasFireDuck, hasIceDuck }: AbilityBarProps) {
  const { spacing } = useResponsiveScale();

  const showAny = hasFireDuck || hasIceDuck;
  if (!showAny) return null;

  return (
    <div className="flex gap-2 items-center" style={{ padding: spacing.xs }}>
      <AbilityIndicator type="fire" cooldownPercent={fireReady} visible={hasFireDuck} />
      <AbilityIndicator type="ice" cooldownPercent={iceReady} visible={hasIceDuck} />
    </div>
  );
}
