import { useEffect, useMemo, useRef, useState } from "react";
import type { Action, PlayerId } from "@lotr-tcg/engine";
import { chooseAction, chooseResponse } from "@lotr-tcg/ai";
import { useGameEngine, type GameSetup } from "../engine-adapter/useGameEngine.js";
import { useSoundEffects } from "../audio/useSoundEffects.js";
import { PlayerPanel } from "./board/PlayerPanel.js";
import { Hand, type TargetingRequest } from "./hand/Hand.js";
import { PassScreen } from "./hotseat/PassScreen.js";

const AI_SEAT: PlayerId = "player2";
const AI_MOVE_DELAY_MS = 450;

const PHASE_LABELS: Record<string, string> = {
  start: "Start",
  resource: "Resource phase — play & tap locations",
  main: "Main phase — play characters, items & stories",
  combat: "Combat phase — attack with your active character",
  end: "End",
};

interface TargetingState {
  actionType: "playItem" | "evolveCharacter";
  instanceId: string;
  legalTargetIds: Set<string>;
}

interface GameScreenProps {
  setup: GameSetup;
  onExit: () => void;
}

export function GameScreen({ setup, onExit }: GameScreenProps) {
  const { state, dispatch, cardDb, actionsFor } = useGameEngine(setup);
  const isVsAI = setup.mode === "vsAI";
  const [targeting, setTargeting] = useState<TargetingState | null>(null);
  const [awaitingHandoff, setAwaitingHandoff] = useState(!isVsAI); // hotseat only: hide P1's opening hand at the deal
  const [seenPlayer, setSeenPlayer] = useState<PlayerId>(state.activePlayer);

  // In vsAI the human always views from the player1 seat and watches the AI's
  // turn play out; in hotseat the viewpoint follows the active player.
  const viewer: PlayerId = isVsAI ? "player1" : state.activePlayer;
  const isAiTurn = isVsAI && state.activePlayer === AI_SEAT;
  // During the AI's turn the human normally has no actions — EXCEPT when the
  // AI has an attack waiting on the stack: that's the human's response window
  // (flash in an event, or resolve the attack).
  const humanResponseWindow = isAiTurn && state.stack.length > 0;
  const viewerActions = useMemo(
    () => (isAiTurn && !humanResponseWindow ? [] : actionsFor(viewer)),
    [actionsFor, viewer, isAiTurn, humanResponseWindow]
  );
  const opponent: PlayerId = viewer === "player1" ? "player2" : "player1";
  const { muted, toggleMute } = useSoundEffects(state, isVsAI ? "player1" : null);

  // "start" and "end" phases have no decisions — advance through them automatically.
  // The ref guard makes this idempotent per game moment, since React StrictMode
  // double-invokes effects in dev and a second endPhase would skip a real phase.
  const lastAutoAdvance = useRef<string>("");
  useEffect(() => {
    const key = `${state.turn}-${state.activePlayer}-${state.phase}`;
    if (!state.winner && (state.phase === "start" || state.phase === "end") && lastAutoAdvance.current !== key) {
      lastAutoAdvance.current = key;
      dispatch({ type: "endPhase", player: state.activePlayer });
    }
  }, [state, dispatch]);

  // Hotseat: when the turn passes to the other player, blank the screen until they tap Ready.
  useEffect(() => {
    if (!isVsAI && state.activePlayer !== seenPlayer) {
      setSeenPlayer(state.activePlayer);
      setAwaitingHandoff(true);
      setTargeting(null);
    }
  }, [state.activePlayer, seenPlayer, isVsAI]);

  // vsAI: on the AI's turn, pick and dispatch one action per state change,
  // with a short delay so the human can follow along. The state-identity ref
  // guard keeps StrictMode's double-invoked effects from double-dispatching.
  // The AI pauses while its own attack sits on the stack — that pending entry
  // is the HUMAN's response window; play resumes once the human resolves it.
  const lastAiActedOn = useRef<unknown>(null);
  useEffect(() => {
    if (!isAiTurn || state.winner || state.phase === "start" || state.phase === "end") return;
    if (state.stack.length > 0) return; // human response window — see above
    if (lastAiActedOn.current === state) return;
    const timer = setTimeout(() => {
      if (lastAiActedOn.current === state) return;
      lastAiActedOn.current = state;
      const action = chooseAction(state, AI_SEAT, cardDb, setup.difficulty);
      if (action) dispatch(action);
    }, AI_MOVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, isAiTurn, cardDb, dispatch, setup.difficulty]);

  // vsAI: mirror image — when the HUMAN's attack (or event) is on the stack,
  // give the AI one chance to flash in a response event before the human
  // resolves. Null response means the AI holds, and the human's Resolve
  // button proceeds as normal.
  const lastAiRespondedTo = useRef<unknown>(null);
  useEffect(() => {
    if (!isVsAI || isAiTurn || state.winner || state.stack.length === 0) return;
    if (state.stack.some((entry) => entry.controller === AI_SEAT)) return; // already responded to this wave
    if (lastAiRespondedTo.current === state) return;
    const timer = setTimeout(() => {
      if (lastAiRespondedTo.current === state) return;
      lastAiRespondedTo.current = state;
      const response = chooseResponse(state, AI_SEAT, cardDb, setup.difficulty);
      if (response) dispatch(response);
    }, AI_MOVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, isVsAI, isAiTurn, cardDb, dispatch, setup.difficulty]);

  const onAction = (action: Action) => {
    setTargeting(null);
    dispatch(action);
  };

  const onPickTarget = (targetInstanceId: string) => {
    if (!targeting) return;
    dispatch({ type: targeting.actionType, player: viewer, instanceId: targeting.instanceId, targetInstanceId });
    setTargeting(null);
  };

  const onBeginTargeting = (request: TargetingRequest) => {
    setTargeting({
      actionType: request.actionType,
      instanceId: request.instanceId,
      legalTargetIds: new Set(request.legalTargetIds),
    });
  };

  const endPhaseAction = viewerActions.find((a) => a.type === "endPhase");
  const resolveAction = viewerActions.find((a) => a.type === "passPriority");

  if (!isVsAI && awaitingHandoff && !state.winner) {
    return <PassScreen player={viewer} onReady={() => setAwaitingHandoff(false)} />;
  }

  const turnLabel = isVsAI
    ? state.activePlayer === "player1"
      ? "Your turn"
      : "The Shadow moves…"
    : state.activePlayer === "player1"
      ? "Player 1"
      : "Player 2";

  return (
    <div className="game">
      <header className="game__banner">
        <span className="game__turn">
          Turn {state.turn} · {turnLabel}
        </span>
        <span className="game__phase">
          {humanResponseWindow
            ? "The enemy attacks! Respond with an event, or resolve the attack."
            : isAiTurn
              ? "The computer is taking its turn"
              : (PHASE_LABELS[state.phase] ?? state.phase)}
        </span>
        {targeting ? (
          <span className="game__targeting">
            {targeting.actionType === "playItem"
              ? "Choose a character for the item"
              : "Choose the character to evolve"}{" "}
            <button className="btn btn--small" onClick={() => setTargeting(null)}>
              Cancel
            </button>
          </span>
        ) : (
          <span className="game__controls">
            {resolveAction && (
              <button className="btn btn--resolve" onClick={() => onAction(resolveAction)}>
                Resolve ({state.stack.length} on stack)
              </button>
            )}
            {endPhaseAction && (
              <button className="btn" onClick={() => onAction(endPhaseAction)}>
                {state.phase === "combat" ? "End turn" : "Next phase"}
              </button>
            )}
          </span>
        )}
        <button className="btn btn--quiet" onClick={toggleMute} title={muted ? "Unmute sounds" : "Mute sounds"}>
          {muted ? "🔇" : "🔊"}
        </button>
        <button className="btn btn--quiet" onClick={onExit}>
          Quit
        </button>
      </header>

      <PlayerPanel
        player={state.players[opponent]}
        cardDb={cardDb}
        isViewer={false}
        viewerActions={viewerActions}
        onAction={onAction}
      />

      {state.stack.length > 0 && (
        <div className="stack-tray">
          {state.stack.map((entry, i) => (
            <span key={i} className="stack-tray__entry">
              {i + 1}. {entry.effect.type === "resolveAttack" ? "⚔ attack" : entry.effect.type} ({entry.controller})
            </span>
          ))}
          <span className="stack-tray__hint">resolves top-down (last in, first out)</span>
        </div>
      )}

      <PlayerPanel
        player={state.players[viewer]}
        cardDb={cardDb}
        isViewer={true}
        viewerActions={viewerActions}
        onAction={onAction}
        targetableIds={targeting?.legalTargetIds}
        onPickTarget={onPickTarget}
      />

      <Hand
        player={state.players[viewer]}
        cardDb={cardDb}
        viewerActions={targeting ? [] : viewerActions}
        onAction={onAction}
        onBeginTargeting={onBeginTargeting}
      />

      <details className="game-log">
        <summary>Game log ({state.log.length})</summary>
        <ul>
          {state.log
            .slice(-30)
            .reverse()
            .map((entry, i) => (
              <li key={i}>
                T{entry.turn} {entry.player}: {entry.message}
              </li>
            ))}
        </ul>
      </details>

      {state.winner && (
        <div className="overlay">
          <div className="overlay__box">
            <h2>
              {state.winner === "draw"
                ? "A draw — both sides fall together."
                : isVsAI
                  ? state.winner === "player1"
                    ? "Victory! The Free Peoples prevail."
                    : "Defeat — the Shadow covers Middle-earth."
                  : `${state.winner === "player1" ? "Player 1" : "Player 2"} wins!`}
            </h2>
            <button className="btn" onClick={onExit}>
              Back to menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
