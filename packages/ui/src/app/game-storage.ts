import type { GameState } from "@lotr-tcg/engine";
import type { GameSetup } from "../engine-adapter/useGameEngine.js";

/**
 * Save/resume: GameState is a plain serializable object by design (the
 * pure-reducer architecture), so persisting a game is just JSON.
 */
const STORAGE_KEY = "lotr-tcg-saved-game";

export interface SavedGame {
  setup: GameSetup;
  state: GameState;
  savedAt: number;
}

export function saveGame(setup: GameSetup, state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ setup, state, savedAt: Date.now() } satisfies SavedGame));
  } catch {
    // storage full/unavailable — resuming is a convenience, never fatal
  }
}

export function loadSavedGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedGame;
    if (!parsed?.setup?.player1DeckCardIds || !parsed?.state?.players) return null;
    if (parsed.state.winner) return null; // finished games aren't resumable
    return parsed;
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
