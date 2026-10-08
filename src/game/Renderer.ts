import { BACKGROUND_LAYERS, BIRD, DEBUG_HITBOXES, PIPE, UI, VIEWPORT } from "./constants";
import { SPARK_FRAMES, STEAM_FRAMES } from "./assets";
import type { AssetPack } from "./assets";
import { rankForScore } from "./rules";
import type { EffectKind, PipePair, RenderFrame } from "./types";

const FLAP_FRAMES = ["bird_flap_up", "bird_flap_mid", "bird_flap_down", "bird_flap_mid"] as const;
const FONT_STACK = 'Georgia, "Times New Roman", serif';

export class Renderer {
  private readonly statFitCache = new Map<string, { labelSize: number; valueSize: number; labelHeight: number; valueHeight: number; gap: number }>();

  constructor(private readonly context: CanvasRenderingContext2D) {}

  draw(frame: RenderFrame): void {
    const ctx = this.context;
    ctx.clearRect(0, 0, VIEWPORT.width, VIEWPORT.height);

    if (!frame.assets) {
      this.drawLoading(frame.loadingProgress, frame.loadingError);
      return;
    }

    const assets = frame.assets;
    this.drawBackground(assets, frame.sceneTime);
    if (frame.milestoneMessage && frame.state === "PLAYING") {
      this.drawMilestone(frame.milestoneMessage);
    }
    this.drawAirships(assets, frame.airships);
    this.drawPipes(assets, frame.pipes);
    this.drawEffects(assets, frame.effects, "steam");
    this.drawBird(frame, assets);
    this.drawEffects(assets, frame.effects, "spark");

    if (frame.state === "READY") {
      this.drawReady(assets, frame);
      if (frame.statsOpen) this.drawStats(frame);
    }
    if (frame.state === "PLAYING" || frame.state === "PAUSED" || frame.state === "RESUME_COUNTDOWN") {
      this.drawScoreHud(assets, frame.score);
    }
    if (frame.state === "PLAYING" || frame.state === "PAUSED") {
      this.drawPauseButton(assets, frame.pressedButton === "pause");
    }
    if (frame.state === "PAUSED") this.drawPaused(assets, frame.pressedButton === "play");
    if (frame.state === "RESUME_COUNTDOWN") this.drawResumeCountdown(frame.countdownLabel ?? "3");
    if (frame.state === "GAME_OVER") this.drawGameOver(assets, frame);
    if (frame.state !== "LOADING") this.drawMuteButton(frame);

    if (DEBUG_HITBOXES) this.drawHitboxes(frame.pipes, frame.bird.y);
  }

  private drawLoading(progress: number, error: string | null): void {
    const ctx = this.context;
    ctx.fillStyle = "#171512";
    ctx.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    this.drawText("CLOCKWORK FLIGHT", 270, 392, 34, "#e4b665");

    if (error) {
      this.drawText("ARTWORK COULD NOT BE LOADED", 270, 472, 19, "#f0d7aa");
      this.drawText(error, 270, 514, 15, "#f0d7aa", 430);
      this.drawText("Check the asset file, then reload this page.", 270, 562, 15, "#c9bba4");
      return;
    }

    this.drawText("Preparing the flight deck", 270, 470, 18, "#e7d7bc");
    ctx.fillStyle = "#463a2b";
    ctx.fillRect(100, 505, 340, 8);
    ctx.fillStyle = "#c08c48";
    ctx.fillRect(100, 505, 340 * progress, 8);
  }

  private drawBackground(assets: AssetPack, sceneTime: number): void {
    const ctx = this.context;
    ctx.drawImage(assets.bg_sky, 0, 0, VIEWPORT.width, VIEWPORT.height);

    for (const layer of BACKGROUND_LAYERS) {
      const offset = (sceneTime * PIPE.baseSpeed * layer.speed) % VIEWPORT.width;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(assets[layer.asset], -offset, 0, VIEWPORT.width, VIEWPORT.height);
      ctx.drawImage(
        assets[layer.asset],
        VIEWPORT.width - offset,
        0,
        VIEWPORT.width,
        VIEWPORT.height,
      );
      ctx.restore();
    }
  }

  private drawAirships(
    assets: AssetPack,
    airships: RenderFrame["airships"],
  ): void {
    const ctx = this.context;
    for (const airship of airships) {
      const width = 512 * airship.scale;
      const height = 256 * airship.scale;
      ctx.globalAlpha = 0.86;
      ctx.drawImage(assets[airship.asset], airship.x - width / 2, airship.y - height / 2, width, height);
    }
    ctx.globalAlpha = 1;
  }

