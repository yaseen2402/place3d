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
      console.log("Sending cube placement request:", cubeData);

      // Add username to the cube data
      cubeData.name = username;

      // Send checkCooldown message with cube data
      postWebViewMessage({
        type: "checkCooldown",
        data: cubeData,
      });
    });

    // Load existing cubes
    this.game.loadExistingCubes(cubes);

    // Create position panel and store reference
    const positionPanel = new PositionPanel(this.game);
    this.game.setPositionPanel(positionPanel);

    this.game.animate();
  }

  /**
   * @arg {MessageEvent<DevvitSystemMessage>} ev
   * @return {void}
   */
  #onMessage = (ev) => {
    if (ev.data.type !== "devvit-message") return;
    const { message } = ev.data.data;

    console.log("Received message from main.tsx:", message);

    switch (message.type) {
      case "initialData":
        this.initGame(message.data.username, message.data.cubes);
        break;

      case "updateCubes":
        console.log("Received cube update:", message.data.cubes);
        // Update cube rendering
        if (this.game) {
          // Handle as normal update from another user
          this.showCubeNotification(message.data.cubes);

          // Place the cube using storage coordinates
          const cubeData = message.data.cubes;
          this.game.placeCubeAt(
            parseInt(cubeData.x),
            parseInt(cubeData.y),
            parseInt(cubeData.z),
            true, // these are storage coordinates
            cubeData.color // Pass the color from the data
          );
        }
        break;

      case "cooldownActive":
        console.log("Cooldown active:", message.data.remainingSeconds);
        if (this.game && this.game.positionPanel) {
          // Pass true to indicate this is an active cooldown notification
          this.game.positionPanel.startCooldown(
            message.data.remainingSeconds,
            true
          );

          // Show the toast directly here
          const toast = document.getElementById("toast");
          if (toast) {
            toast.textContent = `Please wait ${Math.ceil(
              message.data.remainingSeconds
            )} seconds before placing another cube`;
            toast.classList.add("show");
            setTimeout(() => {
              toast.classList.remove("show");
            }, 1500);
          }
        }
        break;

      case "cooldownStarted":
        console.log("Cooldown started, placing cube");
        if (this.game && this.game.positionPanel) {
          // Pass false to indicate this is not an active cooldown notification
          this.game.positionPanel.startCooldown(message.data.seconds, false);

          // Place the cube, but check for inputs first
          if (this.game.positionPanel.inputs) {
            const x =
              parseInt(this.game.positionPanel.inputs.x.input.value) -
              GRID_OFFSET -
              1;
            const y =
              parseInt(this.game.positionPanel.inputs.y.input.value) - 1 + 0.5;
            const z =
              parseInt(this.game.positionPanel.inputs.z.input.value) -
              GRID_OFFSET -
              1;

            // Use the selected color for locally placed cubes
            this.game.placeCubeAt(
              x,
              y,
              z,
              false,
              this.game.gameState.selectedColor
            );
          } else {
            console.error("Position panel inputs not available");
          }
        }
        break;

      case "allowPlacement":
        console.log("Received 'allowPlacement' - this shouldn't happen");
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
