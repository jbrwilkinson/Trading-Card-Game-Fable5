import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/state/createInitialState.js";
import {
  attachItem,
  drawCard,
  moveToActive,
  playLocation,
  playToBench,
  tapLocationForResource,
  untapAll,
} from "../src/zones/zones.js";
import { fixtureDeck } from "./fixtures/cards.js";
import { withHand } from "./fixtures/helpers.js";

function freshState() {
  return createInitialState(fixtureDeck(), fixtureDeck(), "seed-zones");
}

describe("zones", () => {
  it("drawCard moves the top deck card into hand", () => {
    const state = freshState();
    const before = state.players.player1;
    const after = drawCard(state, "player1").players.player1;
    expect(after.hand.length).toBe(before.hand.length + 1);
    expect(after.deck.length).toBe(before.deck.length - 1);
  });

  it("drawCard on an empty deck marks the player decked out instead of throwing", () => {
    let state = freshState();
    // Drain the deck.
    while (state.players.player1.deck.length > 0) {
      state = drawCard(state, "player1");
    }
    const handBefore = state.players.player1.hand.length;
    const emptied = drawCard(state, "player1");
    expect(emptied.players.player1.deckedOut).toBe(true);
    expect(emptied.players.player1.hand.length).toBe(handBefore);
  });

  it("playLocation moves a location from hand to locationsInPlay and blocks a second play this turn", () => {
    let state = withHand(freshState(), "player1", ["shire", "rivendell"]);
    const shire = state.players.player1.hand.find((c) => c.cardId === "shire")!;
    state = playLocation(state, "player1", shire.instanceId);
    expect(state.players.player1.locationsInPlay).toHaveLength(1);
    expect(state.players.player1.hasPlayedLocationThisTurn).toBe(true);

    const rivendell = state.players.player1.hand.find((c) => c.cardId === "rivendell")!;
    const blocked = playLocation(state, "player1", rivendell.instanceId);
    expect(blocked.players.player1.locationsInPlay).toHaveLength(1); // no-op, already played one this turn
  });

  it("tapLocationForResource adds resourceValue to the pool and taps the location", () => {
    let state = withHand(freshState(), "player1", ["shire"]);
    const shire = state.players.player1.hand.find((c) => c.cardId === "shire")!;
    state = playLocation(state, "player1", shire.instanceId);
    state = tapLocationForResource(state, "player1", shire.instanceId, 1);
    expect(state.players.player1.resourcePool).toBe(1);
    expect(state.players.player1.locationsInPlay[0]?.tapped).toBe(true);

    // Tapping an already-tapped location is a no-op.
    const again = tapLocationForResource(state, "player1", shire.instanceId, 1);
    expect(again.players.player1.resourcePool).toBe(1);
  });

  it("playToBench then moveToActive promotes a character and benches the previous active", () => {
    let state = withHand(freshState(), "player1", ["frodo-baggins", "samwise-gamgee"]);
    const frodo = state.players.player1.hand.find((c) => c.cardId === "frodo-baggins")!;
    state = playToBench(state, "player1", frodo.instanceId);
    expect(state.players.player1.bench).toHaveLength(1);
    state = moveToActive(state, "player1", frodo.instanceId);
    expect(state.players.player1.active?.instanceId).toBe(frodo.instanceId);
    expect(state.players.player1.bench).toHaveLength(0);

    const sam = state.players.player1.hand.find((c) => c.cardId === "samwise-gamgee")!;
    state = playToBench(state, "player1", sam.instanceId);
    state = moveToActive(state, "player1", sam.instanceId);
    expect(state.players.player1.active?.instanceId).toBe(sam.instanceId);
    // Frodo was displaced back to the bench, not lost.
    expect(state.players.player1.bench.map((c) => c.instanceId)).toContain(frodo.instanceId);
  });

  it("attachItem moves an item from hand onto a target character's attachedItems", () => {
    let state = withHand(freshState(), "player1", ["frodo-baggins", "sting"]);
    const frodo = state.players.player1.hand.find((c) => c.cardId === "frodo-baggins")!;
    state = playToBench(state, "player1", frodo.instanceId);
    const sting = state.players.player1.hand.find((c) => c.cardId === "sting")!;
    state = attachItem(state, "player1", sting.instanceId, frodo.instanceId);
    const benched = state.players.player1.bench.find((c) => c.instanceId === frodo.instanceId);
    expect(benched?.attachedItems).toHaveLength(1);
    expect(benched?.attachedItems[0]?.cardId).toBe("sting");
    expect(state.players.player1.hand.some((c) => c.instanceId === sting.instanceId)).toBe(false);
  });

  it("untapAll resets locations, resource pool, and the once-per-turn location flag", () => {
    let state = withHand(freshState(), "player1", ["shire"]);
    const shire = state.players.player1.hand.find((c) => c.cardId === "shire")!;
    state = playLocation(state, "player1", shire.instanceId);
    state = tapLocationForResource(state, "player1", shire.instanceId, 1);
    state = untapAll(state, "player1");
    expect(state.players.player1.locationsInPlay[0]?.tapped).toBe(false);
    expect(state.players.player1.resourcePool).toBe(0);
    expect(state.players.player1.hasPlayedLocationThisTurn).toBe(false);
  });

  it("untapAll untaps the active character so it can attack again next turn", () => {
    let state = withHand(freshState(), "player1", ["frodo-baggins"]);
    const frodo = state.players.player1.hand.find((c) => c.cardId === "frodo-baggins")!;
    state = playToBench(state, "player1", frodo.instanceId);
    state = moveToActive(state, "player1", frodo.instanceId);
    state = {
      ...state,
      players: {
        ...state.players,
        player1: { ...state.players.player1, active: { ...state.players.player1.active!, tapped: true } },
      },
    };
    state = untapAll(state, "player1");
    expect(state.players.player1.active?.tapped).toBe(false);
  });
});
