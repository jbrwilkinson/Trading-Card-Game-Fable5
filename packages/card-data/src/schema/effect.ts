import { z } from "zod";

export const targetSpecSchema = z.union([
  z.object({ scope: z.literal("opponentActive") }),
  z.object({ scope: z.literal("ownActive") }),
  z.object({ scope: z.literal("anyCharacter") }),
  z.object({ scope: z.literal("chosenInstance") }),
]);

export const effectSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("damage"), amount: z.number().int().positive(), target: targetSpecSchema }),
  z.object({ type: z.literal("heal"), amount: z.number().int().positive(), target: targetSpecSchema }),
  z.object({
    type: z.literal("drawCards"),
    count: z.number().int().positive(),
    player: z.enum(["self", "opponent"]),
  }),
  z.object({
    type: z.literal("buffStat"),
    stat: z.enum(["power", "resilience"]),
    amount: z.number().int(),
    duration: z.enum(["turn", "permanent"]),
    target: targetSpecSchema,
  }),
  z.object({ type: z.literal("returnToHand"), target: targetSpecSchema }),
  z.object({ type: z.literal("corruptionTick"), amount: z.number().int().positive() }),
]);

export const abilitySchema = z.object({
  trigger: z.enum(["onPlay", "onAttack", "onTurnStart", "activated"]),
  effect: effectSchema,
  cost: z.number().int().nonnegative().optional(),
});
