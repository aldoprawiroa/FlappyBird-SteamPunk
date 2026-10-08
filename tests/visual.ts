import { loadAssets } from "../src/game/assets";
import { Renderer } from "../src/game/Renderer";
import { rankForScore } from "../src/game/rules";
import type { GameState, PlayerProfile, RenderFrame } from "../src/game/types";

const profile: PlayerProfile = {
  schemaVersion: 2,
  bestScore: 9999,
  totalRuns: 48,
  totalPipesPassed: 672,
  totalPlayTimeSeconds: 3725,
  muted: false,
};

const canvasElement = document.querySelector<HTMLCanvasElement>("#preview");
const selectorElement = document.querySelector<HTMLSelectElement>("#fixture");
const controls = document.querySelector<HTMLElement>("#controls");
const hideControls = document.querySelector<HTMLButtonElement>("#hide-controls");
if (!canvasElement || !selectorElement || !controls || !hideControls) {
  throw new Error("The visual fixture page is incomplete.");
}
const canvas = canvasElement;
const selector = selectorElement;

const cases: Array<{ label: string; state: GameState; score: number; bestScore: number; newBest?: boolean; statsOpen?: boolean; countdownLabel?: string; milestoneMessage?: string }> = [
  ...[0, 1, 9, 10, 99, 100, 999, 9999].map((score) => ({
    label: `GAME_OVER · SCORE ${score} · BEST ${score}`,
    state: "GAME_OVER" as const,
    score,
    bestScore: score,
  })),
  { label: "GAME_OVER · SCORE 9 · BEST 9999", state: "GAME_OVER", score: 9, bestScore: 9999 },
  ...[5, 15, 30, 50].map((score) => ({
    label: `GAME_OVER · ${rankForScore(score)} · NEW BEST`,
    state: "GAME_OVER" as const,
    score,
    bestScore: score,
    newBest: true,
  })),
  { label: "READY · STATS OPEN", state: "READY", score: 0, bestScore: profile.bestScore, statsOpen: true },
  { label: "RESUME COUNTDOWN · 3", state: "RESUME_COUNTDOWN", score: 12, bestScore: profile.bestScore, countdownLabel: "3" },
  { label: "RESUME COUNTDOWN · GO", state: "RESUME_COUNTDOWN", score: 12, bestScore: profile.bestScore, countdownLabel: "GO" },
  { label: "PLAYING · SPEED UP", state: "PLAYING", score: 15, bestScore: profile.bestScore, milestoneMessage: "SPEED UP" },
];

for (const [index, item] of cases.entries()) {
  const option = document.createElement("option");
  option.value = String(index);
  option.textContent = item.label;
  selector.append(option);
}

const assets = await loadAssets(() => undefined);
const renderer = new Renderer(canvas.getContext("2d")!);

function renderSelected(): void {
  const item = cases[Number(selector.value)];
  const frame: RenderFrame = {
    state: item.state,
    assets,
    loadingProgress: 1,
    loadingError: null,
    sceneTime: 0,
    bird: { y: 480, velocityY: 0, rotation: 0, animationTime: 0 },
    pipes: [],
    airships: [],
    effects: [],
    score: item.score,
    bestScore: item.bestScore,
    profile,
    rank: rankForScore(item.score),
    newBest: item.newBest ?? false,
    muted: profile.muted,
    statsOpen: item.statsOpen ?? false,
    countdownLabel: item.countdownLabel ?? null,
    milestoneMessage: item.milestoneMessage ?? null,
    pressedButton: null,
  };
  renderer.draw(frame);
}

selector.addEventListener("change", renderSelected);
hideControls.addEventListener("click", () => { controls.hidden = true; });
renderSelected();
