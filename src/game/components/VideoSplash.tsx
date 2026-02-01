/**
 * VideoSplash - Plays the Veo 3.1 generated splash video
 *
 * Automatically selects portrait (9:16) or landscape (16:9) based on screen orientation.
 * The video shows a cartoon tornado sweeping across a Nebraska farm with animals peeking out.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "../audio";

interface VideoSplashProps {
  onComplete: () => void;
}

export function VideoSplash({ onComplete }: VideoSplashProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPortrait, setIsPortrait] = useState(
    typeof window !== "undefined" ? window.innerHeight > window.innerWidth : false
  );

  // Select video based on orientation
  const videoSrc = isPortrait
    ? "/assets/video/splash_portrait.mp4"
    : "/assets/video/splash_landscape.mp4";

  // Handle orientation changes
  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Start splash music
  useEffect(() => {
    audioManager.playTrack("splash");
  }, []);

  // Handle video events
  const handleCanPlay = useCallback(() => {
    videoRef.current?.play();
  }, []);

  const handleEnded = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Skip on click/tap
  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Allow skipping with click/tap after short delay
  useEffect(() => {
    const handleInteraction = () => handleSkip();

    const timeout = setTimeout(() => {
      window.addEventListener("click", handleInteraction);
      window.addEventListener("touchstart", handleInteraction);
    }, 500);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
    };
  }, [handleSkip]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <video
        ref={videoRef}
        src={videoSrc}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        onCanPlay={handleCanPlay}
        onEnded={handleEnded}
      />

      {/* Skip hint */}
      <div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center pointer-events-none game-font text-white/60 text-sm"
        style={{ animation: "pulse 2s ease-in-out infinite" }}
      >
        Tap to skip
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
