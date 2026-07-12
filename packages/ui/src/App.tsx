import { useState } from "react";
import type { GameState } from "@lotr-tcg/engine";
import { MainMenu } from "./app/MainMenu.js";
import { DeckBuilder } from "./app/DeckBuilder.js";
import { GameScreen } from "./game/GameScreen.js";
import type { GameSetup } from "./engine-adapter/useGameEngine.js";

type Screen =
  | { kind: "menu" }
  | { kind: "builder" }
  | { kind: "game"; setup: GameSetup; restoredState?: GameState };

export function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "menu" });

  if (screen.kind === "builder") {
    return <DeckBuilder onDone={() => setScreen({ kind: "menu" })} />;
  }
  if (screen.kind === "game") {
    // key forces a fresh engine state when a new game starts
    return (
      <GameScreen
        key={screen.setup.seed}
        setup={screen.setup}
        restoredState={screen.restoredState}
        onExit={() => setScreen({ kind: "menu" })}
      />
    );
  }
  return (
    <MainMenu
      onStart={(setup) => setScreen({ kind: "game", setup })}
      onResume={(saved) => setScreen({ kind: "game", setup: saved.setup, restoredState: saved.state })}
      onOpenDeckBuilder={() => setScreen({ kind: "builder" })}
    />
  );
}
