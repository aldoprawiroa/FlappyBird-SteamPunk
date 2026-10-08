import { BACKGROUND_LAYERS, BIRD, DEBUG_HITBOXES, PIPE, UI, VIEWPORT } from "./constants";
import { SPARK_FRAMES, STEAM_FRAMES } from "./assets";
import type { AssetPack } from "./assets";
import type { EffectKind, PipePair, RenderFrame } from "./types";

const FLAP_FRAMES = ["bird_flap_up", "bird_flap_mid", "bird_flap_down", "bird_flap_mid"] as const;
const FONT_STACK = 'Georgia, "Times New Roman", serif';

export class Renderer {
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
    this.drawAirships(assets, frame.airships);
    this.drawPipes(assets, frame.pipes);
    this.drawEffects(assets, frame.effects, "steam");
    this.drawBird(frame, assets);
    this.drawEffects(assets, frame.effects, "spark");

    if (frame.state === "READY") this.drawReady(assets);
    if (frame.state === "PLAYING" || frame.state === "PAUSED") {
      this.drawScoreHud(assets, frame.score);
      this.drawPauseButton(assets, frame.pressedButton === "pause");
    }
    if (frame.state === "PAUSED") this.drawPaused(assets, frame.pressedButton === "play");
    if (frame.state === "GAME_OVER") this.drawGameOver(assets, frame);

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
      const offset = (sceneTime * PIPE.speed * layer.speed) % VIEWPORT.width;
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
    const halfGap = PIPE.gap / 2;
    const bodyX = -PIPE.bodyWidth / 2;
    const capX = -PIPE.capWidth / 2;

    for (const pipe of pipes) {
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

  private drawReady(assets: AssetPack): void {
    this.drawCenteredImage(assets.logo, 270, 150, 450, 180);
    this.drawText("TAP / SPACE TO FLY", 270, 710, 24, "#fff0cf");
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

  private drawGameOver(assets: AssetPack, frame: RenderFrame): void {
    this.drawOverlay(0.46);
    this.drawText("GAME OVER", 270, 340, 38, "#f3d59e");
    this.drawCenteredImage(assets.hud_score_frame, 270, 442, 232, 88);
    this.drawText("SCORE", 270, 421, 15, "#fff0cf");
    this.drawText(String(frame.score), 270, 457, 31, "#fff0cf");
    this.drawCenteredImage(assets.hud_best_frame, 270, 560, 208, 91);
    this.drawText("BEST", 270, 544, 14, "#fff0cf");
    this.drawText(String(frame.bestScore), 270, 580, 27, "#fff0cf");

    const sprite = frame.pressedButton === "restart"
      ? assets.button_restart_pressed
      : assets.button_restart;
    this.drawCenteredImage(sprite, UI.restart.x, UI.restart.y, UI.restart.visualSize, UI.restart.visualSize);
    this.drawText("RESTART", 270, 782, 18, "#fff0cf");
    this.drawText("TAP TO RESTART", 270, 838, 15, "#d8c6a7");
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

    const halfGap = PIPE.gap / 2;
    for (const pipe of pipes) {
      const left = pipe.x - PIPE.collisionWidth / 2;
      const gapTop = pipe.gapCenter - halfGap;
      const gapBottom = pipe.gapCenter + halfGap;
      ctx.strokeRect(left, 0, PIPE.collisionWidth, gapTop);
      ctx.strokeRect(left, gapBottom, PIPE.collisionWidth, VIEWPORT.height - gapBottom);
    }
    ctx.restore();
  }
}
