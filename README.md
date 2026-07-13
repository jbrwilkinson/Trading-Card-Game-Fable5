# Trading Card Game

This is a wholly-AI generated 'Trading Card' game created by Claude Fable 5 with two steps:

1. [Prompt](./docs/prompt.txt) to create the plan.
2. Execute the [Plan](./docs/plan.md)

...almost one-shot.

I did this to try out Claude Fable 5 and burned through ~£36 of tokens.

It's not complete, but definitely the start of something.

Enjoy!

![Screensot](./docs/images/Screenshot2026-07-13.png)

## To Run

```bash
npm install
npm run dev
open http://localhost:5173
```

## Documentation

- [Game rules](./docs/rules.md) — how to play, all mechanics, all the numbers
- [Card authoring guide](./docs/card-authoring-guide.md) — add your own cards with plain JSON (no code), then `npm run validate-cards`
- [Architecture](./docs/architecture.md) — how the engine/AI/UI fit together
- `npm test` runs every package's suite; games autosave and can be resumed from the menu

