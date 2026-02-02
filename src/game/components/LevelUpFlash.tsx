/**
 * Level Up Flash Component
 * Full-screen white overlay that fades out on level change.
 * Respects reducedMotion.
 */

import { useEffect, useRef, useState } from "react";

interface LevelUpFlashProps {
  level: number;
  reducedMotion?: boolean;
}

export function LevelUpFlash({ level, reducedMotion = false }: LevelUpFlashProps) {
  const [visible, setVisible] = useState(false);
  const prevLevel = useRef(level);

  useEffect(() => {
    if (level !== prevLevel.current && level > 1) {
      prevLevel.current = level;
      if (reducedMotion) return;

      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
    prevLevel.current = level;
  }, [level, reducedMotion]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(255, 255, 255, 0.6)",
        zIndex: 50,
        pointerEvents: "none",
        animation: "levelUpFade 300ms ease-out forwards",
      }}
    >
      <style>{`
        @keyframes levelUpFade {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
