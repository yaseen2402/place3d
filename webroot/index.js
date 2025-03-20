import { Game } from "./game/Game.js";
import { PositionPanel } from "./game/PositionPanel.js";

function initGame() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const game = new Game(container);
  new PositionPanel(game);
  game.animate();
}

window.addEventListener("load", initGame);
