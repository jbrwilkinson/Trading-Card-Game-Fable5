import type { Action, CardDatabase, GameState, PlayerId, Phase } from "../types/index.js";
import {
  attachItem,
  drawCard,
  moveToActive,
  playLocation,
  playToBench,
  tapLocationForResource,
  untapAll,
} from "../zones/zones.js";
import { applyEffect, cleanupKnockouts } from "../rules/applyEffect.js";
import { getEffectiveResilience } from "../rules/stats.js";
import { legalActions } from "../rules/legalActions.js";
import { checkWinCondition } from "../win-condition/checkWinCondition.js";
import { pushToStack, resolveStack } from "../stack/stack.js";

function opponentOf(p: PlayerId): PlayerId {
  return p === "player1" ? "player2" : "player1";
}

const PHASE_ORDER: Phase[] = ["start", "resource", "main", "combat", "end"];

function log(state: GameState, player: PlayerId, message: string, kind: GameState["log"][number]["kind"]): GameState {
  return { ...state, log: [...state.log, { turn: state.turn, player, message, kind }] };
}

/** Removes every "turn"-duration status effect from both players' characters. */
function expireTurnBuffs(state: GameState): GameState {
  const strip = (c: GameState["players"]["player1"]["bench"][number]) =>
    c.statusEffects.some((s) => s.duration === "turn")
      ? { ...c, statusEffects: c.statusEffects.filter((s) => s.duration !== "turn") }
      : c;
  let next = state;
  for (const playerId of ["player1", "player2"] as PlayerId[]) {
    const player = next.players[playerId];
    next = {
      ...next,
      players: {
        ...next.players,
        [playerId]: {
          ...player,
          active: player.active ? strip(player.active) : null,
          bench: player.bench.map(strip),
        },
      },
    };
  }
  return next;
}

/** Fires onTurnStart abilities for the active player's characters (active slot first, then bench). */
function fireTurnStartAbilities(state: GameState, cardDb: CardDatabase): GameState {
  let next = state;
  const player = next.players[next.activePlayer];
  const characters = [player.active, ...player.bench].filter((c): c is NonNullable<typeof c> => c !== null);
  for (const instance of characters) {
    const def = cardDb.getCard(instance.cardId);
    if (def.kind !== "character") continue;
    for (const ability of def.abilities) {
      if (ability.trigger === "onTurnStart") {
        next = applyEffect(next, next.activePlayer, ability.effect);
      }
    }
  }
  return next;
}

/** Advances phase; "start" and "end" are automatic (no player action pauses there) — see reducer notes. */
function advancePhase(state: GameState, cardDb: CardDatabase): GameState {
  const currentIndex = PHASE_ORDER.indexOf(state.phase);
  const isLastPhase = currentIndex === PHASE_ORDER.length - 1;

  let next: GameState;
  if (isLastPhase) {
    const nextPlayer = opponentOf(state.activePlayer);
    // Until-end-of-turn buffs wear off as the turn passes.
    next = expireTurnBuffs(state);
    next = { ...next, activePlayer: nextPlayer, turn: next.turn + 1, phase: "start" };
    next = log(next, nextPlayer, `Turn ${next.turn} begins.`, "phase");
  } else {
    next = { ...state, phase: PHASE_ORDER[currentIndex + 1] as Phase };
  }

  if (next.phase === "start") {
    next = untapAll(next, next.activePlayer);
    const startedFirstTurn = next.turn === 1;
    if (!startedFirstTurn) {
      next = drawCard(next, next.activePlayer);
      next = log(next, next.activePlayer, "Drew a card.", "draw");
    }
    next = fireTurnStartAbilities(next, cardDb);
    return advancePhase(next, cardDb); // start has no pausable actions, fall through to resource
  }

  return next;
}

