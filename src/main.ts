import "./styles/main.css";
import { Game } from "./game/Game";

const canvas = document.querySelector<HTMLCanvasElement>("#game");

if (!canvas) {
  throw new Error("Clockwork Flight canvas was not found.");
}

new Game(canvas).start();
