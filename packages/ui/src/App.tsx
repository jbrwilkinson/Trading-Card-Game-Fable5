import { useState } from "react";
import { MainMenu } from "./app/MainMenu.js";
import { DeckBuilder } from "./app/DeckBuilder.js";
import { GameScreen } from "./game/GameScreen.js";
import type { GameSetup } from "./engine-adapter/useGameEngine.js";

type Screen = { kind: "menu" } | { kind: "builder" } | { kind: "game"; setup: GameSetup };

export function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "menu" });

  if (screen.kind === "builder") {
    return <DeckBuilder onDone={() => setScreen({ kind: "menu" })} />;
  }
  if (screen.kind === "game") {
    // key forces a fresh engine state when a new game starts
    return (
      <GameScreen key={screen.setup.seed} setup={screen.setup} onExit={() => setScreen({ kind: "menu" })} />
    );
  }
  return (
    <MainMenu
      onStart={(setup) => setScreen({ kind: "game", setup })}
      onOpenDeckBuilder={() => setScreen({ kind: "builder" })}
    />
  );
}
