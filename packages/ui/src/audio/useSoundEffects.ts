import { useEffect, useRef, useState } from "react";
import type { GameState } from "@lotr-tcg/engine";
import { isMuted, playSfx, setMuted } from "./sound-manager.js";

/**
 * One hook watches the engine's append-only log (plus winner/discard deltas)
 * and reacts with sounds — so audio triggering never gets scattered through
 * click handlers, and AI-driven actions make exactly the same noises as
 * human ones.
 */
function boardCharacterCount(state: GameState): number {
  const players = [state.players.player1, state.players.player2];
  return players.reduce((n, p) => n + (p.active ? 1 : 0) + p.bench.length, 0);
}

function permanentsInPlay(state: GameState): number {
  const players = [state.players.player1, state.players.player2];
  return players.reduce(
    (n, p) =>
      n +
      p.locationsInPlay.length +
      (p.active ? 1 + p.active.attachedItems.length : 0) +
      p.bench.reduce((b, c) => b + 1 + c.attachedItems.length, 0),
    0
  );
}

export function useSoundEffects(state: GameState, humanSeat: "player1" | "player2" | null) {
  const lastLogLength = useRef(state.log.length);
  const lastBoardCount = useRef(boardCharacterCount(state));
  const lastPermanents = useRef(permanentsInPlay(state));
  const announcedWinner = useRef(false);
  const [mutedState, setMutedState] = useState(isMuted());

  useEffect(() => {
    const newEntries = state.log.slice(lastLogLength.current);
    lastLogLength.current = state.log.length;
    for (const entry of newEntries) {
      if (entry.kind === "draw") playSfx("draw");
      else if (entry.kind === "attack") playSfx("attack");
      else if (entry.kind === "resolve") playSfx("resolve");
      else if (entry.kind === "phase") playSfx("turn");
    }

    // A character leaving the board is a knockout; something new arriving is a card being played.
    const boardCount = boardCharacterCount(state);
    if (boardCount < lastBoardCount.current) playSfx("knockout");
    lastBoardCount.current = boardCount;

    const permanents = permanentsInPlay(state);
    if (permanents > lastPermanents.current) playSfx("play");
    lastPermanents.current = permanents;

    if (state.winner && !announcedWinner.current) {
      announcedWinner.current = true;
      if (humanSeat && state.winner !== "draw") {
        playSfx(state.winner === humanSeat ? "victory" : "defeat");
      } else {
        playSfx("victory");
      }
    }
  }, [state, humanSeat]);

  const toggleMute = () => {
    setMuted(!isMuted());
    setMutedState(isMuted());
  };

  return { muted: mutedState, toggleMute };
}
