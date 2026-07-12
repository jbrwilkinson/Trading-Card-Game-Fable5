import type { Action, CardDatabase, GameState, PlayerId } from "../types/index.js";

function opponentOf(p: PlayerId): PlayerId {
  return p === "player1" ? "player2" : "player1";
}

/**
 * Single source of truth for "what can this player legally do right now" —
 * used both to validate human input and to enumerate the AI's candidate
 * moves (packages/ai depends on this, never duplicates the logic).
 */
export function legalActions(state: GameState, playerId: PlayerId, cardDb: CardDatabase): Action[] {
  if (state.winner) return [];
  const player = state.players[playerId];
  const actions: Action[] = [];

  // Events can be played by either player at any time there's an active game (fast speed),
  // as long as the mini-stack hasn't hit its max depth.
  if (state.stack.length < 2) {
    for (const card of player.hand) {
      const def = cardDb.getCard(card.cardId);
      if (def.kind === "event" && def.cost.total <= player.resourcePool) {
        actions.push({ type: "playEvent", player: playerId, instanceId: card.instanceId });
      }
    }
  }

  // Either player can resolve the top of a non-empty stack.
  if (state.stack.length > 0) {
    actions.push({ type: "passPriority", player: playerId });
  }

  if (playerId !== state.activePlayer) {
    return actions; // only the active player gets phase-gated actions below
  }

  switch (state.phase) {
    case "resource": {
      if (!player.hasPlayedLocationThisTurn) {
        for (const card of player.hand) {
          if (cardDb.getCard(card.cardId).kind === "location") {
            actions.push({ type: "playLocation", player: playerId, instanceId: card.instanceId });
          }
        }
      }
      for (const location of player.locationsInPlay) {
        if (!location.tapped) {
          actions.push({ type: "tapLocation", player: playerId, instanceId: location.instanceId });
        }
      }
      actions.push({ type: "endPhase", player: playerId });
      break;
    }
    case "main": {
      if (player.bench.length < 5) {
        for (const card of player.hand) {
          const def = cardDb.getCard(card.cardId);
          if (def.kind === "character" && def.cost.total <= player.resourcePool) {
            actions.push({ type: "playCharacterToBench", player: playerId, instanceId: card.instanceId });
          }
        }
      }
      if (!player.active && player.bench.length > 0) {
        for (const c of player.bench) {
          actions.push({ type: "moveToActive", player: playerId, instanceId: c.instanceId });
        }
      }
      for (const card of player.hand) {
        const def = cardDb.getCard(card.cardId);
        if (def.kind === "story" && def.cost.total <= player.resourcePool) {
          actions.push({ type: "playStory", player: playerId, instanceId: card.instanceId });
        }
        if (def.kind === "item" && def.cost.total <= player.resourcePool) {
          const targets = [player.active, ...player.bench].filter((c): c is NonNullable<typeof c> => c !== null);
          for (const target of targets) {
            actions.push({
              type: "playItem",
              player: playerId,
              instanceId: card.instanceId,
              targetInstanceId: target.instanceId,
            });
          }
        }
      }
      actions.push({ type: "endPhase", player: playerId });
      break;
    }
    case "combat": {
      // Attacking is legal whenever the active character is untapped; with no
      // defending active character the attack hits the opponent's Hope directly.
      if (player.active && !player.active.tapped) {
        actions.push({ type: "declareAttack", player: playerId, attackerInstanceId: player.active.instanceId });
      }
      actions.push({ type: "endPhase", player: playerId });
      break;
    }
    case "start":
    case "end": {
      actions.push({ type: "endPhase", player: playerId });
      break;
    }
  }

  return actions;
}
