import { useMemo, useState } from "react";
import { STARTER_DECKS } from "@lotr-tcg/card-data";
import type { Difficulty } from "@lotr-tcg/ai";
import type { GameMode, GameSetup } from "../engine-adapter/useGameEngine.js";
import { loadCustomDecks } from "./deck-storage.js";
import { loadSavedGame, type SavedGame } from "./game-storage.js";

interface MainMenuProps {
  onStart: (setup: GameSetup) => void;
  onResume: (saved: SavedGame) => void;
  onOpenDeckBuilder: () => void;
}

export function MainMenu({ onStart, onResume, onOpenDeckBuilder }: MainMenuProps) {
  const savedGame = useMemo(() => loadSavedGame(), []);
  const decks = useMemo(() => [...STARTER_DECKS, ...loadCustomDecks()], []);
  const [p1DeckId, setP1DeckId] = useState(decks[0]!.id);
  const [p2DeckId, setP2DeckId] = useState(decks[3]?.id ?? decks[0]!.id);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");

  // Fall back to the first deck if an id no longer resolves (e.g. a custom
  // deck was renamed/deleted in localStorage after being selected).
  const deckById = (id: string) => decks.find((d) => d.id === id) ?? decks[0]!;

  const start = (mode: GameMode) => {
    onStart({
      mode,
      difficulty,
      player1DeckCardIds: deckById(p1DeckId).cardIds,
      player2DeckCardIds: deckById(p2DeckId).cardIds,
      seed: `game-${Date.now()}`,
    });
  };

  return (
    <div className="menu">
      <h1 className="menu__title">Tales of Middle-earth</h1>
      <p className="menu__subtitle">A trading card game of the Free Peoples and the Shadow</p>

      {savedGame && (
        <button className="btn btn--large menu__resume" onClick={() => onResume(savedGame)}>
          Resume game — turn {savedGame.state.turn} ({savedGame.setup.mode === "vsAI" ? "vs computer" : "hotseat"})
        </button>
      )}

      <div className="menu__decks">
        {(["player1", "player2"] as const).map((slot) => {
          const value = slot === "player1" ? p1DeckId : p2DeckId;
          const setValue = slot === "player1" ? setP1DeckId : setP2DeckId;
          return (
            <label key={slot} className="menu__deck-pick">
              <span>{slot === "player1" ? "Your deck (Player 1)" : "Opponent deck (Player 2 / computer)"}</span>
              <select value={value} onChange={(e) => setValue(e.target.value)}>
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
              <small>{deckById(value).description}</small>
            </label>
          );
        })}
      </div>

      <div className="menu__modes">
        <div className="menu__mode">
          <button className="btn btn--large" onClick={() => start("vsAI")}>
            Play vs the computer
          </button>
          <label className="menu__difficulty">
            Difficulty{" "}
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>
        <div className="menu__mode">
          <button className="btn btn--large" onClick={() => start("hotseat")}>
            Two players, one screen
          </button>
          <small className="menu__note">Pass the device between turns</small>
        </div>
      </div>

      <button className="btn menu__builder-link" onClick={onOpenDeckBuilder}>
        Deck builder
      </button>
    </div>
  );
}
