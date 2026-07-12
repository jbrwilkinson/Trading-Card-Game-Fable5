import { describe, expect, it } from "vitest";
import {
  createInitialState,
  dispatch,
  legalActions,
  type GameState,
  type PlayerId,
} from "@lotr-tcg/engine";
import { createCardDatabase, FELLOWSHIP_DECK, MORDOR_DECK } from "@lotr-tcg/card-data";
import { chooseAction } from "../src/select-action.js";
import { DIFFICULTY_PRESETS } from "../src/difficulty.js";

const cardDb = createCardDatabase();

function makeCharacterInstance(cardId: string, playerId: PlayerId, tag: string) {
  return {
    instanceId: `${playerId}-${cardId}-${tag}`,
    cardId,
    tapped: false,
    damageMarked: 0,
    attachedItems: [],
    statusEffects: [],
    evolvedFromInstanceIds: [],
  };
}

describe("chooseAction conformance", () => {
  it("plays full self-play games on every difficulty without ever producing an illegal action", () => {
    for (const difficulty of ["easy", "normal", "hard"] as const) {
      let state = createInitialState(FELLOWSHIP_DECK.cardIds, MORDOR_DECK.cardIds, `selfplay-${difficulty}`);
      let steps = 0;
      const MAX_STEPS = 4000;

      while (!state.winner && steps < MAX_STEPS) {
        steps++;
        const action = chooseAction(state, state.activePlayer, cardDb, difficulty);
        expect(action, `AI returned no action with game still live (${difficulty})`).not.toBeNull();
        // dispatch throws on illegal actions — the whole point of this test.
        state = dispatch(state, action!, cardDb);
      }

      expect(state.winner, `game did not finish in ${MAX_STEPS} steps (${difficulty})`).not.toBeNull();
    }
  });

  it("only ever proposes actions present in legalActions", () => {
    let state = createInitialState(FELLOWSHIP_DECK.cardIds, MORDOR_DECK.cardIds, "conformance-spot");
    for (let i = 0; i < 200 && !state.winner; i++) {
      const action = chooseAction(state, state.activePlayer, cardDb, "normal");
      if (!action) break;
      const legal = legalActions(state, state.activePlayer, cardDb);
      expect(legal.map((a) => JSON.stringify(a))).toContain(JSON.stringify(action));
      state = dispatch(state, action, cardDb);
    }
  });
});

describe("chooseAction behavior", () => {
  it("takes the lethal attack when one is available", () => {
    const base = createInitialState(FELLOWSHIP_DECK.cardIds, MORDOR_DECK.cardIds, "lethal-test");
    const attacker = makeCharacterInstance("aragorn-strider", "player1", "active"); // power 4
    const state: GameState = {
      ...base,
      phase: "combat",
      activePlayer: "player1",
      players: {
        ...base.players,
        player1: { ...base.players.player1, active: attacker },
        player2: { ...base.players.player2, hopeTotal: 3, active: null },
      },
    };

    const action = chooseAction(state, "player1", cardDb, "hard");
    expect(action?.type).toBe("declareAttack");
  });

  it("never picks a move leading to its own immediate loss when alternatives exist", () => {
    // AI at 3 Hope in combat with an untapped active; opponent has a big active.
    // Attacking marks damage on the enemy but our engine's counterattack comes
    // next turn — the immediate check here is simply that the chosen action is
    // legal and does not hand the opponent a win in the simulated next state.
    const base = createInitialState(FELLOWSHIP_DECK.cardIds, MORDOR_DECK.cardIds, "avoid-loss");
    const own = makeCharacterInstance("goblin-scout", "player2", "active");
    const enemy = makeCharacterInstance("gandalf-the-grey", "player1", "active");
    const state: GameState = {
      ...base,
      phase: "combat",
      activePlayer: "player2",
      players: {
        ...base.players,
        player1: { ...base.players.player1, active: enemy },
        player2: { ...base.players.player2, active: own, hopeTotal: 3 },
      },
    };
    const action = chooseAction(state, "player2", cardDb, "hard");
    expect(action).not.toBeNull();
    const next = dispatch(state, action!, cardDb);
    expect(next.winner).not.toBe("player1");
  });

  it("difficulty presets are genuinely distinct", () => {
    const { easy, normal, hard } = DIFFICULTY_PRESETS;
    expect(easy.pickFromTop).toBeGreaterThan(hard.pickFromTop);
    expect(hard.weights.cardAdvantage).toBeGreaterThan(easy.weights.cardAdvantage);
    expect(hard.weights.locationEconomy).toBeGreaterThan(easy.weights.locationEconomy);
  });
});
