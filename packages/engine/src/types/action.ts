import type { PlayerId } from "./common.js";

export type Action =
  | { type: "playLocation"; player: PlayerId; instanceId: string }
  | { type: "tapLocation"; player: PlayerId; instanceId: string }
  | { type: "playCharacterToBench"; player: PlayerId; instanceId: string }
  | { type: "playItem"; player: PlayerId; instanceId: string; targetInstanceId: string }
  | { type: "playEvent"; player: PlayerId; instanceId: string; targetInstanceId?: string }
  | { type: "playStory"; player: PlayerId; instanceId: string; targetInstanceId?: string }
  | { type: "moveToActive"; player: PlayerId; instanceId: string }
  | { type: "retreat"; player: PlayerId; benchInstanceId: string }
  | { type: "evolveCharacter"; player: PlayerId; instanceId: string; targetInstanceId: string }
  | { type: "declareAttack"; player: PlayerId; attackerInstanceId: string }
  | { type: "passPriority"; player: PlayerId }
  | { type: "endPhase"; player: PlayerId };

export interface CardDatabase {
  getCard(cardId: string): import("./card.js").Card;
}
