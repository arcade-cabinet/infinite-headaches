/**
 * MainMenuBackground - Static full-screen background for the main menu
 *
 * Displays a beautiful Nebraska farm scene generated with Imagen 3.
 * Automatically selects portrait (9:16) or landscape (16:9) based on screen orientation.
 * Falls back to a gradient if images aren't available yet.
 */

import { useEffect, useState } from "react";

export function MainMenuBackground() {
  const [isPortrait, setIsPortrait] = useState(
    typeof window !== "undefined" ? window.innerHeight > window.innerWidth : false
  );
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Select image based on orientation
  const imageSrc = isPortrait
    ? "/assets/backgrounds/menu_portrait.png"
    : "/assets/backgrounds/menu_landscape.png";

  // Handle orientation changes
  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Preload image
  useEffect(() => {
    setImageLoaded(false);
    setImageFailed(false);

    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageFailed(true);
    img.src = imageSrc;
  }, [imageSrc]);

  return (
    <div className="fixed inset-0 z-0">
      {/* Fallback gradient - Nebraska sunset colors */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              to bottom,
              #1e3a5f 0%,
              #4a6fa5 20%,
              #8ba5c4 40%,
              #e8b87d 60%,
              #d4956a 75%,
              #6b4423 90%,
              #3d2817 100%
            )
          `,
        }}
      />

      {/* Storm clouds overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 30% 20%, rgba(60, 70, 90, 0.8) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 70% 30%, rgba(50, 60, 80, 0.6) 0%, transparent 50%)
          `,
        }}
      />

      {/* Golden sunlight effect */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 50% 100%, rgba(255, 200, 100, 0.2) 0%, transparent 60%)
          `,
        }}
      />

      {/* Generated background image (if available) */}
      {!imageFailed && (
        <img
          src={imageSrc}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        />
      )}

      {/* Subtle vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(
              ellipse 100% 100% at 50% 50%,
              transparent 40%,
              rgba(0, 0, 0, 0.4) 100%
            )
          `,
        }}
      />
    </div>
  );
}
