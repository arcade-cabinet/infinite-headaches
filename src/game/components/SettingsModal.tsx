/**
 * Settings Modal
 * Game settings panel including graphics, sound, accessibility, and seed options
 */

import { animate } from "animejs";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { useAccessibilitySettings, useGraphics } from "@/graphics/hooks/useGraphics";
import type { QualityLevel } from "@/graphics/settings/types";
import { useRandomActions, useSeedName } from "@/random";
import { colors, gameColors } from "@/theme/tokens/colors";
import { useResponsiveScale } from "../hooks/useResponsiveScale";
import { GameButton } from "./GameButton";
import { GameCard } from "./GameCard";
import {
  type KeyAction,
  type KeyBindings,
  DEFAULT_KEY_BINDINGS,
  getKeyBindings,
  saveKeyBindings,
  resetKeyBindings,
} from "@/platform/keybindings";
import { inputManager } from "@/platform/input";
import type { ColorblindMode } from "@/game/graphics/shaders/ColorblindFilter";

interface SettingsModalProps {
  onClose: () => void;
}

type SettingsTab = "graphics" | "sound" | "accessibility" | "seed" | "controls";

interface SoundSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  ariaLabel: string;
}

interface VolumeSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  fontSize: { xs: string; sm: string };
}

const QUALITY_LABELS: Record<QualityLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const TAB_LABELS: Record<SettingsTab, string> = {
  graphics: "Graphics",
  sound: "Sound",
  accessibility: "Access",
  controls: "Controls",
  seed: "Seed",
};

const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  masterVolume: 80,
  musicVolume: 70,
  sfxVolume: 80,
  muted: false,
};

const SENSITIVITY_CONFIG = {
  min: 0.5,
  max: 2.0,
  step: 0.1,
} as const;

const STORAGE_KEY = "homestead-headaches-sound-settings";

/**
 * Load sound settings from localStorage
 */
function loadSoundSettings(): SoundSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SOUND_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_SOUND_SETTINGS;
}

/**
 * Save sound settings to localStorage
 */
function saveSoundSettings(settings: SoundSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Reusable toggle switch component
 */
function ToggleSwitch({ checked, onChange, disabled = false, ariaLabel }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className="relative w-12 h-6 rounded-full transition-colors disabled:opacity-50"
      style={{
        backgroundColor: checked ? colors.barnRed[500] : colors.soil[600],
      }}
      aria-pressed={checked}
      aria-label={ariaLabel}
    >
      <span
        className="absolute top-1 w-4 h-4 rounded-full transition-transform"
        style={{
          backgroundColor: colors.wheat[100],
          left: checked ? "calc(100% - 20px)" : "4px",
        }}
      />
    </button>
  );
}

/**
 * Reusable volume slider component
 */
function VolumeSlider({ label, value, onChange, disabled = false, fontSize }: VolumeSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span style={{ color: colors.wheat[300] }}>{label}</span>
        <span style={{ color: colors.wheat[400], fontSize: fontSize.xs }}>{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:opacity-50"
        style={{
          backgroundColor: colors.soil[600],
          accentColor: colors.wheat[500],
        }}
      />
    </div>
  );
}

/**
 * Graphics settings tab content
 */
interface GraphicsTabProps {
  quality: QualityLevel;
  recommendedQuality: QualityLevel;
  isLoading: boolean;
  onQualityChange: (level: QualityLevel) => void;
  fontSize: { xs: string; sm: string };
}

function GraphicsTab({
  quality,
  recommendedQuality,
  isLoading,
  onQualityChange,
  fontSize,
}: GraphicsTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold mb-3" style={{ color: colors.wheat[300] }}>
          Quality Preset
        </h3>
        <div className="space-y-2">
          {(["low", "medium", "high"] as const).map((level) => (
            <label
              key={level}
              className="flex items-center gap-3 cursor-pointer p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: quality === level ? `${colors.barnRed[600]}40` : "transparent",
              }}
            >
              <input
                type="radio"
                name="quality"
                value={level}
                checked={quality === level}
                onChange={() => onQualityChange(level)}
                disabled={isLoading}
                className="w-4 h-4 accent-current"
                style={{ accentColor: colors.barnRed[500] }}
              />
              <span className="flex-1">{QUALITY_LABELS[level]}</span>
              {level === recommendedQuality && (
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ backgroundColor: colors.pasture[600], color: colors.white }}
                >
                  Recommended
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-lg" style={{ backgroundColor: `${colors.soil[700]}60` }}>
        <p style={{ color: colors.wheat[200], fontSize: fontSize.xs }}>
          Quality affects shadows, particles, reflections, and post-processing effects. Lower
          settings improve performance on older devices.
        </p>
      </div>
    </div>
  );
}

