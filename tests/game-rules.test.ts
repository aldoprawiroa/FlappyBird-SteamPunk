import { describe, expect, it } from "vitest";
import { BIRD, DIFFICULTY_TIERS, PIPE, VIEWPORT } from "../src/game/constants";
import { awardPipeScore, difficultyForScore, gapCenterFrom, rankForScore } from "../src/game/rules";
import type { PipePair } from "../src/game/types";

describe("difficulty tiers", () => {
  it.each([
    [0, 0, 180, 240], [4, 0, 180, 240],
    [5, 1, 192, 234], [9, 1, 192, 234],
    [10, 2, 204, 228], [14, 2, 204, 228],
    [15, 3, 216, 222], [19, 3, 216, 222],
    [20, 4, 228, 216], [29, 4, 228, 216],
    [30, 5, 240, 210], [9999, 5, 240, 210],
  ])("score %i selects tier %i", (score, index, speed, gap) => {
    expect(difficultyForScore(score)).toMatchObject({ index, speed, gap });
  });
});

describe("run ranks", () => {
  it.each([
    [0, "Unranked"], [4, "Unranked"], [5, "Bronze"], [14, "Bronze"],
    [15, "Silver"], [29, "Silver"], [30, "Gold"], [49, "Gold"], [50, "Platinum"],
  ])("score %i ranks %s", (score, rank) => {
    expect(rankForScore(score)).toBe(rank);
  });
});

describe("pipe scoring and gap placement", () => {
  it("awards each pipe at most once", () => {
    const pipe: PipePair = { x: 0, gapCenter: 480, gap: 240, passed: false };
    expect(awardPipeScore(pipe)).toBe(true);
    expect(awardPipeScore(pipe)).toBe(false);
  });

  it("keeps actual tier transitions bounded with overlapping safe bird-center bands", () => {
    for (const tier of DIFFICULTY_TIERS) {
      const minimum = tier.gap / 2 + PIPE.safeCenterMargin;
      const maximum = VIEWPORT.height - minimum;
      expect(gapCenterFrom(0, tier.gap, minimum, tier.gap)).toBe(minimum);
      expect(gapCenterFrom(1, tier.gap, maximum, tier.gap)).toBe(maximum);
    }

    for (let index = 1; index < DIFFICULTY_TIERS.length; index += 1) {
      const previousGap = DIFFICULTY_TIERS[index - 1].gap;
      const nextGap = DIFFICULTY_TIERS[index].gap;
      const previousMinimum = previousGap / 2 + PIPE.safeCenterMargin;
      const previousMaximum = VIEWPORT.height - previousMinimum;
      const nextMinimum = nextGap / 2 + PIPE.safeCenterMargin;
      const nextMaximum = VIEWPORT.height - nextMinimum;
      const maxShift = Math.min(
        PIPE.maxGapShift,
        2 * (Math.min(previousGap, nextGap) / 2 - BIRD.hitRadiusY - PIPE.gapCenterClearance),
      );

      for (const previousCenter of [previousMinimum, VIEWPORT.height / 2, previousMaximum]) {
        for (const randomValue of [0, 1]) {
          const nextCenter = gapCenterFrom(randomValue, nextGap, previousCenter, previousGap);
          const overlap =
            Math.min(previousCenter + previousGap / 2 - BIRD.hitRadiusY, nextCenter + nextGap / 2 - BIRD.hitRadiusY) -
            Math.max(previousCenter - previousGap / 2 + BIRD.hitRadiusY, nextCenter - nextGap / 2 + BIRD.hitRadiusY);

          expect(nextCenter).toBeGreaterThanOrEqual(nextMinimum);
          expect(nextCenter).toBeLessThanOrEqual(nextMaximum);
          expect(Math.abs(nextCenter - previousCenter)).toBeLessThanOrEqual(maxShift);
          expect(overlap).toBeGreaterThanOrEqual(2 * PIPE.gapCenterClearance);
        }
      }
    }
  });

  it("clamps random inputs", () => {
    expect(gapCenterFrom(-10, 240)).toBe(gapCenterFrom(0, 240));
    expect(gapCenterFrom(10, 240)).toBe(gapCenterFrom(1, 240));
    expect(Number.isFinite(gapCenterFrom(Number.NaN, 240))).toBe(true);
  });
});
