import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/state/createInitialState.js";
import { checkWinCondition } from "../src/win-condition/checkWinCondition.js";
import { fixtureDeck } from "./fixtures/cards.js";

function freshState() {
  return createInitialState(fixtureDeck(), fixtureDeck(), "seed-win");
}

describe("checkWinCondition", () => {
  it("returns null while both players are healthy", () => {
    expect(checkWinCondition(freshState())).toBeNull();
  });

  it("declares the opponent winner when a player's hopeTotal hits 0", () => {
    const state = freshState();
    const zeroed = { ...state, players: { ...state.players, player1: { ...state.players.player1, hopeTotal: 0 } } };
    expect(checkWinCondition(zeroed)).toBe("player2");
  });

  it("declares the opponent winner when a player is decked out", () => {
    const state = freshState();
    const decked = { ...state, players: { ...state.players, player2: { ...state.players.player2, deckedOut: true } } };
    expect(checkWinCondition(decked)).toBe("player1");
  });

  it("declares the opponent winner when a player's corruption reaches the limit", () => {
    const state = freshState();
    const corrupted = {
      ...state,
      players: { ...state.players, player1: { ...state.players.player1, corruptionTrack: 10 } },
    };
    expect(checkWinCondition(corrupted)).toBe("player2");
  });

  it("declares a draw if both players lose simultaneously", () => {
    const state = freshState();
    const both = {
      ...state,
      players: {
        player1: { ...state.players.player1, hopeTotal: 0 },
        player2: { ...state.players.player2, hopeTotal: 0 },
      },
    };
    expect(checkWinCondition(both)).toBe("draw");
  });
});
