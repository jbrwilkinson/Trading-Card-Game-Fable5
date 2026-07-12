import type { Card, CardDatabase } from "@lotr-tcg/engine";
import { cardFileSchema } from "./schema/card.js";

import fellowshipLocations from "../cards/fellowship/locations.json";
import fellowshipCharacters from "../cards/fellowship/characters.json";
import fellowshipItems from "../cards/fellowship/items.json";
import fellowshipEvents from "../cards/fellowship/events.json";
import fellowshipStories from "../cards/fellowship/stories.json";
import mordorLocations from "../cards/mordor/locations.json";
import mordorCharacters from "../cards/mordor/characters.json";
import mordorItems from "../cards/mordor/items.json";
import mordorEvents from "../cards/mordor/events.json";
import mordorStories from "../cards/mordor/stories.json";

const RAW_FILES: Record<string, unknown> = {
  "fellowship/locations.json": fellowshipLocations,
  "fellowship/characters.json": fellowshipCharacters,
  "fellowship/items.json": fellowshipItems,
  "fellowship/events.json": fellowshipEvents,
  "fellowship/stories.json": fellowshipStories,
  "mordor/locations.json": mordorLocations,
  "mordor/characters.json": mordorCharacters,
  "mordor/items.json": mordorItems,
  "mordor/events.json": mordorEvents,
  "mordor/stories.json": mordorStories,
};

/** Validates every card file against the Zod schema; throws with a file-scoped message on the first invalid card. */
export function loadAllCards(): Card[] {
  const cards: Card[] = [];
  const seenIds = new Set<string>();
  for (const [file, raw] of Object.entries(RAW_FILES)) {
    const parsed = cardFileSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new Error(`Invalid card data in ${file} at ${issue?.path.join(".")}: ${issue?.message}`);
    }
    for (const card of parsed.data) {
      if (seenIds.has(card.id)) {
        throw new Error(`Duplicate card id "${card.id}" (second copy found in ${file})`);
      }
      seenIds.add(card.id);
      cards.push(card as Card);
    }
  }
  return cards;
}

export function createCardDatabase(): CardDatabase {
  const byId = new Map(loadAllCards().map((c) => [c.id, c]));
  return {
    getCard(cardId: string): Card {
      const card = byId.get(cardId);
      if (!card) throw new Error(`Unknown card id: ${cardId}`);
      return card;
    },
  };
}
