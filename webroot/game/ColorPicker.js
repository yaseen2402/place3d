import { COLORS } from "./constants.js";

export class ColorPicker {
  constructor(game) {
    this.game = game;
    this.element = this.createColorPicker();
    document.body.appendChild(this.element);
  }

  createColorPicker() {
    const container = document.createElement("div");
    container.style.cssText = `
            position: fixed;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255, 255, 255, 0.8);
            padding: 10px;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;

    Object.entries(COLORS).forEach(([name, color]) => {
      const button = document.createElement("button");
      button.style.cssText = `
                width: 40px;
                height: 40px;
                border: 2px solid #333;
                border-radius: 4px;
                background: ${color};
                cursor: pointer;
            `;
      button.onclick = () => this.game.setSelectedColor(color);
      container.appendChild(button);
    });

    return container;
  }
}