/**
 * Sound settings tab content
 */
interface SoundTabProps {
  settings: SoundSettings;
  onSettingChange: (key: keyof SoundSettings, value: number | boolean) => void;
  fontSize: { xs: string; sm: string };
}

function SoundTab({ settings, onSettingChange, fontSize }: SoundTabProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span style={{ color: colors.wheat[300] }}>Mute All</span>
        <ToggleSwitch
          checked={settings.muted}
          onChange={() => onSettingChange("muted", !settings.muted)}
          ariaLabel="Mute all sounds"
        />
      </div>

      <VolumeSlider
        label="Master Volume"
        value={settings.masterVolume}
        onChange={(v) => onSettingChange("masterVolume", v)}
        disabled={settings.muted}
        fontSize={fontSize}
      />

      <VolumeSlider
        label="Music"
        value={settings.musicVolume}
        onChange={(v) => onSettingChange("musicVolume", v)}
        disabled={settings.muted}
        fontSize={fontSize}
      />

      <VolumeSlider
        label="Sound Effects"
        value={settings.sfxVolume}
        onChange={(v) => onSettingChange("sfxVolume", v)}
        disabled={settings.muted}
        fontSize={fontSize}
      />
    </div>
  );
}

/**
 * Accessibility settings tab content
 */
interface AccessibilityTabProps {
  reducedMotion: boolean;
  screenShake: boolean;
  isLoading: boolean;
  onToggleReducedMotion: () => void;
  onToggleScreenShake: () => void;
  fontSize: { xs: string; sm: string };
  colorblindMode: ColorblindMode;
  onColorblindModeChange: (mode: ColorblindMode) => void;
  highContrastMode: boolean;
  onToggleHighContrastMode: () => void;
  inputSensitivity: number;
  onInputSensitivityChange: (value: number) => void;
  oneHandedMode: boolean;
  onToggleOneHandedMode: () => void;
}

