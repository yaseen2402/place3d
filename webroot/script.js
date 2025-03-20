/** @typedef {import('../src/message.ts').DevvitSystemMessage} DevvitSystemMessage */
/** @typedef {import('../src/message.ts').WebViewMessage} WebViewMessage */

import { Game } from "./game/Game.js";
import { PositionPanel } from "./game/PositionPanel.js";
import { GRID_OFFSET } from "./game/constants.js";

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

    console.log("Received message from main.tsx:", message);

    switch (message.type) {
      case "initialData": {
        const { username, cubes } = message.data;
        console.log("Received initial cubes data:", message.data.cubes);
        this.initGame(username, cubes);
        break;
      }
      case "updateCubes": {
        console.log("Received updated cubes data:", message.data);
        if (this.game) {
          const cubeData = message.data.cubes;
          const position = {
            x: parseInt(cubeData.x) - 1 - GRID_OFFSET,
            y: parseInt(cubeData.y) - 1 + 0.5,
            z: parseInt(cubeData.z) - 1 - GRID_OFFSET,
          };

          // Show notification
          this.showCubeNotification(cubeData);

          // First remove any existing cube from the scene directly
          const existingCube = this.game.gameState.getCube(position);
          if (existingCube && existingCube.parent) {
            this.game.scene.remove(existingCube);
          }

          // Create and add the new cube
          const cube = this.game.cubeBuilder.createCube(cubeData.color);
          cube.position.set(position.x, position.y, position.z);
          this.game.scene.add(cube);

          // Update the game state without trying to remove (since we already did)
          this.game.gameState.cubes.set(
            `${position.x},${position.y},${position.z}`,
            cube
          );
        } else {
          console.log("Game not initialized");
        }
        break;
      }
      default:
        /** to-do: @satisifes {never} */
        const _ = message;
        break;
    }
  };

  showCubeNotification(cubeData) {
    const container = document.getElementById("notificationContainer");

    if (!container) {
      console.error("Notification container not found");
      return;
    }

    // Create new notification element
    const notification = document.createElement("div");
    notification.className = "cubeNotification";

    notification.innerHTML = `
      <strong>${cubeData.name}</strong> placed a cube:<br>
      <span style="display: inline-block; width: 12px; height: 12px; background: ${cubeData.color}; border: 1px solid #333; margin-right: 5px; vertical-align: middle;"></span>
      at (${cubeData.x}, ${cubeData.y}, ${cubeData.z})
    `;

    // Add to container
    container.appendChild(notification);

    // Remove notification after delay
    setTimeout(() => {
      notification.classList.add("fade-out");
      setTimeout(() => {
        if (notification.parentElement) {
          notification.parentElement.removeChild(notification);
        }
      }, 300); // Remove after fade animation
    }, 3000);
  }
}

/**
 * Sends a message to the Devvit app.
 * @arg {WebViewMessage} msg
 * @return {void}
 */
function postWebViewMessage(msg) {
  parent.postMessage(msg, "*");
}

// Create an instance of the App class
const app = new App();
