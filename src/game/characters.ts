/**
 * Character data - shared between menu UI and game logic.
 * Pure TS, no React dependencies.
 */

export interface CharacterModifiers {
  speedMultiplier: number;
  wobbleMultiplier: number;
}

export interface CharacterInfo {
  id: "farmer_john" | "farmer_mary";
  name: string;
  role: string;
  description: string;
  traits: { positive: string; negative: string };
  modifiers: CharacterModifiers;
}

export const CHARACTERS: CharacterInfo[] = [
  {
    id: "farmer_john",
    name: "Farmer John",
    role: "The Veteran",
    description: "Has seen it all. Including flying cows.",
    traits: { positive: "Steady Hands", negative: "Slow Walker" },
    modifiers: { speedMultiplier: 0.90, wobbleMultiplier: 0.85 },
  },
  {
    id: "farmer_mary",
    name: "Farmer Mary",
    role: "The Wife",
    description: "Been running this farm together for 30 years.",
    traits: { positive: "Fast Reflexes", negative: "Easily Startled" },
    modifiers: { speedMultiplier: 1.10, wobbleMultiplier: 1.15 },
  },
];

export type CharacterId = CharacterInfo["id"];
