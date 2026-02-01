/**
 * Sound Toggle Component
 * Mute/unmute button for game audio
 */

import { useCallback, useEffect, useState } from "react";
import { audioManager } from "../audio";

interface SoundToggleProps {
  className?: string;
}

export function SoundToggle({ className = "" }: SoundToggleProps) {
  const [isMuted, setIsMuted] = useState(() => {
    // Check localStorage for saved preference
    if (typeof window !== "undefined") {
      return localStorage.getItem("animal-muted") === "true";
    }
    return false;
  });

  // Apply mute state on mount and changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("animal-muted", String(isMuted));
    }
    // Sync with audio manager
    audioManager.setMuted(isMuted);
  }, [isMuted]);

  const toggleSound = useCallback(() => {
    setIsMuted((prev) => {
      const newMuted = !prev;
      // If unmuting and music was playing, restart it
      if (!newMuted) {
        audioManager.startMusic();
      } else {
        audioManager.stopMusic();
      }
      return newMuted;
    });
  }, []);

  return (
    <button
      onClick={toggleSound}
      className={`
        pointer-events-auto
        w-12 h-12
        rounded-full
        bg-amber-900/80
        border-2 border-amber-600/50
        flex items-center justify-center
        transition-all duration-200
        hover:bg-amber-800/80 hover:scale-110
        active:scale-95
        shadow-lg
        ${className}
      `}
      aria-label={isMuted ? "Unmute sound" : "Mute sound"}
    >
      {isMuted ? (
        // Muted icon - speaker with X
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-amber-200"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        // Sound on icon - speaker with waves
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-yellow-300"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </button>
  );
}
