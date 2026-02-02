/**
 * Menu state - character selection, coins, modal toggles, audio.
 * Reacts to screen state changes (loads coins + plays music on menu enter).
 */

import { useState, useCallback, useEffect } from "react";
import { CHARACTERS, type CharacterInfo } from "@/game/characters";
import { getCoins } from "@/game/progression/Upgrades";
import { audioManager } from "@/game/audio";
import type { ScreenState } from "./useSceneManager";

export function useMenuState(screen: ScreenState) {
  const [selectedCharacterIndex, setSelectedCharacterIndex] = useState(0);
  const [coins, setCoins] = useState(0);

  // Modal toggles
  const [showShop, setShowShop] = useState(false);
  const [showModes, setShowModes] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const selectedCharacter: CharacterInfo = CHARACTERS[selectedCharacterIndex];
  const selectedCharacterId = selectedCharacter?.id ?? "farmer_john";

  // Load coins + start music when entering menu
  useEffect(() => {
    if (screen === "menu") {
      setCoins(getCoins());
      audioManager.playTrack("mainMenu");
    }
  }, [screen]);

  // Character cycling
  const handlePrevCharacter = useCallback(() => {
    setSelectedCharacterIndex(
      (prev) => (prev - 1 + CHARACTERS.length) % CHARACTERS.length
    );
  }, []);

  const handleNextCharacter = useCallback(() => {
    setSelectedCharacterIndex((prev) => (prev + 1) % CHARACTERS.length);
  }, []);

  const handleCharacterChange = useCallback((index: number) => {
    setSelectedCharacterIndex(index);
  }, []);

  // Modal openers/closers
  const openPlay = useCallback(() => setShowModes(true), []);
  const openUpgrades = useCallback(() => setShowShop(true), []);
  const openSettings = useCallback(() => setShowSettings(true), []);
  const closeModes = useCallback(() => setShowModes(false), []);
  const closeShop = useCallback(() => setShowShop(false), []);
  const closeHelp = useCallback(() => setShowHelp(false), []);
  const closeSettings = useCallback(() => setShowSettings(false), []);

  const isAnyModalOpen = showShop || showModes || showHelp || showSettings;

  return {
    selectedCharacterIndex,
    selectedCharacter,
    selectedCharacterId,
    coins,
    handlePrevCharacter,
    handleNextCharacter,
    handleCharacterChange,
    // Modals
    showShop,
    showModes,
    showHelp,
    showSettings,
    openPlay,
    openUpgrades,
    openSettings,
    closeModes,
    closeShop,
    closeHelp,
    closeSettings,
    isAnyModalOpen,
  };
}
