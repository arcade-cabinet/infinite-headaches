import { Vector3, Color3 } from "@babylonjs/core";
import { world } from "./world";
import { Entity } from "./components";
import { AnimalType } from "../../config";

export const createAnimal = (type: AnimalType, position: Vector3): Entity => ({
  id: crypto.randomUUID(),
  position,
  velocity: new Vector3(0, 0, 0),
  scale: new Vector3(1, 1, 1),
  model: `assets/models/${type}.glb`, // Converted assets
  tag: { type: "animal", subtype: type },
  physics: { mass: 1, restitution: 0.2, friction: 0.5 },
  wobble: { offset: 0, velocity: 0, damping: 0.9, springiness: 0.1 },
  mergeable: { level: 1, mergeRadius: 1.5 },
  colorOverlay: { color: new Color3(1, 1, 1), intensity: 0 }, // Neutral
});

type CharacterId = 'farmer_john' | 'farmer_mary';

const CHARACTER_CONFIG: Record<CharacterId, {
  model: string;
  name: string;
  positiveTraits: string[];
  negativeTraits: string[];
}> = {
  farmer_john: {
    model: "assets/models/farmer_john.glb",
    name: "Farmer John",
    positiveTraits: ["Steady Hands"],
    negativeTraits: ["Slow Walker"],
  },
  farmer_mary: {
    model: "assets/models/farmer_mary.glb",
    name: "Farmer Mary",
    positiveTraits: ["Fast Reflexes"],
    negativeTraits: ["Easily Startled"],
  },
};

export const createPlayer = (characterId: CharacterId, position: Vector3): Entity => {
  const config = CHARACTER_CONFIG[characterId];

  return {
    id: crypto.randomUUID(),
    position,
    velocity: new Vector3(0, 0, 0),
    scale: new Vector3(1.2, 1.2, 1.2),
    model: config.model,
    tag: { type: "player", subtype: characterId },
    input: { speed: 10, smoothness: 0.1 },
    wobble: { offset: 0, velocity: 0, damping: 0.9, springiness: 0.05 },
    traits: {
      name: config.name,
      positiveTraits: config.positiveTraits,
      negativeTraits: config.negativeTraits,
    },
  };
};
