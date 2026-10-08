import { LEGACY_BEST_SCORE_KEY, PROFILE_KEY } from "./constants";
import type { PlayerProfile } from "./types";

function defaultProfile(bestScore = 0): PlayerProfile {
  return {
    schemaVersion: 2,
    bestScore,
    totalRuns: 0,
    totalPipesPassed: 0,
    totalPlayTimeSeconds: 0,
    muted: false,
  };
}

export function isPlayerProfile(value: unknown): value is PlayerProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const profile = value as Record<string, unknown>;
  return profile.schemaVersion === 2 &&
    Number.isSafeInteger(profile.bestScore) && (profile.bestScore as number) >= 0 &&
    Number.isSafeInteger(profile.totalRuns) && (profile.totalRuns as number) >= 0 &&
    Number.isSafeInteger(profile.totalPipesPassed) && (profile.totalPipesPassed as number) >= 0 &&
    Number.isSafeInteger(profile.totalPlayTimeSeconds) && (profile.totalPlayTimeSeconds as number) >= 0 &&
    typeof profile.muted === "boolean";
}

function readLegacyBestScore(): number {
  try {
    const stored = localStorage.getItem(LEGACY_BEST_SCORE_KEY);
    if (stored === null || !/^\d+$/.test(stored)) return 0;
    const score = Number(stored);
    return Number.isSafeInteger(score) ? score : 0;
  } catch {
    return 0;
  }
}

export function loadProfile(): PlayerProfile {
  let stored: string | null;
  try {
    stored = localStorage.getItem(PROFILE_KEY);
  } catch {
    return defaultProfile();
  }

  if (stored !== null) {
    try {
      const parsed: unknown = JSON.parse(stored);
      if (isPlayerProfile(parsed)) return parsed;
    } catch {
      // Invalid profile data is replaced from the legacy score or defaults.
    }
  }

  const migrated = defaultProfile(readLegacyBestScore());
  saveProfile(migrated);
  return migrated;
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // The in-memory profile remains usable when browser storage is disabled.
  }
}
