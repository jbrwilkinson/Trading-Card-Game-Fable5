import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/state/createInitialState.js";
import { dispatch } from "../src/reducer/dispatch.js";
import { legalActions } from "../src/rules/legalActions.js";
import { createFixtureCardDatabase, fixtureDeck } from "./fixtures/cards.js";
import type { Action, GameState, PlayerId } from "../src/index.js";

const cardDb = createFixtureCardDatabase();

/**
 * Picks a deterministic "best effort" action for a scripted player: get a
 * character active as soon as possible, otherwise prefer playing a location,
 * tapping resource, attacking, or advancing the phase — in that priority
 * order. This isn't meant to be smart, only to prove a full game can be
 * played start-to-finish through dispatch()/legalActions() alone, with zero
 * UI code, per the M1 done-criteria.
 */
function pickAction(state: GameState, playerId: PlayerId): Action | undefined {
  const options = legalActions(state, playerId, cardDb);
  const priority = [
    "moveToActive",
    "declareAttack",
    "playCharacterToBench",
    "playLocation",
    "tapLocation",
    "playItem",
    "playStory",
    "playEvent",
    "passPriority",
    "endPhase",
  ] as const;
  for (const type of priority) {
    const match = options.find((a) => a.type === type);
    if (match) return match;
  }
  return options[0];
}

describe("full playthrough scenario", () => {
  it("plays a complete game from initial deal to a win condition using only dispatch()", () => {
    let state = createInitialState(fixtureDeck(), fixtureDeck(), "seed-scenario");
    expect(state.winner).toBeNull();

    let safetyCounter = 0;
    const MAX_ACTIONS = 5000; // generous upper bound; a real game resolves in a few hundred at most

    while (!state.winner && safetyCounter < MAX_ACTIONS) {
      safetyCounter += 1;
      const acting: PlayerId = state.activePlayer;

      // Let the non-active player react first (events/stack), matching how a
      // human UI would offer priority, then let the active player act.
      const opponent = acting === "player1" ? "player2" : "player1";
      const opponentAction = pickAction(state, opponent);
      if (opponentAction && opponentAction.type !== "endPhase") {
        state = dispatch(state, opponentAction, cardDb);
        continue;
      }

      const action = pickAction(state, acting);
      if (!action) break; // no legal action at all — shouldn't happen while winner is null
      state = dispatch(state, action, cardDb);
    }

    expect(state.winner).not.toBeNull();
    expect(["player1", "player2", "draw"]).toContain(state.winner);
    expect(safetyCounter).toBeLessThan(MAX_ACTIONS); // proves it converged, not that it hit the safety cap
    // The log should contain a real sequence of turns/attacks/plays, not an empty/no-op game.
    expect(state.log.length).toBeGreaterThan(5);
  });
});
