import { describe, expect, it } from "vitest";
import type { GameState } from "../src/index.js";
import { createInitialState } from "../src/state/createInitialState.js";
import { dispatch } from "../src/reducer/dispatch.js";
import { legalActions } from "../src/rules/legalActions.js";
import { moveToActive, playToBench } from "../src/zones/zones.js";
import { createFixtureCardDatabase, fixtureDeck } from "./fixtures/cards.js";
import { withHand } from "./fixtures/helpers.js";

const cardDb = createFixtureCardDatabase();

function freshState() {
  return { ...createInitialState(fixtureDeck(), fixtureDeck(), "seed-dispatch"), phase: "resource" as const };
}

describe("dispatch", () => {
  it("throws on an action that legalActions does not offer", () => {
    const state = freshState();
    expect(() =>
      dispatch(state, { type: "declareAttack", player: "player1", attackerInstanceId: "nope" }, cardDb)
    ).toThrow(/Illegal action/);
  });

  it("playLocation -> tapLocation -> endPhase moves resource into the pool and advances to main", () => {
    let state = withHand(freshState(), "player1", ["shire"]);
    const shire = state.players.player1.hand.find((c) => c.cardId === "shire")!;
    state = dispatch(state, { type: "playLocation", player: "player1", instanceId: shire.instanceId }, cardDb);
    state = dispatch(state, { type: "tapLocation", player: "player1", instanceId: shire.instanceId }, cardDb);
    expect(state.players.player1.resourcePool).toBe(1);
    state = dispatch(state, { type: "endPhase", player: "player1" }, cardDb);
    expect(state.phase).toBe("main");
  });

  it("resolves two stacked events in LIFO order via passPriority", () => {
    let state = withHand(freshState(), "player1", ["a-elbereth-gilthoniel", "a-elbereth-gilthoniel"]);
    state = { ...state, players: { ...state.players, player1: { ...state.players.player1, resourcePool: 5 } } };
    // Give both players an active so the damage effect (target: opponentActive) has somewhere to land.
    // Aragorn's resilience (4) comfortably survives the 2 total damage from both events, so the
    // knockout/cleanup pass doesn't interfere with the damageMarked assertions below.
    state = withHand(state, "player2", ["aragorn-strider"]);
    const aragorn = state.players.player2.hand.find((c) => c.cardId === "aragorn-strider")!;
    state = moveToActive(playToBench(state, "player2", aragorn.instanceId), "player2", aragorn.instanceId);

    const [event1, event2] = state.players.player1.hand;
    state = dispatch(state, { type: "playEvent", player: "player1", instanceId: event1!.instanceId }, cardDb);
    expect(state.stack).toHaveLength(1);
    state = dispatch(state, { type: "playEvent", player: "player1", instanceId: event2!.instanceId }, cardDb);
    expect(state.stack).toHaveLength(2);

    state = dispatch(state, { type: "passPriority", player: "player1" }, cardDb);
    expect(state.stack).toHaveLength(1);
    expect(state.players.player2.active?.damageMarked).toBe(1);

    state = dispatch(state, { type: "passPriority", player: "player1" }, cardDb);
    expect(state.stack).toHaveLength(0);
    expect(state.players.player2.active?.damageMarked).toBe(2);
  });

  it("declareAttack resolves through the stack: damage and Hope loss land on passPriority", () => {
    let state: GameState = { ...freshState(), phase: "combat" };
    state = withHand(state, "player1", ["aragorn-strider"]);
    const aragorn = state.players.player1.hand.find((c) => c.cardId === "aragorn-strider")!;
    state = moveToActive(playToBench(state, "player1", aragorn.instanceId), "player1", aragorn.instanceId);
    state = withHand(state, "player2", ["frodo-baggins"]);
    const frodo = state.players.player2.hand.find((c) => c.cardId === "frodo-baggins")!;
    state = moveToActive(playToBench(state, "player2", frodo.instanceId), "player2", frodo.instanceId);

    const hopeBefore = state.players.player2.hopeTotal;
    state = dispatch(state, { type: "declareAttack", player: "player1", attackerInstanceId: aragorn.instanceId }, cardDb);

    // Declared but not yet resolved: no damage, attacker untapped, attack on the stack.
    expect(state.stack).toHaveLength(1);
    expect(state.players.player2.hopeTotal).toBe(hopeBefore);
    expect(state.players.player1.active?.tapped).toBe(false);
    // A second declaration while one is pending is illegal.
    expect(() =>
      dispatch(state, { type: "declareAttack", player: "player1", attackerInstanceId: aragorn.instanceId }, cardDb)
    ).toThrow(/Illegal action/);

    state = dispatch(state, { type: "passPriority", player: "player1" }, cardDb);

    expect(state.players.player2.hopeTotal).toBe(hopeBefore - 4); // aragorn power 4
    // Frodo (resilience 2) took 4 damage — knocked out and discarded by the central cleanup pass.
    expect(state.players.player2.active).toBeNull();
    expect(state.players.player2.discard.some((c) => c.instanceId === frodo.instanceId)).toBe(true);
    expect(state.players.player1.active?.tapped).toBe(true);
  });

  it("declareAttack with no defending active hits the opponent's Hope directly", () => {
    let state: GameState = { ...freshState(), phase: "combat" };
    state = withHand(state, "player1", ["aragorn-strider"]);
    const aragorn = state.players.player1.hand.find((c) => c.cardId === "aragorn-strider")!;
    state = moveToActive(playToBench(state, "player1", aragorn.instanceId), "player1", aragorn.instanceId);
    expect(state.players.player2.active).toBeNull();

    const hopeBefore = state.players.player2.hopeTotal;
    state = dispatch(state, { type: "declareAttack", player: "player1", attackerInstanceId: aragorn.instanceId }, cardDb);
    state = dispatch(state, { type: "passPriority", player: "player1" }, cardDb);

    expect(state.players.player2.hopeTotal).toBe(hopeBefore - 4); // aragorn power 4, straight to Hope
    expect(state.players.player1.active?.tapped).toBe(true);
  });

  it("a defender's response event that kills the attacker makes the attack fizzle", () => {
    let state: GameState = { ...freshState(), phase: "combat" };
    // Frodo (1 power, 2 resilience) attacks; defender responds with two stacked
    // damage events... one is enough: deal 1 damage twice? Use a weakened attacker:
    state = withHand(state, "player1", ["frodo-baggins"]);
    const frodo = state.players.player1.hand.find((c) => c.cardId === "frodo-baggins")!;
    state = moveToActive(playToBench(state, "player1", frodo.instanceId), "player1", frodo.instanceId);
    // Pre-damage Frodo so a single 1-damage event finishes him (resilience 2).
    state = {
      ...state,
      players: {
        ...state.players,
        player1: { ...state.players.player1, active: { ...state.players.player1.active!, damageMarked: 1 } },
      },
    };
    state = withHand(state, "player2", ["a-elbereth-gilthoniel", "aragorn-strider"]);
    const aragorn = state.players.player2.hand.find((c) => c.cardId === "aragorn-strider")!;
    state = moveToActive(playToBench(state, "player2", aragorn.instanceId), "player2", aragorn.instanceId);
    state = {
      ...state,
      players: { ...state.players, player2: { ...state.players.player2, resourcePool: 2 } },
    };

    const hopeBefore = state.players.player2.hopeTotal;
    state = dispatch(state, { type: "declareAttack", player: "player1", attackerInstanceId: frodo.instanceId }, cardDb);

    // Defender responds: 1 damage to the attacking Frodo (opponentActive from player2's view).
    const event = state.players.player2.hand.find((c) => c.cardId === "a-elbereth-gilthoniel")!;
    state = dispatch(state, { type: "playEvent", player: "player2", instanceId: event.instanceId }, cardDb);
    expect(state.stack).toHaveLength(2);

    // LIFO: event resolves first, killing Frodo...
    state = dispatch(state, { type: "passPriority", player: "player2" }, cardDb);
    expect(state.players.player1.active).toBeNull();
    // ...then the attack pops and fizzles: no Hope lost.
    state = dispatch(state, { type: "passPriority", player: "player2" }, cardDb);
    expect(state.stack).toHaveLength(0);
    expect(state.players.player2.hopeTotal).toBe(hopeBefore);
  });

  it("evolveCharacter upgrades a matching board character, keeping damage and firing onPlay", () => {
    let state: GameState = { ...freshState(), phase: "main" };
    state = withHand(state, "player1", ["frodo-baggins"]);
    const frodo = state.players.player1.hand.find((c) => c.cardId === "frodo-baggins")!;
    state = { ...state, players: { ...state.players, player1: { ...state.players.player1, resourcePool: 5 } } };
    state = dispatch(state, { type: "playCharacterToBench", player: "player1", instanceId: frodo.instanceId }, cardDb);

    // Give the benched Frodo a scratch, then evolve him.
    state = {
      ...state,
      players: {
        ...state.players,
        player1: {
          ...state.players.player1,
          bench: state.players.player1.bench.map((c) => ({ ...c, damageMarked: 1 })),
          hand: [],
        },
      },
    };
    state = withHand(state, "player1", ["frodo-ring-bearer"]);
    const evolution = state.players.player1.hand.find((c) => c.cardId === "frodo-ring-bearer")!;
    const actions = legalActions(state, "player1", cardDb);
    const evolveAction = actions.find((a) => a.type === "evolveCharacter");
    expect(evolveAction).toBeDefined();

    state = dispatch(state, evolveAction!, cardDb);
    const evolved = state.players.player1.bench[0]!;
    expect(evolved.cardId).toBe("frodo-ring-bearer");
    expect(evolved.instanceId).toBe(frodo.instanceId); // same board identity
    expect(evolved.damageMarked).toBe(1); // damage carries over
    expect(evolved.evolvedFromInstanceIds).toContain("frodo-baggins");
    expect(state.players.player1.discard.some((c) => c.instanceId === evolution.instanceId)).toBe(true);
  });

  it("evolution cards cannot be played to the bench directly", () => {
    let state: GameState = { ...freshState(), phase: "main" };
    state = withHand(state, "player1", ["frodo-ring-bearer"]);
    state = { ...state, players: { ...state.players, player1: { ...state.players.player1, resourcePool: 9 } } };
    const actions = legalActions(state, "player1", cardDb);
    expect(actions.some((a) => a.type === "playCharacterToBench")).toBe(false);
    expect(actions.some((a) => a.type === "evolveCharacter")).toBe(false); // no base Frodo on board
  });

  it("fires a character's onPlay ability when played to the bench", () => {
    let state: GameState = { ...freshState(), phase: "main" };
    state = withHand(state, "player1", ["gandalf-herald"]);
    state = {
      ...state,
      players: { ...state.players, player1: { ...state.players.player1, resourcePool: 4 } },
    };
    const gandalf = state.players.player1.hand.find((c) => c.cardId === "gandalf-herald")!;
    const deckBefore = state.players.player1.deck.length;
    state = dispatch(state, { type: "playCharacterToBench", player: "player1", instanceId: gandalf.instanceId }, cardDb);
    // Hand: played Gandalf (-1) and drew a card from the onPlay trigger (+1) → net 0.
    expect(state.players.player1.hand).toHaveLength(1);
    expect(state.players.player1.deck.length).toBe(deckBefore - 1);
    expect(state.players.player1.bench.some((c) => c.cardId === "gandalf-herald")).toBe(true);
  });

  it("fires a location's enterEffect when played", () => {
    let state: GameState = { ...freshState(), phase: "resource" };
    state = withHand(state, "player1", ["grey-havens"]);
    const havens = state.players.player1.hand.find((c) => c.cardId === "grey-havens")!;
    const deckBefore = state.players.player1.deck.length;
    state = dispatch(state, { type: "playLocation", player: "player1", instanceId: havens.instanceId }, cardDb);
    expect(state.players.player1.locationsInPlay).toHaveLength(1);
    expect(state.players.player1.deck.length).toBe(deckBefore - 1); // drew from enterEffect
    expect(state.players.player1.hand).toHaveLength(1); // played the location, drew a replacement
  });

  it("sets state.winner and stops accepting further actions once Hope reaches 0", () => {
    let state: GameState = { ...freshState(), phase: "combat" };
    state = withHand(state, "player1", ["aragorn-strider"]);
    const aragorn = state.players.player1.hand.find((c) => c.cardId === "aragorn-strider")!;
    state = moveToActive(playToBench(state, "player1", aragorn.instanceId), "player1", aragorn.instanceId);
    state = withHand(state, "player2", ["frodo-baggins"]);
    const frodo = state.players.player2.hand.find((c) => c.cardId === "frodo-baggins")!;
    state = moveToActive(playToBench(state, "player2", frodo.instanceId), "player2", frodo.instanceId);
    state = { ...state, players: { ...state.players, player2: { ...state.players.player2, hopeTotal: 3 } } };

    state = dispatch(state, { type: "declareAttack", player: "player1", attackerInstanceId: aragorn.instanceId }, cardDb);
    state = dispatch(state, { type: "passPriority", player: "player1" }, cardDb);

    expect(state.winner).toBe("player1");
    const before = state;
    const after = dispatch(state, { type: "endPhase", player: "player2" }, cardDb);
    expect(after).toBe(before); // dispatch is a no-op once there's a winner
  });
});
