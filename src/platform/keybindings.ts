/**
 * Remappable Key Bindings
 * Supports customizing keyboard controls with persistence.
 */

import { storage, STORAGE_KEYS } from "./storage";

export type KeyAction =
  | "moveLeft"
  | "moveRight"
  | "bank"
  | "pause"
  | "fireAbility"
  | "iceAbility";

export type KeyBindings = Record<KeyAction, string[]>;

/**
 * Default key bindings matching the original hardcoded values in input.ts
 */
export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  moveLeft: ["ArrowLeft", "KeyA"],
  moveRight: ["ArrowRight", "KeyD"],
  bank: ["Enter", "ArrowUp"],
  pause: ["Escape", "KeyP", "Space"],
  fireAbility: ["KeyE", "ShiftLeft", "ShiftRight"],
  iceAbility: ["KeyQ"],
};

let currentBindings: KeyBindings | null = null;

/**
 * Load key bindings from storage, falling back to defaults.
 */
export async function loadKeyBindings(): Promise<KeyBindings> {
  if (currentBindings) return currentBindings;

  const stored = await storage.get<KeyBindings>(STORAGE_KEYS.KEY_BINDINGS);
  currentBindings = stored ? { ...DEFAULT_KEY_BINDINGS, ...stored } : { ...DEFAULT_KEY_BINDINGS };
  return currentBindings;
}

/**
 * Get current key bindings synchronously (returns defaults if not yet loaded).
 */
export function getKeyBindings(): KeyBindings {
  return currentBindings ?? { ...DEFAULT_KEY_BINDINGS };
}

/**
 * Save key bindings to storage.
 */
export async function saveKeyBindings(bindings: KeyBindings): Promise<void> {
  // Validate key bindings before saving
  const validated: KeyBindings = { ...DEFAULT_KEY_BINDINGS };
  for (const action of Object.keys(DEFAULT_KEY_BINDINGS) as KeyAction[]) {
    if (action in bindings && Array.isArray(bindings[action])) {
      validated[action] = bindings[action]
        .filter((key): key is string => typeof key === "string" && key.length > 0 && key.length < 50)
        .slice(0, 10);
    }
  }
  currentBindings = validated;
  await storage.set(STORAGE_KEYS.KEY_BINDINGS, validated);
}

/**
 * Reset key bindings to defaults.
 */
export async function resetKeyBindings(): Promise<void> {
  currentBindings = { ...DEFAULT_KEY_BINDINGS };
  await storage.set(STORAGE_KEYS.KEY_BINDINGS, currentBindings);
}

/**
 * Update a single action's key bindings.
 */
export async function setActionBinding(
  action: KeyAction,
  keys: string[],
): Promise<void> {
  const bindings = getKeyBindings();
  bindings[action] = keys;
  await saveKeyBindings(bindings);
}
