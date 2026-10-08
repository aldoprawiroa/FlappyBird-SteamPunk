export const VIEWPORT = {
  width: 540,
  height: 960,
} as const;

export const PHYSICS = {
  gravity: 1500,
  flapVelocity: -480,
  maxFallVelocity: 700,
  maxDelta: 0.04,
} as const;

export const BIRD = {
  x: VIEWPORT.width * 0.3,
  startY: VIEWPORT.height / 2,
  drawSize: 96,
  hitRadiusX: 26,
  hitRadiusY: 21,
  animationFps: 12,
  minRotation: -0.35,
  maxRotation: 1.22,
} as const;

const pipeScale = 120 / 320;

export const PIPE = {
  speed: 180,
  spacing: 320,
  gap: 240,
  safeCenterMargin: 120,
  initialGapShift: 25,
  maxGapShift: 170,
  capWidth: 120,
  capHeight: 192 * pipeScale,
  bodyWidth: 256 * pipeScale,
  bodyHeight: 512 * pipeScale,
  collisionWidth: 108,
} as const;

export const BACKGROUND_LAYERS = [
  { asset: "bg_city_far", speed: 0.1, opacity: 0.62 },
  { asset: "bg_city_mid", speed: 0.24, opacity: 0.76 },
  { asset: "bg_city_near", speed: 0.44, opacity: 0.9 },
] as const;

export const AIRSHIPS = {
  maxCount: 2,
  firstDelay: 1.6,
  minDelay: 5,
  maxDelay: 9,
  minScale: 0.28,
  maxScale: 0.38,
  minSpeed: 18,
  maxSpeed: 30,
  minY: 120,
  maxY: 760,
} as const;

export const EFFECTS = {
  poolSize: 4,
  steamDuration: 0.52,
  steamMinInterval: 2.4,
  steamMaxInterval: 4.4,
  sparkDuration: 0.32,
} as const;

export const UI = {
  pause: { x: 486, y: 68, visualSize: 62, targetSize: 86 },
  resume: { x: VIEWPORT.width / 2, y: 520, visualSize: 96, targetSize: 132 },
  restart: { x: VIEWPORT.width / 2, y: 710, visualSize: 100, targetSize: 132 },
} as const;

export const DEBUG_HITBOXES = false;
export const BEST_SCORE_KEY = "clockwork-flight-best-score";
