import { useState } from "react";
import type { Card, CardDatabase } from "@lotr-tcg/engine";
import { CardArt } from "./CardArt.js";

/**
 * Fixed-position enlarged card preview. Fed by event delegation: the game
 * root watches mouseover for anything carrying data-card-id (every CardFace
 * sets it), so no per-component prop threading is needed.
 */
export function useCardInspector(cardDb: CardDatabase) {
  const [card, setCard] = useState<Card | null>(null);

  const onMouseOver = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest("[data-card-id]");
    if (!el) {
      if (card) setCard(null);
      return;
    }
    const cardId = el.getAttribute("data-card-id");
    if (cardId && cardId !== card?.id) {
      try {
        setCard(cardDb.getCard(cardId));
      } catch {
        setCard(null);
      }
    }
  };

  const onMouseLeave = () => setCard(null);

  return { inspectedCard: card, inspectorHandlers: { onMouseOver, onMouseLeave } };
}

export function CardInspector({ card, cardDb }: { card: Card; cardDb: CardDatabase }) {
  void cardDb;
  return (
    <aside className="inspector" aria-live="polite">
      <div className={`card card--hand card--${card.faction} inspector__card`}>
        <div className="card__header">
          <span className="card__name">{card.name}</span>
          {"cost" in card && <span className="card__cost">{card.cost.total}</span>}
          {card.kind === "location" && <span className="card__cost card__cost--resource">+{card.resourceValue}</span>}
        </div>
        <div className="card__art">
          <CardArt card={card} />
        </div>
        {card.kind === "character" && (
          <div className="card__stats">
            <span className="card__power">{card.power}⚔</span>
            <span className="card__resilience">{card.resilience}❤</span>
          </div>
        )}
      </div>
      <div className="inspector__text">
        <strong>{card.name}</strong>
        <em className="inspector__kind">
          {card.faction} {card.kind}
        </em>
        {card.rulesText && <p>{card.rulesText}</p>}
        {card.flavorText && <p className="inspector__flavor">{card.flavorText}</p>}
      </div>
    </aside>
  );
}
