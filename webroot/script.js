/** @typedef {import('../src/message.ts').DevvitSystemMessage} DevvitSystemMessage */
/** @typedef {import('../src/message.ts').WebViewMessage} WebViewMessage */

import { Game } from "./game/Game.js";
import { PositionPanel } from "./game/PositionPanel.js";
import { GRID_OFFSET } from "./game/constants.js";

class App {
  constructor() {
    this.game = null;
    this.loadingOverlay = document.getElementById("loadingOverlay");
    this.loadingProgress = document.getElementById("loadingProgress");
    this.isLoading = true;

    console.log("App constructor called");

    // When the Devvit app sends a message with `postMessage()`, this will be triggered
    addEventListener("message", this.#onMessage);

    // This event gets called when the web view is loaded
    addEventListener("load", () => {
      console.log("WebView loaded, sending webViewReady message");
      this.updateLoading("Connecting to server...");
      this.postWebViewMessage({ type: "webViewReady" });
      console.log("webViewReady message sent");
    });

    // Add a Set to track recent notifications
    this.recentNotifications = new Set();
  }

  // Add these methods to handle loading UI
  updateLoading(message) {
    if (this.loadingProgress) {
      this.loadingProgress.textContent = message;
    }
  }

  hideLoading() {
    if (this.loadingOverlay && this.isLoading) {
      this.isLoading = false;
      this.loadingOverlay.classList.add("fade-out");
      setTimeout(() => {
        this.loadingOverlay.style.display = "none";
      }, 500); // Wait for the animation to complete
    }
  }

  initGame(username, initialCubes, gameState) {
    console.log(
      "initGame called with username:",
      username,
      "initial cubes:",
      initialCubes,
      "game state:",
      gameState
    );
    this.username = username;
    this.gameState = gameState; // Store game state

    // Initialize the game first
    this.game = new Game({
      onCubePlaced: (cubeData) => {
        // Prevent cube placement if game has ended
        if (this.gameState === "ended") {
          return;
        }

        console.log("onCubePlaced callback triggered with data:", cubeData);
        cubeData.name = username;
        this.postWebViewMessage({
          type: "checkCooldown",
          data: cubeData,
        });
      },
    });

    // Process loading in staged approach
    setTimeout(() => {
      console.log("Loading existing cubes");
      if (initialCubes && Object.keys(initialCubes).length > 0) {
        this.updateLoading(
          `Loading ${Object.keys(initialCubes).length} existing cubes...`
        );
      } else {
        this.updateLoading("Preparing new environment...");
      }

      this.loadCubesInBatches(initialCubes, () => {
        console.log("Creating position panel");
        this.updateLoading("Setting up controls...");
        const positionPanel = new PositionPanel(this.game);
        this.game.setPositionPanel(positionPanel);

        // Move the game state check here, after position panel is created
        if (this.gameState === "ended") {
          // Hide position panel and instructions
          const positionPanel = document.querySelector(".position-panel");
          const instructions = document.getElementById("instructions");
          const toggleInstructions =
            document.getElementById("toggleInstructions");

          if (positionPanel) positionPanel.style.display = "none";
          if (instructions) instructions.style.display = "none";
          if (toggleInstructions) toggleInstructions.style.display = "none";

          // Create and show game ended message
          const endMessage = document.createElement("div");
          endMessage.id = "gameEndMessage";
          endMessage.innerHTML = `
                    <div style="
                        position: fixed;
                        bottom: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                        background-color: rgba(0, 0, 0, 0.7);
                        color: white;
                        padding: 15px 30px;
                        border-radius: 5px;
                        text-align: center;
                        z-index: 1000;
                    ">
                        This game has ended. You are viewing the final state.
                    </div>
                `;
          document.body.appendChild(endMessage);
        }

        console.log("Starting animation loop");
        this.updateLoading("Finalizing...");
        this.game.animate();

        console.log("Game initialization complete");

        setTimeout(() => {
          this.updateLoading("Ready!");
          this.hideLoading();
        }, 300);
      });
    }, 500);
  }

  // Load cubes in batches to prevent UI freezing
  loadCubesInBatches(cubes, onComplete) {
    if (!cubes || Object.keys(cubes).length === 0) {
      if (onComplete) onComplete();
      return;
    }

    const cubeEntries = Object.entries(cubes);
    const totalCubes = cubeEntries.length;
    const batchSize = 20;
    let processedCount = 0;

    const processBatch = (startIdx) => {
      const endIdx = Math.min(startIdx + batchSize, totalCubes);

      for (let i = startIdx; i < endIdx; i++) {
        const [_, cubeDataStr] = cubeEntries[i];
        try {
          const cubeData = JSON.parse(cubeDataStr);
          const cube = this.game.cubeBuilder.createCube(cubeData.color);
          const position = {
            x: parseInt(cubeData.x) - 1 - GRID_OFFSET,
            y: parseInt(cubeData.y) - 1 + 0.5,
            z: parseInt(cubeData.z) - 1 - GRID_OFFSET,
          };

          cube.position.set(position.x, position.y, position.z);
          this.game.scene.add(cube);
          this.game.gameState.addCube(cube.position, cube);
        } catch (error) {
          console.error("Error processing cube:", error);
        }
      }

      processedCount += endIdx - startIdx;
      this.updateLoading(`Loading cubes... ${processedCount}/${totalCubes}`);

      if (endIdx < totalCubes) {
        // Process next batch
        setTimeout(() => processBatch(endIdx), 0);
      } else {
        // All batches processed
        if (onComplete) onComplete();
      }
    };

    // Start processing first batch
    processBatch(0);
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
        this.initGame(
          message.data.username,
          message.data.cubes,
          message.data.gameState // Pass the gameState
        );
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
          try {
            if (this.game.positionPanel.inputs) {
              // Safely extract and parse input values with fallbacks
              const xInput = this.game.positionPanel.inputs.x.input;
              const yInput = this.game.positionPanel.inputs.y.input;
              const zInput = this.game.positionPanel.inputs.z.input;

              // Make sure we have valid numbers
              const x = parseInt(xInput.value || "1") - GRID_OFFSET - 1;
              const y = parseInt(yInput.value || "1") - 1 + 0.5;
              const z = parseInt(zInput.value || "1") - GRID_OFFSET - 1;

              console.log(
                "Placing cube at position:",
                { x, y, z },
                "Raw input values:",
                {
                  x: xInput.value,
                  y: yInput.value,
                  z: zInput.value,
                }
              );

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
          } catch (error) {
            console.error("Error placing cube:", error);
          }
        }
        break;

      case "allowPlacement":
        console.log("Received 'allowPlacement' - this shouldn't happen");
        break;
    }
  };

