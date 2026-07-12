import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/state/createInitialState.js";
import { playToBench, moveToActive } from "../src/zones/zones.js";
import { applyEffect, cleanupKnockouts } from "../src/rules/applyEffect.js";
import { getEffectiveResilience } from "../src/rules/stats.js";
import { createFixtureCardDatabase, fixtureDeck } from "./fixtures/cards.js";
import { withHand } from "./fixtures/helpers.js";

const cardDb = createFixtureCardDatabase();

function stateWithBothActives() {
  let state = createInitialState(fixtureDeck(), fixtureDeck(), "seed-effects");
  state = withHand(state, "player1", ["frodo-baggins"]);
  state = withHand(state, "player2", ["aragorn-strider"]);
  const p1Frodo = state.players.player1.hand.find((c) => c.cardId === "frodo-baggins")!;
  state = moveToActive(playToBench(state, "player1", p1Frodo.instanceId), "player1", p1Frodo.instanceId);
  const p2Aragorn = state.players.player2.hand.find((c) => c.cardId === "aragorn-strider")!;
  state = moveToActive(playToBench(state, "player2", p2Aragorn.instanceId), "player2", p2Aragorn.instanceId);
  return state;
}

describe("applyEffect", () => {
  it("damage marks damage on the resolved target", () => {
    const state = stateWithBothActives();
    const next = applyEffect(state, "player1", { type: "damage", amount: 2, target: { scope: "opponentActive" } });
    expect(next.players.player2.active?.damageMarked).toBe(2);
  });

  it("heal reduces damageMarked (never below 0)", () => {
    let state = stateWithBothActives();
    state = applyEffect(state, "player1", { type: "damage", amount: 2, target: { scope: "opponentActive" } });
    state = applyEffect(state, "player2", { type: "heal", amount: 5, target: { scope: "ownActive" } });
    expect(state.players.player2.active?.damageMarked).toBe(0);
  });

  it("drawCards draws the requested count for the specified player", () => {
    const state = stateWithBothActives();
    const before = state.players.player2.hand.length;
    const next = applyEffect(state, "player1", { type: "drawCards", count: 2, player: "opponent" });
    expect(next.players.player2.hand.length).toBe(before + 2);
  });

  it("buffStat adds a status effect that stats.ts picks up", () => {
    let state = stateWithBothActives();
    const before = getEffectiveResilience(cardDb, state.players.player1.active!);
    state = applyEffect(state, "player1", {
      type: "buffStat",
      stat: "resilience",
      amount: 3,
      duration: "permanent",
      target: { scope: "ownActive" },
    });
    const after = getEffectiveResilience(cardDb, state.players.player1.active!);
    expect(after).toBe(before + 3);
  });

  it("returnToHand moves the active character back to hand and clears the active slot", () => {
    const state = stateWithBothActives();
    const activeId = state.players.player1.active!.instanceId;
    const next = applyEffect(state, "player2", { type: "returnToHand", target: { scope: "opponentActive" } });
    expect(next.players.player1.active).toBeNull();
    expect(next.players.player1.hand.some((c) => c.instanceId === activeId)).toBe(true);
  });

  it("corruptionTick increments the controller's corruptionTrack", () => {
    const state = stateWithBothActives();
    const next = applyEffect(state, "player1", { type: "corruptionTick", amount: 1 });
    expect(next.players.player1.corruptionTrack).toBe(1);
  });

  it("cleanupKnockouts discards a character whose damage meets or exceeds effective resilience", () => {
    let state = stateWithBothActives();
    const frodo = state.players.player1.active!;
    state = applyEffect(state, "player2", { type: "damage", amount: 2, target: { scope: "opponentActive" } }); // frodo resilience 2
    state = cleanupKnockouts(state, (playerId, instanceId) => {
      const p = state.players[playerId];
      const instance = [p.active, ...p.bench].find((c) => c?.instanceId === instanceId);
      return instance ? getEffectiveResilience(cardDb, instance) : 0;
    });
    expect(state.players.player1.active).toBeNull();
    expect(state.players.player1.discard.some((c) => c.instanceId === frodo.instanceId)).toBe(true);
  });
});
