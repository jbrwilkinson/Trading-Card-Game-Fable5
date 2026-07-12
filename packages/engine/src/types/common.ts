export type PlayerId = "player1" | "player2";

export type Faction = "fellowship" | "rohan" | "gondor" | "mordor" | "neutral";

export type CardKind = "character" | "location" | "item" | "event" | "story";

export interface ResourceCost {
  total: number;
}

export type TargetSpec =
  | { scope: "opponentActive" }
  | { scope: "ownActive" }
  | { scope: "anyCharacter" }
  | { scope: "chosenInstance" };
