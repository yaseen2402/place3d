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

    // When the Devvit app sends a message with `postMessage()`, this will be triggered
    addEventListener("message", this.#onMessage);

    // This event gets called when the web view is loaded
    addEventListener("load", () => {
      this.updateLoading("Connecting to server...");
      this.postWebViewMessage({ type: "webViewReady" });
    });

    // Add a Set to track recent notifications
    this.recentNotifications = new Set();

    // Add background color switcher
    this.backgroundColors = [
      "#87ceeb", // Light blue sky (default)
      "#f0f0f0",
      "#c0c0c0",
    ];
    this.currentBackgroundIndex = 0;
    this.addBackgroundSwitcher();
    this.addNavigationArrows();
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

  addBackgroundSwitcher() {
    // Create and style the background switcher button
    const switchButton = document.createElement("button");
    switchButton.id = "switchBackgroundButton";
    switchButton.textContent = "⇄ Background";
    switchButton.style.position = "absolute";
    switchButton.style.top = "10px";
    switchButton.style.left = "120px"; // Position to the right of show controls button
    switchButton.style.zIndex = "999"; // Set lower than show controls button
    switchButton.style.padding = "4px 8px";
    switchButton.style.backgroundColor = "#000000";
    switchButton.style.opacity = "0.4";
    switchButton.style.color = "#fff";
    switchButton.style.border = "none";
    switchButton.style.borderRadius = "4px";
    switchButton.style.cursor = "pointer";
    switchButton.style.fontSize = "12px";
    switchButton.style.fontFamily = "Arial, sans-serif";
    switchButton.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
    switchButton.style.transition = "opacity 0.3s";

    // Add hover effect
    switchButton.addEventListener("mouseover", () => {
      switchButton.style.opacity = "0.7";
    });
    switchButton.addEventListener("mouseout", () => {
      switchButton.style.opacity = "0.4";
    });

    switchButton.addEventListener("click", () => {
      this.currentBackgroundIndex =
        (this.currentBackgroundIndex + 1) % this.backgroundColors.length;
      const newColor = this.backgroundColors[this.currentBackgroundIndex];
      this.game.renderer.setClearColor(newColor);
    });

    // Append the button to the body
    document.body.appendChild(switchButton);

    // Move show controls button to top left and adjust related elements
    const showControlsButton = document.getElementById("toggleInstructions");
    const instructionsPanel = document.getElementById("instructions");

    if (showControlsButton) {
      showControlsButton.style.top = "10px";
      showControlsButton.style.left = "10px";
      showControlsButton.style.zIndex = "1000";
    }

    if (instructionsPanel) {
      instructionsPanel.style.top = "50px"; // Position below the buttons
      instructionsPanel.style.left = "10px";
      instructionsPanel.style.zIndex = "998";
    }
  }

  addNavigationArrows() {
    // Create container for joystick-style controls
    const navContainer = document.createElement("div");
    navContainer.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 20px;
      width: 120px;
      height: 120px;
      z-index: 1000;
    `;

    // Create arrows with relative positioning
    const createArrow = (symbol, position) => {
      const arrow = document.createElement("button");
      arrow.innerHTML = symbol;
      arrow.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.4);
        color: white;
        border: none;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        font-size: 20px;
        cursor: pointer;
        transition: opacity 0.3s;
        display: flex;
        align-items: center;
        justify-content: center;
        ${position}
      `;
      return arrow;
    };

    // Create and position all arrows
    const leftArrow = createArrow("⟨", "left: 0; top: 42px;");
    const rightArrow = createArrow("⟩", "right: 0; top: 42px;");
    const upArrow = createArrow("⋀", "top: 0; left: 42px;");
    const downArrow = createArrow("⋁", "bottom: 0; left: 42px;");

    // Add hover effects
    [leftArrow, rightArrow, upArrow, downArrow].forEach((arrow) => {
      arrow.addEventListener("mouseover", () => (arrow.style.opacity = "0.7"));
      arrow.addEventListener("mouseout", () => (arrow.style.opacity = "1"));
    });

    // State tracking
    let currentRotation = { horizontal: 0, vertical: 0 };

    // Add click handlers
    leftArrow.addEventListener("click", () => {
      currentRotation.horizontal += Math.PI / 2;
      this.rotateCamera(currentRotation);
    });

    rightArrow.addEventListener("click", () => {
      currentRotation.horizontal -= Math.PI / 2;
      this.rotateCamera(currentRotation);
    });

    upArrow.addEventListener("click", () => {
      currentRotation.vertical = Math.min(
        currentRotation.vertical + Math.PI / 4,
        Math.PI / 2
      );
      this.rotateCamera(currentRotation);
    });

    downArrow.addEventListener("click", () => {
      currentRotation.vertical = Math.max(
        currentRotation.vertical - Math.PI / 4,
        -Math.PI / 4
      );
      this.rotateCamera(currentRotation);
    });

    // Append all arrows to container
    navContainer.appendChild(leftArrow);
    navContainer.appendChild(rightArrow);
    navContainer.appendChild(upArrow);
    navContainer.appendChild(downArrow);
    document.body.appendChild(navContainer);
  }

  rotateCamera(rotation) {
    if (!this.game) return;

    const camera = this.game.camera;
    const controls = this.game.controls;

    // Increase radius for better view
    const radius = 30; // Changed from 15 to 30 for a more zoomed out view
    const targetX =
      radius * Math.cos(rotation.vertical) * Math.cos(rotation.horizontal);
    const targetZ =
      radius * Math.cos(rotation.vertical) * Math.sin(rotation.horizontal);
    const targetY = radius * Math.sin(rotation.vertical) + 20; // Increased base height from 15 to 20

    // Animate camera movement
    const duration = 1000;
    const startPos = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);

      // Easing function
      const eased =
        progress < 0.5
          ? 4 * progress ** 3
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      camera.position.x = startPos.x + (targetX - startPos.x) * eased;
      camera.position.y = startPos.y + (targetY - startPos.y) * eased;
      camera.position.z = startPos.z + (targetZ - startPos.z) * eased;

      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  initGame(username, initialCubes, gameState) {
    this.username = username;
    this.gameState = gameState;

    // Initialize the game first
    this.game = new Game({
      onCubePlaced: (cubeData) => {
        // Prevent cube placement if game has ended
        if (this.gameState === "ended") {
          return;
        }

        cubeData.name = username;
        this.postWebViewMessage({
          type: "checkCooldown",
          data: cubeData,
        });
      },
    });

    // Process loading in staged approach
    setTimeout(() => {
      if (initialCubes && Object.keys(initialCubes).length > 0) {
        this.updateLoading(
          `Loading ${Object.keys(initialCubes).length} existing cubes...`
        );
      } else {
        this.updateLoading("Preparing new environment...");
      }

      this.loadCubesInBatches(initialCubes, () => {
        // Only create position panel if game is not ended
        if (this.gameState !== "ended") {
          this.updateLoading("Setting up controls...");
          const positionPanel = new PositionPanel(this.game);
          this.game.setPositionPanel(positionPanel);
        }

        // Handle ended state
        if (this.gameState === "ended") {
          const instructions = document.getElementById("instructions");
          const toggleInstructions =
            document.getElementById("toggleInstructions");

          // if (instructions) instructions.style.display = "none";
          // if (toggleInstructions) toggleInstructions.style.display = "none";

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

        this.updateLoading("Finalizing...");
        this.game.animate();

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

    switch (message.type) {
      case "initialData":
        this.initGame(
          message.data.username,
          message.data.cubes,
          message.data.gameState // Pass the gameState
        );
        break;

      case "updateCubes":
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
        if (this.game && this.game.positionPanel) {
          // Start the cooldown UI
          this.game.positionPanel.startCooldown(message.data.seconds, false);

          // Place the cube using the last attempted position
          const lastPos = this.game.gameState.lastPlacedPosition;
          if (lastPos) {
            this.game.placeCubeAt(
              lastPos.x,
              lastPos.y,
              lastPos.z,
              false,
              this.game.gameState.selectedColor
            );
          }
        }
        break;

      case "allowPlacement":
        break;
    }
  };

  showCubeNotification(cubeData) {
    const notificationKey = `${cubeData.name}_${cubeData.x}_${cubeData.y}_${cubeData.z}_${cubeData.color}`;

    if (this.recentNotifications.has(notificationKey)) {
      return;
    }

    this.recentNotifications.add(notificationKey);
    setTimeout(() => {
      this.recentNotifications.delete(notificationKey);
    }, 1000);

    const notification = document.createElement("div");
    notification.className = "cubeNotification";
    notification.style.animation = "slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)";

    // Create color preview div
    const colorPreview = document.createElement("div");
    colorPreview.className = "cube-color-preview";
    colorPreview.style.background = cubeData.color;

    // Create content div
    const content = document.createElement("div");
    content.className = "notification-content";
    content.innerHTML = `
        <span class="notification-username">${cubeData.name}</span>
        placed at <span class="notification-coords">${cubeData.x}, ${cubeData.y}, ${cubeData.z}</span>
    `;

    // Assemble notification
    notification.appendChild(colorPreview);
    notification.appendChild(content);

    const container = document.getElementById("notificationContainer");
    container.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("fade-out");
      setTimeout(() => {
        if (notification.parentElement) {
          notification.parentElement.removeChild(notification);
        }
      }, 300);
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
  return; // Skip default loading
};

// Create an instance of the App class
const app = new App();
// Make app globally accessible for other components
window.app = app;
