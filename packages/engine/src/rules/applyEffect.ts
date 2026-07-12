import type { Effect, GameState, PlayerId, TargetSpec } from "../types/index.js";
import { applyDamage, drawCards } from "../zones/zones.js";

const other = (p: PlayerId): PlayerId => (p === "player1" ? "player2" : "player1");

interface ResolvedTarget {
  playerId: PlayerId;
  instanceId: string;
}

function resolveTarget(
  state: GameState,
  controller: PlayerId,
  target: TargetSpec,
  explicitInstanceId?: string
): ResolvedTarget | null {
  switch (target.scope) {
    case "opponentActive": {
      const opponent = other(controller);
      const active = state.players[opponent].active;
      return active ? { playerId: opponent, instanceId: active.instanceId } : null;
    }
    case "ownActive": {
      const active = state.players[controller].active;
      return active ? { playerId: controller, instanceId: active.instanceId } : null;
    }
    case "anyCharacter":
    case "chosenInstance": {
      if (!explicitInstanceId) return null;
      const ownerId: PlayerId | null = state.players.player1.active?.instanceId === explicitInstanceId ||
        state.players.player1.bench.some((c) => c.instanceId === explicitInstanceId)
        ? "player1"
        : state.players.player2.active?.instanceId === explicitInstanceId ||
            state.players.player2.bench.some((c) => c.instanceId === explicitInstanceId)
          ? "player2"
          : null;
      return ownerId ? { playerId: ownerId, instanceId: explicitInstanceId } : null;
    }
  }
}

/** Single interpreter for the closed Effect vocabulary — one handler per variant, reused by every card that uses it. */
export function applyEffect(
  state: GameState,
  controller: PlayerId,
  effect: Effect,
  explicitTargetInstanceId?: string
): GameState {
  switch (effect.type) {
    case "damage": {
      const target = resolveTarget(state, controller, effect.target, explicitTargetInstanceId);
      if (!target) return state;
      return applyDamage(state, target.playerId, target.instanceId, effect.amount);
    }
    case "heal": {
      const target = resolveTarget(state, controller, effect.target, explicitTargetInstanceId);
      if (!target) return state;
      return applyDamage(state, target.playerId, target.instanceId, -effect.amount);
    }
    case "drawCards": {
      const playerId = effect.player === "self" ? controller : other(controller);
      return drawCards(state, playerId, effect.count);
    }
    case "buffStat": {
      const target = resolveTarget(state, controller, effect.target, explicitTargetInstanceId);
      if (!target) return state;
      const player = state.players[target.playerId];
      const apply = (c: typeof player.active) =>
        c && c.instanceId === target.instanceId
          ? { ...c, statusEffects: [...c.statusEffects, { stat: effect.stat, amount: effect.amount, duration: effect.duration }] }
          : c;
      return {
        ...state,
        players: {
          ...state.players,
          [target.playerId]: {
            ...player,
            active: apply(player.active),
            bench: player.bench.map((c) => apply(c) ?? c),
          },
        },
      };
    }
    case "returnToHand": {
      const target = resolveTarget(state, controller, effect.target, explicitTargetInstanceId);
      if (!target) return state;
      const player = state.players[target.playerId];
      const card =
        player.active?.instanceId === target.instanceId
          ? player.active
          : player.bench.find((c) => c.instanceId === target.instanceId);
      if (!card) return state;
      return {
        ...state,
        players: {
          ...state.players,
          [target.playerId]: {
            ...player,
            active: player.active?.instanceId === target.instanceId ? null : player.active,
            bench: player.bench.filter((c) => c.instanceId !== target.instanceId),
            hand: [...player.hand, card],
          },
        },
      };
    }
    case "corruptionTick": {
      const player = state.players[controller];
      return {
        ...state,
        players: {
          ...state.players,
          [controller]: { ...player, corruptionTrack: player.corruptionTrack + effect.amount },
        },
      };
    }
    default: {
      const exhaustive: never = effect;
      return exhaustive;
    }
  }
}

/** After damage: move any character whose damage >= its effective resilience to discard. */
export function cleanupKnockouts(state: GameState, getResilience: (playerId: PlayerId, instanceId: string) => number): GameState {
  let next = state;
  for (const playerId of ["player1", "player2"] as PlayerId[]) {
    const player = next.players[playerId];
    const casualties = [player.active, ...player.bench].filter(
      (c): c is NonNullable<typeof c> => c !== null && c.damageMarked >= getResilience(playerId, c.instanceId)
    );
    for (const casualty of casualties) {
      const p = next.players[playerId];
      const isActive = p.active?.instanceId === casualty.instanceId;
      next = {
        ...next,
        players: {
          ...next.players,
          [playerId]: {
            ...p,
            active: isActive ? null : p.active,
            bench: p.bench.filter((c) => c.instanceId !== casualty.instanceId),
            discard: [...p.discard, casualty],
          },
        },
      };
    }
  }
  return next;
}
