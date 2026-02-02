/**
 * Game Card Component
 * Modal-style card for menus and overlays
 */

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface GameCardProps {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function GameCard({ children, className, style }: GameCardProps) {
  return (
    <div
      className={cn(
        // Nebraska Homestead: soil/wood dark background
        "bg-[#4a3c30]/95",
        "p-6 md:p-8 lg:p-10",
        "rounded-2xl md:rounded-3xl",
        // Weathered wood border
        "border-4 md:border-[6px] border-[#6b5a3a]",
        "pointer-events-auto",
        "shadow-2xl",
        "w-full",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}