  private drawPipes(assets: AssetPack, pipes: PipePair[]): void {
    const ctx = this.context;
    const bodyX = -PIPE.bodyWidth / 2;
    const capX = -PIPE.capWidth / 2;

    for (const pipe of pipes) {
      const halfGap = pipe.gap / 2;
      const gapTop = pipe.gapCenter - halfGap;
      const gapBottom = pipe.gapCenter + halfGap;
      const upperCapY = gapTop - PIPE.capHeight;

      ctx.save();
      ctx.translate(pipe.x, 0);
      for (
        let y = upperCapY - PIPE.bodyHeight;
        y + PIPE.bodyHeight > 0;
        y -= PIPE.bodyHeight
      ) {
        ctx.drawImage(assets.pipe_body, bodyX, y, PIPE.bodyWidth, PIPE.bodyHeight);
      }
      ctx.drawImage(assets.pipe_cap, capX, upperCapY, PIPE.capWidth, PIPE.capHeight);
      ctx.restore();

      ctx.save();
      ctx.translate(pipe.x, 0);
      ctx.translate(0, gapBottom + PIPE.capHeight);
      ctx.scale(1, -1);
      ctx.drawImage(assets.pipe_cap, capX, 0, PIPE.capWidth, PIPE.capHeight);
      ctx.restore();

      for (
        let y = gapBottom + PIPE.capHeight;
        y < VIEWPORT.height;
        y += PIPE.bodyHeight
      ) {
        ctx.drawImage(assets.pipe_body, pipe.x + bodyX, y, PIPE.bodyWidth, PIPE.bodyHeight);
      }
    }
  }

  private drawEffects(
    assets: AssetPack,
    effects: RenderFrame["effects"],
    kind: EffectKind,
  ): void {
    const ctx = this.context;
    for (const effect of effects) {
      if (!effect.active || effect.kind !== kind) continue;
      const progress = Math.min(0.999, effect.age / effect.duration);
      const frameIndex = Math.min(3, Math.floor(progress * 4));
      const image = effect.kind === "steam"
        ? assets[STEAM_FRAMES[frameIndex]]
        : assets[SPARK_FRAMES[frameIndex]];
      const size = effect.kind === "steam" ? 64 : 82;

      ctx.save();
      ctx.globalAlpha = effect.kind === "steam" ? 0.3 * (1 - progress * 0.45) : 0.92 * (1 - progress);
      ctx.drawImage(image, effect.x - size / 2, effect.y - size / 2, size, size);
      ctx.restore();
    }
  }

  private drawBird(frame: RenderFrame, assets: AssetPack): void {
    let sprite: keyof AssetPack;
    if (frame.state === "GAME_OVER") {
      sprite = "bird_hit";
    } else if (frame.state === "READY") {
      sprite = "bird_idle";
    } else {
      const animationIndex = Math.floor(frame.bird.animationTime * BIRD.animationFps) % FLAP_FRAMES.length;
      sprite = FLAP_FRAMES[animationIndex];
    }

    const ctx = this.context;
    ctx.save();
    ctx.translate(BIRD.x, frame.bird.y);
    ctx.rotate(frame.bird.rotation);
    ctx.drawImage(
      assets[sprite],
      -BIRD.drawSize / 2,
      -BIRD.drawSize / 2,
      BIRD.drawSize,
      BIRD.drawSize,
    );
    ctx.restore();
  }

  private drawReady(assets: AssetPack, frame: RenderFrame): void {
    this.drawCenteredImage(assets.logo, 270, 150, 450, 180);
    this.drawText("TAP / SPACE TO FLY", 270, 710, 24, "#fff0cf");
    this.drawButton(UI.stats.x, UI.stats.y, UI.stats.visualWidth, UI.stats.visualHeight,
      "STATS", this.context, frame.pressedButton === "stats");
  }

  private drawScoreHud(assets: AssetPack, score: number): void {
    this.drawCenteredImage(assets.hud_score_frame, 270, 68, 176, 67);
    this.drawText(String(score), 270, 69, 31, "#fff0cf");
  }

  private drawPauseButton(assets: AssetPack, pressed: boolean): void {
    const sprite = pressed ? assets.button_pause_pressed : assets.button_pause;
    this.drawCenteredImage(sprite, UI.pause.x, UI.pause.y, UI.pause.visualSize, UI.pause.visualSize);
  }

  private drawPaused(assets: AssetPack, pressed: boolean): void {
    this.drawOverlay(0.58);
    this.drawText("PAUSED", 270, 420, 40, "#f3d59e");
    const sprite = pressed ? assets.button_play_pressed : assets.button_play;
    this.drawCenteredImage(sprite, UI.resume.x, UI.resume.y, UI.resume.visualSize, UI.resume.visualSize);
    this.drawText("RESUME", 270, 600, 19, "#fff0cf");
  }

