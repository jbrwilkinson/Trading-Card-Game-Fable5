import type { CardInstance, GameState, PlayerId, PlayerState } from "../types/index.js";
import { MAX_BENCH_SIZE } from "../state/createInitialState.js";

function updatePlayer(state: GameState, playerId: PlayerId, patch: Partial<PlayerState>): GameState {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...state.players[playerId], ...patch },
    },
  };
}

/** Draws the top card of the deck into hand. If the deck is empty, marks the player decked-out (checked by win-condition). */
export function drawCard(state: GameState, playerId: PlayerId): GameState {
  const player = state.players[playerId];
  if (player.deck.length === 0) {
    return updatePlayer(state, playerId, { deckedOut: true });
  }
  const [card, ...rest] = player.deck;
  return updatePlayer(state, playerId, { deck: rest, hand: [...player.hand, card as CardInstance] });
}

export function drawCards(state: GameState, playerId: PlayerId, count: number): GameState {
  let next = state;
  for (let i = 0; i < count; i++) {
    next = drawCard(next, playerId);
  }
  return next;
}

/** Moves a card instance from hand onto the bench (must have room). */
export function playToBench(state: GameState, playerId: PlayerId, instanceId: string): GameState {
  const player = state.players[playerId];
  if (player.bench.length >= MAX_BENCH_SIZE) return state;
  const card = player.hand.find((c) => c.instanceId === instanceId);
  if (!card) return state;
  const hand = player.hand.filter((c) => c.instanceId !== instanceId);
  return updatePlayer(state, playerId, { hand, bench: [...player.bench, card] });
}

/** Promotes a benched card to the Active slot, benching the previous Active (if any) at the back of the bench. */
export function moveToActive(state: GameState, playerId: PlayerId, instanceId: string): GameState {
  const player = state.players[playerId];
  const card = player.bench.find((c) => c.instanceId === instanceId);
  if (!card) return state;
  const bench = player.bench.filter((c) => c.instanceId !== instanceId);
  const nextBench = player.active ? [...bench, player.active] : bench;
  return updatePlayer(state, playerId, { active: card, bench: nextBench });
}

export function playLocation(state: GameState, playerId: PlayerId, instanceId: string): GameState {
  const player = state.players[playerId];
  if (player.hasPlayedLocationThisTurn) return state;
  const card = player.hand.find((c) => c.instanceId === instanceId);
  if (!card) return state;
  const hand = player.hand.filter((c) => c.instanceId !== instanceId);
  return updatePlayer(state, playerId, {
    hand,
    locationsInPlay: [...player.locationsInPlay, card],
    hasPlayedLocationThisTurn: true,
  });
}

export function tapLocationForResource(
  state: GameState,
  playerId: PlayerId,
  instanceId: string,
  resourceValue: number
): GameState {
  const player = state.players[playerId];
  const location = player.locationsInPlay.find((c) => c.instanceId === instanceId);
  if (!location || location.tapped) return state;
  const locationsInPlay = player.locationsInPlay.map((c) =>
    c.instanceId === instanceId ? { ...c, tapped: true } : c
  );
  return updatePlayer(state, playerId, {
    locationsInPlay,
    resourcePool: player.resourcePool + resourceValue,
  });
}

function findInstance(player: PlayerState, instanceId: string): CardInstance | undefined {
  return (
    (player.active?.instanceId === instanceId ? player.active : undefined) ??
    player.bench.find((c) => c.instanceId === instanceId)
  );
}

/** Moves a character instance (active or bench) to discard, e.g. on knockout. Clears active if it was the active card. */
export function sendToDiscard(state: GameState, playerId: PlayerId, instanceId: string): GameState {
  const player = state.players[playerId];
  const card = findInstance(player, instanceId);
  if (!card) return state;
  const isActive = player.active?.instanceId === instanceId;
  const bench = player.bench.filter((c) => c.instanceId !== instanceId);
  return updatePlayer(state, playerId, {
    active: isActive ? null : player.active,
    bench,
    discard: [...player.discard, card],
  });
}

export function applyDamage(state: GameState, playerId: PlayerId, instanceId: string, amount: number): GameState {
  const player = state.players[playerId];
  const apply = (c: CardInstance): CardInstance =>
    c.instanceId === instanceId ? { ...c, damageMarked: Math.max(0, c.damageMarked + amount) } : c;
  return updatePlayer(state, playerId, {
    active: player.active ? apply(player.active) : null,
    bench: player.bench.map(apply),
  });
}

/** Moves an item card from hand and attaches it to a target character instance (active or bench, same player). */
export function attachItem(state: GameState, playerId: PlayerId, itemInstanceId: string, targetInstanceId: string): GameState {
  const player = state.players[playerId];
  const item = player.hand.find((c) => c.instanceId === itemInstanceId);
  if (!item) return state;
  const hand = player.hand.filter((c) => c.instanceId !== itemInstanceId);
  const attach = (c: CardInstance): CardInstance =>
    c.instanceId === targetInstanceId ? { ...c, attachedItems: [...c.attachedItems, item] } : c;
  const target = findInstance(player, targetInstanceId);
  if (!target) return state;
  return updatePlayer(state, playerId, {
    hand,
    active: player.active ? attach(player.active) : null,
    bench: player.bench.map(attach),
  });
}

export function untapAll(state: GameState, playerId: PlayerId): GameState {
  const player = state.players[playerId];
  const refresh = (c: CardInstance): CardInstance =>
    c.tapped || c.abilityUsedThisTurn ? { ...c, tapped: false, abilityUsedThisTurn: false } : c;
  return updatePlayer(state, playerId, {
    locationsInPlay: player.locationsInPlay.map(refresh),
    active: player.active ? refresh(player.active) : null,
    bench: player.bench.map(refresh),
    resourcePool: 0,
    hasPlayedLocationThisTurn: false,
    hasRetreatedThisTurn: false,
  });
}

export function adjustHope(state: GameState, playerId: PlayerId, delta: number): GameState {
  const player = state.players[playerId];
  return updatePlayer(state, playerId, { hopeTotal: Math.max(0, player.hopeTotal + delta) });
}
