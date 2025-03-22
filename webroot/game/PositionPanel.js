import { COLORS, GRID_SIZE, GRID_OFFSET, COLOR_PALETTES } from "./constants.js";

export class PositionPanel {
  constructor(game) {
    this.game = game;
    this.isVisible = true;
    this.selectedColorButton = null; // Track selected color button
    this.confirmButton = null;
    this.cooldownActive = false;
    this.inputs = null; // Add this line to store inputs
    this.currentPaletteIndex = 0;
    this.palettes = Object.values(COLOR_PALETTES);

    // Create panel first
    this.panel = this.createPanel();

    // Now setup keyboard controls after panel is created
    this.setupKeyboardControls();

    document.body.appendChild(this.panel);
  }

  startCooldown(seconds, isActiveNotification = false) {
    if (!this.confirmButton) return;

    this.cooldownActive = true;
    this.confirmButton.disabled = true;
    this.confirmButton.style.opacity = "0.5";
    this.confirmButton.style.cursor = "not-allowed";

    let remainingTime = seconds;

    const updateButton = () => {
      if (this.confirmButton) {
        this.confirmButton.textContent = `Wait ${remainingTime}s`;
        this.confirmButton.style.backgroundColor = "#999";
      }
    };

    updateButton();

    if (isActiveNotification) {
      this.showToast(
        `Please wait ${seconds} seconds before placing another cube`
      );
    }

    const cooldownInterval = setInterval(() => {
      remainingTime--;
      if (remainingTime <= 0) {
        clearInterval(cooldownInterval);
        this.endCooldown();
      } else {
        updateButton();
      }
    }, 1000);
  }

  showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
    }, 1500); // Show for 1.5 seconds
  }

  createColorSection() {
    const colorSection = document.createElement("div");
    colorSection.style.cssText = `
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-bottom: 6px;
      padding: 6px;
      background: rgba(0, 0, 0, 0.03);
      border-radius: 8px;
    `;

    // Function to update color buttons
    const updateColorButtons = () => {
      // Clear existing buttons
      while (colorSection.firstChild) {
        colorSection.removeChild(colorSection.firstChild);
      }

      const currentPalette = this.palettes[this.currentPaletteIndex];
      const colorEntries = Object.entries(currentPalette.colors);

      // Add first 7 color buttons
      for (let i = 0; i < Math.min(7, colorEntries.length); i++) {
        const [name, color] = colorEntries[i];
        const colorButton = this.createColorButton(name, color);
        colorSection.appendChild(colorButton);
      }

      // Add palette switch button in the last position
      const switchButton = this.createPaletteSwitchButton(updateColorButtons);
      colorSection.appendChild(switchButton);
    };

    // Initial render
    updateColorButtons();
    return colorSection;
  }

  createColorButton(name, color) {
    const button = document.createElement("button");
    button.style.cssText = `
      width: 100%;
      aspect-ratio: 1;
      border: 2px solid ${color === "#ffffff" ? "#ddd" : color};
      border-radius: 6px;
      background: ${color};
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      position: relative;
      overflow: hidden;
    `;
    button.title = name;

    button.onclick = () => {
      if (this.selectedColorButton) {
        this.selectedColorButton.style.transform = "scale(1)";
        this.selectedColorButton.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
      }

      button.style.transform = "scale(1.1)";
      button.style.boxShadow = `0 4px 10px ${color}80`;
      this.selectedColorButton = button;

      // Ripple effect
      const ripple = document.createElement("div");
      ripple.style.cssText = `
        position: absolute;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, ${color}40 0%, transparent 70%);
        transform: scale(0);
        top: 0;
        left: 0;
        transition: transform 0.4s ease-out;
      `;
      button.appendChild(ripple);
      requestAnimationFrame(() => (ripple.style.transform = "scale(4)"));
      setTimeout(() => ripple.remove(), 400);

      this.game.setSelectedColor(color);
    };

    return button;
  }

  createPaletteSwitchButton(updateCallback) {
    const button = document.createElement("button");
    button.style.cssText = `
      width: 100%;
      aspect-ratio: 1;
      border: 2px solid #ddd;
      border-radius: 6px;
      background: #f0f0f0;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    `;
    button.innerHTML = "→";
    button.title = "Next Color Palette";

    button.onclick = () => {
      // Animate button press
      button.style.transform = "scale(0.9)";
      setTimeout(() => (button.style.transform = "scale(1)"), 100);

      // Switch to next palette
      this.currentPaletteIndex =
        (this.currentPaletteIndex + 1) % this.palettes.length;
      updateCallback();

      // Show palette name in toast
      this.showToast(
        `Color Palette: ${this.palettes[this.currentPaletteIndex].name}`
      );
    };

    return button;
  }

  createPanel() {
    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed;
      left: 20px;
      bottom: 20px;
      background: rgba(255, 255, 255, 0.95);
      padding: 6px;
      padding-top: 30px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-family: 'Arial', sans-serif;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      width: 200px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    `;

    // Enhanced toggle button
    const toggleButton = document.createElement("button");
    toggleButton.textContent = "Hide";
    toggleButton.style.cssText = `
      position: absolute;
      top: 5px;
      left: 5px;
      width: 45px;
      height: 22px;
      padding: 2px;
      background: #2196F3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      box-shadow: 0 2px 5px rgba(33, 150, 243, 0.3);
    `;

    toggleButton.addEventListener("mouseenter", () => {
      toggleButton.style.backgroundColor = "#1976D2";
    });

    toggleButton.addEventListener("mouseleave", () => {
      toggleButton.style.backgroundColor = "#2196F3";
    });

    toggleButton.addEventListener("click", () => {
      this.isVisible = !this.isVisible;
      container.style.transform = this.isVisible
        ? "translateY(0)"
        : "translateY(calc(100% - 30px))";
      toggleButton.textContent = this.isVisible ? "Hide" : "Show";
    });

    container.appendChild(toggleButton);

    // Replace colorSection creation with new method
    const colorSection = this.createColorSection();
    container.appendChild(colorSection);

    // Enhanced input styling
    const createInput = (label, min, max) => {
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(0, 0, 0, 0.03);
        padding: 6px;
        border-radius: 8px;
        justify-content: space-between;
      `;

      const labelElement = document.createElement("label");
      labelElement.textContent = label;
      labelElement.style.cssText = `
        font-size: 14px;
        font-weight: bold;
        color: #333;
        width: 30px;
        text-align: center;
        display: flex;
        justify-content: center;
        align-items: center;
      `;

      const input = document.createElement("input");
      input.type = "number";
      input.min = min;
      input.max = max;
      input.value = "1";
      input.style.cssText = `
        width: 50px;
        padding: 4px;
        border: 2px solid #e0e0e0;
        border-radius: 6px;
        font-size: 14px;
        transition: all 0.2s ease;
        text-align: center;
        background: white;
      `;

      // Enforce min/max constraints when value changes
      input.addEventListener("input", () => {
        let value = parseInt(input.value);

        // Check if the value is a number and enforce limits
        if (!isNaN(value)) {
          if (value < min) value = min;
          if (value > max) value = max;

          // Update the input value if it's different from the constrained value
          if (parseInt(input.value) !== value) {
            input.value = value;
          }
        }

        // Trigger updatePreview
        updatePreview();
      });

      // Also enforce limits when the input loses focus
      input.addEventListener("blur", () => {
        let value = parseInt(input.value);

        // If empty or not a number, set to min
        if (isNaN(value)) {
          input.value = min;
        } else {
          // Enforce min/max
          if (value < min) input.value = min;
          if (value > max) input.value = max;
        }

        updatePreview();
      });

      input.addEventListener("focus", () => {
        input.style.borderColor = "#2196F3";
        input.style.boxShadow = "0 0 0 3px rgba(33, 150, 243, 0.2)";
      });

      input.addEventListener("blur", () => {
        input.style.borderColor = "#e0e0e0";
        input.style.boxShadow = "none";
      });

      // Enhanced arrow buttons
      const createArrowButton = (text, onClick) => {
        const button = document.createElement("button");
        button.textContent = text;
        button.style.cssText = `
          width: 28px;
          height: 28px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          transition: all 0.2s ease;
          user-select: none;
          touch-action: manipulation;
        `;

        let intervalId = null;
        let timeoutId = null;
        let isActive = false;

        const startIncrement = (e) => {
          if (e) {
            e.preventDefault(); // Prevent default behavior
            e.stopPropagation(); // Stop event propagation
          }

          if (isActive) return;
          isActive = true;

          // Immediate click
          onClick();

          // Setup long-press behavior
          timeoutId = setTimeout(() => {
            intervalId = setInterval(() => {
              onClick();
            }, 50);
          }, 400);

          button.style.transform = "scale(0.95)";
          button.style.backgroundColor = "#e0e0e0";
        };

        const stopIncrement = (e) => {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }

          isActive = false;
          if (intervalId) clearInterval(intervalId);
          if (timeoutId) clearTimeout(timeoutId);
          intervalId = null;
          timeoutId = null;

          button.style.transform = "scale(1)";
          button.style.backgroundColor = "#f5f5f5";
        };

        // Mouse events
        button.addEventListener("mousedown", startIncrement, {
          passive: false,
        });
        button.addEventListener("mouseup", stopIncrement, { passive: false });
        button.addEventListener("mouseleave", stopIncrement, {
          passive: false,
        });

        // Touch events
        button.addEventListener("touchstart", startIncrement, {
          passive: false,
        });
        button.addEventListener("touchend", stopIncrement, { passive: false });
        button.addEventListener("touchcancel", stopIncrement, {
          passive: false,
        });

        return button;
      };

      // Add arrow buttons based on axis
      if (label === "X:") {
        wrapper.appendChild(
          createArrowButton("←", () => {
            const newVal = Math.max(parseInt(input.value) - 1, input.min);
            input.value = newVal;
            input.dispatchEvent(new Event("input"));
          })
        );
        wrapper.appendChild(
          createArrowButton("→", () => {
            const newVal = Math.min(parseInt(input.value) + 1, input.max);
            input.value = newVal;
            input.dispatchEvent(new Event("input"));
          })
        );
      } else if (label === "Y:") {
        wrapper.appendChild(
          createArrowButton("↑", () => {
            const newVal = Math.min(parseInt(input.value) + 1, input.max);
            input.value = newVal;
            input.dispatchEvent(new Event("input"));
          })
        );
        wrapper.appendChild(
          createArrowButton("↓", () => {
            const newVal = Math.max(parseInt(input.value) - 1, input.min);
            input.value = newVal;
            input.dispatchEvent(new Event("input"));
          })
        );
      } else if (label === "Z:") {
        wrapper.appendChild(
          createArrowButton("↑", () => {
            const newVal = Math.min(parseInt(input.value) + 1, input.max);
            input.value = newVal;
            input.dispatchEvent(new Event("input"));
          })
        );
        wrapper.appendChild(
          createArrowButton("↓", () => {
            const newVal = Math.max(parseInt(input.value) - 1, input.min);
            input.value = newVal;
            input.dispatchEvent(new Event("input"));
          })
        );
      }

      wrapper.appendChild(labelElement);
      wrapper.appendChild(input);

      return { wrapper, input };
    };

    const inputs = {
      y: createInput("Y:", 1, 30),
      x: createInput("X:", 1, 30),
      z: createInput("Z:", 1, 30),
    };

    // Store inputs as a class property
    this.inputs = inputs;

    const confirmButton = this.createConfirmButton();
    this.confirmButton = confirmButton;

    const updatePreview = () => {
      const x = parseInt(inputs.x.input.value) - GRID_OFFSET - 1;
      const y = parseInt(inputs.y.input.value) - 1 + 0.5;
      const z = parseInt(inputs.z.input.value) - GRID_OFFSET - 1;
      this.game.updatePreviewPosition(x, y, z);
    };

    Object.values(inputs).forEach(({ input }) => {
      input.addEventListener("input", updatePreview);
    });

    container.appendChild(colorSection);
    container.appendChild(inputs.x.wrapper);
    container.appendChild(inputs.y.wrapper);
    container.appendChild(inputs.z.wrapper);
    container.appendChild(confirmButton);

    updatePreview();

    return container;
  }

  createConfirmButton() {
    const button = document.createElement("button");
    button.className = "position-confirm-button";
    button.textContent = "Place Cube";

    // Function to handle the cube placement
    const handlePlacement = () => {
      console.log("Handle placement called"); // Debug log

      // If already in cooldown or button is disabled, ignore
      if (this.cooldownActive || button.disabled) {
        console.log("Button is in cooldown or disabled, ignoring click");
        return;
      }

      // Immediately disable the button
      button.disabled = true;
      button.style.opacity = "0.5";
      button.style.cursor = "not-allowed";

      const x = parseInt(this.inputs.x.input.value);
      const y = parseInt(this.inputs.y.input.value);
      const z = parseInt(this.inputs.z.input.value);

      // Check if values are valid before placing cube
      if (isNaN(x) || isNaN(y) || isNaN(z)) {
        console.error("Invalid coordinates:", x, y, z);
        button.disabled = false;
        button.style.opacity = "1";
        button.style.cursor = "pointer";
        return;
      }

      // Convert to world coordinates and place cube
      const worldX = x - GRID_OFFSET - 1;
      const worldY = y - 1 + 0.5;
      const worldZ = z - GRID_OFFSET - 1;

      console.log("Attempting to place cube at:", { worldX, worldY, worldZ }); // Debug log

      // Add safety timeout to re-enable button if server doesn't respond
      setTimeout(() => {
        if (!this.cooldownActive) {
          console.log("Safety timeout: Re-enabling button");
          button.disabled = false;
          button.style.opacity = "1";
          button.style.cursor = "pointer";
        }
      }, 5000); // 5 second safety timeout

      try {
        this.game.placeCube(worldX, worldY, worldZ);
        console.log("placeCube called successfully"); // Debug log
      } catch (error) {
        console.error("Error placing cube:", error);
        button.disabled = false;
        button.style.opacity = "1";
        button.style.cursor = "pointer";
      }
    };

    // Use a single touchstart/click handler instead of multiple event listeners
    let touchStarted = false;

    button.addEventListener(
      "touchstart",
      (e) => {
        touchStarted = true;
        // Don't prevent default here to allow the click event to fire naturally
        console.log("Touch start detected"); // Debug log
      },
      { passive: true }
    );

    button.addEventListener("click", (e) => {
      console.log("Click event fired, touchStarted:", touchStarted); // Debug log
      handlePlacement();
    });

    // Clean up touch state
    button.addEventListener(
      "touchend",
      () => {
        touchStarted = false;
      },
      { passive: true }
    );

    // Add mobile-friendly styles
    button.style.cssText += `
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        user-select: none;
        -webkit-user-select: none;
        padding: 12px;
        width: 100%;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        margin-top: 8px;
        transition: all 0.2s ease;
    `;

    return button;
  }

  endCooldown() {
    if (!this.confirmButton) return;

    this.cooldownActive = false;
    this.confirmButton.disabled = false;
    this.confirmButton.textContent = "Place Cube";
    this.confirmButton.style.backgroundColor = "#4CAF50";
    this.confirmButton.style.opacity = "1";
    this.confirmButton.style.cursor = "pointer";
  }

  placeCubeIfAllowed() {
    const x = parseInt(this.inputs.x.input.value) - GRID_OFFSET - 1;
    const y = parseInt(this.inputs.y.input.value) - 1 + 0.5;
    const z = parseInt(this.inputs.z.input.value) - GRID_OFFSET - 1;
    this.game.placeCubeAt(x, y, z);
  }

  setupKeyboardControls() {
    // Prevent duplicate event listeners
    if (this.keyboardControlsActive) return;
    this.keyboardControlsActive = true;

    document.addEventListener("keydown", (e) => {
      // Ignore if an input is focused or cooldown is active
      if (document.activeElement.tagName === "INPUT" || this.cooldownActive) {
        return;
      }

      const updateInput = (input, newValue) => {
        // Ensure value stays within bounds (1-30)
        newValue = Math.max(1, Math.min(30, newValue));
        input.value = newValue;
        input.dispatchEvent(new Event("input")); // Trigger input event to update preview
      };

      switch (e.key.toLowerCase()) {
        case "w": // Forward (decrease Z)
          e.preventDefault();
          updateInput(
            this.inputs.z.input,
            parseInt(this.inputs.z.input.value) - 1
          );
          break;
        case "s": // Backward (increase Z)
          e.preventDefault();
          updateInput(
            this.inputs.z.input,
            parseInt(this.inputs.z.input.value) + 1
          );
          break;
        case "a": // Left (decrease X)
          e.preventDefault();
          updateInput(
            this.inputs.x.input,
            parseInt(this.inputs.x.input.value) - 1
          );
          break;
        case "d": // Right (increase X)
          e.preventDefault();
          updateInput(
            this.inputs.x.input,
            parseInt(this.inputs.x.input.value) + 1
          );
          break;
        case "arrowup": // Up (increase Y)
          e.preventDefault();
          updateInput(
            this.inputs.y.input,
            parseInt(this.inputs.y.input.value) + 1
          );
          break;
        case "arrowdown": // Down (decrease Y)
          e.preventDefault();
          updateInput(
            this.inputs.y.input,
            parseInt(this.inputs.y.input.value) - 1
          );
          break;
        case "enter": // Place cube
          e.preventDefault();
          if (!this.cooldownActive && !this.confirmButton.disabled) {
            const x = parseInt(this.inputs.x.input.value);
            const y = parseInt(this.inputs.y.input.value);
            const z = parseInt(this.inputs.z.input.value);

            if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
              const worldX = x - GRID_OFFSET - 1;
              const worldY = y - 1 + 0.5;
              const worldZ = z - GRID_OFFSET - 1;
              this.game.placeCube(worldX, worldY, worldZ);
            }
          }
          break;
      }
    });
  }
}
