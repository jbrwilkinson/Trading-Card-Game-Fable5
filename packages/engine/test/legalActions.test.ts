import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/state/createInitialState.js";
import { legalActions } from "../src/rules/legalActions.js";
import { createFixtureCardDatabase, fixtureDeck } from "./fixtures/cards.js";
import { withHand } from "./fixtures/helpers.js";

const cardDb = createFixtureCardDatabase();

function baseState() {
  return { ...createInitialState(fixtureDeck(), fixtureDeck(), "seed-legal"), phase: "resource" as const };
}

describe("legalActions", () => {
  it("in the resource phase, offers playLocation for a location in hand plus endPhase", () => {
    const state = withHand(baseState(), "player1", ["shire", "frodo-baggins"]);
    const actions = legalActions(state, "player1", cardDb);
    expect(actions.some((a) => a.type === "playLocation")).toBe(true);
    expect(actions.every((a) => a.type !== "playCharacterToBench")).toBe(true); // main phase only
    expect(actions.some((a) => a.type === "endPhase")).toBe(true);
  });

  it("does not offer phase-gated actions to the non-active player", () => {
    const state = withHand(baseState(), "player2", ["shire"]);
    const actions = legalActions(state, "player2", cardDb);
    expect(actions.every((a) => a.type !== "playLocation" && a.type !== "endPhase")).toBe(true);
  });

  it("does not offer playCharacterToBench when resourcePool is below every character's cost", () => {
    const state = withHand({ ...baseState(), phase: "main" }, "player1", ["frodo-baggins"]);
    const actions = legalActions(state, "player1", cardDb);
    expect(actions.some((a) => a.type === "playCharacterToBench")).toBe(false);
  });

  it("offers playCharacterToBench once resourcePool covers the character's cost", () => {
    const state = withHand({ ...baseState(), phase: "main" }, "player1", ["frodo-baggins"]);
    const funded = {
      ...state,
      players: { ...state.players, player1: { ...state.players.player1, resourcePool: 5 } },
    };
    const actions = legalActions(funded, "player1", cardDb);
    expect(actions.some((a) => a.type === "playCharacterToBench")).toBe(true);
  });

  it("offers no actions once the game has a winner", () => {
    const state = { ...baseState(), winner: "player1" as const };
    expect(legalActions(state, "player1", cardDb)).toEqual([]);
    expect(legalActions(state, "player2", cardDb)).toEqual([]);
  });
});
