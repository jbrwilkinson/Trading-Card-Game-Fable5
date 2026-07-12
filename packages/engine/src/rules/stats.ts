import type { CardDatabase } from "../types/action.js";
import type { CardInstance } from "../types/index.js";

function sumItemModifier(cardDb: CardDatabase, instance: CardInstance, stat: "power" | "resilience"): number {
  return instance.attachedItems.reduce((total, item) => {
    const card = cardDb.getCard(item.cardId);
    if (card.kind !== "item") return total;
    return total + (card.statModifiers[stat] ?? 0);
  }, 0);
}

function sumStatusModifier(instance: CardInstance, stat: "power" | "resilience"): number {
  return instance.statusEffects.filter((s) => s.stat === stat).reduce((total, s) => total + s.amount, 0);
}

export function getEffectivePower(cardDb: CardDatabase, instance: CardInstance): number {
  const card = cardDb.getCard(instance.cardId);
  const base = card.kind === "character" ? card.power : 0;
  return base + sumItemModifier(cardDb, instance, "power") + sumStatusModifier(instance, "power");
}

export function getEffectiveResilience(cardDb: CardDatabase, instance: CardInstance): number {
  const card = cardDb.getCard(instance.cardId);
  const base = card.kind === "character" ? card.resilience : 0;
  return base + sumItemModifier(cardDb, instance, "resilience") + sumStatusModifier(instance, "resilience");
}
