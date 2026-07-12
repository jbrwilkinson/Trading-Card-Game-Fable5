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
 * Greedy one-ply action selection: enumerate exactly what the engine says is
 * legal (the same legalActions humans are validated against, so the AI can
 * never cheat), simulate each candidate through the real reducer — safe
 * because the reducer is pure and never mutates its input — and score the
 * outcome. Difficulty picks among the top K candidates with a seeded RNG so
 * behavior is reproducible for a given state.
 *
 * Known limitation, by design (see docs/architecture notes in the plan):
 * no opponent-hand modeling and no multi-ply search. The public signature
 * won't change when this is upgraded to determinized sampling later.
 */
export function chooseAction(
  state: GameState,
  playerId: PlayerId,
  cardDb: CardDatabase,
  difficulty: Difficulty = "normal"
): Action | null {
  const preset = DIFFICULTY_PRESETS[difficulty];
  const candidates = legalActions(state, playerId, cardDb);
  if (candidates.length === 0) return null;

  const scored = candidates.map((action) => {
    let score: number;
    try {
      let next = dispatch(state, action, cardDb);
      // An event only *pushes* onto the stack; at face value that reads as pure
      // card loss. Score the position as if the stack resolves, so events are
      // valued by their effect rather than dismissed.
      let guard = 0;
      while (next.stack.length > 0 && !next.winner && guard++ < 4) {
        next = dispatch(next, { type: "passPriority", player: playerId }, cardDb);
      }
      score = scoreState(next, playerId, cardDb, preset.weights);
    } catch {
      score = Number.NEGATIVE_INFINITY; // defensive: an unexpectedly rejected action is never picked
    }
    // endPhase is the fallback move: nudge it below genuinely neutral actions
    // so the AI develops its board instead of idling through phases.
    if (action.type === "endPhase") score -= 0.1;
    return { action, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.max(1, preset.pickFromTop));
  const rng = createRng(`${state.rngSeed}-${state.turn}-${state.phase}-${state.log.length}-${playerId}`);
  return top[rng.nextInt(top.length)]!.action;
}
