# Tales of Middle-earth — Game Rules

Canonical rules text. The engine in `packages/engine` implements exactly what
is described here; if the two ever disagree, one of them has a bug.

## Overview

Two players battle with 30-card decks. You win by any of:

1. **Hope** — reduce your opponent's Hope (✨, starts at **20**) to 0.
2. **Deck-out** — your opponent must draw a card and has none left.
3. **Corruption** — your opponent's corruption track (☠) reaches **10**.

If both players would lose at the same moment, the game is a draw.

## The cards

| Kind | What it does |
|---|---|
| **Character** | Fights. Has a resource cost, **power** (⚔ damage dealt) and **resilience** (❤ damage endured). May carry abilities. |
| **Location** | Your resource engine. Play one per turn; tap each for its resource value. Some have an arrival effect. |
| **Item** | Attaches to one of your characters for stat bonuses (e.g. Sting: +1 power). |
| **Event** | *Fast.* Playable any time you could respond — including during your opponent's attack. Goes on the stack. |
| **Story** | *Slow.* Main phase of your own turn only. Resolves immediately. |

Some characters are **evolutions** (e.g. *Gandalf the White* evolves from
*Gandalf the Grey*). They cannot be played directly from hand — see
[Evolution](#evolution).

## Setup

Each player shuffles their 30-card deck and draws **7** cards. Player 1 takes
the first turn and does **not** draw a card on that first turn.

## Board layout

Each player has:

- **Active slot** — at most one character; the only one that attacks or is attacked.
- **Bench** — up to **5** supporting characters.
- **Locations row** — locations in play, tapped or untapped.
- Deck, hand, and discard pile.

## Turn structure

Phases run: **start → resource → main → combat → end**.

**Start** (automatic): untap everything, refresh once-per-turn allowances,
draw a card (except the very first turn), then any *at the start of your
turn* abilities fire (active character first, then bench, in order).

**Resource phase**: you may play **one** location this turn, and tap any of
your untapped locations to add their resource value to your pool. Unspent
resources persist until your next turn's start (you can leave resources open
to pay for response events on your opponent's turn).

**Main phase**: spend resources to
- play characters from hand to your bench (never directly to the active slot);
- move a bench character to the active slot if it is empty;
- **retreat**: once per turn, swap your active character with a bench
  character of your choice;
- attach items to your characters;
- **evolve** a character (see below);
- play *Story* cards;
- use **activated abilities** (see below).

**Combat phase**: if your active character is untapped, it may attack (see
[Combat](#combat-and-the-stack)). Attacking taps it.

**End** (automatic): *until end of turn* effects wear off as the turn passes
to your opponent.

## Combat and the stack

Declaring an attack does not deal damage immediately — the attack goes on
**the stack**, and the defender gets a **response window** to play one Event
before it resolves. The stack resolves last-in-first-out, so the response
lands first.

When the attack resolves:

- Damage equals the attacker's current **effective power** (base + items +
  buffs).
- If the defender has an active character, the damage is marked on it **and**
  subtracted from the defender's Hope.
- If the defender has **no** active character, the damage goes straight to Hope.
- The attacker becomes tapped.
- Any *when this character attacks* abilities fire.

**Fizzling:** if the response removes the attacker from the battlefield
(killed, bounced), the attack resolves into nothing — no damage, no Hope loss.

A character whose marked damage reaches its effective resilience is knocked
out and goes to its owner's discard pile.

The stack holds at most **2** entries: one attack or event, plus one response.

## Evolution

An evolution card lists the character it evolves from. During your main
phase, pay its cost to play it **onto** a matching character you control
(active or bench). The character keeps its position, damage, items, and
buffs; its stats and abilities become the new form's, and any *when played*
ability of the new form fires. Evolution is permanent — there is no way to
revert to the base form.

## Abilities

| Trigger | When it fires |
|---|---|
| *When played* (`onPlay`) | As the character enters play (including via evolution). Locations' arrival effects work the same way. |
| *When this character attacks* (`onAttack`) | As its attack resolves. |
| *At the start of your turn* (`onTurnStart`) | During its controller's start phase. |
| **Activated** | You choose to use it during your main phase: pay the listed resource cost. Each character can use an activated ability once per turn. |

## Corruption

Some cards (mostly of the Shadow) raise a player's corruption track — usually
the opponent's, though bearing the One Ring can raise your own. Corruption
never goes down. At **10**, that player falls to the Shadow and loses.

## Deck construction

- Exactly **30** cards.
- At most **3** copies of any card — except locations, at most **4**.
- A deck draws on one faction plus **neutral** cards (enforced by the in-game
  deck builder; the four starter decks follow the same rule).

## Reduced-to-practice numbers

| Constant | Value |
|---|---|
| Starting Hope | 20 |
| Starting hand | 7 |
| Deck size | 30 |
| Bench limit | 5 |
| Corruption limit | 10 |
| Stack depth | 2 |
| Locations per turn | 1 |
| Retreats per turn | 1 |
