export interface EvalWeights {
  hopeDiff: number;
  boardPower: number;
  boardResilience: number;
  activePresence: number;
  cardAdvantage: number;
  locationEconomy: number;
  resourcesAvailable: number;
}

export interface DifficultyPreset {
  name: Difficulty;
  weights: EvalWeights;
  /** Pick uniformly among the top K scoring actions — 1 = always best, higher = sloppier play. */
  pickFromTop: number;
}

export type Difficulty = "easy" | "normal" | "hard";

/**
 * Tuning knobs live here so difficulty can be adjusted (or new presets added)
 * without touching the scoring shape in evaluate.ts. Easy plays sloppily by
 * sampling among its top four candidate moves and undervaluing the long game
 * (card advantage, economy); hard is the same scorer played greedily with
 * fuller weights.
 */
export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyPreset> = {
  easy: {
    name: "easy",
    weights: {
      hopeDiff: 3,
      boardPower: 2,
      boardResilience: 1,
      activePresence: 4,
      cardAdvantage: 0.5,
      locationEconomy: 1,
      resourcesAvailable: 0.25,
    },
    pickFromTop: 4,
  },
  normal: {
    name: "normal",
    weights: {
      hopeDiff: 4,
      boardPower: 2.5,
      boardResilience: 1.5,
      activePresence: 6,
      cardAdvantage: 1.5,
      locationEconomy: 2,
      resourcesAvailable: 0.5,
    },
    pickFromTop: 2,
  },
  hard: {
    name: "hard",
    weights: {
      hopeDiff: 5,
      boardPower: 3,
      boardResilience: 2,
      activePresence: 8,
      cardAdvantage: 2.5,
      locationEconomy: 3,
      resourcesAvailable: 0.5,
    },
    pickFromTop: 1,
  },
};