  private drawResumeCountdown(label: string): void {
    this.drawOverlay(0.58);
    this.drawText(label, 270, 470, label === "GO" ? 48 : 72, "#f3d59e");
  }

  private drawMilestone(message: string): void {
    this.drawText(message, 270, 136, 16, "#f3d59e", 190);
  }

  private drawGameOver(assets: AssetPack, frame: RenderFrame): void {
    this.drawOverlay(0.58);
    this.drawText("GAME OVER", 270, 200, 38, "#f3d59e");
    if (frame.newBest) this.drawText("NEW BEST!", 270, 258, 22, "#e4b665");
    this.drawStatPanel(assets.hud_score_frame, "SCORE", String(frame.score), 270, 355, 315, 120, 30);
    this.drawStatPanel(assets.hud_best_frame, "BEST", String(frame.bestScore), 270, 500, 256, 112, 28);
    this.drawText("RANK", 270, 575, 14, "#d8c6a7");
    this.drawText(frame.rank, 270, 601, 23, "#e4b665");

    const sprite = frame.pressedButton === "restart"
      ? assets.button_restart_pressed
      : assets.button_restart;
    this.drawCenteredImage(sprite, UI.restart.x, UI.restart.y, UI.restart.visualSize, UI.restart.visualSize);
    this.drawText("RESTART", 270, 785, 18, "#fff0cf");
    this.drawText("TAP TO RESTART", 270, 838, 15, "#d8c6a7");
  }

  private drawStatPanel(
    image: HTMLImageElement,
    label: string,
    value: string,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    valueSize: number,
  ): void {
    const ctx = this.context;
    this.drawCenteredImage(image, centerX, centerY, width, height);
    const safeWidth = width * 0.76;
    const safeHeight = height * 0.5;
    const key = `${label}|${value}|${width}|${height}|${valueSize}`;
    let fit = this.statFitCache.get(key);
    if (!fit) {
      fit = this.fitStatText(label, value, safeWidth, safeHeight, valueSize);
      if (this.statFitCache.size >= 64) this.statFitCache.clear();
      this.statFitCache.set(key, fit);
    }

    const groupHeight = fit.labelHeight + fit.gap + fit.valueHeight;
    const labelY = centerY - groupHeight / 2 + fit.labelHeight / 2;
    const valueY = centerY + groupHeight / 2 - fit.valueHeight / 2;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    this.drawFittedText(label, centerX, labelY, fit.labelSize, "#fff0cf");
    this.drawFittedText(value, centerX, valueY, fit.valueSize, "#fff0cf");
    ctx.restore();
  }

  private fitStatText(
    label: string,
    value: string,
    maxWidth: number,
    maxHeight: number,
    valueSize: number,
  ): { labelSize: number; valueSize: number; labelHeight: number; valueHeight: number; gap: number } {
    let labelSize = 14;
    let fittedValueSize = valueSize;
    const gap = 2;
    while (labelSize >= 10 && fittedValueSize >= 16) {
      const labelMetrics = this.statTextMetrics(label, labelSize);
      const valueMetrics = this.statTextMetrics(value, fittedValueSize);
      const height = labelMetrics.height + gap + valueMetrics.height;
      if (labelMetrics.width <= maxWidth && valueMetrics.width <= maxWidth && height <= maxHeight) {
        return {
          labelSize,
          valueSize: fittedValueSize,
          labelHeight: labelMetrics.height,
          valueHeight: valueMetrics.height,
          gap,
        };
      }
      if (fittedValueSize > 16) fittedValueSize -= 1;
      else labelSize -= 1;
    }
    const labelMetrics = this.statTextMetrics(label, labelSize);
    const valueMetrics = this.statTextMetrics(value, fittedValueSize);
    return {
      labelSize,
      valueSize: fittedValueSize,
      labelHeight: labelMetrics.height,
      valueHeight: valueMetrics.height,
      gap,
    };
  }

  private statTextMetrics(text: string, size: number): { width: number; height: number } {
    const ctx = this.context;
    ctx.font = `700 ${size}px ${FONT_STACK}`;
    const metrics = ctx.measureText(text);
    const stroke = Math.max(2, size * 0.12);
    return {
      width: metrics.width + stroke,
      height: Math.max(size * 0.82, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) + stroke,
    };
  }

