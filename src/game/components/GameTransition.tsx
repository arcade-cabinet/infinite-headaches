/**
 * GameTransition - Quality-tiered transition from menu to gameplay
 *
 * - HIGH: Dust particles fade out / fade in
 * - MEDIUM: Simple fade out / fade in (no particles)
 * - LOW: Instant transition (no effect)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { colors } from "@/theme/tokens/colors";
import { useGraphics } from "../../graphics";

interface GameTransitionProps {
  /** Called when the transition completes */
  onComplete: () => void;
  /** Whether the transition is active */
  active: boolean;
}

interface DustParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  rotation: number;
  speed: number;
}

export function GameTransition({ onComplete, active }: GameTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { settings } = useGraphics();
  const quality = settings.quality;

  const [phase, setPhase] = useState<"idle" | "fadeOut" | "fadeIn" | "done">("idle");
  const [dustParticles, setDustParticles] = useState<DustParticle[]>([]);
  const [overlayOpacity, setOverlayOpacity] = useState(0);

  // Skip transition on LOW quality
  useEffect(() => {
    if (active && quality === "low") {
      onComplete();
    }
  }, [active, quality, onComplete]);

  // Initialize dust particles for HIGH quality
  useEffect(() => {
    if (!active || quality !== "high") return;

    const particles: DustParticle[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 20 + Math.random() * 60,
        opacity: 0,
        rotation: Math.random() * 360,
        speed: 0.5 + Math.random() * 1.5,
      });
    }
    setDustParticles(particles);
  }, [active, quality]);

  // Animation sequence
  useEffect(() => {
    if (!active || quality === "low") return;

    setPhase("fadeOut");
    let frame = 0;
    const totalFrames = quality === "high" ? 60 : 40; // ~1s for high, ~0.67s for medium
    const midPoint = totalFrames / 2;

    const animate = () => {
      frame++;
      const progress = frame / totalFrames;

      if (frame <= midPoint) {
        // Fade out phase
        const fadeOutProgress = frame / midPoint;
        setOverlayOpacity(fadeOutProgress);

        if (quality === "high") {
          setDustParticles((prev) =>
            prev.map((p) => ({
              ...p,
              opacity: Math.min(0.8, fadeOutProgress * 1.2),
              y: p.y - p.speed * 0.5,
              rotation: p.rotation + p.speed,
            }))
          );
        }
      } else {
        // Fade in phase
        if (phase !== "fadeIn") setPhase("fadeIn");
        const fadeInProgress = (frame - midPoint) / midPoint;
        setOverlayOpacity(1 - fadeInProgress);

        if (quality === "high") {
          setDustParticles((prev) =>
            prev.map((p) => ({
              ...p,
              opacity: Math.max(0, 0.8 - fadeInProgress * 1.2),
              y: p.y + p.speed * 2,
              rotation: p.rotation + p.speed * 0.5,
            }))
          );
        }
      }

      if (frame < totalFrames) {
        requestAnimationFrame(animate);
      } else {
        setPhase("done");
        onComplete();
      }
    };

    requestAnimationFrame(animate);
  }, [active, quality, onComplete]);

  // Don't render on LOW quality or when not active
  if (!active || quality === "low") {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 overflow-hidden pointer-events-none"
    >
      {/* Solid color overlay for fade effect */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: colors.soil[800],
          opacity: overlayOpacity,
          transition: "opacity 0.05s linear",
        }}
      />

      {/* Dust particles (HIGH quality only) */}
      {quality === "high" && dustParticles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
            transform: `rotate(${particle.rotation}deg)`,
            background: `radial-gradient(circle,
              ${colors.soil[400]} 0%,
              ${colors.soil[500]} 40%,
              transparent 70%
            )`,
            filter: "blur(4px)",
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
}
