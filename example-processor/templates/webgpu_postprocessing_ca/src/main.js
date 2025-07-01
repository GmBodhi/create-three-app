import "./style.css"; // For webpack support

import {
  Vector2,
  WebGPURenderer,
  PerspectiveCamera,
  Scene,
  Color,
  PMREMGenerator,
  Clock,
  Group,
  GridHelper,
  PostProcessing,
  MeshStandardMaterial,
  BoxGeometry,
  SphereGeometry,
  ConeGeometry,
  CylinderGeometry,
  TorusGeometry,
  OctahedronGeometry,
  IcosahedronGeometry,
  TorusKnotGeometry,
  Mesh,
  BufferGeometry,
  BufferAttribute,
  PointsMaterial,
  Points,
} from "three";
import { pass, renderOutput, uniform } from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { chromaticAberration } from "three/addons/tsl/display/ChromaticAberrationNode.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

const params = {
  enabled: true,
  animated: true,
  strength: 1.5,
  center: new Vector2(0.5, 0.5),
  scale: 1.2,
  autoRotate: true,
  cameraDistance: 40,
};

let camera, scene, renderer, clock, mainGroup;
let controls, postProcessing;

init();

async function init() {
  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 15, params.cameraDistance);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.autoRotate = true;
  controls.autoRotateSpeed = -0.1;
  controls.target.set(0, 0.5, 0);
  controls.update();

  scene = new Scene();
  scene.background = new Color(0x0a0a0a);

  const pmremGenerator = new PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(
    new RoomEnvironment(),
    0.04
  ).texture;

  clock = new Clock();

  // Create main group
  mainGroup = new Group();
  scene.add(mainGroup);

  // Create shapes
  createShapes();

  // Add a grid for reference
  const gridHelper = new GridHelper(40, 20, 0x444444, 0x222222);
  gridHelper.position.y = -10;
  scene.add(gridHelper);

  // post processing
  postProcessing = new PostProcessing(renderer);
  postProcessing.outputColorTransform = false;

  // scene pass
  const scenePass = pass(scene, camera);
  const outputPass = renderOutput(scenePass);

  // Create uniform nodes for the static version that can be updated
  const staticStrength = uniform(params.strength);
  const staticCenter = uniform(new Vector2(params.center.x, params.center.y));
  const staticScale = uniform(params.scale);

  // With static values (using uniform nodes)
  const caPass = chromaticAberration(
    outputPass,
    staticStrength,
    staticCenter,
    staticScale
  );

  // Set initial output based on params
  postProcessing.outputNode = params.enabled ? caPass : outputPass;

  window.addEventListener("resize", onWindowResize);

  // GUI

  const gui = new GUI();
  gui.title("Chromatic Aberration");

  gui.add(params, "enabled").onChange((value) => {
    postProcessing.outputNode = value ? caPass : outputPass;
    postProcessing.needsUpdate = true;
  });

  const staticFolder = gui.addFolder("Static Parameters");

  staticFolder.add(staticStrength, "value", 0, 3).name("Strength");
  staticFolder.add(staticCenter.value, "x", -1, 1).name("Center X");
  staticFolder.add(staticCenter.value, "y", -1, 1).name("Center Y");
  staticFolder.add(staticScale, "value", 0.5, 2).name("Scale");

  const animationFolder = gui.addFolder("Animation");
  animationFolder.add(params, "animated");
  animationFolder.add(params, "autoRotate").onChange((value) => {
    controls.autoRotate = value;
  });
}

function createShapes() {
  const shapes = [];
  const materials = [];

  // Define colors for different materials
  const colors = [
    0xff0000, // Red
    0x00ff00, // Green
    0x0000ff, // Blue
    0xffff00, // Yellow
    0xff00ff, // Magenta
    0x00ffff, // Cyan
    0xffffff, // White
    0xff8800, // Orange
  ];

  // Create materials
  colors.forEach((color) => {
    materials.push(
      new MeshStandardMaterial({
        color: color,
        roughness: 0.2,
        metalness: 0.8,
      })
    );
  });

  // Create geometries
  const geometries = [
    new BoxGeometry(3, 3, 3),
    new SphereGeometry(2, 32, 16),
    new ConeGeometry(2, 4, 8),
    new CylinderGeometry(1.5, 1.5, 4, 8),
    new TorusGeometry(2, 0.8, 8, 16),
    new OctahedronGeometry(2.5),
    new IcosahedronGeometry(2.5),
    new TorusKnotGeometry(1.5, 0.5, 64, 8),
  ];

  // Create central showcase
  const centralGroup = new Group();

  // Large central torus
  const centralTorus = new Mesh(
    new TorusGeometry(5, 1.5, 16, 32),
    new MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 1,
      emissive: 0x222222,
    })
  );
  centralGroup.add(centralTorus);

  // Inner rotating shapes
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const radius = 3;

    const mesh = new Mesh(
      geometries[i % geometries.length],
      materials[i % materials.length]
    );

    mesh.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);

    mesh.scale.setScalar(0.5);
    centralGroup.add(mesh);
    shapes.push(mesh);
  }

  mainGroup.add(centralGroup);
  shapes.push(centralGroup);

  // Create outer ring of shapes
  const numShapes = 12;
  const outerRadius = 15;

  for (let i = 0; i < numShapes; i++) {
    const angle = (i / numShapes) * Math.PI * 2;
    const shapesGroup = new Group();

    const geometry = geometries[i % geometries.length];
    const material = materials[i % materials.length];

    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    shapesGroup.add(mesh);
    shapesGroup.position.set(
      Math.cos(angle) * outerRadius,
      Math.sin(i * 0.5) * 2,
      Math.sin(angle) * outerRadius
    );

    mainGroup.add(shapesGroup);
    shapes.push(shapesGroup);
  }

  // Add floating particles
  const particlesGeometry = new BufferGeometry();
  const particlesCount = 200;
  const positions = new Float32Array(particlesCount * 3);

  for (let i = 0; i < particlesCount * 3; i += 3) {
    const radius = 25 + Math.random() * 10;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    positions[i] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i + 1] = radius * Math.cos(phi);
    positions[i + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  particlesGeometry.setAttribute("position", new BufferAttribute(positions, 3));

  const particlesMaterial = new PointsMaterial({
    color: 0xffffff,
    size: 0.5,
    sizeAttenuation: true,
  });

  const particles = new Points(particlesGeometry, particlesMaterial);
  mainGroup.add(particles);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const time = clock.getElapsedTime();

  controls.update();

  if (params.animated) {
    // Animate individual shapes
    mainGroup.children.forEach((child, index) => {
      if (child.children.length > 0) {
        // Central group
        child.rotation.y = time * 0.5;
        child.children.forEach((subChild, subIndex) => {
          if (subChild.geometry) {
            subChild.rotation.x = time * (1 + subIndex * 0.1);
            subChild.rotation.z = time * (1 - subIndex * 0.1);
          }
        });
      } else if (child.type === "Group") {
        // Outer shapes
        child.rotation.x = time * 0.5 + index;
        child.rotation.y = time * 0.3 + index;
        child.position.y = Math.sin(time + index) * 2;
      }
    });
  }

  postProcessing.render();
}
