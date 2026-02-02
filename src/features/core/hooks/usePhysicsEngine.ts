/**
 * Havok physics engine initialization hook.
 * Loads WASM binary and creates HavokPlugin once on mount.
 */

import { useEffect, useState } from "react";
import { HavokPlugin } from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";

export function usePhysicsEngine() {
  const [havokPlugin, setHavokPlugin] = useState<HavokPlugin | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const havokInstance = await HavokPhysics({
          locateFile: () => "./HavokPhysics.wasm",
        });
        setHavokPlugin(new HavokPlugin(true, havokInstance));
        setIsReady(true);
      } catch (e) {
        console.error("Failed to load Havok Physics:", e);
        setError("Failed to load Physics Engine. Please reload.");
      }
    })();
  }, []);

  return { havokPlugin, isReady, error };
}
