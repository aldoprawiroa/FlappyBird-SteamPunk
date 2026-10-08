# Clockwork Flight

Clockwork Flight is an original steampunk-themed side-scrolling arcade game built with TypeScript, Vite, and HTML5 Canvas.

## Play

**[Play Clockwork Flight](https://aldoprawiroa.github.io/FlappyBird-SteamPunk/)**

## Gameplay

Tap, click, or press a key to flap and stay aloft. Avoid the steampunk pipe obstacles; each pair you pass adds a point. Your best score is saved in your browser.

## Controls

**Desktop**

- Space, W, Arrow Up, or mouse click to flap
- P, Escape, or the pause button to pause; resume uses a short countdown
- S to open player stats and M to toggle sound
- After a crash, tap/click, press a flap key, or use the restart button

**Mobile**

- Tap to flap
- Use the on-screen pause button

## Features

- Responsive 9:16 gameplay viewport
- Desktop and mobile controls
- Animated mechanical bird
- Modular, procedurally placed pipe obstacles
- Score and persistent local best score
- Bounded score-based difficulty, run ranks, and new-best feedback
- Local run totals with migration from the v1 best-score key
- Procedural sound effects and optional mobile vibration
- Ready, playing, paused, and game-over states
- Multi-layer parallax steampunk environment with airships
- Steam and spark effects
- Pause and restart controls
- Responsive HTML5 Canvas rendering

Run the deterministic rules and storage tests with `npm test`. For static Canvas
fixtures using the shipped artwork, run `npm run dev` and open `/tests/visual.html`.

## Tech Stack

- TypeScript
- Vite
- HTML5 Canvas
- CSS
- localStorage

No game engine is used.

## Running Locally

```sh
git clone https://github.com/aldoprawiroa/FlappyBird-SteamPunk.git
cd FlappyBird-SteamPunk
npm install
npm run dev
```

Create and preview a production build with:

```sh
npm run build
npm run preview
```

## Project Structure

- `src/game/` — game state, input, rendering, assets, and storage
- `src/styles/` — responsive canvas presentation
- `assets/clockwork-flight/` — game artwork
- `.github/workflows/` — GitHub Pages deployment

## Assets

The game includes an original Clockwork Flight steampunk asset pack in `assets/clockwork-flight/`.

## Contributing

Issues and pull requests are welcome.

## License

This project is licensed under the [MIT License](LICENSE).
