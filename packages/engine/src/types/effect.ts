import type { TargetSpec } from "./common.js";

/**
 * Closed vocabulary of effects. Every card's behavior is expressed as one or
 * more of these variants so a) non-programmers can author cards as JSON and
 * b) the engine has exactly one handler per variant, unit-tested once and
 * reused by every card that uses it.
 */
export type Effect =
  | { type: "damage"; amount: number; target: TargetSpec }
  | { type: "heal"; amount: number; target: TargetSpec }
  | { type: "drawCards"; count: number; player: "self" | "opponent" }
  | {
      type: "buffStat";
      stat: "power" | "resilience";
      amount: number;
      duration: "turn" | "permanent";
      target: TargetSpec;
    }
  | { type: "returnToHand"; target: TargetSpec }
  | { type: "corruptionTick"; amount: number };

export type AbilityTrigger = "onPlay" | "onAttack" | "onTurnStart" | "activated";

export interface Ability {
  trigger: AbilityTrigger;
  effect: Effect;
  /** Only relevant for trigger "activated": resource cost to activate. */
  cost?: number;
}
