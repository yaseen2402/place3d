import { Game } from "./game/Game.js";
import { ColorPicker } from "./game/ColorPicker.js";

function initGame() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const game = new Game(container);
  new ColorPicker(game);
  game.animate();
}

window.addEventListener("load", initGame);
