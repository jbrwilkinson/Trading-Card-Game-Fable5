import {
  createRng,
  dispatch,
  legalActions,
  type Action,
  type CardDatabase,
  type GameState,
  type PlayerId,
} from "@lotr-tcg/engine";
import { DIFFICULTY_PRESETS, type Difficulty } from "./difficulty.js";
import { scoreState } from "./evaluate.js";

/**
 * Reaction-window decision: with an enemy attack (or event) waiting on the
 * stack, should this player flash in an event of their own first? Returns a
 * playEvent action, or null to let the stack resolve untouched.
 *
 * Each candidate response is scored by simulating it plus full stack
 * resolution through the real reducer, compared against the do-nothing
 * baseline (resolving the stack as-is). Only a response that beats the
 * baseline is worth a card.
 */
export function chooseResponse(
  state: GameState,
  playerId: PlayerId,
  cardDb: CardDatabase,
  difficulty: Difficulty = "normal"
): Action | null {
  if (state.stack.length === 0) return null;
  const preset = DIFFICULTY_PRESETS[difficulty];

  const drain = (s: GameState): GameState => {
    let next = s;
    let guard = 0;
    while (next.stack.length > 0 && !next.winner && guard++ < 4) {
      next = dispatch(next, { type: "passPriority", player: playerId }, cardDb);
    }
    return next;
  };

  const baseline = scoreState(drain(state), playerId, cardDb, preset.weights);

  const candidates = legalActions(state, playerId, cardDb).filter((a) => a.type === "playEvent");
  let best: { action: Action; score: number } | null = null;
  for (const action of candidates) {
    try {
      const score = scoreState(drain(dispatch(state, action, cardDb)), playerId, cardDb, preset.weights);
      if (!best || score > best.score) best = { action, score };
    } catch {
      // an unexpectedly rejected candidate is simply skipped
    }
  }

  if (!best || best.score <= baseline) return null;
  // Easy AI sometimes misses its response window entirely.
  if (preset.pickFromTop >= 4) {
    const rng = createRng(`${state.rngSeed}-response-${state.turn}-${state.log.length}`);
    if (rng.next() < 0.5) return null;
  }
  return best.action;
}
