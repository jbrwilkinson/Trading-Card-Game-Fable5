import {
  getEffectivePower,
  getEffectiveResilience,
  type CardDatabase,
  type GameState,
  type PlayerId,
  type PlayerState,
} from "@lotr-tcg/engine";
import type { EvalWeights } from "./difficulty.js";

const other = (p: PlayerId): PlayerId => (p === "player1" ? "player2" : "player1");

function boardStats(cardDb: CardDatabase, player: PlayerState): { power: number; resilience: number } {
  const characters = [player.active, ...player.bench].filter((c): c is NonNullable<typeof c> => c !== null);
  let power = 0;
  let resilience = 0;
  for (const c of characters) {
    power += getEffectivePower(cardDb, c);
    resilience += Math.max(0, getEffectiveResilience(cardDb, c) - c.damageMarked);
  }
  return { power, resilience };
}

/**
 * Pure heuristic score of a game state from one player's perspective —
 * positive is good for that player. Terminal states dominate everything
 * else so lethal lines are always taken and losses always avoided.
 */
export function scoreState(state: GameState, forPlayer: PlayerId, cardDb: CardDatabase, w: EvalWeights): number {
  const opp = other(forPlayer);
  if (state.winner === forPlayer) return Number.POSITIVE_INFINITY;
  if (state.winner === opp) return Number.NEGATIVE_INFINITY;
  if (state.winner === "draw") return -1000;

  const self = state.players[forPlayer];
  const enemy = state.players[opp];
  const selfBoard = boardStats(cardDb, self);
  const enemyBoard = boardStats(cardDb, enemy);

  let score = 0;
  score += w.hopeDiff * (self.hopeTotal - enemy.hopeTotal);
  score += w.boardPower * (selfBoard.power - enemyBoard.power);
  score += w.boardResilience * (selfBoard.resilience - enemyBoard.resilience);
  score += w.activePresence * ((self.active ? 1 : 0) - (enemy.active ? 1 : 0));
  score += w.cardAdvantage * (self.hand.length - enemy.hand.length);
  score += w.locationEconomy * (self.locationsInPlay.length - enemy.locationsInPlay.length);
  score += w.resourcesAvailable * self.resourcePool;
  // Corruption climbs toward a loss at the limit, so the enemy's track is an asset and ours a liability.
  score += w.corruptionPressure * (enemy.corruptionTrack - self.corruptionTrack);
  return score;
}
