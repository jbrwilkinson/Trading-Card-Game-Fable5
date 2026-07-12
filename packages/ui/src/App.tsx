import { useState } from "react";
import { createInitialState, type GameState } from "@lotr-tcg/engine";

/**
 * Placeholder entry point — proves the dev server is real and the engine
 * package wires into the UI correctly. The actual board UI (hand, bench,
 * targeting, hotseat pass-screen, etc.) is milestone M2 work, not this.
 */
export function App() {
  const [state] = useState<GameState>(() => createInitialState(["shire"], ["shire"], "dev-smoke-test"));

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>LOTR TCG</h1>
      <p>Dev server is running. Engine package is wired in correctly.</p>
      <p>
        Turn {state.turn} — active player: {state.activePlayer} — phase: {state.phase}
      </p>
      <p style={{ color: "#666" }}>The real board UI (hand, bench, targeting, hotseat mode) is milestone M2.</p>
    </main>
  );
}
