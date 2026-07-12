/**
 * validate-cards CLI — run via `npm run validate-cards` from the repo root.
 *
 * Reads every faction JSON file in packages/card-data/cards, validates it
 * against the Zod card schema, checks for duplicate ids, and verifies the
 * starter decks only reference cards that exist. Exits non-zero with a
 * file-scoped error message on the first problem, so a card author gets
 * pointed at exactly the file and card that's wrong.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { cardFileSchema } from "../../card-data/src/schema/card.js";
import { STARTER_DECKS } from "../../card-data/src/decks.js";

const cardsDir = fileURLToPath(new URL("../../card-data/cards", import.meta.url));

function findJsonFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

let errorCount = 0;
const seenIds = new Map<string, string>(); // id -> file it first appeared in
let cardCount = 0;

for (const file of findJsonFiles(cardsDir)) {
  const label = relative(cardsDir, file);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    console.error(`✗ ${label}: not valid JSON — ${(err as Error).message}`);
    errorCount++;
    continue;
  }

  const parsed = cardFileSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const cardIndex = issue.path[0];
      const maybeId =
        Array.isArray(raw) && typeof cardIndex === "number"
          ? ((raw[cardIndex] as { id?: string } | undefined)?.id ?? `index ${cardIndex}`)
          : "unknown card";
      console.error(`✗ ${label} [${maybeId}] at ${issue.path.join(".")}: ${issue.message}`);
      errorCount++;
    }
    continue;
  }

  for (const card of parsed.data) {
    cardCount++;
    const firstFile = seenIds.get(card.id);
    if (firstFile) {
      console.error(`✗ ${label}: duplicate card id "${card.id}" (already defined in ${firstFile})`);
      errorCount++;
    } else {
      seenIds.set(card.id, label);
    }
  }
}

for (const deck of STARTER_DECKS) {
  if (deck.cardIds.length !== 30) {
    console.error(`✗ deck "${deck.name}": has ${deck.cardIds.length} cards, expected 30`);
    errorCount++;
  }
  for (const cardId of deck.cardIds) {
    if (!seenIds.has(cardId)) {
      console.error(`✗ deck "${deck.name}": references unknown card id "${cardId}"`);
      errorCount++;
    }
  }
}

if (errorCount > 0) {
  console.error(`\n${errorCount} problem(s) found across ${cardCount} cards.`);
  process.exit(1);
}
console.log(`✓ ${cardCount} cards and ${STARTER_DECKS.length} decks validated, no problems found.`);
