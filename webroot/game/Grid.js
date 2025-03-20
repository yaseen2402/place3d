import * as THREE from "../three/three.module.js";
import { GRID_SIZE, CUBE_SIZE } from "./constants.js";

export class Grid {
  constructor() {
    // Create base platform
    const platformGeometry = new THREE.BoxGeometry(
      GRID_SIZE * CUBE_SIZE,
      CUBE_SIZE / 4,
      GRID_SIZE * CUBE_SIZE
    );
    const platformMaterial = new THREE.MeshPhongMaterial({
      color: 0x808080,
      shininess: 0,
    });
    this.platform = new THREE.Mesh(platformGeometry, platformMaterial);
    this.platform.position.y = -CUBE_SIZE / 8;

    // Create grid helper
    this.gridHelper = new THREE.GridHelper(
      GRID_SIZE * CUBE_SIZE,
      GRID_SIZE,
      0x000000,
      0x888888
    );
    this.gridHelper.position.y = 0;
  }

  addToScene(scene) {
    scene.add(this.platform);
    scene.add(this.gridHelper);
  }
}
