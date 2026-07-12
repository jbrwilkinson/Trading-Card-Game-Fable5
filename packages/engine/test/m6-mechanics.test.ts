import { describe, expect, it } from "vitest";
import type { GameState } from "../src/index.js";
import { createInitialState } from "../src/state/createInitialState.js";
import { dispatch } from "../src/reducer/dispatch.js";
import { legalActions } from "../src/rules/legalActions.js";
import { getEffectivePower } from "../src/rules/stats.js";
import { moveToActive, playToBench } from "../src/zones/zones.js";
import { createFixtureCardDatabase, fixtureDeck } from "./fixtures/cards.js";
import { withHand } from "./fixtures/helpers.js";

const cardDb = createFixtureCardDatabase();

function freshState(): GameState {
  return { ...createInitialState(fixtureDeck(), fixtureDeck(), "seed-m6"), phase: "main" };
}

function withActive(state: GameState, player: "player1" | "player2", cardId: string): GameState {
  let next = withHand(state, player, [cardId]);
  const instance = next.players[player].hand[0]!;
  next = moveToActive(playToBench(next, player, instance.instanceId), player, instance.instanceId);
  return next;
}

describe("turn-duration buff expiry", () => {
  it("a 'turn' buff wears off when the turn passes; 'permanent' buffs stay", () => {
    let state = withActive(freshState(), "player1", "frodo-baggins");
    const frodo = state.players.player1.active!;
    state = {
      ...state,
      players: {
        ...state.players,
        player1: {
          ...state.players.player1,
          active: {
            ...frodo,
            statusEffects: [
              { stat: "power", amount: 3, duration: "turn" },
              { stat: "power", amount: 1, duration: "permanent" },
            ],
          },
        },
      },
    };
    expect(getEffectivePower(cardDb, state.players.player1.active!)).toBe(1 + 3 + 1);

    // main -> combat -> end -> (turn passes) next player's resource phase
    state = dispatch(state, { type: "endPhase", player: "player1" }, cardDb);
    state = dispatch(state, { type: "endPhase", player: "player1" }, cardDb);
    state = dispatch(state, { type: "endPhase", player: "player1" }, cardDb);
    expect(state.activePlayer).toBe("player2");

    expect(getEffectivePower(cardDb, state.players.player1.active!)).toBe(1 + 1); // turn buff gone, permanent stays
  });
});

describe("onAttack trigger", () => {
  it("deals its extra effect when the attack resolves", () => {
    let state: GameState = { ...freshState(), phase: "combat" };
    state = withActive(state, "player1", "elf-archer"); // power 2, onAttack: +1 damage
    state = withActive(state, "player2", "aragorn-strider"); // resilience 4

    state = dispatch(state, { type: "declareAttack", player: "player1", attackerInstanceId: state.players.player1.active!.instanceId }, cardDb);
    state = dispatch(state, { type: "passPriority", player: "player1" }, cardDb);

    // 2 from the attack + 1 from the onAttack volley.
    expect(state.players.player2.active?.damageMarked).toBe(3);
    // Hope only drops by the attack damage itself, not the ability's character damage.
    expect(state.players.player2.hopeTotal).toBe(20 - 2);
  });
});

describe("onTurnStart trigger", () => {
  it("heals the active character at its controller's turn start", () => {
    let state = withActive(freshState(), "player1", "aragorn-strider");
    // Herb-master on player1's bench; wounded Aragorn active.
    state = {
      ...state,
      players: {
        ...state.players,
        player1: {
          ...state.players.player1,
          active: { ...state.players.player1.active!, damageMarked: 2 },
        },
      },
    };
    let bench = withHand(state, "player1", ["herb-master"]);
    const herb = bench.players.player1.hand[0]!;
    state = playToBench(bench, "player1", herb.instanceId);

    // Pass to player2 and back to player1: herb-master heals 1 at player1's turn start.
    state = dispatch(state, { type: "endPhase", player: "player1" }, cardDb); // -> combat
    state = dispatch(state, { type: "endPhase", player: "player1" }, cardDb); // -> end
    state = dispatch(state, { type: "endPhase", player: "player1" }, cardDb); // -> p2 resource
    state = dispatch(state, { type: "endPhase", player: "player2" }, cardDb); // -> p2 main
    state = dispatch(state, { type: "endPhase", player: "player2" }, cardDb); // -> p2 combat
    state = dispatch(state, { type: "endPhase", player: "player2" }, cardDb); // -> p2 end
    state = dispatch(state, { type: "endPhase", player: "player2" }, cardDb); // -> p1 resource (turn start fired)

    expect(state.activePlayer).toBe("player1");
    expect(state.players.player1.active?.damageMarked).toBe(1);
  });
});

