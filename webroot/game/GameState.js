export class GameState {
  constructor() {
    this.cubes = new Map(); // Stores position -> cube data
    this.selectedColor = "#ff0000"; // Default red
  }

  setSelectedColor(color) {
    this.selectedColor = color;
  }

  addCube(position, cube) {
    const key = `${position.x},${position.y},${position.z}`;
    if (this.cubes.has(key)) {
      // Remove existing cube from scene
      const existingCube = this.cubes.get(key);
      existingCube.parent.remove(existingCube);
    }
    this.cubes.set(key, cube);
  }

  getCube(position) {
    const key = `${position.x},${position.y},${position.z}`;
    return this.cubes.get(key);
  }
}
