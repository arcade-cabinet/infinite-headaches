import { World } from "miniplex";
import { Entity } from "./components";

export const world = new World<Entity>();

// Expose for E2E testing
if (typeof window !== "undefined") {
  (window as any).GAME_WORLD = world;
}
