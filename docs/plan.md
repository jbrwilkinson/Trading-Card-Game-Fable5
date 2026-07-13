# LOTR-Themed Digital Trading Card Game

## Context

The user wants an original digital trading card game set in Middle-earth (Lord of the Rings / The Hobbit characters and locations), mechanically inspired by Pokémon TCG and Magic: The Gathering but not a clone of either. It needs to support two local play modes — versus a computer AI opponent, and two humans sharing one screen taking turns (hotseat) — no real-time networked multiplayer required. The project directory is currently empty, so this is a from-scratch build.

Decisions confirmed with the user:
- **Scope**: browser app, local play only (vs-AI and hotseat). No backend/networking needed.
- **Art**: AI-generated original illustrations evoking LOTR characters/scenes — real film stills, book covers, and Tolkien Estate artwork are copyrighted and won't be reproduced. This is being built as a personal, non-commercial project; if the user ever wants to distribute or monetize it, that changes the IP calculus and should be revisited.
- **MVP content**: medium card set, ~80–120 cards across a few factions (Fellowship/Free Peoples, Rohan, Gondor, Mordor/Shadow).
- **Tech stack**: delegated to me — TypeScript throughout, React for UI, a pure TS rules engine decoupled from the UI.

### Research summary (Pokémon TCG + MTG mechanics)