  private drawFittedText(text: string, x: number, y: number, size: number, color: string): void {
    const ctx = this.context;
    ctx.font = `700 ${size}px ${FONT_STACK}`;
    ctx.strokeStyle = "rgba(30, 20, 11, 0.94)";
    ctx.lineWidth = Math.max(2, size * 0.12);
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  private drawStats(frame: RenderFrame): void {
    const ctx = this.context;
    this.drawOverlay(0.72);
    ctx.save();
    ctx.fillStyle = "rgba(25, 20, 15, 0.96)";
    ctx.strokeStyle = "#b78746";
    ctx.lineWidth = 4;
    ctx.fillRect(52, 230, 436, 500);
    ctx.strokeRect(52, 230, 436, 500);
    ctx.restore();
    this.drawText("FLIGHT LOG", 270, 280, 30, "#f3d59e");
    this.drawCloseStats(frame.pressedButton === "closeStats");
    this.drawStatsRow("BEST", String(frame.profile.bestScore), 340);
    this.drawStatsRow("RUNS", String(frame.profile.totalRuns), 412);
    this.drawStatsRow("PIPES", String(frame.profile.totalPipesPassed), 484);
    this.drawStatsRow("FLIGHT TIME", formatPlayTime(frame.profile.totalPlayTimeSeconds), 556);
    this.drawStatsRow("HIGHEST RANK", rankForScore(frame.profile.bestScore), 628);
  }

  private drawStatsRow(label: string, value: string, y: number): void {
    this.drawText(label, 270, y, 14, "#d8c6a7");
    this.drawText(value, 270, y + 27, 21, "#fff0cf", 390);
  }

  private drawCloseStats(pressed: boolean): void {
    const ctx = this.context;
    const { x, y, visualSize } = UI.closeStats;
    ctx.save();
    ctx.fillStyle = pressed ? "#75532e" : "#382a1b";
    ctx.strokeStyle = "#b78746";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, visualSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    this.drawText("×", x, y - 1, 25, "#fff0cf");
  }

  private drawMuteButton(frame: RenderFrame): void {
    const y = frame.state === "READY"
      ? frame.statsOpen ? UI.mute.statsY : UI.mute.readyY
      : UI.mute.y;
    const label = frame.muted ? "SOUND OFF" : "SOUND ON";
    this.drawButton(UI.mute.x, y, UI.mute.visualWidth, UI.mute.visualHeight,
      label, this.context, frame.pressedButton === "mute");
  }

  private drawButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    ctx: CanvasRenderingContext2D,
    pressed: boolean,
  ): void {
    ctx.save();
    ctx.fillStyle = pressed ? "rgba(104, 72, 38, 0.96)" : "rgba(35, 27, 20, 0.9)";
    ctx.strokeStyle = "#b78746";
    ctx.lineWidth = 2;
    ctx.fillRect(x - width / 2, y - height / 2, width, height);
    ctx.strokeRect(x - width / 2, y - height / 2, width, height);
    ctx.restore();
    this.drawText(label, x, y, 12, "#fff0cf", width - 12);
  }

  private drawOverlay(alpha: number): void {
    const ctx = this.context;
    ctx.fillStyle = "rgba(15, 13, 10, " + alpha + ")";
    ctx.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
  }

  private drawCenteredImage(
    image: HTMLImageElement,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
  ): void {
    this.context.drawImage(image, centerX - width / 2, centerY - height / 2, width, height);
  }

  private drawText(
    text: string,
    x: number,
    y: number,
    size: number,
    color: string,
    maxWidth = VIEWPORT.width - 40,
  ): void {
    const ctx = this.context;
    ctx.save();
    ctx.font = "700 " + size + "px " + FONT_STACK;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(30, 20, 11, 0.94)";
    ctx.lineWidth = Math.max(2, size * 0.12);
    ctx.strokeText(text, x, y, maxWidth);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y, maxWidth);
    ctx.restore();
  }

  private drawHitboxes(pipes: PipePair[], birdY: number): void {
    const ctx = this.context;
    ctx.save();
    ctx.strokeStyle = "#ff584d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(BIRD.x, birdY, BIRD.hitRadiusX, BIRD.hitRadiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    for (const pipe of pipes) {
      const left = pipe.x - PIPE.collisionWidth / 2;
      const halfGap = pipe.gap / 2;
      const gapTop = pipe.gapCenter - halfGap;
      const gapBottom = pipe.gapCenter + halfGap;
      ctx.strokeRect(left, 0, PIPE.collisionWidth, gapTop);
      ctx.strokeRect(left, gapBottom, PIPE.collisionWidth, VIEWPORT.height - gapBottom);
    }
    ctx.restore();
  }
}

function formatPlayTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
