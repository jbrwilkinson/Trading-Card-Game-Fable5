import { useMemo, useState } from "react";
import type { Card, Faction } from "@lotr-tcg/engine";
import { loadAllCards, type DeckDefinition } from "@lotr-tcg/card-data";
import { CardFace } from "../game/card/CardFace.js";
import { saveCustomDeck } from "./deck-storage.js";

const DECK_SIZE = 30;
const MAX_COPIES = 3;
const MAX_LOCATION_COPIES = 4;

const FACTIONS: { id: Exclude<Faction, "neutral">; label: string }[] = [
  { id: "fellowship", label: "Fellowship" },
  { id: "rohan", label: "Rohan" },
  { id: "gondor", label: "Gondor" },
  { id: "mordor", label: "Mordor" },
];

const KIND_ORDER: Card["kind"][] = ["location", "character", "item", "event", "story"];

interface DeckBuilderProps {
  onDone: () => void;
}

export function DeckBuilder({ onDone }: DeckBuilderProps) {
  const allCards = useMemo(() => loadAllCards(), []);
  const [faction, setFaction] = useState<Exclude<Faction, "neutral">>("fellowship");
  const [name, setName] = useState("My deck");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const pool = useMemo(
    () =>
      allCards
        .filter((c) => c.faction === faction || c.faction === "neutral")
        .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.name.localeCompare(b.name)),
    [allCards, faction]
  );

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const maxFor = (card: Card) => (card.kind === "location" ? MAX_LOCATION_COPIES : MAX_COPIES);

  const adjust = (card: Card, delta: number) => {
    setSavedMessage(null);
    setCounts((prev) => {
      const current = prev[card.id] ?? 0;
      let next = Math.max(0, Math.min(maxFor(card), current + delta));
      // Enforce the deck-size cap here, not just via the button's disabled
      // state — rapid clicks can land before React re-renders the button.
      const prevTotal = Object.values(prev).reduce((a, b) => a + b, 0);
      if (delta > 0 && prevTotal + (next - current) > DECK_SIZE) {
        next = Math.max(current, current + (DECK_SIZE - prevTotal));
      }
      const copy = { ...prev };
      if (next === 0) delete copy[card.id];
      else copy[card.id] = next;
      return copy;
    });
  };

  const switchFaction = (f: Exclude<Faction, "neutral">) => {
    setFaction(f);
    setCounts({});
    setSavedMessage(null);
  };

  const problems: string[] = [];
  if (total !== DECK_SIZE) problems.push(`Deck has ${total}/${DECK_SIZE} cards.`);
  if (!name.trim()) problems.push("Give the deck a name.");

  const save = () => {
    const deck: DeckDefinition = {
      id: `custom-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: name.trim(),
      description: `Custom ${FACTIONS.find((f) => f.id === faction)?.label} deck`,
      cardIds: Object.entries(counts).flatMap(([cardId, n]) => Array.from({ length: n }, () => cardId)),
    };
    saveCustomDeck(deck);
    setSavedMessage(`Saved "${deck.name}" — it's now available in the menu.`);
  };

  return (
    <div className="builder">
      <header className="builder__header">
        <h1>Deck builder</h1>
        <div className="builder__factions">
          {FACTIONS.map((f) => (
            <button
              key={f.id}
              className={`btn ${faction === f.id ? "btn--active" : ""}`}
              onClick={() => switchFaction(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="builder__controls">
          <input
            className="builder__name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Deck name"
          />
          <span className={`builder__count ${total === DECK_SIZE ? "builder__count--ok" : ""}`}>
            {total}/{DECK_SIZE}
          </span>
          <button className="btn" disabled={problems.length > 0} onClick={save}>
            Save deck
          </button>
          <button className="btn btn--quiet" onClick={onDone}>
            Back to menu
          </button>
        </div>
        {problems.length > 0 && <div className="builder__problems">{problems.join(" ")}</div>}
        {savedMessage && <div className="builder__saved">{savedMessage}</div>}
      </header>

      <div className="builder__pool">
        {pool.map((card) => {
          const count = counts[card.id] ?? 0;
          return (
            <div key={card.id} className="builder__entry">
              <CardFace card={card} size="hand" highlighted={count > 0} />
              <div className="builder__adjust">
                <button className="btn btn--small" onClick={() => adjust(card, -1)} disabled={count === 0}>
                  −
                </button>
                <span className="builder__copies">
                  {count}/{maxFor(card)}
                </span>
                <button className="btn btn--small" onClick={() => adjust(card, 1)} disabled={count >= maxFor(card) || total >= DECK_SIZE}>
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
