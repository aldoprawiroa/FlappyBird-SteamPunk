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

export const DIFFICULTY_TIERS = [
  { index: 0, minimumScore: 0, speed: 180, gap: 240 },
  { index: 1, minimumScore: 5, speed: 192, gap: 234 },
  { index: 2, minimumScore: 10, speed: 204, gap: 228 },
  { index: 3, minimumScore: 15, speed: 216, gap: 222 },
  { index: 4, minimumScore: 20, speed: 228, gap: 216 },
  { index: 5, minimumScore: 30, speed: 240, gap: 210 },
] as const;

export const PIPE = {
  baseSpeed: DIFFICULTY_TIERS[0].speed,
  spacing: 320,
  safeCenterMargin: 120,
  initialGapShift: 25,
  maxGapShift: 170,
  gapCenterClearance: 8,
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
  restart: { x: VIEWPORT.width / 2, y: 720, visualSize: 100, targetSize: 132 },
  mute: { x: 54, y: 68, readyY: 278, statsY: 780, visualWidth: 116, visualHeight: 48, targetSize: 116 },
  stats: { x: VIEWPORT.width / 2, y: 822, visualWidth: 140, visualHeight: 50, targetSize: 156 },
  closeStats: { x: 464, y: 274, visualSize: 38, targetSize: 64 },
} as const;

export const DEBUG_HITBOXES = false;
export const LEGACY_BEST_SCORE_KEY = "clockwork-flight-best-score";
export const PROFILE_KEY = "clockwork-flight-profile-v2";
