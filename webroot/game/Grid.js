import * as THREE from "../three/three.module.js";
import { GRID_SIZE, CUBE_SIZE } from "./constants.js";

export class Grid {
  constructor() {
    this.createPlatform();
    this.createGridLines();
  }

  createPlatform() {
    // Main platform with texture
    const platformGeometry = new THREE.BoxGeometry(
      GRID_SIZE * CUBE_SIZE,
      CUBE_SIZE / 4,
      GRID_SIZE * CUBE_SIZE
    );

    // Create a checkerboard texture for the platform
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.height = 512;
    const size = 64;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#d3d3d3" : "#a9a9a9";
        ctx.fillRect(x * size, y * size, size, size);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    const platformMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.3,
      metalness: 0.5,
      emissive: new THREE.Color(0xa9a9a9),
      emissiveIntensity: 0.2,
    });

    this.platform = new THREE.Mesh(platformGeometry, platformMaterial);
    this.platform.position.y = -CUBE_SIZE / 8;
    this.platform.receiveShadow = true;
  }

  createGridLines() {
    // Enhanced grid helper with neutral color
    this.gridHelper = new THREE.GridHelper(
      GRID_SIZE * CUBE_SIZE,
      GRID_SIZE,
      0x808080,
      0x606060
    );
    this.gridHelper.position.y = 0.01; // Slightly above platform
    this.gridHelper.material.transparent = true;
    this.gridHelper.material.opacity = 0.4;
  }

  addToScene(scene) {
    scene.add(this.platform);
    scene.add(this.gridHelper);
  }
}