function findInstanceAnywhere(state: GameState, instanceId: string) {
  for (const playerId of ["player1", "player2"] as PlayerId[]) {
    const player = state.players[playerId];
    const found = [player.active, ...player.bench].find((c) => c?.instanceId === instanceId);
    if (found) return found;
  }
  return undefined;
}

function applyAction(state: GameState, action: Action, cardDb: CardDatabase): GameState {
  switch (action.type) {
    case "playLocation": {
      const card = state.players[action.player].hand.find((c) => c.instanceId === action.instanceId);
      let next = playLocation(state, action.player, action.instanceId);
      if (card && next !== state) {
        const def = cardDb.getCard(card.cardId);
        if (def.kind === "location" && def.enterEffect) {
          next = applyEffect(next, action.player, def.enterEffect);
        }
      }
      return next;
    }
    case "tapLocation": {
      const location = state.players[action.player].locationsInPlay.find((c) => c.instanceId === action.instanceId);
      if (!location) return state;
      const def = cardDb.getCard(location.cardId);
      const resourceValue = def.kind === "location" ? def.resourceValue : 0;
      return tapLocationForResource(state, action.player, action.instanceId, resourceValue);
    }
    case "playCharacterToBench": {
      const card = state.players[action.player].hand.find((c) => c.instanceId === action.instanceId);
      if (!card) return state;
      const def = cardDb.getCard(card.cardId);
      const cost = def.kind === "character" ? def.cost.total : 0;
      const spent = { ...state, players: { ...state.players, [action.player]: { ...state.players[action.player], resourcePool: state.players[action.player].resourcePool - cost } } };
      let next = playToBench(spent, action.player, action.instanceId);
      if (def.kind === "character" && next !== spent) {
        for (const ability of def.abilities) {
          if (ability.trigger === "onPlay") {
            next = applyEffect(next, action.player, ability.effect);
          }
        }
      }
      return next;
    }
    case "playItem": {
      const card = state.players[action.player].hand.find((c) => c.instanceId === action.instanceId);
      if (!card) return state;
      const def = cardDb.getCard(card.cardId);
      const cost = def.kind === "item" ? def.cost.total : 0;
      const spent = { ...state, players: { ...state.players, [action.player]: { ...state.players[action.player], resourcePool: state.players[action.player].resourcePool - cost } } };
      return attachItem(spent, action.player, action.instanceId, action.targetInstanceId);
    }
    case "playEvent":
    case "playStory": {
      const card = state.players[action.player].hand.find((c) => c.instanceId === action.instanceId);
      if (!card) return state;
      const def = cardDb.getCard(card.cardId);
      if (def.kind !== "event" && def.kind !== "story") return state;
      const hand = state.players[action.player].hand.filter((c) => c.instanceId !== action.instanceId);
      const discard = [...state.players[action.player].discard, card];
      const spent: GameState = {
        ...state,
        players: {
          ...state.players,
          [action.player]: {
            ...state.players[action.player],
            hand,
            discard,
            resourcePool: state.players[action.player].resourcePool - def.cost.total,
          },
        },
      };
      if (def.kind === "event") {
        // Fast-speed: goes on the mini-stack rather than resolving immediately.
        return pushToStack(spent, action.player, card.instanceId, def.effect);
      }
      return applyEffect(spent, action.player, def.effect, action.targetInstanceId);
    }
    case "moveToActive":
      return moveToActive(state, action.player, action.instanceId);
    case "retreat": {
      const player = state.players[action.player];
      if (!player.active) return state;
      // moveToActive already swaps: the chosen bench character becomes active
      // and the old active goes to the back of the bench.
      const swapped = moveToActive(state, action.player, action.benchInstanceId);
      if (swapped === state) return state;
      let next: GameState = {
        ...swapped,
        players: {
          ...swapped.players,
          [action.player]: { ...swapped.players[action.player], hasRetreatedThisTurn: true },
        },
      };
      next = log(next, action.player, `${player.active.cardId} retreats to the bench.`, "play");
      return next;
    }
    case "declareAttack": {
      const attacker = state.players[action.player].active;
      if (!attacker) return state;
      // The attack goes on the stack rather than resolving immediately: the
      // defender gets a response window (events) before damage is dealt.
      return pushToStack(state, action.player, attacker.instanceId, {
        type: "resolveAttack",
        attackerInstanceId: attacker.instanceId,
      });
    }
    case "evolveCharacter": {
      const evolutionCard = state.players[action.player].hand.find((c) => c.instanceId === action.instanceId);
      if (!evolutionCard) return state;
      const def = cardDb.getCard(evolutionCard.cardId);
      if (def.kind !== "character" || !def.evolvesFrom) return state;
      const player = state.players[action.player];
      const evolve = (c: typeof player.active) =>
        c && c.instanceId === action.targetInstanceId
          ? {
              ...c,
              cardId: def.id,
              evolvedFromInstanceIds: [...c.evolvedFromInstanceIds, c.cardId],
            }
          : c;
      let next: GameState = {
        ...state,
        players: {
          ...state.players,
          [action.player]: {
            ...player,
            hand: player.hand.filter((c) => c.instanceId !== action.instanceId),
            discard: [...player.discard, evolutionCard],
            resourcePool: player.resourcePool - def.cost.total,
            active: evolve(player.active),
            bench: player.bench.map((c) => evolve(c) ?? c),
          },
        },
      };
      next = log(next, action.player, `Evolved into ${def.id}.`, "play");
      for (const ability of def.abilities) {
        if (ability.trigger === "onPlay") {
          next = applyEffect(next, action.player, ability.effect);
        }
      }
      return next;
    }
    case "useAbility": {
      const player = state.players[action.player];
      const instance = [player.active, ...player.bench].find((c) => c?.instanceId === action.instanceId);
      if (!instance) return state;
      const def = cardDb.getCard(instance.cardId);
      if (def.kind !== "character") return state;
      const ability = def.abilities[action.abilityIndex];
      if (!ability || ability.trigger !== "activated") return state;
      const markUsed = (c: typeof player.active) =>
        c && c.instanceId === action.instanceId ? { ...c, abilityUsedThisTurn: true } : c;
      let next: GameState = {
        ...state,
        players: {
          ...state.players,
          [action.player]: {
            ...player,
            resourcePool: player.resourcePool - (ability.cost ?? 0),
            active: markUsed(player.active),
            bench: player.bench.map((c) => markUsed(c) ?? c),
          },
        },
      };
      next = applyEffect(next, action.player, ability.effect);
      return log(next, action.player, `${instance.cardId} uses its ability.`, "resolve");
    }
    case "passPriority":
      return resolveStack(state, cardDb);
    case "endPhase":
      return advancePhase(state, cardDb);
    default:
      return state;
  }
}

/**
 * The engine's public entrypoint. Validates the action against legalActions
 * (the same list a human-input layer or the AI module enumerates), applies
 * it, then centrally resolves knockouts and checks the win condition —
 * these are never scattered into individual effect handlers.
 */
export function dispatch(state: GameState, action: Action, cardDb: CardDatabase): GameState {
  if (state.winner) return state;

  const legal = legalActions(state, action.player, cardDb);
  const isLegal = legal.some((a) => JSON.stringify(a) === JSON.stringify(action));
  if (!isLegal) {
    throw new Error(`Illegal action: ${JSON.stringify(action)}`);
  }

  let next = applyAction(state, action, cardDb);

  next = cleanupKnockouts(next, (playerId, instanceId) => {
    const instance = findInstanceAnywhere(next, instanceId);
    return instance ? getEffectiveResilience(cardDb, instance) : 0;
  });

  const winner = checkWinCondition(next);
  if (winner) {
    next = { ...next, winner };
    if (winner !== "draw") {
      next = log(next, winner, `${winner} wins.`, "win");
    }
  }

  return next;
}
