/**
 * SplashScreen.tsx
 * Dramatic tornado splash screen animation for Homestead Headaches
 *
 * Features:
 * - Tornado sweeps across screen from right to left
 * - Farm animals swirl inside the tornado
 * - Dust settles revealing the title
 * - 3-4 second animation, skippable
 */

import { animate, Timeline } from "animejs";
import { useCallback, useEffect, useRef, useState } from "react";
import { colors, gameColors } from "@/theme/tokens/colors";
import { feedback } from "@/platform/feedback";
import { audioManager } from "../audio";

interface SplashScreenProps {
  onComplete: () => void;
}

// Animal emojis for swirling effect (will be rendered as text)
const SWIRLING_ANIMALS = ["cow", "pig", "chicken", "duck", "sheep"];

// Animal SVG paths for simple silhouettes
const ANIMAL_SHAPES: Record<string, string> = {
  cow: "M12 8c-2 0-4 1-4 3v4c0 1 1 2 2 2h1l1 2h2l1-2h1c1 0 2-1 2-2v-4c0-2-2-3-4-3zm-2 4a1 1 0 110-2 1 1 0 010 2zm4 0a1 1 0 110-2 1 1 0 010 2z",
  pig: "M12 7c-3 0-5 2-5 4v3c0 2 2 3 5 3s5-1 5-3v-3c0-2-2-4-5-4zm-2 5a1 1 0 110-2 1 1 0 010 2zm4 0a1 1 0 110-2 1 1 0 010 2zm-2 2c-1 0-2-.5-2-1h4c0 .5-1 1-2 1z",
  chicken: "M12 6c-2 0-3 1-3 2v2c0 1-1 2-2 2h-1v2h2c1 1 2 2 4 2s3-1 4-2h2v-2h-1c-1 0-2-1-2-2V8c0-1-1-2-3-2z",
  duck: "M12 5c-3 0-4 2-4 3v3l-2 1v2h2l1 2h6l1-2h2v-2l-2-1V8c0-1-1-3-4-3zm-1 4a1 1 0 110-2 1 1 0 010 2z",
  sheep: "M12 6c-3 0-5 1-5 3 0 1-1 2-1 3 0 2 2 4 6 4s6-2 6-4c0-1-1-2-1-3 0-2-2-3-5-3z",
};

interface SwirlingAnimal {
  id: number;
  type: string;
  angle: number;
  radius: number;
  speed: number;
  size: number;
  opacity: number;
}

