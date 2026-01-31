import { useState } from "react";
import { GameButton } from "../components/GameButton";
import { GameCard } from "../components/GameCard";
import { useResponsiveScale } from "../hooks/useResponsiveScale";
import { createPlayer } from "../ecs/archetypes";
import { Vector3 } from "@babylonjs/core";

// Mock character data (would come from ECS/Config)
const CHARACTERS = [
  {
    id: "farmer_john",
    name: "Farmer John",
    role: "The Veteran",
    description: "Has seen it all. Including flying cows.",
    traits: { positive: "Steady Hands", negative: "Slow Walker" },
    unlocked: true,
  },
  {
    id: "farmer_mary",
    name: "Farmer Mary",
    role: "The Wife",
    description: "Been running this farm together for 30 years.",
    traits: { positive: "Fast Reflexes", negative: "Easily Startled" },
    unlocked: true,
  },
  {
    id: "old_mac",
    name: "Old Mac",
    role: "The Legend",
    description: "E-I-E-I-Oh no.",
    traits: { positive: "Animal Whisperer", negative: "Back Problems" },
    unlocked: false,
  }
];

interface CharacterSelectProps {
  onSelect: (characterId: string) => void;
  onBack: () => void;
}

export function CharacterSelect({ onSelect, onBack }: CharacterSelectProps) {
  const { fontSize, spacing } = useResponsiveScale();
  const [currentIndex, setCurrentCharacter] = useState(0);

  const character = CHARACTERS[currentIndex];

  const handleNext = () => {
    setCurrentCharacter((prev) => (prev + 1) % CHARACTERS.length);
  };

  const handlePrev = () => {
    setCurrentCharacter((prev) => (prev - 1 + CHARACTERS.length) % CHARACTERS.length);
  };

  const handleSelect = () => {
    if (character.unlocked) {
      // Create player entity in ECS
      createPlayer(character.id as 'farmer_john' | 'farmer_mary', new Vector3(0, 0, 0));
      onSelect(character.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <GameCard className="w-full max-w-md p-6">
        <h2 className="game-font text-yellow-400 text-center mb-6" style={{ fontSize: fontSize.xl }}>
          CHOOSE YOUR HAND
        </h2>

        <div className="flex items-center justify-between mb-6">
          <button onClick={handlePrev} className="text-4xl text-white hover:text-yellow-400">‹</button>
          
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 bg-slate-700 rounded-full mb-4 border-4 border-slate-500 overflow-hidden relative">
               {/* Placeholder for 3D model view or portrait */}
               <div className="absolute inset-0 flex items-center justify-center text-4xl">
                 🧑‍🌾
               </div>
            </div>
            
            <h3 className="game-font text-white text-2xl mb-1">{character.name}</h3>
            <p className="game-font text-purple-300 text-sm mb-4">{character.role}</p>
            
            <div className="bg-slate-800/50 p-4 rounded-lg w-full">
              <p className="text-slate-300 text-sm italic mb-3">"{character.description}"</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-400">✓ {character.traits.positive}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-400">✗ {character.traits.negative}</span>
                </div>
              </div>
            </div>
          </div>

          <button onClick={handleNext} className="text-4xl text-white hover:text-yellow-400">›</button>
        </div>

        <div className="flex flex-col gap-3">
          <GameButton 
            onClick={handleSelect}
            disabled={!character.unlocked}
            variant={character.unlocked ? "primary" : "secondary"}
          >
            {character.unlocked ? "SELECT" : "LOCKED"}
          </GameButton>
          
          <button 
            onClick={onBack}
            className="text-slate-400 hover:text-white text-sm mt-2"
          >
            Back
          </button>
        </div>
      </GameCard>
    </div>
  );
}
