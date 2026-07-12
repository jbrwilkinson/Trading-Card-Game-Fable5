import type { PlayerId } from "@lotr-tcg/engine";

interface PassScreenProps {
  player: PlayerId;
  onReady: () => void;
}

/**
 * Full-screen opaque overlay shown between hotseat turns (and at the initial
 * deal) so the incoming player never glimpses the other player's hand.
 */
export function PassScreen({ player, onReady }: PassScreenProps) {
  const label = player === "player1" ? "Player 1" : "Player 2";
  return (
    <div className="pass-screen">
      <h1>Pass to {label}</h1>
      <p>Make sure only {label} can see the screen, then continue.</p>
      <button className="btn btn--large" onClick={onReady} autoFocus>
        I'm {label} — show my hand
      </button>
    </div>
  );
}
