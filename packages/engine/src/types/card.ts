import type { CardKind, Faction, ResourceCost } from "./common.js";
import type { Ability, Effect } from "./effect.js";

interface BaseCard {
  id: string;
  name: string;
  faction: Faction;
  kind: CardKind;
  rulesText: string;
  artId: string;
  flavorText?: string;
}

export interface CharacterCard extends BaseCard {
  kind: "character";
  cost: ResourceCost;
  power: number;
  resilience: number;
  abilities: Ability[];
  evolvesFrom?: string;
  tags: string[];
}

export interface LocationCard extends BaseCard {
  kind: "location";
  resourceValue: number;
  enterEffect?: Effect;
}

export interface ItemCard extends BaseCard {
  kind: "item";
  cost: ResourceCost;
  attachTarget: "character";
  statModifiers: { power?: number; resilience?: number };
  grantedAbilities?: Ability[];
}

export interface EventCard extends BaseCard {
  kind: "event";
  cost: ResourceCost;
  speed: "fast";
  effect: Effect;
}

export interface StoryCard extends BaseCard {
  kind: "story";
  cost: ResourceCost;
  speed: "slow";
  effect: Effect;
}

export type Card = CharacterCard | LocationCard | ItemCard | EventCard | StoryCard;
