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
  currentBindings = { ...bindings };
  await storage.set(STORAGE_KEYS.KEY_BINDINGS, bindings);
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
