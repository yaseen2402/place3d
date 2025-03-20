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
    const existingCube = this.cubes.get(key);

    // Only try to remove if the cube exists and has a parent
    if (existingCube && existingCube.parent) {
      existingCube.parent.remove(existingCube);
    }

    this.cubes.set(key, cube);
  }

  getCube(position) {
    const key = `${position.x},${position.y},${position.z}`;
    return this.cubes.get(key);
  }
}
