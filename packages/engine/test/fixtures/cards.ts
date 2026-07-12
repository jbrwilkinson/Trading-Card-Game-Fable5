import type { Card, CardDatabase } from "../../src/index.js";

/**
 * Small, deterministic, hand-authored fixture set covering every CardKind —
 * deliberately NOT the real ~80-120 card set (that lives in packages/card-data
 * and is authored later), kept small here so scenario tests stay readable.
 */
export const FIXTURE_CARDS: Card[] = [
  {
    id: "shire",
    name: "The Shire",
    faction: "fellowship",
    kind: "location",
    rulesText: "Tap for 1 resource.",
    artId: "shire",
    resourceValue: 1,
  },
  {
    id: "rivendell",
    name: "Rivendell",
    faction: "fellowship",
    kind: "location",
    rulesText: "Tap for 2 resource.",
    artId: "rivendell",
    resourceValue: 2,
  },
  {
    id: "frodo-baggins",
    name: "Frodo Baggins",
    faction: "fellowship",
    kind: "character",
    rulesText: "A hobbit far from home.",
    artId: "frodo-baggins",
    cost: { total: 1 },
    power: 1,
    resilience: 2,
    abilities: [],
    tags: ["hobbit"],
  },
  {
    id: "samwise-gamgee",
    name: "Samwise Gamgee",
    faction: "fellowship",
    kind: "character",
    rulesText: "Frodo's steadfast companion.",
    artId: "samwise-gamgee",
    cost: { total: 2 },
    power: 2,
    resilience: 3,
    abilities: [],
    tags: ["hobbit"],
  },
  {
    id: "aragorn-strider",
    name: "Aragorn, Strider",
    faction: "gondor",
    kind: "character",
    rulesText: "Heir of Isildur.",
    artId: "aragorn-strider",
    cost: { total: 3 },
    power: 4,
    resilience: 4,
    abilities: [],
    tags: ["ranger", "human"],
  },
  {
    id: "orc-raider",
    name: "Orc Raider",
    faction: "mordor",
    kind: "character",
    rulesText: "A snarling servant of the Shadow.",
    artId: "orc-raider",
    cost: { total: 2 },
    power: 3,
    resilience: 2,
    abilities: [],
    tags: ["orc"],
  },
  {
    id: "frodo-ring-bearer",
    name: "Frodo, Ring-bearer",
    faction: "fellowship",
    kind: "character",
    rulesText: "Evolves from Frodo Baggins. When played: draw 1 card.",
    artId: "frodo-ring-bearer",
    cost: { total: 2 },
    power: 2,
    resilience: 4,
    abilities: [{ trigger: "onPlay", effect: { type: "drawCards", count: 1, player: "self" } }],
    evolvesFrom: "frodo-baggins",
    tags: ["hobbit", "ring-bearer"],
  },
  {
    id: "gandalf-herald",
    name: "Gandalf, Herald of Hope",
    faction: "fellowship",
    kind: "character",
    rulesText: "When played: draw 1 card.",
    artId: "gandalf-herald",
    cost: { total: 4 },
    power: 3,
    resilience: 4,
    abilities: [{ trigger: "onPlay", effect: { type: "drawCards", count: 1, player: "self" } }],
    tags: ["wizard"],
  },
  {
    id: "grey-havens",
    name: "The Grey Havens",
    faction: "fellowship",
    kind: "location",
    rulesText: "Tap for 1 resource. When played: draw 1 card.",
    artId: "grey-havens",
    resourceValue: 1,
    enterEffect: { type: "drawCards", count: 1, player: "self" },
  },
  {
    id: "sting",
    name: "Sting",
    faction: "fellowship",
    kind: "item",
    rulesText: "An elven blade that glows blue near orcs. Attach: +1 power.",
    artId: "sting",
    cost: { total: 1 },
    attachTarget: "character",
    statModifiers: { power: 1 },
  },
  {
    id: "mithril-shirt",
    name: "Mithril Shirt",
    faction: "fellowship",
    kind: "item",
    rulesText: "Attach: +2 resilience.",
    artId: "mithril-shirt",
    cost: { total: 1 },
    attachTarget: "character",
    statModifiers: { resilience: 2 },
  },
  {
    id: "a-elbereth-gilthoniel",
    name: "A Elbereth Gilthoniel",
    faction: "fellowship",
    kind: "event",
    rulesText: "Fast: deal 1 damage to the opponent's active character.",
    artId: "a-elbereth-gilthoniel",
    cost: { total: 1 },
    speed: "fast",
    effect: { type: "damage", amount: 1, target: { scope: "opponentActive" } },
  },
  {
    id: "council-of-elrond",
    name: "The Council of Elrond",
    faction: "fellowship",
    kind: "story",
    rulesText: "Slow: draw 2 cards.",
    artId: "council-of-elrond",
    cost: { total: 2 },
    speed: "slow",
    effect: { type: "drawCards", count: 2, player: "self" },
  },
];

export function createFixtureCardDatabase(): CardDatabase {
  const byId = new Map(FIXTURE_CARDS.map((c) => [c.id, c]));
  return {
    getCard(cardId: string): Card {
      const card = byId.get(cardId);
      if (!card) throw new Error(`Unknown fixture card id: ${cardId}`);
      return card;
    },
  };
}

/** A small 12-card deck (with duplicates) usable by both players in scenario tests. */
export function fixtureDeck(): string[] {
  return [
    "shire",
    "shire",
    "rivendell",
    "rivendell",
    "frodo-baggins",
    "frodo-baggins",
    "samwise-gamgee",
    "aragorn-strider",
    "sting",
    "mithril-shirt",
    "a-elbereth-gilthoniel",
    "council-of-elrond",
  ];
}
