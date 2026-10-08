import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LEGACY_BEST_SCORE_KEY, PROFILE_KEY } from "../src/game/constants";
import { isPlayerProfile, loadProfile, saveProfile } from "../src/game/storage";
import type { PlayerProfile } from "../src/game/types";

function memoryStorage(seed: Record<string, string> = {}, throwOnGet = false, throwOnSet = false) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key: string) {
      if (throwOnGet) throw new Error("storage unavailable");
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (throwOnSet) throw new Error("storage unavailable");
      values.set(key, String(value));
    },
    removeItem(key: string) { values.delete(key); },
    clear() { values.clear(); },
    values,
  };
}

const validProfile: PlayerProfile = {
  schemaVersion: 2,
  bestScore: 42,
  totalRuns: 7,
  totalPipesPassed: 141,
  totalPlayTimeSeconds: 986,
  muted: true,
};

let storage: ReturnType<typeof memoryStorage>;

beforeEach(() => {
  storage = memoryStorage();
  vi.stubGlobal("localStorage", storage);
});

afterEach(() => vi.unstubAllGlobals());

describe("profile validation", () => {
  it("accepts only complete version 2 profiles with safe nonnegative integer counters", () => {
    expect(isPlayerProfile(validProfile)).toBe(true);
    expect(isPlayerProfile({ ...validProfile, schemaVersion: 1 })).toBe(false);
    expect(isPlayerProfile({ ...validProfile, bestScore: -1 })).toBe(false);
    expect(isPlayerProfile({ ...validProfile, totalRuns: 1.5 })).toBe(false);
    expect(isPlayerProfile({ ...validProfile, totalPipesPassed: Number.MAX_SAFE_INTEGER + 1 })).toBe(false);
    expect(isPlayerProfile({ ...validProfile, totalPlayTimeSeconds: Infinity })).toBe(false);
    expect(isPlayerProfile({ ...validProfile, muted: "false" })).toBe(false);
    expect(isPlayerProfile([])).toBe(false);
  });

  it("loads a valid v2 profile over legacy data", () => {
    storage.values.set(PROFILE_KEY, JSON.stringify(validProfile));
    storage.values.set(LEGACY_BEST_SCORE_KEY, "99");
    expect(loadProfile()).toEqual(validProfile);
  });

  it("migrates a valid v1 best score and leaves the legacy key intact", () => {
    storage.values.set(LEGACY_BEST_SCORE_KEY, "123");
    expect(loadProfile()).toEqual({ ...validProfile, bestScore: 123, totalRuns: 0, totalPipesPassed: 0, totalPlayTimeSeconds: 0, muted: false });
    expect(storage.values.get(LEGACY_BEST_SCORE_KEY)).toBe("123");
    expect(JSON.parse(storage.values.get(PROFILE_KEY) ?? "null").bestScore).toBe(123);
  });

  it("does not reapply migration after a valid v2 profile is written", () => {
    storage.values.set(LEGACY_BEST_SCORE_KEY, "123");
    loadProfile();
    storage.values.set(LEGACY_BEST_SCORE_KEY, "200");
    expect(loadProfile().bestScore).toBe(123);
  });

  it.each(["{", "null", "[]", JSON.stringify({ ...validProfile, totalRuns: -1 })])(
    "recovers from malformed v2 data (%s)", (invalid) => {
      storage.values.set(PROFILE_KEY, invalid);
      storage.values.set(LEGACY_BEST_SCORE_KEY, "9");
      expect(loadProfile().bestScore).toBe(9);
    },
  );

  it.each(["-1", "1.5", "Infinity", "9007199254740992", "bad"]) (
    "ignores invalid legacy score %s", (invalid) => {
      storage.values.set(LEGACY_BEST_SCORE_KEY, invalid);
      expect(loadProfile().bestScore).toBe(0);
    },
  );

  it("keeps storage errors from escaping", () => {
    vi.stubGlobal("localStorage", memoryStorage({}, true, true));
    expect(() => loadProfile()).not.toThrow();
    expect(() => saveProfile(validProfile)).not.toThrow();
  });
});
