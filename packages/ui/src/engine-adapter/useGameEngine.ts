import { useCallback, useMemo, useReducer } from "react";
import {
  createInitialState,
  dispatch as engineDispatch,
  legalActions,
  type Action,
  type CardDatabase,
  type GameState,
  type PlayerId,
} from "@lotr-tcg/engine";
import { createCardDatabase } from "@lotr-tcg/card-data";

import type { Difficulty } from "@lotr-tcg/ai";

export type GameMode = "hotseat" | "vsAI";

export interface GameSetup {
  mode: GameMode;
  /** Only meaningful in vsAI mode; the AI always sits in the player2 seat. */
  difficulty: Difficulty;
  player1DeckCardIds: string[];
  player2DeckCardIds: string[];
  seed: string;
}

/**
 * The one seam where React meets the pure engine. The reducer IS the engine's
 * dispatch; this hook only adds memoized legal-action lookup and a safe
 * dispatcher that ignores actions the engine rejects (belt-and-braces — the
 * UI only offers actions from legalActions, so rejections indicate a UI bug,
 * logged rather than crashing the game).
 *
 * `restoredState` (a previously serialized GameState) resumes a saved game
 * instead of dealing a fresh one.
 */
export function useGameEngine(setup: GameSetup, restoredState?: GameState) {
  const cardDb = useMemo<CardDatabase>(() => createCardDatabase(), []);

  const reducer = useCallback(
    (state: GameState, action: Action): GameState => {
      try {
        return engineDispatch(state, action, cardDb);
      } catch (err) {
        console.error("Engine rejected action", action, err);
        return state;
      }
    },
    [cardDb]
  );

  const [state, dispatch] = useReducer(
    reducer,
    setup,
    (s: GameSetup): GameState =>
      restoredState ?? createInitialState(s.player1DeckCardIds, s.player2DeckCardIds, s.seed)
  );

  const actionsFor = useCallback(
    (playerId: PlayerId): Action[] => legalActions(state, playerId, cardDb),
    [state, cardDb]
  );

  return { state, dispatch, cardDb, actionsFor };
}