- **Pokémon TCG**: 60-card deck; one Active Pokémon + up to 5 on the Bench; attach one Energy card per turn; evolve Basic → Stage 1/2; Trainer cards (Items/Supporters/Stadiums, one Supporter per turn); win by taking 6 Prize cards (via knockouts) or opponent having no Pokémon left to play, or opponent decking out. ([pokemon.com rules](https://www.pokemon.com/us/pokemon-tcg/rules))
- **MTG**: 60+ card deck; lands tapped for mana of 5 colors, each with a strategic identity (W removal/life, U draw/counters, B removal/reanimation, R burn, G ramp/big creatures); spells/abilities resolve via **the stack** (LIFO, both players get priority to respond); permanents (creatures, artifacts, enchantments, lands, planeswalkers) stay on the battlefield, instants/sorceries go to the graveyard after resolving; life starts at 20, hits 0 = loss. ([MTG rules overview](https://magic.wizards.com/en/how-to-play), [Wikipedia](https://en.wikipedia.org/wiki/Magic:_The_Gathering_rules))

### Original ruleset merging both (recommended, tunable in `docs/rules.md`)

| Mechanic | Inspired by | Design |
|---|---|---|
| Resource | MTG lands | Play one **Location** card/turn (Shire, Rivendell, Rohan, Gondor, Moria, Mordor...), tap for resource points. Simpler than Pokémon's separate Energy-attachment card type. |
| Board | Pokémon Active/Bench | One **Active/Front** character in battle position + bench of up to 5 supporting characters. Attacks target the opponent's Active. |
| Progression | Pokémon Evolution + MTG Equipment/Auras | Characters can evolve (e.g. Frodo → Ring-bearer) and/or hold **Item/Artifact** cards (Sting, Andúril, Mithril shirt, the One Ring) for stat buffs/abilities. |
| Spell speed | MTG instants/sorceries + a small stack | **Event** cards (fast, playable in response, e.g. during combat) vs **Story** cards (slow, your main phase only). A shallow 1–2 deep stack — not full MTG priority-passing complexity. |
| Win condition | MTG life totals | **Hope** total (starts ~20), reduced by unblocked attacks on the Active character; 0 = loss. Also lose on empty-deck draw. A `corruptionTrack` field is reserved on player state for thematic Mordor/Ring cards, promotable to a second loss condition post-MVP once combat balance is validated. |
| AI opponent | — | Heuristic action scoring, not classic minimax — the opponent's hand is hidden and draws are random, so true minimax would either cheat (see the hand) or need expensive hand-sampling. MVP: score every legal action via the engine's own `legalActions()`, simulate it against a cloned real `GameState`, prefer the best-scoring outcome, with one shallow ply of "worst plausible response" using only public information. Upgradable later to determinized sampling (deal N plausible hidden hands, average) without changing the engine or AI's public API. |

## Technical Plan

### 1. Project structure — TypeScript monorepo (pnpm or npm workspaces)

```
Trading-Card-Game/
├── packages/
│   ├── engine/        # pure TS rules engine — zero UI/DOM deps
│   ├── card-data/      # ~80-120 cards as faction JSON, Zod-validated
│   ├── ai/             # heuristic AI opponent, depends only on engine
│   ├── ui/              # React app (Vite), depends on engine+card-data+ai
│   └── tools/            # CLI: validate-cards, art-manifest
├── docs/ (rules.md, card-authoring-guide.md, architecture.md)
└── art/ (source/ raw AI generations, cards/ processed webp, keyed by artId)
```

The engine physically cannot import React (separate package, no React dependency) — this is what keeps AI and human players symmetric callers of the same `engine.dispatch(action)` API, and keeps the rules testable without a browser.

### 2. Core data model (`packages/engine/src/types/card.ts`)

Discriminated union on `kind`: `CharacterCard | LocationCard | ItemCard | EventCard | StoryCard`, each with `id`, `name`, `faction`, `artId` (decoupled from `id`), `rulesText`. `Ability`/`Effect` are a **closed structured vocabulary** (`{type: "damage", amount, target}`, `{type: "drawCards", ...}`, etc.) — not free text or embedded code — so the ~80-120 cards stay authorable by the user in JSON, and each effect type gets exactly one engine handler, unit-tested once.

Cards stored as **one JSON file per faction per kind** (e.g. `packages/card-data/cards/gondor/characters.json`), validated by Zod schemas at load time and via a `validate-cards` CLI. `docs/card-authoring-guide.md` documents field meanings and the effect vocabulary for non-programmer editing.

### 3. Rules engine — reducer/state-machine pattern

Single immutable `GameState` (turn, phase, players, stack, log, seeded `rngSeed`), transitions via `dispatch(action) -> GameState`. Explicit phase state machine (`start → resource → main → combat → end`) gates legal actions via `legalActions()` — the single source of truth used by both human-input validation and AI move enumeration. `CardInstance` separates per-copy state (damage, tapped, attachments) from static card definition (looked up by `cardId`). Chosen over ECS (overkill for this entity shape) or mutable OOP (breaks cheap state-cloning needed for AI simulation and undo/replay).

### 4. AI opponent (`packages/ai/`)

`evaluate.ts` scores a `GameState` (Hope differential, board power/resilience, card advantage, tempo) with tunable weight presets (`easy`/`normal`/`hard`) in `difficulty.ts`. `select-action.ts` enumerates candidates via the engine's own `legalActions()`, simulates each via the real reducer against a cloned state, and picks the best-scoring action. Single entrypoint `chooseAction(state, playerId, difficulty)`, called by the UI's game loop exactly where it would otherwise wait for a human click.

### 5. UI (`packages/ui/`, React + Vite)

DOM/CSS-driven (not canvas) — this is a slot-based board game, not an action game, so DOM gives free accessibility and hit-testing; canvas/CSS-transforms reserved only for flourishes (card flips, attack impacts). Component tree: `GameScreen` → `TurnBanner`, `OpponentPanel`/`SelfPanel` (`ActiveSlot`, `Bench`, `LocationRow`), `Hand`, `StackTray`, `TargetingOverlay`, `GameLog`, `HotseatPassScreen`. A single shared `<CardFace>`/`<CardFrame>` component renders a card everywhere it appears. `HotseatPassScreen` is a full-screen "pass the device" overlay shown on active-player change in 2-human mode (skipped in vs-AI mode), preventing the incoming player from seeing the outgoing hand. `engine-adapter/useGameEngine()` wraps `useReducer(engineReducer, initialState)` and auto-invokes `ai.chooseAction` when it's the AI's turn — the one seam where React meets the pure engine.

### 6. Art pipeline (AI-generated, copyright-safe)

`art/cards/<faction>/<artId>.webp`, `artId` decoupled from card `id` (art can be reused/regenerated independently of rules identity). Standardize WebP, fixed aspect ratio, `@2x` variant. **Placeholder-art fallback per card kind** so engine/UI/AI development is never blocked on art — a `tools/art-manifest` CLI reports which cards still need real art, filled in incrementally. `docs/art-generation-notes.md` logs prompt style per faction for visual consistency across ~100 cards.

### 7. Sound

Howler.js wrapper (`packages/ui/src/audio/sound-manager.ts`) exposing `playSfx`/`playMusic`/`mute`. A `useSoundEffects()` hook watches `state.log` entries (draw, play, attack, win/lose) and triggers SFX reactively rather than scattering calls through components. MVP: one menu theme + one battle theme + core SFX; per-faction ambient themes are a later polish pass, not MVP-blocking.

### 8. Testing (most important part to get right)

Vitest across the monorepo. `packages/engine/test/` mirrors `src/` 1:1 — pure input-state/action → output-state assertions, no mocking. Tiers: unit (zone transitions, each `Effect` handler), reducer integration (stack resolution order, illegal-target rejection), scripted scenario/playthrough tests against small hand-authored fixture decks (not the real 100-card set, for determinism), and a fuzz/property tier (random legal-action sequences via the same `legalActions()` the AI uses, asserting invariants like conserved card counts and `bench.length <= 5`). Seeded RNG makes any playtest or bug reproducible. `ai` tests assert it never proposes an action `legalActions` rejects, and takes lethal attacks when available. UI tests are lighter-touch (targeting overlay correctness, hotseat hand-hiding) since correctness lives in engine tests.

### 9. Milestones (each independently playable/demoable)

1. **Engine core** — zones, phases, resource/location play, Active-only combat, Hope win condition, ~10-card fixture set, full game playable via a text/test harness. No UI yet.
2. **Full board UI + card pipeline** — real `packages/ui` wired to the engine, card-data/Zod pipeline live, placeholder art throughout, bench + items + Event/Story stack implemented, hotseat mode fully playable by two humans in-browser. No AI yet.
3. **AI opponent** — `packages/ai` wired into vs-AI mode, difficulty presets tuned via playtesting, legality-conformance tests passing.
4. **Full ~80–120 card set + real art/audio + polish** — remaining factions authored, real AI-generated art and Howler audio wired in, deck-builder screen, balance pass, UI polish.

### Critical files to get right first

- `packages/engine/src/state/` — canonical `GameState`/`PlayerState`/`CardInstance` shape, everything else depends on it.
- `packages/engine/src/rules/legalActions.ts` — shared source of truth for human input validation and AI move enumeration.
- `packages/card-data/src/schema/` — Zod contract between user-authored JSON and engine `Card` types.
- `packages/ai/src/select-action.ts` — the heuristic-scoring/shallow-lookahead implementation.
- `packages/ui/src/engine-adapter/` — the seam between React, the pure engine, and the AI.

## Verification

- After M1: run `packages/engine`'s Vitest suite; a scripted scenario test should play a full game through the reducer to a Hope-based win with zero UI code.
- After M2: `npm run dev` in `packages/ui`, play a full hotseat game in-browser end-to-end (draw, play a Location, play a Character, attack, win/lose), confirming the pass-device screen hides the other hand correctly.
- After M3: play a full vs-AI game in-browser; confirm the AI never attempts an illegal move (covered by `ai` package tests) and its choices are locally sensible.
- After M4: play through main menu → deck selection → full game with real art/audio and no placeholders remaining; run `validate-cards` to confirm the full ~80-120 card set passes schema/balance checks.