  showCubeNotification(cubeData) {
    // Create a unique key for this notification
    const notificationKey = `${cubeData.name}_${cubeData.x}_${cubeData.y}_${cubeData.z}_${cubeData.color}`;

    // If we've shown this exact notification in the last second, ignore it
    if (this.recentNotifications.has(notificationKey)) {
      return;
    }

    // Add this notification to our tracking Set
    this.recentNotifications.add(notificationKey);

    // Remove it from the Set after 1 second
    setTimeout(() => {
      this.recentNotifications.delete(notificationKey);
    }, 1000);

    // Create and show the notification as before
    const notification = document.createElement("div");
    notification.className = "cubeNotification";
    notification.innerHTML = `
        ${cubeData.name} placed a cube at (${cubeData.x}, ${cubeData.y}, ${cubeData.z})
        <div style="display: inline-block; width: 12px; height: 12px; background: ${cubeData.color}; margin-left: 5px; border: 1px solid #000;"></div>
    `;

    const container = document.getElementById("notificationContainer");
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

  /**
   * Sends a message to the Devvit app.
   * @arg {WebViewMessage} msg
   * @return {void}
   */
  postWebViewMessage(msg) {
    parent.postMessage(msg, "*");
  }
}

// Update the Game class's loadExistingCubes method to do nothing since we'll handle loading with batches
Game.prototype.loadExistingCubes = function (cubes) {
  console.log("Skipping default cube loading, will load in batches");
  return; // Skip default loading
};

// Create an instance of the App class
const app = new App();
// Make app globally accessible for other components
window.app = app;
