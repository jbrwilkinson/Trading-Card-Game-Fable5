import type { CardInstance, GameState, PlayerId } from "../../src/index.js";

let counter = 0;

export function makeInstance(cardId: string): CardInstance {
  counter += 1;
  return {
    instanceId: `test-${cardId}-${counter}`,
    cardId,
    tapped: false,
    damageMarked: 0,
    attachedItems: [],
    statusEffects: [],
    evolvedFromInstanceIds: [],
  };
}

/** Overrides a player's hand with specific fixture card ids — avoids relying on shuffle outcomes in tests. */
export function withHand(state: GameState, playerId: PlayerId, cardIds: string[]): GameState {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...state.players[playerId], hand: cardIds.map(makeInstance) },
    },
  };
}
