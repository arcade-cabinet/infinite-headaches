/**
 * Fake loading screen simulation.
 * Runs through staged progress when active, calls onComplete when done.
 */

import { useEffect, useRef, useState } from "react";

interface LoadingStage {
  progress: number;
  text: string;
}

const STAGES: LoadingStage[] = [
  { progress: 20, text: "Planting Crops..." },
  { progress: 40, text: "Polishing Tractors..." },
  { progress: 60, text: "Waking up Roosters..." },
  { progress: 80, text: "Loading Farmers..." },
  { progress: 100, text: "Ready!" },
];

export function useLoadingSimulation(active: boolean, onComplete: () => void) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Initializing...");

  // Use ref to avoid re-triggering effect when callback identity changes
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!active) return;

    setProgress(0);
    setStatus("Preparing Diorama...");

    let stage = 0;
    const interval = setInterval(() => {
      if (stage >= STAGES.length) {
        clearInterval(interval);
        onCompleteRef.current();
        return;
      }
      setProgress(STAGES[stage].progress);
      setStatus(STAGES[stage].text);
      stage++;
    }, 400);

    return () => clearInterval(interval);
  }, [active]);

  return { progress, status };
}
