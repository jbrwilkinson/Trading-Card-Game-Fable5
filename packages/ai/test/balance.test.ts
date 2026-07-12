import { describe, expect, it } from "vitest";
import { createInitialState, dispatch } from "@lotr-tcg/engine";
import { createCardDatabase, STARTER_DECKS } from "@lotr-tcg/card-data";
import { chooseAction } from "../src/select-action.js";

const cardDb = createCardDatabase();

/**
 * Balance smoke test: hard-AI self-play across every starter-deck matchup
 * must reach a decisive result in a reasonable number of turns. Guards
 * against reintroducing stall states (like the pre-M3 tapped-forever bug
 * that dragged every game to a 40+ turn deck-out).
 */
describe("starter deck balance smoke", () => {
  const matchups: [number, number][] = [];
  for (let a = 0; a < STARTER_DECKS.length; a++) {
    for (let b = a + 1; b < STARTER_DECKS.length; b++) {
      matchups.push([a, b]);
    }
  }

  it.each(matchups)("deck %i vs deck %i finishes within 35 turns", (a, b) => {
    const deckA = STARTER_DECKS[a]!;
    const deckB = STARTER_DECKS[b]!;
    let state = createInitialState(deckA.cardIds, deckB.cardIds, `balance-${deckA.id}-${deckB.id}`);
    let steps = 0;

    while (!state.winner && steps < 4000) {
      steps++;
      const action = chooseAction(state, state.activePlayer, cardDb, "hard");
      if (!action) break;
      state = dispatch(state, action, cardDb);
    }

    expect(state.winner, `${deckA.name} vs ${deckB.name} never finished`).not.toBeNull();
    expect(state.turn, `${deckA.name} vs ${deckB.name} dragged to turn ${state.turn}`).toBeLessThanOrEqual(35);
  });
});
