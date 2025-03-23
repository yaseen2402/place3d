import * as THREE from "../three/three.module.min.js";
import { OrbitControls } from "../three/controls/OrbitControls.js";
import { COLORS, GRID_SIZE, CUBE_SIZE, GRID_OFFSET } from "./constants.js";
import { CubeBuilder } from "./CubeBuilder.js";
import { Grid } from "./Grid.js";
import { GameState } from "./GameState.js";

export class Game {
  constructor(callbacks = {}) {
    console.log("Game constructor called");

    // Store callbacks
    this.callbacks = callbacks || {};

    // Debug DOM structure
    console.log("Available elements in the DOM:");
    document.querySelectorAll("*").forEach((el) => {
      if (el.id)
        console.log(`Element with ID: ${el.id}, tagName: ${el.tagName}`);
    });

    // DOM element validation with detailed logging
    const container = document.getElementById("gameContainer");
    console.log("gameContainer element:", container);

    this.container = container;

    if (!this.container) {
      console.error(
        "Game container element not found. Creating fallback container."
      );
      // Create a fallback container if not found
      this.container = document.createElement("div");
      this.container.id = "gameContainer";
      document.body.appendChild(this.container);
      console.log("Created fallback container:", this.container);
    }

    // Ensure container is properly configured
    this.container.style.width = "100%";
    this.container.style.height = "100%";
    this.container.style.position = "relative";

    // Initialize game components
    this.gameState = new GameState();
    this.cubeBuilder = new CubeBuilder();

    // Initialize the game
    this.init();
  }

  init() {
    console.log("Game init called");

    try {
      // Create scene
      this.scene = new THREE.Scene();

      // Remove fog
      // this.scene.fog = new THREE.Fog(0xd3d3d3, 30, 60);

      // Create camera with safe defaults
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      this.camera.position.set(15, 15, 15);
      this.camera.lookAt(0, 0, 0);

      // Create renderer with validation
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setClearColor(0x87ceeb); // Light blue sky color as default
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // Safely append the renderer to the container
      console.log("Appending renderer to container:", this.container);
      if (this.container && typeof this.container.appendChild === "function") {
        this.container.appendChild(this.renderer.domElement);
      } else {
        console.error("Invalid container for renderer:", this.container);
        // Fallback to appending to the body
        document.body.appendChild(this.renderer.domElement);
      }

      // Create grid
      this.grid = new Grid();
      this.grid.addToScene(this.scene);

      // Setup controls
      this.setupControls();

      // Setup lights
      this.setupLights();

      // Setup window resize handler
      window.addEventListener("resize", this.onWindowResize.bind(this));

      console.log("Game initialization complete");
    } catch (error) {
      console.error("Error during game initialization:", error);
    }
  }

  setupLights() {
    // Main ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    // Remove directional light (sun)
    // const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    // directionalLight.position.set(10, 20, 10);
    // directionalLight.castShadow = true;
    // directionalLight.shadow.camera.near = 0.1;
    // directionalLight.shadow.camera.far = 100;
    // directionalLight.shadow.mapSize.width = 2048;
    // directionalLight.shadow.mapSize.height = 2048;
    // this.scene.add(directionalLight);

    // Remove rim lights to avoid reflections
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

  placeCube(x, y, z) {
    console.log("Game.placeCube called with:", x, y, z);

    // Store the coordinates for later use
    const worldCoords = { x, y, z };
    this.gameState.lastPlacedPosition = worldCoords;

    // Convert from world coordinates to storage coordinates
    const cubeData = {
      x: Math.round(x + GRID_OFFSET) + 1,
      y: Math.round(y - 0.5) + 1,
      z: Math.round(z + GRID_OFFSET) + 1,
      color: this.gameState.selectedColor,
    };

    console.log("Converted to storage coordinates:", cubeData);

    // Only send to server, don't place cube yet
    if (this.callbacks.onCubePlaced) {
      console.log("Calling onCubePlaced callback");
      this.callbacks.onCubePlaced(cubeData);
    } else {
      console.error("onCubePlaced callback is not defined");
    }
  }

  placeCubeAt(x, y, z, isStorageCoords = false, color = null) {
    let worldX = x;
    let worldY = y;
    let worldZ = z;

    // Convert storage coordinates to world coordinates if needed
    if (isStorageCoords) {
      worldX = x - 1 - GRID_OFFSET;
      worldY = y - 1 + 0.5;
      worldZ = z - 1 - GRID_OFFSET;
    }

    // Use provided color or fallback to selected color
    const cubeColor = color || this.gameState.selectedColor;

    // Check if there's already a cube at this position and remove it
    const position = new THREE.Vector3(worldX, worldY, worldZ);
    const existingCube = this.gameState.getCube(position);
    if (existingCube && existingCube.parent) {
      existingCube.parent.remove(existingCube);
    }

    // Create and place the new cube
    const cube = this.cubeBuilder.createCube(cubeColor);
    cube.position.set(worldX, worldY, worldZ);
    this.scene.add(cube);
    this.gameState.addCube(cube.position, cube);
  }

  setPositionPanel(panel) {
    this.positionPanel = panel;
  }
}
