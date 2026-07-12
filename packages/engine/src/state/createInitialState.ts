import type { CardInstance, GameState, PlayerId, PlayerState } from "../types/index.js";
import { createRng, shuffle } from "../shuffle/rng.js";

export const STARTING_HOPE = 20;
export const STARTING_HAND_SIZE = 7;
export const MAX_BENCH_SIZE = 5;

function toInstances(cardIds: string[], playerId: PlayerId): CardInstance[] {
  return cardIds.map((cardId, index) => ({
    instanceId: `${playerId}-${cardId}-${index}`,
    cardId,
    tapped: false,
    damageMarked: 0,
    attachedItems: [],
    statusEffects: [],
    evolvedFromInstanceIds: [],
  }));
}

function buildPlayerState(playerId: PlayerId, deckCardIds: string[], rngSeed: string): PlayerState {
  const rng = createRng(`${rngSeed}-${playerId}`);
  const shuffled = shuffle(toInstances(deckCardIds, playerId), rng);
  const hand = shuffled.slice(0, STARTING_HAND_SIZE);
  const deck = shuffled.slice(STARTING_HAND_SIZE);
  return {
    id: playerId,
    deck,
    hand,
    active: null,
    bench: [],
    discard: [],
    resourcePool: 0,
    locationsInPlay: [],
    hopeTotal: STARTING_HOPE,
    corruptionTrack: 0,
    hasPlayedLocationThisTurn: false,
    hasRetreatedThisTurn: false,
    deckedOut: false,
  };
}

export function createInitialState(
  player1DeckCardIds: string[],
  player2DeckCardIds: string[],
  rngSeed: string
): GameState {
  return {
    turn: 1,
    activePlayer: "player1",
    phase: "start",
    players: {
      player1: buildPlayerState("player1", player1DeckCardIds, rngSeed),
      player2: buildPlayerState("player2", player2DeckCardIds, rngSeed),
    },
    stack: [],
    pendingTargets: null,
    log: [],
    rngSeed,
    winner: null,
  };
}
