import type { Card, CardDatabase, CardInstance } from "@lotr-tcg/engine";
import { getEffectivePower, getEffectiveResilience } from "@lotr-tcg/engine";
import { CardArt } from "./CardArt.js";

interface CardFaceProps {
  card: Card;
  /** Board instance, when rendering a card in play (shows damage, buffs, items). */
  instance?: CardInstance;
  cardDb?: CardDatabase;
  size?: "hand" | "board";
  highlighted?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
}

/**
 * The single shared card renderer used everywhere a card appears — hand,
 * board, log tooltips. Placeholder "art" is a faction-tinted panel with the
 * kind glyph; real generated art replaces the panel in M4 keyed by artId.
 */
export function CardFace({ card, instance, cardDb, size = "board", highlighted, dimmed, onClick }: CardFaceProps) {
  const power = instance && cardDb ? getEffectivePower(cardDb, instance) : card.kind === "character" ? card.power : null;
  const resilience =
    instance && cardDb ? getEffectiveResilience(cardDb, instance) : card.kind === "character" ? card.resilience : null;
  const damage = instance?.damageMarked ?? 0;

  const classes = [
    "card",
    `card--${size}`,
    `card--${card.faction}`,
    highlighted ? "card--highlighted" : "",
    dimmed ? "card--dimmed" : "",
    instance?.tapped ? "card--tapped" : "",
    onClick ? "card--clickable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} onClick={onClick} data-card-id={card.id}>
      <div className="card__header">
        <span className="card__name">{card.name}</span>
        {"cost" in card && <span className="card__cost">{card.cost.total}</span>}
        {card.kind === "location" && <span className="card__cost card__cost--resource">+{card.resourceValue}</span>}
      </div>
      <div className="card__art">
        <CardArt card={card} />
      </div>
      {size === "hand" && card.rulesText && <div className="card__rules">{card.rulesText}</div>}
      {card.kind === "character" && (
        <div className="card__stats">
          <span className="card__power">{power}⚔</span>
          {damage > 0 && <span className="card__damage">-{damage}</span>}
          <span className="card__resilience">{resilience}❤</span>
        </div>
      )}
      {instance && instance.attachedItems.length > 0 && (
        <div className="card__items">
          {instance.attachedItems.map((item) => (
            <span key={item.instanceId} className="card__item-chip" title={item.cardId}>
              🛡
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