interface DustParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  rotation: number;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tornadoRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const dustContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Timeline | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  const [isSkipping, setIsSkipping] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [tornadoX, setTornadoX] = useState(110); // Start off-screen right
  const [dustParticles, setDustParticles] = useState<DustParticle[]>([]);
  const [swirlingAnimals, setSwirlingAnimals] = useState<SwirlingAnimal[]>([]);

  // Initialize swirling animals
  useEffect(() => {
    const animals: SwirlingAnimal[] = [];
    for (let i = 0; i < 12; i++) {
      animals.push({
        id: i,
        type: SWIRLING_ANIMALS[i % SWIRLING_ANIMALS.length],
        angle: (Math.PI * 2 * i) / 12,
        radius: 30 + Math.random() * 60,
        speed: 0.02 + Math.random() * 0.03,
        size: 16 + Math.random() * 20,
        opacity: 0.6 + Math.random() * 0.4,
      });
    }
    setSwirlingAnimals(animals);
  }, []);

  // Generate dust particles
  useEffect(() => {
    const particles: DustParticle[] = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        id: i,
        x: Math.random() * 100,
        y: 50 + Math.random() * 50,
        size: 10 + Math.random() * 40,
        opacity: 0,
        rotation: Math.random() * 360,
      });
    }
    setDustParticles(particles);
  }, []);

  // Canvas animation for tornado funnel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let animationId: number;
    let time = 0;

    const drawTornado = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = (tornadoX / 100) * canvas.width;
      const topY = canvas.height * 0.1;
      const bottomY = canvas.height * 0.85;
      const height = bottomY - topY;

      // Draw tornado funnel with multiple spiraling layers
      for (let layer = 0; layer < 5; layer++) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(100, 116, 139, ${0.15 - layer * 0.02})`;
        ctx.lineWidth = 3 - layer * 0.4;

        for (let y = topY; y < bottomY; y += 2) {
          const progress = (y - topY) / height;
          const baseRadius = 20 + progress * 120 - layer * 15;
          const wobble = Math.sin(time * 3 + y * 0.02 + layer) * 10;
          const spiralOffset = Math.sin(time * 2 + y * 0.05 + layer * 0.5) * baseRadius * 0.3;

          const x = centerX + wobble + spiralOffset;

          if (y === topY) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // Draw debris particles in the tornado
      const debrisCount = 30;
      for (let i = 0; i < debrisCount; i++) {
        const baseY = topY + (height * i) / debrisCount;
        const progress = (baseY - topY) / height;
        const radius = 15 + progress * 100;
        const angle = time * 3 + (i * Math.PI * 2) / debrisCount;
        const spiralX = centerX + Math.cos(angle) * radius * (0.3 + progress * 0.7);
        const spiralY = baseY + Math.sin(time * 2 + i) * 5;

        ctx.beginPath();
        ctx.fillStyle = `rgba(139, 115, 85, ${0.4 + Math.random() * 0.3})`;
        ctx.arc(spiralX, spiralY, 2 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      time += 0.016;
      animationId = requestAnimationFrame(drawTornado);
    };

    drawTornado();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [tornadoX]);

  // Animate swirling animals
  useEffect(() => {
    let animationId: number;

    const animateAnimals = () => {
      setSwirlingAnimals((prev) =>
        prev.map((animal) => ({
          ...animal,
          angle: animal.angle + animal.speed,
        }))
      );
      animationId = requestAnimationFrame(animateAnimals);
    };

    animateAnimals();

    return () => cancelAnimationFrame(animationId);
  }, []);

  // Main animation sequence
  useEffect(() => {
    // Start splash music (tornado theme)
    audioManager.playTrack("splash");

    // Play whoosh sound
    feedback.play("drop");

    const timeline = new Timeline({
      defaults: { ease: "easeOutQuad" },
    });

    // Phase 1: Tornado enters from right (0-1.5s)
    timeline.add(
      {},
      {
        duration: 1500,
        update: (anim) => {
          const progress = anim.progress / 100;
          // Move from 110% (off right) to 40% (center-left)
          setTornadoX(110 - progress * 70);
        },
      },
      0
    );

    // Phase 2: Tornado reaches center, starts to dissipate (1.5-2.5s)
    timeline.add(
      {},
      {
        duration: 1000,
        update: (anim) => {
          const progress = anim.progress / 100;
          // Continue moving left while fading
          setTornadoX(40 - progress * 50);

          // Start showing dust
          setDustParticles((prev) =>
            prev.map((p, i) => ({
              ...p,
              opacity: Math.min(0.8, progress * 1.5 * (1 - i / prev.length)),
            }))
          );
        },
      },
      1500
    );

    // Phase 3: Dust settles, title emerges (2.5-4s)
    timeline.add(
      {},
      {
        duration: 1500,
        begin: () => {
          setShowTitle(true);
          // Play a satisfying sound
          feedback.play("land");
        },
        update: (anim) => {
          const progress = anim.progress / 100;

          // Fade out dust gradually
          setDustParticles((prev) =>
            prev.map((p, i) => ({
              ...p,
              opacity: Math.max(0, 0.8 - progress * 1.2),
              y: p.y + (progress * 20 * i) / prev.length,
            }))
          );
        },
        complete: () => {
          if (!isSkipping) {
            onComplete();
          }
        },
      },
      2500
    );

    animationRef.current = timeline;

    return () => {
      if (animationRef.current) {
        animationRef.current.pause();
      }
    };
  }, [onComplete, isSkipping]);

  // Title reveal animation
  useEffect(() => {
    if (showTitle && titleRef.current) {
      animate(titleRef.current, {
        opacity: [0, 1],
        scale: [0.5, 1.05, 1],
        translateY: [50, -10, 0],
        duration: 800,
        ease: "easeOutBack",
      });
    }
  }, [showTitle]);

  // Handle skip
  const handleSkip = useCallback(() => {
    if (isSkipping) return;
    setIsSkipping(true);

    if (animationRef.current) {
      animationRef.current.pause();
    }

    // Quick fade out
    if (containerRef.current) {
      animate(containerRef.current, {
        opacity: [1, 0],
        duration: 300,
        ease: "easeOutQuad",
        complete: () => onComplete(),
      });
    } else {
      onComplete();
    }
  }, [isSkipping, onComplete]);

  // Handle click/tap to skip - also ensures audio context is ready
  useEffect(() => {
    const handleInteraction = () => {
      // Initialize audio on first interaction (browser requirement)
      audioManager.init();
      handleSkip();
    };

    window.addEventListener("click", handleInteraction);
    window.addEventListener("touchstart", handleInteraction);

    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
    };
  }, [handleSkip]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 overflow-hidden"
      style={{
        background: `linear-gradient(to bottom,
          ${colors.storm[700]} 0%,
          ${colors.storm[600]} 30%,
          ${colors.soil[700]} 70%,
          ${colors.soil[800]} 100%
        )`,
      }}
    >
      {/* Storm sky effect */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse at 50% 20%,
            ${colors.storm[500]} 0%,
            transparent 50%
          )`,
        }}
      />

      {/* Canvas for tornado funnel animation */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: tornadoX > -10 ? 1 : 0 }}
      />

      {/* Tornado core with swirling animals */}
      <div
        ref={tornadoRef}
        className="absolute pointer-events-none"
        style={{
          left: `${tornadoX}%`,
          top: "10%",
          height: "75%",
          width: "250px",
          transform: "translateX(-50%)",
          opacity: tornadoX > -10 ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      >
        {/* Tornado funnel gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom,
              rgba(100, 116, 139, 0.1) 0%,
              rgba(100, 116, 139, 0.2) 50%,
              rgba(139, 115, 85, 0.3) 80%,
              rgba(139, 115, 85, 0.4) 100%
            )`,
            clipPath: "polygon(45% 0%, 55% 0%, 100% 100%, 0% 100%)",
          }}
        />

        {/* Swirling animals */}
        {swirlingAnimals.map((animal) => {
          const heightProgress = 0.2 + (animal.id / swirlingAnimals.length) * 0.6;
          const expandedRadius = animal.radius * (0.5 + heightProgress);
          const x = 50 + Math.cos(animal.angle) * (expandedRadius / 2.5);
          const y = heightProgress * 100;

          return (
            <div
              key={animal.id}
              className="absolute"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: animal.size,
                height: animal.size,
                transform: `
                  translate(-50%, -50%)
                  rotate(${animal.angle * 180 / Math.PI}deg)
                  scale(${0.5 + heightProgress * 0.5})
                `,
                opacity: animal.opacity * (tornadoX > 10 ? 1 : Math.max(0, tornadoX / 10)),
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="100%"
                height="100%"
                fill={colors.soil[300]}
                style={{
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                }}
              >
                <path d={ANIMAL_SHAPES[animal.type]} />
              </svg>
            </div>
          );
        })}

        {/* Wind streaks */}
        {[...Array(8)].map((_, i) => (
          <div
            key={`streak-${i}`}
            className="absolute"
            style={{
              left: `${30 + i * 5}%`,
              top: `${10 + i * 10}%`,
              width: "60%",
              height: "2px",
              background: `linear-gradient(90deg,
                transparent 0%,
                rgba(255,255,255,0.3) 50%,
                transparent 100%
              )`,
              transform: `rotate(${-15 + i * 3}deg)`,
              animation: `windStreak ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Dust particles layer */}
      <div ref={dustContainerRef} className="absolute inset-0 pointer-events-none">
        {dustParticles.map((particle) => (
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
              filter: "blur(2px)",
            }}
          />
        ))}
      </div>

      {/* Ground/horizon line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24"
        style={{
          background: `linear-gradient(to top,
            ${colors.soil[900]} 0%,
            ${colors.pasture[800]} 50%,
            transparent 100%
          )`,
        }}
      />

      {/* Title - emerges from dust */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 10 }}
      >
        <h1
          ref={titleRef}
          className="game-font text-center leading-tight opacity-0"
          style={{
            fontSize: "clamp(2rem, 8vw, 5rem)",
            color: colors.wheat[300],
            textShadow: `
              4px 4px 0 ${colors.barnRed[700]},
              8px 8px 0 ${colors.barnRed[900]},
              -2px -2px 0 #000,
              2px -2px 0 #000,
              -2px 2px 0 #000,
              2px 2px 0 #000,
              0 0 40px rgba(234, 179, 8, 0.6),
              0 0 80px rgba(234, 179, 8, 0.3)
            `,
            filter: `drop-shadow(0 0 30px ${colors.wheat[500]})`,
          }}
        >
          HOMESTEAD
          <br />
          HEADACHES
        </h1>
      </div>

      {/* Skip hint */}
      <div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center pointer-events-none"
        style={{
          color: colors.wheat[400],
          fontSize: "0.875rem",
          opacity: 0.6,
          animation: "pulse 2s ease-in-out infinite",
        }}
      >
        Tap to skip
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes windStreak {
          0% {
            opacity: 0.2;
            transform: translateX(-10px) rotate(-10deg);
          }
          100% {
            opacity: 0.5;
            transform: translateX(10px) rotate(10deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.8;
          }
        }

        @keyframes dustFloat {
          0% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
          100% {
            transform: translateY(0) rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
