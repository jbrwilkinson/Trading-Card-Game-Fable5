import { describe, expect, it } from "vitest";
import { createCardDatabase, loadAllCards } from "../src/loader.js";
import { STARTER_DECKS } from "../src/decks.js";
import { cardFileSchema } from "../src/schema/card.js";

describe("card data", () => {
  it("loads every faction file through the schema without errors", () => {
    const cards = loadAllCards();
    expect(cards.length).toBeGreaterThanOrEqual(30);
  });

  it("every card id is unique", () => {
    const cards = loadAllCards();
    const ids = cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("rejects malformed cards with a useful error", () => {
    const bad = [{ id: "Bad Id!", name: "", kind: "character" }];
    const parsed = cardFileSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it("createCardDatabase throws for unknown ids", () => {
    const db = createCardDatabase();
    expect(() => db.getCard("not-a-card")).toThrow(/Unknown card id/);
  });
});

describe("starter decks", () => {
  const db = createCardDatabase();

  it("every deck is exactly 30 cards", () => {
    for (const deck of STARTER_DECKS) {
      expect(deck.cardIds, deck.name).toHaveLength(30);
    }
  });

  it("every deck card id resolves in the card database", () => {
    for (const deck of STARTER_DECKS) {
      for (const cardId of deck.cardIds) {
        expect(() => db.getCard(cardId), `${deck.name}: ${cardId}`).not.toThrow();
      }
    }
  });

  it("no deck plays more than 3 copies of a card", () => {
    for (const deck of STARTER_DECKS) {
      const counts = new Map<string, number>();
      for (const cardId of deck.cardIds) {
        counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
      }
      for (const [cardId, count] of counts) {
        const kind = db.getCard(cardId).kind;
        // Locations are the resource base (like MTG basic lands) and may exceed 3.
        if (kind !== "location") {
          expect(count, `${deck.name}: ${cardId}`).toBeLessThanOrEqual(3);
        }
      }
    }
  });
});
