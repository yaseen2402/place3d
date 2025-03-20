/** @typedef {import('../src/message.ts').DevvitSystemMessage} DevvitSystemMessage */
/** @typedef {import('../src/message.ts').WebViewMessage} WebViewMessage */

import { Game } from "./game/Game.js";
import { PositionPanel } from "./game/PositionPanel.js";

class App {
  constructor() {
    this.game = null;
    // Get references to the HTML elements
    // this.output = /** @type {HTMLPreElement} */ (document.querySelector('#messageOutput'));

    // this.usernameLabel = /** @type {HTMLSpanElement} */ (document.querySelector('#username'));

    // When the Devvit app sends a message with `postMessage()`, this will be triggered
    addEventListener("message", this.#onMessage);

    // This event gets called when the web view is loaded
    addEventListener("load", () => {
      console.log("WebView loaded, sending webViewReady message");
      postWebViewMessage({ type: "webViewReady" });
      initGame();
    });
  }

  initGame(username, cubes) {
    console.log("Initializing game with username:", username);
    console.log("Initial cubes data:", cubes);

    const container = document.createElement("div");
    document.body.appendChild(container);

    this.game = new Game(container, (cubeData) => {
      console.log("Cube placed, sending data to main.tsx:", {
        ...cubeData,
        name: username,
      });

      postWebViewMessage({
        type: "saveCubes",
        data: {
          ...cubeData,
          name: username,
        },
      });
    });

    // Load existing cubes
    this.game.loadExistingCubes(cubes);

    new PositionPanel(this.game);
    this.game.animate();
  }

  /**
   * @arg {MessageEvent<DevvitSystemMessage>} ev
   * @return {void}
   */
  #onMessage = (ev) => {
    // Reserved type for messages sent via `context.ui.webView.postMessage`
    if (ev.data.type !== "devvit-message") return;
    const { message } = ev.data.data;

    // this.output.replaceChildren(JSON.stringify(message, undefined, 2));

    console.log("Received message from main.tsx:", message);

    switch (message.type) {
      case "initialData": {
        // Initialize game with username and existing cubes
        const { username, cubes } = message.data;
        console.log("Received initial cubes data:", message.data.cubes);
        this.initGame(username, cubes);
        break;
      }
      case "updateCubes": {
        console.log("Received updated cubes data:", message.data.cubes);
        // Handle cube updates if needed
        const { cubes } = message.data;
        if (this.game) {
          this.game.loadExistingCubes(cubes);
        }
        break;
      }
      default:
        /** to-do: @satisifes {never} */
        const _ = message;
        break;
    }
  };
}

/**
 * Sends a message to the Devvit app.
 * @arg {WebViewMessage} msg
 * @return {void}
 */
function postWebViewMessage(msg) {
  parent.postMessage(msg, "*");
}

new App();
