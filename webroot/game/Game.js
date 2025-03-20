import * as THREE from "../three/three.module.js";
import { OrbitControls } from "../three/controls/OrbitControls.js";
import { COLORS, GRID_SIZE, CUBE_SIZE, GRID_OFFSET } from "./constants.js";
import { CubeBuilder } from "./CubeBuilder.js";
import { Grid } from "./Grid.js";
import { GameState } from "./GameState.js";

export class Game {
  constructor(container, onCubePlaced) {
    this.container = container;
    this.onCubePlaced = onCubePlaced; // Callback for when a cube is placed
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.controls = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.gameState = new GameState();
    this.cubeBuilder = new CubeBuilder();
    this.grid = new Grid();
    this.previewCube = null;

    this.init();
    this.setupLights();
    this.setupControls();
    this.setupEventListeners();
  }

  init() {
    // Setup renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    // Adjust camera position for 30x30 grid
    this.camera.position.set(GRID_SIZE * 0.6, GRID_SIZE * 0.6, GRID_SIZE * 0.6);
    this.camera.lookAt(0, 0, 0);

    // Add grid to scene
    this.grid.addToScene(this.scene);

    // Set background
    this.scene.background = new THREE.Color(0x87ceeb);
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(10, 20, 0);
    this.scene.add(directionalLight);
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 100;
    this.controls.rotateSpeed = 1.5;
    this.controls.panSpeed = 2.0;

    // Swap mouse buttons
    this.controls.mouseButtons = {
      RIGHT: 0, // Make right click rotate (0 is the primary rotation button)
      LEFT: 2, // Make left click pan (2 is the primary pan button)
      MIDDLE: 1, // Keep middle button as is
    };
  }

  setupEventListeners() {
    window.addEventListener("resize", this.onWindowResize.bind(this));
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  setSelectedColor(color) {
    this.gameState.setSelectedColor(color);

    if (!this.previewCube) {
      // Create preview cube if it doesn't exist
      this.previewCube = this.cubeBuilder.createCube(color);
      this.previewCube.material = this.previewCube.material.clone();
      this.previewCube.material.opacity = 0.5;
      this.previewCube.material.transparent = true;
      this.scene.add(this.previewCube);
    }

    // Add a subtle scale animation when changing colors
    this.previewCube.scale.set(0.9, 0.9, 0.9);
    setTimeout(() => {
      this.previewCube.scale.set(1, 1, 1);
    }, 150);

    // Update the preview cube color with a smooth transition
    const oldMaterial = this.previewCube.material;
    const newMaterial = this.cubeBuilder.createCube(color).material.clone();
    newMaterial.opacity = 0.5;
    newMaterial.transparent = true;
    this.previewCube.material = newMaterial;
    oldMaterial.dispose();
  }

  updatePreviewPosition(x, y, z) {
    if (!this.previewCube) {
      this.previewCube = this.cubeBuilder.createCube(
        this.gameState.selectedColor
      );
      this.previewCube.material = this.previewCube.material.clone();
      this.previewCube.material.opacity = 0.5;
      this.previewCube.material.transparent = true;
      this.scene.add(this.previewCube);
    }

    // Direct position update instead of lerp
    this.previewCube.position.set(x, y, z);
  }

  loadExistingCubes(cubes) {
    if (!cubes) {
      console.log("No existing cubes to load");
      return;
    }

    console.log("Loading existing cubes:", cubes);
    Object.values(cubes).forEach((cubeDataStr) => {
      try {
        const cubeData = JSON.parse(cubeDataStr);
        console.log("Parsing cube data:", cubeData);

        const cube = this.cubeBuilder.createCube(cubeData.color);
        const position = {
          x: parseInt(cubeData.x) - 1 - GRID_OFFSET,
          y: parseInt(cubeData.y) - 1 + 0.5,
          z: parseInt(cubeData.z) - 1 - GRID_OFFSET,
        };

        console.log("Placing cube at position:", position);
        cube.position.set(position.x, position.y, position.z);
        this.scene.add(cube);
        this.gameState.addCube(cube.position, cube);
      } catch (error) {
        console.error(
          "Error parsing cube data:",
          error,
          "Raw data:",
          cubeDataStr
        );
      }
    });
  }

  placeCubeAt(x, y, z) {
    // Add placement animation
    const cube = this.cubeBuilder.createCube(this.gameState.selectedColor);
    cube.position.set(x, y, z);
    cube.scale.set(0, 0, 0);
    this.scene.add(cube);

    // Animate the cube scaling up
    const targetScale = 1;
    const duration = 300; // milliseconds
    const startTime = Date.now();

    const animate = () => {
      const progress = (Date.now() - startTime) / duration;
      if (progress < 1) {
        const scale = targetScale * Math.min(1, progress);
        cube.scale.set(scale, scale, scale);
        requestAnimationFrame(animate);
      } else {
        cube.scale.set(targetScale, targetScale, targetScale);
      }
    };

    animate();
    this.gameState.addCube(cube.position, cube);

    // Convert coordinates back to 1-30 range for storage
    const storageData = {
      x: Math.round(x + GRID_OFFSET) + 1,
      y: Math.round(y - 0.5) + 1,
      z: Math.round(z + GRID_OFFSET) + 1,
      color: this.gameState.selectedColor,
    };

    console.log("Converting to storage coordinates:", storageData);

    if (this.onCubePlaced) {
      this.onCubePlaced(storageData);
    }
  }
}
