import { BIRD, DIFFICULTY_TIERS, PIPE, VIEWPORT } from "./constants";
import type { PipePair, RunRank } from "./types";

export function difficultyForScore(score: number) {
  let selected: (typeof DIFFICULTY_TIERS)[number] = DIFFICULTY_TIERS[0];
  for (const tier of DIFFICULTY_TIERS) {
    if (score < tier.minimumScore) break;
    selected = tier;
  }
  return selected;
}

export function rankForScore(score: number): RunRank {
  if (score >= 50) return "Platinum";
  if (score >= 30) return "Gold";
  if (score >= 15) return "Silver";
  if (score >= 5) return "Bronze";
  return "Unranked";
}

export function gapCenterFrom(
  randomValue: number,
  gap: number,
  previousCenter?: number,
  previousGap?: number,
): number {
  const minimum = gap / 2 + PIPE.safeCenterMargin;
  const maximum = VIEWPORT.height - minimum;
  const origin = previousCenter ?? VIEWPORT.height / 2;
  const shift = previousCenter === undefined
    ? PIPE.initialGapShift
    : Math.min(
        PIPE.maxGapShift,
        2 * (
          Math.min(gap, previousGap ?? gap) / 2 -
          BIRD.hitRadiusY -
          PIPE.gapCenterClearance
        ),
      );
  const localMinimum = Math.max(minimum, origin - shift);
  const localMaximum = Math.min(maximum, origin + shift);
  const random = Number.isFinite(randomValue) ? Math.max(0, Math.min(1, randomValue)) : 0.5;
  return localMinimum + random * (localMaximum - localMinimum);
}

export function awardPipeScore(pair: PipePair): boolean {
  if (pair.passed) return false;
  pair.passed = true;
  return true;
}
