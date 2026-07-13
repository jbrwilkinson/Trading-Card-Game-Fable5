# Card Authoring Guide

Cards are plain JSON — you can add or change cards without touching any
engine code. This guide covers the file layout, every field, the complete
effect vocabulary, and how to check your work.

## Workflow

1. Edit the right JSON file under `packages/card-data/cards/<faction>/`.
2. Run `npm run validate-cards` from the repo root. It reports the exact file
   and card of any mistake, duplicate ids, and broken deck references.
3. Start the game (`npm run dev`) — your card is live, with generated art.
4. To put the card in a starter deck, edit `packages/card-data/src/decks.ts`.
   Or just build a deck in-game (the deck builder sees every valid card).

## File layout

One file per faction per kind:

```
packages/card-data/cards/
├── fellowship/  characters.json  locations.json  items.json  events.json  stories.json
├── rohan/       …
├── gondor/      …
├── mordor/      …
└── neutral/     characters.json  items.json  events.json  stories.json
```

Each file is a JSON array of card objects. Factions: `fellowship`, `rohan`,
`gondor`, `mordor`, `neutral` (neutral cards are usable in any deck).

## Fields common to every card

| Field | Notes |
|---|---|
| `id` | kebab-case slug, unique across the whole set (`"frodo-baggins"`) |
| `name` | Display name |
| `faction` | One of the five factions |
| `kind` | `character` / `location` / `item` / `event` / `story` |
| `rulesText` | Shown on the card; describe what the card mechanically does |
| `artId` | Seed for the generated art — usually the same as `id`. If you later add a real illustration, it's keyed by this |
| `flavorText` | Optional italic quote |

## Per-kind fields

**Character**
```json
{
  "kind": "character",
  "cost": { "total": 3 },
  "power": 3,
  "resilience": 4,
  "abilities": [],
  "tags": ["elf", "archer"],
  "evolvesFrom": "gandalf-the-grey"
}
```
`tags` influence the generated art (wizard hat, archer bow, crown for
king/lord/lady/prince/steward, spider legs, hood for wraith/traitor, size for
hobbit vs troll/ent…) and are free-form otherwise. `evolvesFrom` (optional)
makes this an evolution: it can only be played onto that base character.

**Location**
```json
{ "kind": "location", "resourceValue": 2, "enterEffect": { … } }
```
`resourceValue` is what tapping it yields. `enterEffect` (optional) fires
when it's played.

**Item**
```json
{
  "kind": "item",
  "cost": { "total": 1 },
  "attachTarget": "character",
  "statModifiers": { "power": 1, "resilience": 2 }
}
```

**Event** (fast — playable in response) and **Story** (slow — your main phase)
```json
{ "kind": "event", "cost": { "total": 1 }, "speed": "fast",  "effect": { … } }
{ "kind": "story", "cost": { "total": 2 }, "speed": "slow",  "effect": { … } }
```

## The effect vocabulary

Every effect is one of these shapes — the engine has exactly one tested
handler per shape, which is what keeps hand-authored JSON safe:

| Effect | Shape |
|---|---|
| Deal damage | `{ "type": "damage", "amount": 2, "target": T }` |
| Heal damage | `{ "type": "heal", "amount": 2, "target": T }` |
| Draw cards | `{ "type": "drawCards", "count": 2, "player": "self" \| "opponent" }` |
| Buff a stat | `{ "type": "buffStat", "stat": "power" \| "resilience", "amount": 2, "duration": "turn" \| "permanent", "target": T }` |
| Bounce to hand | `{ "type": "returnToHand", "target": T }` |
| Corrupt | `{ "type": "corruptionTick", "amount": 2, "player": "self" \| "opponent" }` |

`T` (target) should be `{ "scope": "opponentActive" }` or
`{ "scope": "ownActive" }`. (The schema also accepts `anyCharacter` /
`chosenInstance`, but the current UI never asks the player to pick a target
for an effect — stick to the two fixed scopes.) If the targeted slot is empty
when the effect resolves, the effect simply does nothing.

`"duration": "turn"` buffs wear off when the turn passes; `"permanent"` buffs
last while the character remains in play.

## Abilities (characters only)

```json
"abilities": [
  { "trigger": "onPlay",      "effect": { … } },
  { "trigger": "onAttack",    "effect": { … } },
  { "trigger": "onTurnStart", "effect": { … } },
  { "trigger": "activated", "cost": 2, "effect": { … } }
]
```

- `onPlay` — fires when the character enters play (including by evolution).
- `onAttack` — fires as its attack resolves.
- `onTurnStart` — fires at its controller's turn start.
- `activated` — a button appears on the card; the player pays `cost`
  resources to fire the effect, once per character per turn.

A card may have several abilities (see Gandalf the White).

## Rough costing guide

The existing set prices characters at roughly `cost ≈ (power + resilience) / 2`,
with a discount for drawbacks and a premium for abilities. Compare against
similar cards before inventing new price points, and lean on
`packages/ai/test/balance.test.ts` — if AI self-play games stop finishing
inside 35 turns, something is degenerate.

## Starter decks

`packages/card-data/src/decks.ts` defines the four starter decks: exactly 30
cards, ≤3 copies each (≤4 for locations), one faction plus neutrals.
`validate-cards` re-checks all of this.
