import { BEST_SCORE_KEY } from "./constants";

export function readBestScore(): number {
  try {
    const stored = localStorage.getItem(BEST_SCORE_KEY);
    if (stored === null || !/^\d+$/.test(stored)) return 0;

    const score = Number(stored);
    return Number.isSafeInteger(score) ? score : 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score: number): void {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(score));
  } catch {
    // Best score remains available in memory when browser storage is disabled.
  }
}
