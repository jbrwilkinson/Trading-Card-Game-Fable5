import type { GameState, PlayerId } from "../types/index.js";

const other = (p: PlayerId): PlayerId => (p === "player1" ? "player2" : "player1");

/**
 * Pure check run after every dispatch (single source of truth, not scattered
 * across effect handlers). A player loses if their Hope total hits 0 or they
 * are decked out (asked to draw with an empty deck).
 */
export function checkWinCondition(state: GameState): PlayerId | "draw" | null {
  const p1 = state.players.player1;
  const p2 = state.players.player2;

  const p1Lost = p1.hopeTotal <= 0 || p1.deckedOut;
  const p2Lost = p2.hopeTotal <= 0 || p2.deckedOut;

  if (p1Lost && p2Lost) return "draw";
  if (p1Lost) return other("player1");
  if (p2Lost) return other("player2");
  return null;
}
