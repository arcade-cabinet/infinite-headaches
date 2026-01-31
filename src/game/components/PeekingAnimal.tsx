/**
 * Peeking Animal Component
 * An animated farm animal that peeks out from the sides of the screen
 */

import { animate } from "animejs";
import { useCallback, useEffect, useRef, useState } from "react";
import { ANIMAL_TYPES, type AnimalType, GAME_CONFIG } from "../config";
import { ANIMAL_IMAGES } from "../assets/images";

interface PeekingAnimalProps {
  scale?: number;
}

export function PeekingAnimal({ scale = 1 }: PeekingAnimalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState<"left" | "right">("left");
  const [currentAnimal, setCurrentAnimal] = useState<AnimalType>("cow");
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationRef = useRef<ReturnType<typeof animate> | null>(null);

  const baseWidth = GAME_CONFIG.animal.width * 2 * scale;
  const baseHeight = GAME_CONFIG.animal.height * 2 * scale;

  // Pick a random animal for the next peek
  const pickRandomAnimal = useCallback(() => {
    const types = Object.keys(ANIMAL_TYPES).filter(t => t !== 'farmer') as AnimalType[];
    const randomType = types[Math.floor(Math.random() * types.length)];
    setCurrentAnimal(randomType);
  }, []);

  // Random blinking
  useEffect(() => {
    const scheduleBlink = () => {
      const delay = 2000 + Math.random() * 3000;
      blinkTimeoutRef.current = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(
          () => {
            setIsBlinking(false);
            scheduleBlink();
          },
          150 + Math.random() * 100
        );
      }, delay);
    };

    scheduleBlink();

    return () => {
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
    };
  }, []);

  // Peek animation cycle
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const doPeek = () => {
      // Pick new animal
      pickRandomAnimal();
      
      // Randomly choose side
      const newSide = Math.random() > 0.5 ? "left" : "right";
      setSide(newSide);

      // Reset position
      container.style.transform = newSide === "left" ? `translateX(-100%)` : `translateX(100%)`;

      // Peek in animation
      animationRef.current = animate(container, {
        translateX: newSide === "left" ? "-30%" : "30%",
        duration: 800,
        ease: "outBack",
        onComplete: () => {
          // Hold for a bit
          setTimeout(
            () => {
              // Peek out animation
              animationRef.current = animate(container, {
                translateX: newSide === "left" ? "-100%" : "100%",
                duration: 600,
                ease: "inBack",
                onComplete: () => {
                  // Schedule next peek
                  peekTimeoutRef.current = setTimeout(doPeek, 3000 + Math.random() * 4000);
                },
              });
            },
            2000 + Math.random() * 2000
          );
        },
      });
    };

    // Initial peek after a short delay
    peekTimeoutRef.current = setTimeout(doPeek, 1000);

    return () => {
      if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
      if (animationRef.current) animationRef.current.pause();
    };
  }, [pickRandomAnimal]);

  return (
    <div
      ref={containerRef}
      className="fixed z-10 pointer-events-none"
      style={{
        [side]: 0,
        bottom: "10%",
        transform: side === "left" ? "translateX(-100%)" : "translateX(100%)",
      }}
    >
        <div style={{ 
            width: baseWidth, 
            height: baseHeight, 
            transform: side === "right" ? "scaleX(-1)" : undefined,
            position: 'relative'
        }}>
            <img 
                src={ANIMAL_IMAGES[currentAnimal]} 
                alt={currentAnimal}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                }}
            />
            {/* Simple blink overlay (optional) */}
            {isBlinking && (
                <div className="absolute top-1/2 left-1/2 w-full h-full bg-black/10" style={{ transform: 'translate(-50%, -50%)', mixBlendMode: 'multiply' }} />
            )}
        </div>
    </div>
  );
}
