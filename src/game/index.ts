/**
 * Infinite Headaches Game
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
export type { DuckAIState, DuckBehaviorType } from "./ai/DuckBehavior";
// AI System
export { applyDuckAI, getBehaviorInfo, getRandomBehavior } from "./ai/DuckBehavior";
// AutoPlayer for E2E Testing
export {
  AutoPlayer,
  createAutoPlayer,
  createAutoPlayerIntegration,
  enableAutoPlayer,
  disableAutoPlayer,
  isAutoPlayerEnabled,
  type AutoPlayerIntegration,
  type AutoPlayerGameState,
} from "./ai/AutoPlayer";
// Audio
export { audioManager, type SoundType } from "./audio";
export { AchievementToast, AchievementToastList } from "./components/AchievementToast";
export { GameButton } from "./components/GameButton";
export { GameCard } from "./components/GameCard";
// Components
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
export type { AnimalType, GameMode, PowerUpType } from "./config";
// Config
export { ANIMAL_TYPES, FAIL_MESSAGES, GAME_CONFIG, GAME_INFO, POWER_UPS } from "./config";
export type { EffectType, ParticleConfig, ParticleType } from "./effects/ParticleEffects";
// Particle Effects
export { ParticleSystem, particleSystem } from "./effects/ParticleEffects";
// Engine
export { type GameCallbacks, GameEngine } from "./engine/GameEngine";
export type { AnimalState } from "./entities/Animal";
// Entities
export { Animal, getRandomAnimalType } from "./entities/Animal";
export { Particle } from "./entities/Particle";
export { getRandomPowerUpType, PowerUp } from "./entities/PowerUp";
// ECS exports for freeze and boss functionality
export type { FreezeState } from "./ecs/systems/FreezeSystem";
export { createBossAnimal } from "./ecs/archetypes";
// Hooks
export { type UseGameEngineReturn, useGameEngine } from "./hooks/useGameEngine";
export { type UseHighScoreReturn, useHighScore } from "./hooks/useHighScore";
export { type ResponsiveScales, useResponsiveScale } from "./hooks/useResponsiveScale";
export type { GameModeConfig, GameModeType } from "./modes/GameMode";
// Game Modes
export {
  checkModeUnlocks,
  GAME_MODES,
  loadUnlockedModes,
  saveUnlockedModes,
} from "./modes/GameMode";
export type { Upgrade, UpgradeState } from "./progression/Upgrades";
// Progression/Upgrades
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
export { drawBackground, drawPlatform } from "./renderer/background";
// Renderers
export { GameOverScreen } from "./screens/GameOverScreen";
export { GameScreen } from "./screens/GameScreen";
// Screens
export { MainMenu } from "./screens/MainMenu";