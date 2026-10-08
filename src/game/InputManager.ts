export type InputSignal =
  | { type: "action"; action: "flap" | "togglePause" }
  | { type: "pointerDown"; x: number; y: number }
  | { type: "pointerUp"; x: number; y: number }
  | { type: "pointerCancel" };

export class InputManager {
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly dispatch: (signal: InputSignal) => void,
  ) {
    window.addEventListener("keydown", this.onKeyDown);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerCancel);
    canvas.addEventListener("contextmenu", this.onContextMenu);
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerCancel);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const code = event.code;
    const flapKey = code === "Space" || code === "ArrowUp" || code === "KeyW" || code === "Enter";
    const pauseKey = code === "Escape" || code === "KeyP";

    if (flapKey || pauseKey) event.preventDefault();
    if (event.repeat) return;

    if (pauseKey) {
      this.dispatch({ type: "action", action: "togglePause" });
    } else if (flapKey) {
      this.dispatch({ type: "action", action: "flap" });
    }
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    this.canvas.focus({ preventScroll: true });
    this.canvas.setPointerCapture(event.pointerId);

    const { x, y } = this.toLogicalPoint(event);
    this.dispatch({ type: "pointerDown", x, y });
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const { x, y } = this.toLogicalPoint(event);
    this.dispatch({ type: "pointerUp", x, y });
  };

  private readonly onPointerCancel = (): void => {
    this.dispatch({ type: "pointerCancel" });
  };

  private readonly onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private toLogicalPoint(event: PointerEvent): { x: number; y: number } {
    const bounds = this.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 540,
      y: ((event.clientY - bounds.top) / bounds.height) * 960,
    };
  }
}
