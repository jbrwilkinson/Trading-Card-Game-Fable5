import type { CardDatabase, GameState, PlayerId, StackableEffect } from "../types/index.js";
import { applyEffect } from "../rules/applyEffect.js";
import { getEffectivePower } from "../rules/stats.js";
import { applyDamage } from "../zones/zones.js";

export const MAX_STACK_DEPTH = 2;

const other = (p: PlayerId): PlayerId => (p === "player1" ? "player2" : "player1");

export function pushToStack(
  state: GameState,
  controller: PlayerId,
  sourceInstanceId: string,
  effect: StackableEffect
): GameState {
  if (state.stack.length >= MAX_STACK_DEPTH) return state;
  return { ...state, stack: [...state.stack, { sourceInstanceId, controller, effect }] };
}

/**
 * Resolves a declared attack. Runs when the attack's stack entry pops, i.e.
 * AFTER any response events — so a defender's buff raises resilience in time
 * and a removal effect that killed or bounced the attacker makes the attack
 * fizzle entirely (the attacker is no longer on the battlefield).
 */
function resolveAttack(
  state: GameState,
  cardDb: CardDatabase,
  attackerPlayer: PlayerId,
  attackerInstanceId: string
): GameState {
  const attacker = state.players[attackerPlayer].active;
  if (!attacker || attacker.instanceId !== attackerInstanceId) return state; // fizzle: attacker left the field
  const defenderId = other(attackerPlayer);
  const defender = state.players[defenderId].active;
  const damage = getEffectivePower(cardDb, attacker);

  let next = defender ? applyDamage(state, defenderId, defender.instanceId, damage) : state;
  next = {
    ...next,
    players: {
      ...next.players,
      [defenderId]: {
        ...next.players[defenderId],
        hopeTotal: Math.max(0, next.players[defenderId].hopeTotal - damage),
      },
      [attackerPlayer]: {
        ...next.players[attackerPlayer],
        active: next.players[attackerPlayer].active
          ? { ...next.players[attackerPlayer].active!, tapped: true }
          : null,
      },
    },
  };
  return {
    ...next,
    log: [
      ...next.log,
      { turn: next.turn, player: attackerPlayer, message: `${attacker.cardId} attacks for ${damage}.`, kind: "attack" },
    ],
  };
}

/** Pops and resolves the top of the stack (LIFO), reusing the same effect interpreter non-stack effects use. */
export function resolveStack(state: GameState, cardDb: CardDatabase): GameState {
  if (state.stack.length === 0) return state;
  const top = state.stack[state.stack.length - 1]!;
  const base: GameState = { ...state, stack: state.stack.slice(0, -1) };

  if (top.effect.type === "resolveAttack") {
    return resolveAttack(base, cardDb, top.controller, top.effect.attackerInstanceId);
  }
  const resolved = applyEffect(base, top.controller, top.effect);
  return {
    ...resolved,
    log: [
      ...resolved.log,
      { turn: resolved.turn, player: top.controller, message: `Resolved ${top.effect.type} from stack.`, kind: "resolve" },
    ],
  };
}