describe("activated abilities", () => {
  it("pays the cost, applies the effect, and locks out reuse until next turn", () => {
    let state = withActive(freshState(), "player1", "flame-wizard");
    state = withActive(state, "player2", "aragorn-strider");
    state = {
      ...state,
      players: { ...state.players, player1: { ...state.players.player1, resourcePool: 3 } },
    };

    const abilityActions = legalActions(state, "player1", cardDb).filter((a) => a.type === "useAbility");
    expect(abilityActions).toHaveLength(1);

    state = dispatch(state, abilityActions[0]!, cardDb);
    expect(state.players.player2.active?.damageMarked).toBe(2);
    expect(state.players.player1.resourcePool).toBe(1); // paid 2
    expect(state.players.player1.active?.abilityUsedThisTurn).toBe(true);
    // No second use this turn.
    expect(legalActions(state, "player1", cardDb).some((a) => a.type === "useAbility")).toBe(false);
  });

  it("is not offered when the cost is unaffordable", () => {
    let state = withActive(freshState(), "player1", "flame-wizard");
    state = {
      ...state,
      players: { ...state.players, player1: { ...state.players.player1, resourcePool: 1 } },
    };
    expect(legalActions(state, "player1", cardDb).some((a) => a.type === "useAbility")).toBe(false);
  });

  it("refreshes at the character's next turn start", () => {
    let state = withActive(freshState(), "player1", "flame-wizard");
    state = withActive(state, "player2", "aragorn-strider");
    state = {
      ...state,
      players: { ...state.players, player1: { ...state.players.player1, resourcePool: 2 } },
    };
    const ability = legalActions(state, "player1", cardDb).find((a) => a.type === "useAbility")!;
    state = dispatch(state, ability, cardDb);
    // Cycle to player1's next turn: main->combat->end->(p2)->resource...
    state = dispatch(state, { type: "endPhase", player: "player1" }, cardDb);
    state = dispatch(state, { type: "endPhase", player: "player1" }, cardDb);
    state = dispatch(state, { type: "endPhase", player: "player1" }, cardDb);
    state = dispatch(state, { type: "endPhase", player: "player2" }, cardDb);
    state = dispatch(state, { type: "endPhase", player: "player2" }, cardDb);
    state = dispatch(state, { type: "endPhase", player: "player2" }, cardDb);
    state = dispatch(state, { type: "endPhase", player: "player2" }, cardDb);
    expect(state.activePlayer).toBe("player1");
    expect(state.players.player1.active?.abilityUsedThisTurn).toBe(false);
  });
});

describe("retreat", () => {
  it("swaps active with a chosen bench character, once per turn", () => {
    let state = withActive(freshState(), "player1", "frodo-baggins");
    const frodoId = state.players.player1.active!.instanceId;
    let withSam = withHand(state, "player1", ["samwise-gamgee", "aragorn-strider"]);
    const sam = withSam.players.player1.hand.find((c) => c.cardId === "samwise-gamgee")!;
    const aragorn = withSam.players.player1.hand.find((c) => c.cardId === "aragorn-strider")!;
    state = playToBench(playToBench(withSam, "player1", sam.instanceId), "player1", aragorn.instanceId);

    const retreatActions = legalActions(state, "player1", cardDb).filter((a) => a.type === "retreat");
    expect(retreatActions).toHaveLength(2); // one per bench character

    state = dispatch(state, { type: "retreat", player: "player1", benchInstanceId: sam.instanceId }, cardDb);
    expect(state.players.player1.active?.instanceId).toBe(sam.instanceId);
    expect(state.players.player1.bench.map((c) => c.instanceId)).toContain(frodoId);

    // Second retreat the same turn is not offered.
    expect(legalActions(state, "player1", cardDb).some((a) => a.type === "retreat")).toBe(false);
  });

  it("is available again on the next turn", () => {
    let state = withActive(freshState(), "player1", "frodo-baggins");
    let withSam = withHand(state, "player1", ["samwise-gamgee"]);
    const sam = withSam.players.player1.hand[0]!;
    state = playToBench(withSam, "player1", sam.instanceId);
    state = dispatch(state, { type: "retreat", player: "player1", benchInstanceId: sam.instanceId }, cardDb);
    expect(state.players.player1.hasRetreatedThisTurn).toBe(true);

    // Cycle to player1's next turn.
    state = dispatch(state, { type: "endPhase", player: "player1" }, cardDb); // -> combat
    state = dispatch(state, { type: "endPhase", player: "player1" }, cardDb); // -> end
    state = dispatch(state, { type: "endPhase", player: "player1" }, cardDb); // -> p2 resource
    state = dispatch(state, { type: "endPhase", player: "player2" }, cardDb); // -> p2 main
    state = dispatch(state, { type: "endPhase", player: "player2" }, cardDb); // -> p2 combat
    state = dispatch(state, { type: "endPhase", player: "player2" }, cardDb); // -> p2 end
    state = dispatch(state, { type: "endPhase", player: "player2" }, cardDb); // -> p1 resource
    expect(state.activePlayer).toBe("player1");
    expect(state.players.player1.hasRetreatedThisTurn).toBe(false);
  });
});
