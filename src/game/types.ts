import type { AssetName, AssetPack } from "./assets";

export type GameState =
  | "LOADING"
  | "READY"
  | "PLAYING"
  | "PAUSED"
  | "RESUME_COUNTDOWN"
  | "GAME_OVER";

export type RunRank = "Unranked" | "Bronze" | "Silver" | "Gold" | "Platinum";

export type PlayerProfile = {
  schemaVersion: 2;
  bestScore: number;
  totalRuns: number;
  totalPipesPassed: number;
  totalPlayTimeSeconds: number;
  muted: boolean;
};

export type Bird = {
  y: number;
  velocityY: number;
  rotation: number;
  animationTime: number;
};

export type PipePair = {
  x: number;
  gapCenter: number;
  gap: number;
  passed: boolean;
};

export type Airship = {
  asset: Extract<AssetName, "airship_01" | "airship_02">;
  x: number;
  y: number;
  scale: number;
  speed: number;
};

export type EffectKind = "steam" | "spark";

export type VisualEffect = {
  kind: EffectKind;
  x: number;
  y: number;
  age: number;
  duration: number;
  active: boolean;
};

export type PressedButton = "pause" | "play" | "restart" | "mute" | "stats" | "closeStats" | null;

export type RenderFrame = {
  state: GameState;
  assets: AssetPack | null;
  loadingProgress: number;
  loadingError: string | null;
  sceneTime: number;
  bird: Bird;
  pipes: PipePair[];
  airships: Airship[];
  effects: VisualEffect[];
  score: number;
  bestScore: number;
  profile: PlayerProfile;
  rank: RunRank;
  newBest: boolean;
  muted: boolean;
  statsOpen: boolean;
  countdownLabel: string | null;
  milestoneMessage: string | null;
  pressedButton: PressedButton;
};
