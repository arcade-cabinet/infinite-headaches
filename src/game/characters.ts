/**
 * Character data - shared between menu UI and game logic.
 * Pure TS, no React dependencies.
 */

export interface CharacterInfo {
  id: "farmer_john" | "farmer_mary";
  name: string;
  role: string;
  description: string;
  traits: { positive: string; negative: string };
}

export const CHARACTERS: CharacterInfo[] = [
  {
    id: "farmer_john",
    name: "Farmer John",
    role: "The Veteran",
    description: "Has seen it all. Including flying cows.",
    traits: { positive: "Steady Hands", negative: "Slow Walker" },
  },
  {
    id: "farmer_mary",
    name: "Farmer Mary",
    role: "The Wife",
    description: "Been running this farm together for 30 years.",
    traits: { positive: "Fast Reflexes", negative: "Easily Startled" },
  },
];

export type CharacterId = CharacterInfo["id"];
