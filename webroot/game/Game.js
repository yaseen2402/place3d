import * as THREE from "../three/three.module.js";
import { OrbitControls } from "../three/controls/OrbitControls.js";
import { COLORS, GRID_SIZE, CUBE_SIZE } from "./constants.js";
import { CubeBuilder } from "./CubeBuilder.js";
import { Grid } from "./Grid.js";
import { GameState } from "./GameState.js";

export class Game {
  constructor(container) {
    this.container = container;
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

    // Setup camera
    this.camera.position.set(GRID_SIZE, GRID_SIZE, GRID_SIZE);
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

    if (this.previewCube) {
      this.scene.remove(this.previewCube);
    }

    this.previewCube = this.cubeBuilder.createCube(color);
    this.previewCube.material = this.previewCube.material.clone();
    this.previewCube.material.opacity = 0.5;
    this.previewCube.material.transparent = true;
    this.scene.add(this.previewCube);
    this.updatePreviewPosition(-24.5, 0, -24.5); // Default position
  }

  updatePreviewPosition(x, y, z) {
    if (this.previewCube) {
      this.previewCube.position.set(x, y, z);
    }
  }

  placeCubeAt(x, y, z) {
    if (!this.previewCube) return;

    const position = new THREE.Vector3(x, y, z);
    const cube = this.cubeBuilder.createCube(this.gameState.selectedColor);
    cube.position.copy(position);
    this.scene.add(cube);
    this.gameState.addCube(position, cube);
  }
}
