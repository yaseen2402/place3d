import * as THREE from "../three/three.module.js";
import { CUBE_SIZE } from "./constants.js";

export class CubeBuilder {
  constructor() {
    this.geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    this.materials = new Map();
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
    return new THREE.Mesh(this.geometry, this.getMaterial(color));
  }
}
