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
      "bg-yellow-400 text-black",
      "border-3 md:border-4 border-black",
      "shadow-[0_6px_0_#F57F17,0_12px_16px_rgba(0,0,0,0.3)]",
      "md:shadow-[0_8px_0_#F57F17,0_15px_20px_rgba(0,0,0,0.3)]",
      "hover:bg-yellow-300",
      "active:translate-y-1 active:shadow-[0_2px_0_#F57F17]",
      "md:active:translate-y-1.5",
    ],
    secondary: [
      "bg-purple-600 text-white",
      "border-3 md:border-4 border-purple-400",
      "shadow-[0_6px_0_#7c3aed,0_12px_16px_rgba(0,0,0,0.3)]",
      "hover:bg-purple-500",
      "active:translate-y-1 active:shadow-[0_2px_0_#7c3aed]",
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
