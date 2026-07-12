import type { DeckDefinition } from "@lotr-tcg/card-data";

const STORAGE_KEY = "lotr-tcg-custom-decks";

export function loadCustomDecks(): DeckDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DeckDefinition[];
    return Array.isArray(parsed) ? parsed.filter((d) => d && Array.isArray(d.cardIds)) : [];
  } catch {
    return [];
  }
}

export function saveCustomDeck(deck: DeckDefinition): void {
  const decks = loadCustomDecks().filter((d) => d.id !== deck.id);
  decks.push(deck);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

export function deleteCustomDeck(deckId: string): void {
  const decks = loadCustomDecks().filter((d) => d.id !== deckId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}
