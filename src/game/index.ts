/**
 * Homestead Headaches Game
 * Main export file
 */

export type { Achievement, GameStats } from "./achievements";
// Achievements
export {
  checkAchievements,
  getAchievementStats,
  loadAchievements,
  loadStats,
  saveStats,
} from "./achievements";

// Audio
export { audioManager } from "./audio";

// Components
export { AchievementToast, AchievementToastList } from "./components/AchievementToast";
export { GameButton } from "./components/GameButton";
export { GameCard } from "./components/GameCard";
export { GameStyles } from "./components/GameStyles";
export { HeartsDisplay } from "./components/HeartsDisplay";
export { ModeSelect } from "./components/ModeSelect";
export { PauseButton } from "./components/PauseButton";
export { PauseMenu } from "./components/PauseMenu";
export { PeekingAnimal } from "./components/PeekingAnimal";
export { PerfectIndicator } from "./components/PerfectIndicator";
export { CaptureBallButton } from "./components/CaptureBallButton";
export { ScoreDisplay } from "./components/ScoreDisplay";
export { SoundToggle } from "./components/SoundToggle";
export { hasCompletedTutorial, resetTutorial, Tutorial } from "./components/Tutorial";
export { UpgradeShop } from "./components/UpgradeShop";

// Config
export type { AnimalType, GameMode, PowerUpType } from "./config";
export { ANIMAL_TYPES, FAIL_MESSAGES, GAME_CONFIG, GAME_INFO, POWER_UPS } from "./config";

// ECS exports
export { createBossAnimal } from "./ecs/archetypes";
export type { FreezeState } from "./ecs/systems/FreezeSystem";

// Hooks
export { type UseHighScoreReturn, useHighScore } from "./hooks/useHighScore";
export { type ResponsiveScales, useResponsiveScale } from "./hooks/useResponsiveScale";
export { type UseGameLogicReturn, useGameLogic } from "./hooks/useGameLogic";

// Game Modes
export type { GameModeConfig, GameModeType } from "./modes/GameMode";
export {
  checkModeUnlocks,
  GAME_MODES,
  loadUnlockedModes,
  saveUnlockedModes,
} from "./modes/GameMode";

// Progression/Upgrades
export type { Upgrade, UpgradeState } from "./progression/Upgrades";
export {
  addCoins,
  calculateCoinsFromScore,
  getCoins,
  getUpgradeCost,
  getUpgradeModifiers,
  getUpgrades,
  getUpgradeValue,
  loadUpgradeState,
  purchaseUpgrade,
  saveUpgradeState,
} from "./progression/Upgrades";

// Screens
export { GameOverScreen } from "../features/gameplay/GameOverScreen";
export { MainMenu3D } from "../features/menu/MainMenu3D";
export { GameScreen3D } from "../features/core/GameScreen3D";
