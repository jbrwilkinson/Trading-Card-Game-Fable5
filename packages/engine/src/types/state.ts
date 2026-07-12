import type { PlayerId } from "./common.js";
import type { StackableEffect } from "./effect.js";

export type Phase = "start" | "resource" | "main" | "combat" | "end";

export interface StatusEffect {
  stat: "power" | "resilience";
  amount: number;
  duration: "turn" | "permanent";
}

export interface CardInstance {
  instanceId: string;
  cardId: string;
  tapped: boolean;
  damageMarked: number;
  attachedItems: CardInstance[];
  statusEffects: StatusEffect[];
  evolvedFromInstanceIds: string[];
}

export interface PlayerState {
  id: PlayerId;
  deck: CardInstance[];
  hand: CardInstance[];
  active: CardInstance | null;
  bench: CardInstance[];
  discard: CardInstance[];
  resourcePool: number;
  locationsInPlay: CardInstance[];
  hopeTotal: number;
  corruptionTrack: number;
  hasPlayedLocationThisTurn: boolean;
  hasRetreatedThisTurn: boolean;
  deckedOut: boolean;
}

export interface StackEntry {
  sourceInstanceId: string;
  controller: PlayerId;
  effect: StackableEffect;
}

export interface GameLogEntry {
  turn: number;
  player: PlayerId;
  message: string;
  kind: "draw" | "play" | "attack" | "resolve" | "phase" | "win" | "lose";
}

export interface TargetRequest {
  forPlayer: PlayerId;
  sourceInstanceId: string;
  legalInstanceIds: string[];
  reason: "attack" | "effect";
}

export interface GameState {
  turn: number;
  activePlayer: PlayerId;
  phase: Phase;
  players: Record<PlayerId, PlayerState>;
  stack: StackEntry[];
  pendingTargets: TargetRequest | null;
  log: GameLogEntry[];
  rngSeed: string;
  winner: PlayerId | "draw" | null;
}
