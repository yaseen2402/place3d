import * as THREE from "../three/three.module.js";
import { CUBE_SIZE, COLORS } from "./constants.js";

export class CubeBuilder {
  constructor() {
    // Create geometry once and reuse
    this.geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    this.materials = new Map();

    // Pre-create materials for known colors
    Object.values(COLORS).forEach((color) => {
      this.materials.set(
        color,
        new THREE.MeshPhongMaterial({
          color: color,
          shininess: 30,
          flatShading: true,
        })
      );
    });
  }

  getMaterial(color) {
    if (!this.materials.has(color)) {
      this.materials.set(
        color,
        new THREE.MeshPhongMaterial({
          color: color,
          shininess: 30,
          flatShading: true,
        })
      );
    }
    return this.materials.get(color);
  }

  createCube(color) {
    // Reuse existing material if available
    const material = this.materials.get(color);
    return new THREE.Mesh(this.geometry, material);
  }
}
