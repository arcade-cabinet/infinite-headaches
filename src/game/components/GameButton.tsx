/**
 * Game Button Component
 * Styled button for game UI
 */

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
}

export function GameButton({
  children,
  className,
  variant = "primary",
  size = "md",
  style,
  ...props
}: GameButtonProps) {
  const sizeClasses = {
    sm: "py-2 px-6 text-sm md:text-base",
    md: "py-3 px-8 md:py-4 md:px-12 text-lg md:text-2xl",
    lg: "py-4 px-10 md:py-5 md:px-14 text-xl md:text-3xl",
  };

  const variantClasses = {
    primary: [
      // Barn red button with wheat/gold text
      "bg-[#b91c1c] text-[#fef9c3]",
      "border-3 md:border-4 border-[#7f1d1d]",
      "shadow-[0_6px_0_#7f1d1d,0_12px_16px_rgba(0,0,0,0.3)]",
      "md:shadow-[0_8px_0_#7f1d1d,0_15px_20px_rgba(0,0,0,0.3)]",
      "hover:bg-[#991b1b]",
      "active:translate-y-1 active:shadow-[0_2px_0_#7f1d1d]",
      "md:active:translate-y-1.5",
    ],
    secondary: [
      // Weathered wood button with wheat text
      "bg-[#554730] text-[#fef9c3]",
      "border-3 md:border-4 border-[#6b5a3a]",
      "shadow-[0_6px_0_#382e25,0_12px_16px_rgba(0,0,0,0.3)]",
      "hover:bg-[#6b5a3a]",
      "active:translate-y-1 active:shadow-[0_2px_0_#382e25]",
    ],
  };

  return (
    <button
      className={cn(
        "game-font",
        "rounded-full",
        "cursor-pointer",
        "transition-all duration-100",
        "uppercase tracking-wider md:tracking-widest",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "select-none",
        "touch-manipulation",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
}
