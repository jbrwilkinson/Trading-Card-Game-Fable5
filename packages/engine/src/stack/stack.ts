import type { CardDatabase, Effect, GameState, PlayerId } from "../types/index.js";
import { applyEffect } from "../rules/applyEffect.js";

export const MAX_STACK_DEPTH = 2;

export function pushToStack(state: GameState, controller: PlayerId, sourceInstanceId: string, effect: Effect): GameState {
  if (state.stack.length >= MAX_STACK_DEPTH) return state;
  return { ...state, stack: [...state.stack, { sourceInstanceId, controller, effect }] };
}

/** Pops and resolves the top of the stack (LIFO), reusing the same effect interpreter non-stack effects use. */
export function resolveStack(state: GameState, cardDb: CardDatabase): GameState {
  if (state.stack.length === 0) return state;
  const top = state.stack[state.stack.length - 1]!;
  const remaining = state.stack.slice(0, -1);
  const resolved = applyEffect({ ...state, stack: remaining }, top.controller, top.effect);
  return {
    ...resolved,
    log: [
      ...resolved.log,
      { turn: resolved.turn, player: top.controller, message: `Resolved ${top.effect.type} from stack.`, kind: "resolve" },
    ],
  };
}
