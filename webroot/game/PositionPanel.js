import { COLORS } from "./constants.js";

export class PositionPanel {
  constructor(game) {
    this.game = game;
    this.panel = this.createPanel();
    document.body.appendChild(this.panel);
  }

  createPanel() {
    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed;
      left: 20px;
      bottom: 20px;
      background: rgba(255, 255, 255, 0.9);
      padding: 12px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-family: Arial, sans-serif;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      width: 180px;
    `;

    // Color Selection Section
    const colorSection = document.createElement("div");
    colorSection.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
      margin-bottom: 8px;
    `;

    Object.entries(COLORS).forEach(([name, color]) => {
      const colorButton = document.createElement("button");
      colorButton.style.cssText = `
        width: 100%;
        aspect-ratio: 1;
        border: 2px solid #333;
        border-radius: 4px;
        background: ${color};
        cursor: pointer;
        transition: transform 0.1s;
      `;
      colorButton.title = name;
      colorButton.onclick = () => this.game.setSelectedColor(color);
      colorSection.appendChild(colorButton);
    });

    // Position Inputs Section
    const inputsContainer = document.createElement("div");
    inputsContainer.style.cssText = `
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 8px 4px;
      align-items: center;
    `;

    const createInput = (label, min, max) => {
      const labelElement = document.createElement("label");
      labelElement.textContent = label;
      labelElement.style.fontSize = "14px";

      const input = document.createElement("input");
      input.type = "number";
      input.min = min;
      input.max = max;
      input.value = "1";
      input.style.cssText = `
        width: 50px;
        padding: 4px;
        border: 1px solid #ccc;
        border-radius: 4px;
      `;

      return { labelElement, input };
    };

    const inputs = {
      y: createInput("Y:", 1, 50),
      x: createInput("X:", 1, 50),
      z: createInput("Z:", 1, 50),
    };

    Object.values(inputs).forEach(({ labelElement, input }) => {
      inputsContainer.appendChild(labelElement);
      inputsContainer.appendChild(input);
    });

    const confirmButton = document.createElement("button");
    confirmButton.textContent = "Place Cube";
    confirmButton.style.cssText = `
      padding: 6px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-top: 4px;
      width: 100%;
    `;

    const updatePreview = () => {
      const x = parseInt(inputs.x.input.value) - 1 - 24.5;
      const y = parseInt(inputs.y.input.value) - 1;
      const z = parseInt(inputs.z.input.value) - 1 - 24.5;
      this.game.updatePreviewPosition(x, y, z);
    };

    Object.values(inputs).forEach(({ input }) => {
      input.addEventListener("input", updatePreview);
    });

    confirmButton.addEventListener("click", () => {
      const x = parseInt(inputs.x.input.value) - 1 - 24.5;
      const y = parseInt(inputs.y.input.value) - 1;
      const z = parseInt(inputs.z.input.value) - 1 - 24.5;
      this.game.placeCubeAt(x, y, z);
    });

    container.appendChild(colorSection);
    container.appendChild(inputsContainer);
    container.appendChild(confirmButton);

    updatePreview();
    return container;
  }
}
