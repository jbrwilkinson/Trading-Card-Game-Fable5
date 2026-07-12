import { z } from "zod";
import { abilitySchema, effectSchema } from "./effect.js";

const factionSchema = z.enum(["fellowship", "rohan", "gondor", "mordor", "neutral"]);
const costSchema = z.object({ total: z.number().int().nonnegative() });

const baseFields = {
  id: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "card id must be a kebab-case slug, e.g. 'frodo-baggins'"),
  name: z.string().min(1),
  faction: factionSchema,
  rulesText: z.string(),
  artId: z.string().min(1),
  flavorText: z.string().optional(),
};

export const characterCardSchema = z.object({
  ...baseFields,
  kind: z.literal("character"),
  cost: costSchema,
  power: z.number().int().nonnegative(),
  resilience: z.number().int().positive(),
  abilities: z.array(abilitySchema),
  evolvesFrom: z.string().optional(),
  tags: z.array(z.string()),
});

export const locationCardSchema = z.object({
  ...baseFields,
  kind: z.literal("location"),
  resourceValue: z.number().int().positive(),
  enterEffect: effectSchema.optional(),
});

export const itemCardSchema = z.object({
  ...baseFields,
  kind: z.literal("item"),
  cost: costSchema,
  attachTarget: z.literal("character"),
  statModifiers: z.object({
    power: z.number().int().optional(),
    resilience: z.number().int().optional(),
  }),
  grantedAbilities: z.array(abilitySchema).optional(),
});

export const eventCardSchema = z.object({
  ...baseFields,
  kind: z.literal("event"),
  cost: costSchema,
  speed: z.literal("fast"),
  effect: effectSchema,
});

export const storyCardSchema = z.object({
  ...baseFields,
  kind: z.literal("story"),
  cost: costSchema,
  speed: z.literal("slow"),
  effect: effectSchema,
});

export const cardSchema = z.discriminatedUnion("kind", [
  characterCardSchema,
  locationCardSchema,
  itemCardSchema,
  eventCardSchema,
  storyCardSchema,
]);

export const cardFileSchema = z.array(cardSchema);
