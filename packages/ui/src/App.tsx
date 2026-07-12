import { useState } from "react";
import { MainMenu } from "./app/MainMenu.js";
import { GameScreen } from "./game/GameScreen.js";
import type { GameSetup } from "./engine-adapter/useGameEngine.js";

export function App() {
  const [setup, setSetup] = useState<GameSetup | null>(null);

  if (!setup) {
    return <MainMenu onStart={setSetup} />;
  }
  // key forces a fresh engine state when a new game starts
  return <GameScreen key={setup.seed} setup={setup} onExit={() => setSetup(null)} />;
}
