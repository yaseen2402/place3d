import { COLORS, GRID_SIZE, GRID_OFFSET } from "./constants.js";

export class PositionPanel {
  constructor(game) {
    this.game = game;
    this.isVisible = true;
    this.selectedColorButton = null; // Track selected color button
    this.confirmButton = null;
    this.cooldownActive = false;
    this.inputs = null; // Add this line to store inputs
    this.panel = this.createPanel();
    document.body.appendChild(this.panel);
  }

  startCooldown(seconds, isActiveNotification = false) {
    if (!this.confirmButton) return;

    this.cooldownActive = true;
    this.confirmButton.disabled = true;
    let remainingTime = seconds;

    const updateButton = () => {
      this.confirmButton.textContent = `Wait ${remainingTime}s`;
      this.confirmButton.style.backgroundColor = "#999";
      this.confirmButton.style.cursor = "not-allowed";
    };

    updateButton();

    // Only show toast message if this is an active cooldown notification
    if (isActiveNotification) {
      this.showToast(
        `Please wait ${seconds} seconds before placing another cube`
      );
    }

    const cooldownInterval = setInterval(() => {
      remainingTime--;
      if (remainingTime <= 0) {
        clearInterval(cooldownInterval);
        this.cooldownActive = false;
        this.confirmButton.disabled = false;
        this.confirmButton.textContent = "Place Cube";
        this.confirmButton.style.backgroundColor = "#4CAF50";
        this.confirmButton.style.cursor = "pointer";
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

    // Enhanced Color Selection Section
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

    Object.entries(COLORS).forEach(([name, color]) => {
      const colorButton = document.createElement("button");
      colorButton.style.cssText = `
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
      colorButton.title = name;

      colorButton.onclick = () => {
        // Remove highlight from previous selection
        if (this.selectedColorButton) {
          this.selectedColorButton.style.transform = "scale(1)";
          this.selectedColorButton.style.boxShadow =
            "0 2px 5px rgba(0,0,0,0.1)";
        }

        // Highlight new selection
        colorButton.style.transform = "scale(1.1)";
        colorButton.style.boxShadow = `0 4px 10px ${color}80`;
        this.selectedColorButton = colorButton;

        // Create ripple effect
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
        colorButton.appendChild(ripple);
        requestAnimationFrame(() => (ripple.style.transform = "scale(4)"));
        setTimeout(() => ripple.remove(), 400);

        this.game.setSelectedColor(color);
      };

      colorSection.appendChild(colorButton);
    });

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
      input.inputMode = "numeric"; // Better for mobile numeric keyboards
      input.min = min;
      input.max = max;
      input.value = "1";

      // Make sure input values are parsed as numbers
      input.addEventListener("change", () => {
        // Ensure the value is a number and within range
        let val = parseInt(input.value) || min;
        val = Math.max(min, Math.min(max, val));
        input.value = val.toString();
      });

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

    const confirmButton = document.createElement("button");
    this.confirmButton = confirmButton;
    confirmButton.textContent = "Place Cube";
    confirmButton.style.cssText = `
      padding: 10px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 8px;
      width: 100%;
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 2px 5px rgba(76, 175, 80, 0.3);
    `;

    confirmButton.addEventListener("mouseenter", () => {
      confirmButton.style.transform = "translateY(-2px)";
      confirmButton.style.boxShadow = "0 4px 10px rgba(76, 175, 80, 0.4)";
    });

    confirmButton.addEventListener("mouseleave", () => {
      confirmButton.style.transform = "translateY(0)";
      confirmButton.style.boxShadow = "0 2px 5px rgba(76, 175, 80, 0.3)";
    });

    confirmButton.addEventListener("mousedown", () => {
      confirmButton.style.transform = "scale(0.98)";
    });

    confirmButton.addEventListener("mouseup", () => {
      confirmButton.style.transform = "scale(1)";
    });

    const updatePreview = () => {
      const x = parseInt(inputs.x.input.value) - GRID_OFFSET - 1;
      const y = parseInt(inputs.y.input.value) - 1 + 0.5;
      const z = parseInt(inputs.z.input.value) - GRID_OFFSET - 1;
      this.game.updatePreviewPosition(x, y, z);
    };

    Object.values(inputs).forEach(({ input }) => {
      input.addEventListener("input", updatePreview);
    });

    confirmButton.addEventListener("click", () => {
      console.log("Place cube button clicked");

      if (this.cooldownActive) {
        console.log("Cooldown is active, ignoring click");
        return; // Prevent action if cooldown is active
      }

      try {
        console.log("Getting position values from inputs");
        const x = parseInt(inputs.x.input.value) - GRID_OFFSET - 1;
        const y = parseInt(inputs.y.input.value) - 1 + 0.5;
        const z = parseInt(inputs.z.input.value) - GRID_OFFSET - 1;

        console.log("Position values:", { x, y, z });
        console.log("Calling game.placeCube with position values");

        // Call game's placeCube method which will handle the cooldown check
        this.game.placeCube(x, y, z);

        console.log("game.placeCube called successfully");
      } catch (error) {
        console.error("Error in Place Cube button click handler:", error);
      }
    });

    container.appendChild(colorSection);
    container.appendChild(inputs.x.wrapper);
    container.appendChild(inputs.y.wrapper);
    container.appendChild(inputs.z.wrapper);
    container.appendChild(confirmButton);

    updatePreview();
    return container;
  }

  placeCubeIfAllowed() {
    const x = parseInt(this.inputs.x.input.value) - GRID_OFFSET - 1;
    const y = parseInt(this.inputs.y.input.value) - 1 + 0.5;
    const z = parseInt(this.inputs.z.input.value) - GRID_OFFSET - 1;
    this.game.placeCubeAt(x, y, z);
  }
}
