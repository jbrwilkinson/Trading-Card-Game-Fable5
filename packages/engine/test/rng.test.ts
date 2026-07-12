import { describe, expect, it } from "vitest";
import { createRng, shuffle } from "../src/shuffle/rng.js";

describe("seeded rng", () => {
  it("produces identical shuffle output for the same seed (reproducibility)", () => {
    const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8], createRng("abc"));
    const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8], createRng("abc"));
    expect(a).toEqual(b);
  });

  it("produces different output for different seeds (not just returning input order)", () => {
    const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8], createRng("abc"));
    const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8], createRng("xyz"));
    expect(a).not.toEqual(b);
  });

  it("shuffle is a permutation — same elements, same length", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, createRng("perm"));
    expect(out).toHaveLength(input.length);
    expect([...out].sort()).toEqual([...input].sort());
  });
});
