import type { AssetName, AssetPack } from "./assets";

export type GameState = "LOADING" | "READY" | "PLAYING" | "PAUSED" | "GAME_OVER";

export type Bird = {
  y: number;
  velocityY: number;
  rotation: number;
  animationTime: number;
};

export type PipePair = {
  x: number;
  gapCenter: number;
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

export type PressedButton = "pause" | "play" | "restart" | null;

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
  pressedButton: PressedButton;
};
