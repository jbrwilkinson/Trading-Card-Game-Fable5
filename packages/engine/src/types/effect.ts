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
  | { type: "corruptionTick"; amount: number; player: "self" | "opponent" };

/**
 * Internal-only effect used for stack entries the engine creates itself
 * (never authorable in card JSON — the card-data schema deliberately
 * excludes it). Attacks resolve through the stack so the defender gets a
 * response window.
 */
export type InternalEffect = { type: "resolveAttack"; attackerInstanceId: string };

export type StackableEffect = Effect | InternalEffect;

export type AbilityTrigger = "onPlay" | "onAttack" | "onTurnStart" | "activated";

export interface Ability {
  trigger: AbilityTrigger;
  effect: Effect;
  /** Only relevant for trigger "activated": resource cost to activate. */
  cost?: number;
}