function AccessibilityTab({
  reducedMotion,
  screenShake,
  isLoading,
  onToggleReducedMotion,
  onToggleScreenShake,
  fontSize,
  colorblindMode,
  onColorblindModeChange,
  highContrastMode,
  onToggleHighContrastMode,
  inputSensitivity,
  onInputSensitivityChange,
  oneHandedMode,
  onToggleOneHandedMode,
}: AccessibilityTabProps) {
  return (
    <div className="space-y-4">
      <div
        className="flex items-center justify-between p-3 rounded-lg"
        style={{ backgroundColor: `${colors.soil[700]}40` }}
      >
        <div className="flex-1 mr-4">
          <span style={{ color: colors.wheat[300] }}>Reduced Motion</span>
          <p className="mt-1" style={{ color: colors.wheat[200], fontSize: fontSize.xs }}>
            Reduces animations and motion effects for accessibility
          </p>
        </div>
        <ToggleSwitch
          checked={reducedMotion}
          onChange={onToggleReducedMotion}
          disabled={isLoading}
          ariaLabel="Toggle reduced motion"
        />
      </div>

      <div
        className="flex items-center justify-between p-3 rounded-lg"
        style={{ backgroundColor: `${colors.soil[700]}40` }}
      >
        <div className="flex-1 mr-4">
          <span style={{ color: colors.wheat[300] }}>Screen Shake</span>
          <p className="mt-1" style={{ color: colors.wheat[200], fontSize: fontSize.xs }}>
            Camera shake effects during impacts and events
          </p>
        </div>
        <ToggleSwitch
          checked={screenShake && !reducedMotion}
          onChange={onToggleScreenShake}
          disabled={isLoading || reducedMotion}
          ariaLabel="Toggle screen shake"
        />
      </div>

      {reducedMotion && (
        <p
          className="p-3 rounded-lg"
          style={{
            backgroundColor: `${colors.sky[800]}40`,
            color: colors.sky[200],
            fontSize: fontSize.xs,
          }}
        >
          Screen shake is automatically disabled when Reduced Motion is enabled.
        </p>
      )}

      {/* Colorblind mode dropdown */}
      <div
        className="p-3 rounded-lg"
        style={{ backgroundColor: `${colors.soil[700]}40` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-4">
            <span style={{ color: colors.wheat[300] }}>Colorblind Mode</span>
            <p className="mt-1" style={{ color: colors.wheat[200], fontSize: fontSize.xs }}>
              Simulates color vision for testing or correction
            </p>
          </div>
          <select
            value={colorblindMode}
            onChange={(e) => onColorblindModeChange(e.target.value as ColorblindMode)}
            className="rounded-lg px-3 py-1.5 text-sm"
            style={{
              backgroundColor: colors.soil[600],
              color: colors.wheat[100],
              border: `1px solid ${colors.soil[500]}`,
            }}
            aria-label="Select colorblind mode"
          >
            <option value="none">None</option>
            <option value="protanopia">Protanopia</option>
            <option value="deuteranopia">Deuteranopia</option>
            <option value="tritanopia">Tritanopia</option>
          </select>
        </div>
      </div>

      {/* High Contrast Mode toggle */}
      <div
        className="flex items-center justify-between p-3 rounded-lg"
        style={{ backgroundColor: `${colors.soil[700]}40` }}
      >
        <div className="flex-1 mr-4">
          <span style={{ color: colors.wheat[300] }}>High Contrast Mode</span>
          <p className="mt-1" style={{ color: colors.wheat[200], fontSize: fontSize.xs }}>
            Increases contrast for better visibility
          </p>
        </div>
        <ToggleSwitch
          checked={highContrastMode}
          onChange={onToggleHighContrastMode}
          ariaLabel="Toggle high contrast mode"
        />
      </div>

      {/* Input sensitivity slider */}
      <div
        className="p-3 rounded-lg"
        style={{ backgroundColor: `${colors.soil[700]}40` }}
      >
        <div className="flex justify-between mb-2">
          <span style={{ color: colors.wheat[300] }}>Input Sensitivity</span>
          <span style={{ color: colors.wheat[400], fontSize: fontSize.xs }}>
            {inputSensitivity.toFixed(1)}x
          </span>
        </div>
        <input
          type="range"
          min={String(SENSITIVITY_CONFIG.min)}
          max={String(SENSITIVITY_CONFIG.max)}
          step={String(SENSITIVITY_CONFIG.step)}
          value={inputSensitivity}
          onChange={(e) => onInputSensitivityChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            backgroundColor: colors.soil[600],
            accentColor: colors.wheat[500],
          }}
          aria-label="Input sensitivity"
        />
      </div>

      {/* One-handed mode toggle */}
      <div
        className="flex items-center justify-between p-3 rounded-lg"
        style={{ backgroundColor: `${colors.soil[700]}40` }}
      >
        <div className="flex-1 mr-4">
          <span style={{ color: colors.wheat[300] }}>One-Handed Mode</span>
          <p className="mt-1" style={{ color: colors.wheat[200], fontSize: fontSize.xs }}>
            Mirror J/K/L to left/action/right for one-hand play
          </p>
        </div>
        <ToggleSwitch
          checked={oneHandedMode}
          onChange={onToggleOneHandedMode}
          ariaLabel="Toggle one-handed mode"
        />
      </div>
    </div>
  );
}

/**
 * Controls settings tab content - key remapping
 */
const KEY_ACTION_LABELS: Record<KeyAction, string> = {
  moveLeft: "Move Left",
  moveRight: "Move Right",
  bank: "Bank Stack",
  pause: "Pause",
  fireAbility: "Fire Ability",
  iceAbility: "Ice Ability",
};

interface ControlsTabProps {
  bindings: KeyBindings;
  onBindingChange: (action: KeyAction, keys: string[]) => void;
  onReset: () => void;
  fontSize: { xs: string; sm: string };
}

function ControlsTab({ bindings, onBindingChange, onReset, fontSize }: ControlsTabProps) {
  const [capturingAction, setCapturingAction] = useState<KeyAction | null>(null);

  useEffect(() => {
    if (!capturingAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === "Escape" || e.key === "Escape") {
        setCapturingAction(null);
        return;
      }

      const key = e.code;
      const current = bindings[capturingAction];
      if (!current.includes(key)) {
        onBindingChange(capturingAction, [...current, key]);
      }
      setCapturingAction(null);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [capturingAction, bindings, onBindingChange]);

  return (
    <div className="space-y-3">
      <h3 className="font-bold mb-2" style={{ color: colors.wheat[300] }}>
        Key Bindings
      </h3>

      {(Object.keys(KEY_ACTION_LABELS) as KeyAction[]).map((action) => (
        <div
          key={action}
          className="flex items-center justify-between p-2 rounded-lg"
          style={{ backgroundColor: `${colors.soil[700]}40` }}
        >
          <span style={{ color: colors.wheat[300], fontSize: fontSize.sm }}>
            {KEY_ACTION_LABELS[action]}
          </span>
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-1 rounded"
              style={{
                backgroundColor: colors.soil[600],
                color: colors.wheat[200],
                fontSize: fontSize.xs,
              }}
            >
              {capturingAction === action
                ? "Press a key..."
                : bindings[action].join(", ")}
            </span>
            <button
              type="button"
              onClick={() => setCapturingAction(capturingAction === action ? null : action)}
              className="px-2 py-1 rounded text-xs transition-colors"
              style={{
                backgroundColor: capturingAction === action ? colors.barnRed[500] : colors.soil[600],
                color: colors.wheat[100],
              }}
            >
              {capturingAction === action ? "Cancel" : "Set"}
            </button>
            <button
              type="button"
              onClick={() => onBindingChange(action, DEFAULT_KEY_BINDINGS[action])}
              className="px-2 py-1 rounded text-xs transition-colors"
              style={{
                backgroundColor: colors.soil[600],
                color: colors.wheat[200],
              }}
              aria-label={`Reset ${KEY_ACTION_LABELS[action]} to default`}
            >
              Reset
            </button>
          </div>
        </div>
      ))}

      <div className="mt-4 flex justify-center">
        <GameButton onClick={onReset} variant="secondary" size="sm">
          Reset All
        </GameButton>
      </div>
    </div>
  );
}

/**
 * Seed settings tab content
 */
interface SeedTabProps {
  seedName: string;
  copyFeedback: boolean;
  onShuffle: () => void;
  onCopy: () => void;
  fontSize: { xs: string; sm: string };
}

function SeedTab({ seedName, copyFeedback, onShuffle, onCopy, fontSize }: SeedTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold mb-2" style={{ color: colors.wheat[300] }}>
          Current Seed
        </h3>
        <div
          className="p-4 rounded-lg text-center"
          style={{ backgroundColor: `${colors.soil[700]}60` }}
        >
          <span className="text-lg font-mono tracking-wide" style={{ color: colors.wheat[400] }}>
            {seedName}
          </span>
        </div>
      </div>

      <p style={{ color: colors.wheat[200], fontSize: fontSize.xs }}>
        Seeds control the random elements in your game. Share your seed with friends to play the
        same challenge, or shuffle to get a fresh experience.
      </p>

      <div className="flex gap-3">
        <GameButton
          onClick={onShuffle}
          variant="primary"
          size="sm"
          className="flex-1"
          style={{ backgroundColor: colors.barnRed[500], borderColor: colors.barnRed[700] }}
        >
          Shuffle
        </GameButton>
        <GameButton
          onClick={onCopy}
          variant="secondary"
          size="sm"
          className="flex-1"
          style={{
            backgroundColor: colors.wheat[600],
            borderColor: colors.wheat[700],
            color: colors.soil[900],
          }}
        >
          {copyFeedback ? "Copied!" : "Copy"}
        </GameButton>
      </div>
    </div>
  );
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { fontSize, spacing } = useResponsiveScale();
  const [activeTab, setActiveTab] = useState<SettingsTab>("graphics");
  const modalRef = useRef<HTMLDivElement>(null);

  // Graphics settings
  const {
    settings: graphicsSettings,
    setQuality,
    toggleSetting,
    updateSettings,
    deviceCapabilities,
    isLoading: graphicsLoading,
  } = useGraphics();
  const { reducedMotion, screenShake } = useAccessibilitySettings();

  // Sound settings (local state with persistence)
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(loadSoundSettings);

  // Seed settings
  const seedName = useSeedName();
  const { shuffleSeed } = useRandomActions();
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Key bindings state
  const [keyBindings, setKeyBindings] = useState<KeyBindings>(getKeyBindings);

  // Motor accessibility state
  const [inputSensitivity, setInputSensitivity] = useState(1.0);
  const [oneHandedMode, setOneHandedMode] = useState(false);

  // Load motor settings from input manager on mount
  useEffect(() => {
    const motor = inputManager.getMotorSettings();
    setInputSensitivity(motor.inputSensitivity);
    setOneHandedMode(motor.oneHandedMode);
  }, []);

  // Entrance animation
  const entranceAnimRef = useRef<ReturnType<typeof animate> | null>(null);
  useEffect(() => {
    if (modalRef.current) {
      entranceAnimRef.current = animate(modalRef.current, {
        opacity: [0, 1],
        scale: [0.9, 1],
        duration: 300,
        ease: "outBack",
      });
    }
    return () => { entranceAnimRef.current?.pause(); };
  }, []);

  // Save sound settings when they change
  useEffect(() => {
    saveSoundSettings(soundSettings);
  }, [soundSettings]);

  const handleClose = useCallback(() => {
    if (modalRef.current) {
      animate(modalRef.current, {
        opacity: [1, 0],
        scale: [1, 0.9],
        duration: 200,
        ease: "inQuad",
        complete: onClose,
      });
    } else {
      onClose();
    }
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  const handleQualityChange = useCallback(
    async (level: QualityLevel) => {
      await setQuality(level);
    },
    [setQuality]
  );

  const handleSoundSettingChange = useCallback(
    (key: keyof SoundSettings, value: number | boolean) => {
      setSoundSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleCopySeed = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(seedName);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      // Clipboard API failed, try fallback
      const textArea = document.createElement("textarea");
      textArea.value = seedName;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  }, [seedName]);

  const recommendedQuality = deviceCapabilities?.recommendedQuality ?? "medium";

  const cardStyle: CSSProperties = {
    padding: spacing.lg,
    backgroundColor: gameColors.ui.background,
    borderColor: colors.wheat[400],
  };

  const headerStyle: CSSProperties = {
    fontSize: fontSize.xl,
    color: colors.wheat[400],
    textShadow: "2px 2px 0 #000",
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    },
    [handleClose]
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div ref={modalRef} className="opacity-0 w-full max-w-lg">
        <GameCard className="max-h-[85vh] overflow-auto" style={cardStyle}>
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 id="settings-modal-title" className="game-font" style={headerStyle}>
              SETTINGS
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="transition-colors text-2xl leading-none hover:text-white"
              style={{ color: colors.wheat[300] }}
              aria-label="Close settings"
            >
              x
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {(["graphics", "sound", "accessibility", "controls", "seed"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="game-font flex-1 min-w-[80px] py-2 px-3 rounded-lg transition-colors"
                style={{
                  fontSize: fontSize.sm,
                  backgroundColor:
                    activeTab === tab ? colors.barnRed[500] : `${colors.soil[800]}80`,
                  color: activeTab === tab ? colors.white : colors.wheat[300],
                }}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="game-font" style={{ fontSize: fontSize.sm, color: colors.wheat[100] }}>
            {activeTab === "graphics" && (
              <GraphicsTab
                quality={graphicsSettings.quality}
                recommendedQuality={recommendedQuality}
                isLoading={graphicsLoading}
                onQualityChange={handleQualityChange}
                fontSize={fontSize}
              />
            )}

            {activeTab === "sound" && (
              <SoundTab
                settings={soundSettings}
                onSettingChange={handleSoundSettingChange}
                fontSize={fontSize}
              />
            )}

            {activeTab === "accessibility" && (
              <AccessibilityTab
                reducedMotion={reducedMotion}
                screenShake={screenShake}
                isLoading={graphicsLoading}
                onToggleReducedMotion={() => toggleSetting("reducedMotion")}
                onToggleScreenShake={() => toggleSetting("screenShake")}
                fontSize={fontSize}
                colorblindMode={graphicsSettings.colorblindMode ?? "none"}
                onColorblindModeChange={(mode) => updateSettings({ colorblindMode: mode })}
                highContrastMode={graphicsSettings.highContrastMode ?? false}
                onToggleHighContrastMode={() => updateSettings({ highContrastMode: !(graphicsSettings.highContrastMode ?? false) })}
                inputSensitivity={inputSensitivity}
                onInputSensitivityChange={(value) => {
                  setInputSensitivity(value);
                  inputManager.updateMotorSettings({ inputSensitivity: value, oneHandedMode });
                }}
                oneHandedMode={oneHandedMode}
                onToggleOneHandedMode={() => {
                  const newValue = !oneHandedMode;
                  setOneHandedMode(newValue);
                  inputManager.updateMotorSettings({ inputSensitivity, oneHandedMode: newValue });
                }}
              />
            )}

            {activeTab === "controls" && (
              <ControlsTab
                bindings={keyBindings}
                onBindingChange={(action, keys) => {
                  const updated = { ...keyBindings, [action]: keys };
                  setKeyBindings(updated);
                  saveKeyBindings(updated);
                }}
                onReset={async () => {
                  await resetKeyBindings();
                  setKeyBindings(getKeyBindings());
                }}
                fontSize={fontSize}
              />
            )}

            {activeTab === "seed" && (
              <SeedTab
                seedName={seedName}
                copyFeedback={copyFeedback}
                onShuffle={shuffleSeed}
                onCopy={handleCopySeed}
                fontSize={fontSize}
              />
            )}
          </div>

          {/* Close Button */}
          <div className="mt-6 flex justify-center">
            <GameButton
              onClick={handleClose}
              variant="secondary"
              style={{ backgroundColor: colors.wood[700], borderColor: colors.wood[600] }}
            >
              DONE
            </GameButton>
          </div>
        </GameCard>
      </div>
    </div>
  );
}

export type { SettingsModalProps, SoundSettings };
