import { loadAssets } from "./assets";
import type { AssetPack } from "./assets";
import { AIRSHIPS, BIRD, EFFECTS, PHYSICS, PIPE, UI, VIEWPORT } from "./constants";
import { AudioManager } from "./AudioManager";
import { InputManager } from "./InputManager";
import type { InputSignal } from "./InputManager";
import { Renderer } from "./Renderer";
import { awardPipeScore, difficultyForScore, gapCenterFrom, rankForScore } from "./rules";
import { loadProfile, saveProfile } from "./storage";
import type { Airship, Bird, GameState, PipePair, PressedButton, VisualEffect } from "./types";

export class Game {
  private readonly context: CanvasRenderingContext2D;
  private readonly renderer: Renderer;
  private readonly input: InputManager;
  private readonly resizeObserver: ResizeObserver;
  private state: GameState = "LOADING";
  private assets: AssetPack | null = null;
  private loadingProgress = 0;
  private loadingError: string | null = null;
  private sceneTime = 0;
  private bird: Bird = {
    y: BIRD.startY,
    velocityY: 0,
    rotation: 0,
    animationTime: 0,
  };
  private pipes: PipePair[] = [];
  private airships: Airship[] = [];
  private effects: VisualEffect[] = Array.from({ length: EFFECTS.poolSize }, () => ({
    kind: "steam",
    x: 0,
    y: 0,
    age: 0,
    duration: 1,
    active: false,
  }));
  private score = 0;
  private profile = loadProfile();
  private runElapsedSeconds = 0;
  private runPipesPassed = 0;
  private newBest = false;
  private milestoneRemaining = 0;
  private announcedTier = 0;
  private countdownRemaining = 0;
  private statsOpen = false;
  private readonly audio = new AudioManager();
  private pressedButton: PressedButton = null;
  private steamTimer = 3.2;
  private airshipTimer: number = AIRSHIPS.firstDelay;
  private previousFrame: number | null = null;
  private animationFrame = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("This browser could not create a 2D canvas context.");
    this.context = context;
    this.context.imageSmoothingEnabled = true;
    this.renderer = new Renderer(context);
    this.input = new InputManager(canvas, (signal) => this.handleInput(signal));
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    window.addEventListener("resize", this.resize);
    this.resize();
  }

  start(): void {
    this.setStatus("Loading 31 game artwork files.");
    this.animationFrame = requestAnimationFrame(this.tick);

    void loadAssets((loaded, total) => {
      this.loadingProgress = loaded / total;
    })
      .then((assets) => {
        this.assets = assets;
        this.runDevelopmentChecks();
        this.setState("READY");
      })
      .catch((error: unknown) => {
        this.loadingError = error instanceof Error ? error.message : String(error);
        this.setStatus("Artwork failed to load. " + this.loadingError);
        console.error(this.loadingError);
      });
  }

  destroy(): void {
    cancelAnimationFrame(this.animationFrame);
    this.input.destroy();
    this.audio.destroy();
    this.resizeObserver.disconnect();
    window.removeEventListener("resize", this.resize);
  }

  private readonly resize = (): void => {
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const screenScale =
      Math.min(bounds.width / VIEWPORT.width, bounds.height / VIEWPORT.height) *
      (window.devicePixelRatio || 1);
    const scaleUnits = Math.max(1, Math.round(screenScale * 60));
    const width = scaleUnits * 9;
    const height = scaleUnits * 16;

    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    const scale = scaleUnits / 60;
    this.context.setTransform(scale, 0, 0, scale, 0, 0);
    this.context.imageSmoothingEnabled = true;
  };

  private readonly tick = (timestamp: number): void => {
    const delta =
      this.previousFrame === null
        ? 0
        : Math.min(Math.max((timestamp - this.previousFrame) / 1000, 0), PHYSICS.maxDelta);
    this.previousFrame = timestamp;
    this.update(delta);
    this.renderer.draw({
      state: this.state,
      assets: this.assets,
      loadingProgress: this.loadingProgress,
      loadingError: this.loadingError,
      sceneTime: this.sceneTime,
      bird: this.bird,
      pipes: this.pipes,
      airships: this.airships,
      effects: this.effects,
      score: this.score,
      bestScore: this.profile.bestScore,
      profile: this.profile,
      rank: rankForScore(this.score),
      newBest: this.newBest,
      muted: this.profile.muted,
      statsOpen: this.statsOpen,
      countdownLabel: this.countdownLabel(),
      milestoneMessage: this.milestoneRemaining > 0 ? "SPEED UP" : null,
      pressedButton: this.pressedButton,
    });
    this.animationFrame = requestAnimationFrame(this.tick);
  };

  private update(delta: number): void {
    if (this.state === "LOADING" || this.state === "PAUSED") return;

    if (this.state === "RESUME_COUNTDOWN") {
      this.countdownRemaining = Math.max(0, this.countdownRemaining - delta);
      if (this.countdownRemaining === 0) this.setState("PLAYING");
      return;
    }

    if (this.state === "READY") {
      this.sceneTime += delta;
      this.bird.y = BIRD.startY + Math.sin(this.sceneTime * 2.5) * 9;
      this.updateAirships(delta);
      return;
    }

    if (this.state === "GAME_OVER") {
      this.updateEffects(delta);
      return;
    }

    this.sceneTime += delta;
    this.milestoneRemaining = Math.max(0, this.milestoneRemaining - delta);
    this.runElapsedSeconds += delta;
    this.updateBird(delta);
    this.updatePipes(delta);
    this.updateAirships(delta);

    if (this.hasCollision()) {
      this.endRun();
      return;
    }

    for (const pipe of this.pipes) {
      if (pipe.x < BIRD.x && awardPipeScore(pipe)) {
        this.score += 1;
        this.runPipesPassed += 1;
        this.audio.play("score", this.profile.muted);
        vibrate(12);

        if (this.score > this.profile.bestScore) {
          this.profile.bestScore = this.score;
          this.newBest = true;
          saveProfile(this.profile);
          this.audio.play("newBest", this.profile.muted);
        }

        const tier = difficultyForScore(this.score);
        if (tier.index > this.announcedTier) {
          this.announcedTier = tier.index;
          this.milestoneRemaining = 1.2;
          this.audio.play("milestone", this.profile.muted);
        }
      }
    }

    this.updateSteam(delta);
    this.updateEffects(delta);
  }

  private updateBird(delta: number): void {
    this.bird.velocityY = Math.min(
      this.bird.velocityY + PHYSICS.gravity * delta,
      PHYSICS.maxFallVelocity,
    );
    this.bird.y += this.bird.velocityY * delta;
    this.bird.animationTime += delta;

    const fallProgress =
      (this.bird.velocityY - PHYSICS.flapVelocity) /
      (PHYSICS.maxFallVelocity - PHYSICS.flapVelocity);
    this.bird.rotation =
      BIRD.minRotation +
      Math.max(0, Math.min(1, fallProgress)) * (BIRD.maxRotation - BIRD.minRotation);
  }

  private updatePipes(delta: number): void {
    const speed = difficultyForScore(this.score).speed;
    for (const pipe of this.pipes) pipe.x -= speed * delta;

    while (this.pipes.length > 0 && this.pipes[0].x < -PIPE.capWidth / 2) {
      this.pipes.shift();
    }

    this.ensurePipes();
  }

  private ensurePipes(): void {
    while (
      this.pipes.length < 2 ||
      this.pipes[this.pipes.length - 1].x < VIEWPORT.width + PIPE.spacing
    ) {
      const previous = this.pipes[this.pipes.length - 1];
      const x = previous ? previous.x + PIPE.spacing : VIEWPORT.width + PIPE.capWidth / 2;
      const gap = difficultyForScore(this.score).gap;
      this.pipes.push({
        x,
        gapCenter: gapCenterFrom(Math.random(), gap, previous?.gapCenter, previous?.gap),
        gap,
        passed: false,
      });
    }
  }

  private updateAirships(delta: number): void {
    for (let index = this.airships.length - 1; index >= 0; index -= 1) {
      const airship = this.airships[index];
      airship.x -= airship.speed * delta;
      if (airship.x + 256 * airship.scale / 2 < 0) this.airships.splice(index, 1);
    }

    this.airshipTimer -= delta;
    if (this.airshipTimer > 0) return;
    if (this.airships.length >= AIRSHIPS.maxCount) {
      this.airshipTimer = 1;
      return;
    }

    const scale = this.randomBetween(AIRSHIPS.minScale, AIRSHIPS.maxScale);
    this.airships.push({
      asset: Math.random() < 0.5 ? "airship_01" : "airship_02",
      x: VIEWPORT.width + (256 * scale) / 2,
      y: this.randomBetween(AIRSHIPS.minY, AIRSHIPS.maxY),
      scale,
      speed: this.randomBetween(AIRSHIPS.minSpeed, AIRSHIPS.maxSpeed),
    });
    this.airshipTimer = this.randomBetween(AIRSHIPS.minDelay, AIRSHIPS.maxDelay);
  }

  private updateSteam(delta: number): void {
    this.steamTimer -= delta;
    if (this.steamTimer > 0) return;

    const pipe = this.pipes.find((candidate) => candidate.x > 20 && candidate.x < VIEWPORT.width + 80);
    if (pipe) {
      this.spawnEffect(
        "steam",
        pipe.x + PIPE.capWidth * 0.43,
        pipe.gapCenter - pipe.gap / 2 - PIPE.capHeight * 0.38,
        EFFECTS.steamDuration,
      );
      this.steamTimer = this.randomBetween(EFFECTS.steamMinInterval, EFFECTS.steamMaxInterval);
    } else {
      this.steamTimer = 0.6;
    }
  }

  private updateEffects(delta: number): void {
    for (const effect of this.effects) {
      if (!effect.active) continue;
      effect.age += delta;
      if (effect.age >= effect.duration) effect.active = false;
    }
  }

  private hasCollision(): boolean {
    if (
      this.bird.y - BIRD.hitRadiusY < 0 ||
      this.bird.y + BIRD.hitRadiusY > VIEWPORT.height
    ) {
      return true;
    }

    for (const pipe of this.pipes) {
      const left = pipe.x - PIPE.collisionWidth / 2;
      const right = pipe.x + PIPE.collisionWidth / 2;
      const halfGap = pipe.gap / 2;
      const gapTop = pipe.gapCenter - halfGap;
      const gapBottom = pipe.gapCenter + halfGap;

      if (
        ellipseIntersectsRect(
          BIRD.x,
          this.bird.y,
          BIRD.hitRadiusX,
          BIRD.hitRadiusY,
          left,
          0,
          right,
          gapTop,
        ) ||
        ellipseIntersectsRect(
          BIRD.x,
          this.bird.y,
          BIRD.hitRadiusX,
          BIRD.hitRadiusY,
          left,
          gapBottom,
          right,
          VIEWPORT.height,
        )
      ) {
        return true;
      }
    }
    return false;
  }

  private endRun(): void {
    this.profile.totalRuns = Math.min(Number.MAX_SAFE_INTEGER, this.profile.totalRuns + 1);
    this.profile.totalPipesPassed = Math.min(
      Number.MAX_SAFE_INTEGER,
      this.profile.totalPipesPassed + this.runPipesPassed,
    );
    this.profile.totalPlayTimeSeconds = Math.min(
      Number.MAX_SAFE_INTEGER,
      this.profile.totalPlayTimeSeconds + Math.round(this.runElapsedSeconds),
    );
    saveProfile(this.profile);
    this.audio.play("collision", this.profile.muted);
    vibrate(35);
    this.setState("GAME_OVER");
    this.spawnEffect("spark", BIRD.x + 14, this.bird.y, EFFECTS.sparkDuration);
  }

  private spawnEffect(kind: "steam" | "spark", x: number, y: number, duration: number): void {
    const effect =
      this.effects.find((candidate) => !candidate.active) ??
      (kind === "spark" ? this.effects[0] : undefined);
    if (!effect) return;

    effect.kind = kind;
    effect.x = x;
    effect.y = y;
    effect.age = 0;
    effect.duration = duration;
    effect.active = true;
  }

  private handleInput(signal: InputSignal): void {
    if (signal.type === "pointerCancel") {
      this.pressedButton = null;
      return;
    }
    if (signal.type === "pointerUp") {
      const pressed = this.pressedButton;
      const releasedOnButton = pressed !== null && this.buttonAt(signal.x, signal.y) === pressed;
      this.pressedButton = null;
      if (releasedOnButton && pressed === "pause" && this.state === "PLAYING") {
        this.togglePause();
      } else if (releasedOnButton && pressed === "play" && this.state === "PAUSED") {
        this.togglePause();
      } else if (releasedOnButton && pressed === "restart" && this.state === "GAME_OVER") {
        this.resetRound();
      } else if (releasedOnButton && pressed === "mute") {
        this.toggleMute();
      } else if (releasedOnButton && pressed === "stats" && this.state === "READY") {
        this.statsOpen = true;
      } else if (releasedOnButton && pressed === "closeStats" && this.statsOpen) {
        this.statsOpen = false;
      }
      return;
    }
    if (this.state === "LOADING") return;

    if (signal.type === "action") {
      this.audio.activate(this.profile.muted);
      if (signal.action === "togglePause") {
        if (this.statsOpen) this.statsOpen = false;
        else this.togglePause();
      } else if (signal.action === "toggleStats") {
        if (this.state === "READY") this.statsOpen = !this.statsOpen;
      } else if (signal.action === "toggleMute") {
        this.toggleMute();
      } else if (!this.statsOpen) {
        this.flapOrRestart();
      }
      return;
    }

    this.audio.activate(this.profile.muted);
    this.pressedButton = this.buttonAt(signal.x, signal.y);
    if (this.state === "READY") {
      if (!this.statsOpen && this.pressedButton === null) {
        this.beginRun();
        this.flap();
      }
    } else if (this.state === "PLAYING") {
      if (this.pressedButton === null) this.flap();
    } else if (this.state === "GAME_OVER") {
      if (this.pressedButton === null) this.resetRound();
    }
  }

  private buttonAt(x: number, y: number): PressedButton {
    const muteY = this.state === "READY"
      ? this.statsOpen ? UI.mute.statsY : UI.mute.readyY
      : UI.mute.y;
    if (insideSquare(x, y, UI.mute.x, muteY, UI.mute.targetSize)) return "mute";
    if (this.state === "READY" && !this.statsOpen &&
        insideSquare(x, y, UI.stats.x, UI.stats.y, UI.stats.targetSize)) return "stats";
    if (this.state === "READY" && this.statsOpen &&
        insideSquare(x, y, UI.closeStats.x, UI.closeStats.y, UI.closeStats.targetSize)) return "closeStats";

    const control =
      this.state === "PLAYING"
        ? UI.pause
        : this.state === "PAUSED"
          ? UI.resume
          : this.state === "GAME_OVER"
            ? UI.restart
            : null;
    if (!control) return null;
    return insideSquare(x, y, control.x, control.y, control.targetSize)
      ? this.state === "PLAYING"
        ? "pause"
        : this.state === "PAUSED"
          ? "play"
          : "restart"
      : null;
  }

  private flapOrRestart(): void {
    if (this.state === "READY" && !this.statsOpen) {
      this.beginRun();
      this.flap();
    } else if (this.state === "PLAYING") {
      this.flap();
    } else if (this.state === "GAME_OVER") {
      this.resetRound();
    }
  }

  private beginRun(): void {
    this.runElapsedSeconds = 0;
    this.runPipesPassed = 0;
    this.newBest = false;
    this.milestoneRemaining = 0;
    this.announcedTier = 0;
    this.ensurePipes();
    this.setState("PLAYING");
  }

  private flap(): void {
    if (this.state !== "PLAYING") return;
    this.bird.velocityY = PHYSICS.flapVelocity;
    this.bird.animationTime = 0;
    this.audio.play("flap", this.profile.muted);
  }

  private togglePause(): void {
    if (this.state === "PLAYING") this.setState("PAUSED");
    else if (this.state === "PAUSED") {
      this.countdownRemaining = 3.5;
      this.setState("RESUME_COUNTDOWN");
    }
  }

  private toggleMute(): void {
    this.profile.muted = !this.profile.muted;
    saveProfile(this.profile);
    this.audio.activate(this.profile.muted);
  }

  private resetRound(): void {
    this.score = 0;
    this.pipes = [];
    this.bird.y = BIRD.startY;
    this.bird.velocityY = 0;
    this.bird.rotation = 0;
    this.bird.animationTime = 0;
    this.steamTimer = 3.2;
    this.runElapsedSeconds = 0;
    this.runPipesPassed = 0;
    this.newBest = false;
    this.milestoneRemaining = 0;
    this.announcedTier = 0;
    this.countdownRemaining = 0;
    this.statsOpen = false;
    for (const effect of this.effects) effect.active = false;
    this.setState("READY");
  }

  private setState(state: GameState): void {
    if (this.state === state) return;
    this.state = state;
    const messages: Record<GameState, string> = {
      LOADING: "Loading Clockwork Flight artwork.",
      READY: "Ready. Tap, click, Space, Arrow Up, or W to fly.",
      PLAYING: "Flying. Press P or Escape to pause.",
      PAUSED: "Paused. Press P, Escape, or the play button to resume.",
      RESUME_COUNTDOWN: "Resuming in 3, 2, 1, go.",
      GAME_OVER: "Game over. Tap, click, or press Space to return to ready.",
    };
    this.setStatus(messages[state]);
  }

  private setStatus(message: string): void {
    const status = document.querySelector<HTMLElement>("#game-status");
    if (status) status.textContent = message;
  }

  private randomBetween(minimum: number, maximum: number): number {
    return minimum + Math.random() * (maximum - minimum);
  }

  private countdownLabel(): string | null {
    if (this.state !== "RESUME_COUNTDOWN") return null;
    if (this.countdownRemaining > 2.5) return "3";
    if (this.countdownRemaining > 1.5) return "2";
    if (this.countdownRemaining > 0.5) return "1";
    return "GO";
  }

  private runDevelopmentChecks(): void {
    if (!import.meta.env.DEV) return;

    const gap = difficultyForScore(0).gap;
    const minimum = gap / 2 + PIPE.safeCenterMargin;
    const maximum = VIEWPORT.height - minimum;
    const firstLower = gapCenterFrom(0, gap);
    const firstUpper = gapCenterFrom(1, gap);
    const adjacentLower = gapCenterFrom(0, gap, minimum, gap);
    const adjacentUpper = gapCenterFrom(1, gap, minimum, gap);
    console.assert(
      firstLower >= minimum &&
        firstUpper <= maximum &&
        adjacentLower === minimum &&
        adjacentUpper <= minimum + PIPE.maxGapShift,
      "Pipe gap centers must stay within the safe placement range.",
    );

    const pair: PipePair = { x: 0, gapCenter: minimum, gap, passed: false };
    console.assert(awardPipeScore(pair), "A pipe pair should award its first pass.");
    console.assert(!awardPipeScore(pair), "A pipe pair should not award a second pass.");
  }
}

function insideSquare(x: number, y: number, centerX: number, centerY: number, size: number): boolean {
  const halfSize = size / 2;
  return Math.abs(x - centerX) <= halfSize && Math.abs(y - centerY) <= halfSize;
}

function vibrate(duration: number): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(duration);
    }
  } catch {
    // Haptics are optional and must not affect the run.
  }
}

function ellipseIntersectsRect(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
): boolean {
  const nearestX = Math.max(left, Math.min(centerX, right));
  const nearestY = Math.max(top, Math.min(centerY, bottom));
  const xDistance = (centerX - nearestX) / radiusX;
  const yDistance = (centerY - nearestY) / radiusY;
  return xDistance * xDistance + yDistance * yDistance <= 1;
}
