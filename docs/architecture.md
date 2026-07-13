# Architecture

A TypeScript monorepo (npm workspaces) with a strict dependency direction:

```
            ┌──────────────┐
            │    engine    │   pure rules, zero UI/DOM deps
            └──────┬───────┘
          ┌────────┼────────┐
   ┌──────▼─────┐  │  ┌─────▼──────┐
   │ card-data  │  │  │     ai     │   both depend only on engine
   └──────┬─────┘  │  └─────┬──────┘
          └────────┼────────┘
            ┌──────▼───────┐
            │      ui      │   React/Vite app, consumes all three
            └──────────────┘
```

`packages/tools` holds the `validate-cards` CLI (runs the card-data Zod
schema over every JSON file from Node via tsx).

## The engine: a pure reducer over serializable state

The entire game is one plain-JSON `GameState` object. The only way it changes
is `dispatch(state, action, cardDb) → newState` — a pure function that never
mutates its input. Three big features fall out of this one decision:

- **Testability** — every rule is `given state + action, expect state'`; no
  mocks anywhere. 48 engine tests run in ~30ms.
- **AI simulation** — the AI evaluates a candidate move by literally calling
  the real `dispatch` on the current state and scoring the result. No
  parallel "simulation" implementation to keep in sync.
- **Save/resume** — persisting a game is `JSON.stringify(state)`; the UI
  autosaves to localStorage on every change.

Key modules (all under `packages/engine/src/`):

- `types/` — `Card` discriminated union, the closed `Effect` vocabulary,
  `GameState`/`PlayerState`/`CardInstance`, and the `Action` union.
  `CardInstance` carries per-copy state (damage, tapped, attachments, buffs)
  and references its immutable definition by `cardId`.
- `rules/legalActions.ts` — **the single source of truth** for what a player
  may do right now. Human input validation, the AI's move enumeration, and
  `dispatch`'s legality check all use this one function, so the AI can never
  cheat and the UI can never desync.
- `rules/applyEffect.ts` — one handler per `Effect` variant. Cards are data;
  this closed vocabulary is why non-programmers can author them safely.
- `reducer/dispatch.ts` — applies an action, then centrally runs knockout
  cleanup and the win-condition check (never scattered in effect handlers).
- `stack/` — the mini-stack (depth 2). Attacks resolve through it, which is
  what creates defender response windows and the fizzle rule. `resolveAttack`
  is an engine-internal stack effect that card JSON cannot express.
- `shuffle/` — seeded RNG; identical seeds replay identical games, which the
  tests and any future replay/netplay feature rely on.

Phases (`start → resource → main → combat → end`) gate legality; `start` and
`end` have no decisions and are advanced automatically by the UI.

## The AI: greedy one-ply search over real dispatch

`packages/ai` scores each legal action by simulating it (plus full stack
resolution, so events aren't misread as card loss) and evaluating the
resulting state: Hope differential, board stats, active presence, card
advantage, location economy, resources, corruption pressure. Difficulty
presets tune the weights and how sloppily the top moves are sampled;
`chooseResponse` separately decides whether flashing a response event beats
letting the stack resolve. Known, deliberate limits: no opponent-hand
modelling and no multi-ply search — upgradable behind the same two-function
API (`chooseAction`, `chooseResponse`).

The conformance tests play entire self-play games asserting the AI never
produces an illegal action, and the balance suite requires every
starter-deck matchup to finish within 35 turns.

## The UI: a thin shell around the engine

`engine-adapter/useGameEngine` wraps React's `useReducer` directly around the
engine's `dispatch`. Everything else reads `legalActions` to decide what is
clickable — the UI contains no rules logic of its own. The AI plays by the
same seam: an effect watches the state and dispatches `chooseAction` on the
AI's turn (pausing while its own attack waits on the stack, because that
pending entry is the *human's* response window).

Notable pieces:

- **Generative card art** (`game/card/CardArt.tsx`) — deterministic SVG
  scenes seeded by `artId`: faction palettes, tag-driven character
  silhouettes, landscapes, item glyphs. Real illustrations can replace it
  per-card via the same `artId` key without touching anything else.
- **Synthesized audio** (`audio/`) — Web Audio oscillator/noise SFX driven by
  watching the engine log (so AI actions sound identical to human ones), and
  a generative per-faction ambient theme scheduled on the audio clock, immune
  to background-tab timer throttling.
- **Hotseat privacy** — a full-screen pass-device overlay between turns; the
  viewpoint follows the active player. In vs-AI mode the viewpoint is fixed
  and pass screens never appear.
- **Persistence** — autosave via `app/game-storage.ts`; custom decks from the
  deck builder live in localStorage alongside.

## Testing strategy

- Engine: unit tests per zone/effect/rule, reducer integration tests
  (stack LIFO, fizzle, evolution carry-over), and a scripted full-game
  scenario that plays start-to-finish through `dispatch` alone.
- AI: self-play conformance (zero illegal actions across full games at every
  difficulty), behavior checks (takes lethal, responds to attacks), and the
  35-turn balance smoke across all starter-deck matchups.
- card-data: schema validation plus deck integrity, mirrored by the
  standalone `validate-cards` CLI for authors.
- UI: verified end-to-end in the browser each milestone (scripted DOM
  drivers playing complete games); correctness lives in the engine tests.

## Deviations from the original plan

- Card art is generative SVG and audio is synthesized Web Audio, because no
  bitmap/mp3 assets could be produced in the build environment. Both keep the
  planned asset pipelines (artId keys, one swappable module) so real assets
  can drop in later.
- The `pendingTargets` field and `anyCharacter`/`chosenInstance` target
  scopes exist in the types but the current card set only uses fixed-scope
  targeting; the UI's choose-a-target flow is used for items and evolutions.
