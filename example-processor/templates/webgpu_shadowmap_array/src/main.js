import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { mx_fractal_noise_vec3, positionWorld, Fn, color } from "three/tsl";

import { TileShadowNode } from "three/addons/tsl/shadows/TileShadowNode.js";
import { TileShadowNodeHelper } from "three/addons/tsl/shadows/TileShadowNodeHelper.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import Stats from "stats-gl";

let camera, scene, renderer, clock;
let dirLight, stats;
let torusKnot, dirGroup;
let tsmHelper;

init();

async function init() {
  // Renderer setup
  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = BasicShadowMap;
  // renderer.shadowMap.type = PCFSoftShadowMap;

  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.body.appendChild(renderer.domElement);

  await renderer.init();
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(45, 60, 100);

  scene = new Scene();
  scene.backgroundNode = color(0xccccff); // Brighter blue sky
  scene.fog = new Fog(0xccccff, 700, 1000);

  // Enhanced lighting for a brighter scene
  scene.add(new AmbientLight(0xccccff, 3));

  // Main directional light (sun)
  dirLight = new DirectionalLight(0xffffaa, 5);
  dirLight.position.set(0, 80, 30);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 200;
  dirLight.shadow.camera.right = 180;
  dirLight.shadow.camera.left = -180;
  dirLight.shadow.camera.top = 180;
  dirLight.shadow.camera.bottom = -160;
  dirLight.shadow.mapSize.width = 1024 * 4;
  dirLight.shadow.mapSize.height = 1024 * 4;
  dirLight.shadow.radius = 1;
  dirLight.shadow.bias = -0.005;

  // Set up the tile shadow mapping
  const tsm = new TileShadowNode(dirLight, {
    tilesX: 2,
    tilesY: 2,
  });

  dirLight.shadow.shadowNode = tsm;
  scene.add(dirLight);

  tsmHelper = new TileShadowNodeHelper(tsm);
  scene.add(tsmHelper);

  dirGroup = new Group();
  dirGroup.add(dirLight);
  scene.add(dirGroup);

  // Create the ground with enhanced texture
  const planeGeometry = new PlaneGeometry(1500, 1500, 2, 2);
  const planeMaterial = new MeshPhongMaterial({
    color: 0x88aa44,
    shininess: 5,
    specular: 0x222222,
  });

  planeMaterial.colorNode = Fn(() => {
    const noise = mx_fractal_noise_vec3(positionWorld.mul(0.05)).saturate();
    // Mix of greens and browns for a more natural ground
    const green = color(0.4, 0.7, 0.3);
    const brown = color(0.6, 0.5, 0.3);
    return noise.x.mix(green, brown);
  })();

  const ground = new Mesh(planeGeometry, planeMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Spread various objects across the scene
  createScenery();

  // Camera controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 5, 0);
  controls.minDistance = 0.01;
  controls.maxDistance = 400;
  controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent camera from going below ground
  controls.update();

  stats = new Stats({
    precision: 3,
    horizontal: false,
    trackGPU: true,
  });
  stats.init(renderer);
  document.body.appendChild(stats.dom);

  clock = new Clock();

  window.addEventListener("resize", resize);
}

function createScenery() {
  // 1. Columns using instanced mesh
  const columnGeometry = new CylinderGeometry(0.8, 1, 1, 16);
  const columnMaterial = new MeshPhongMaterial({
    color: 0xdddddd,
    shininess: 20,
  });

  const columnPositions = [];
  const columnScales = [];

  for (let x = -100; x <= 100; x += 40) {
    for (let z = -100; z <= 100; z += 40) {
      if (Math.random() > 0.3) {
        const height = 5 + Math.random() * 10;
        const posX = x + (Math.random() * 10 - 5);
        const posY = height / 2;
        const posZ = z + (Math.random() * 10 - 5);

        columnPositions.push(posX, posY, posZ);
        columnScales.push(1, height, 1); // Only scale Y to match height
      }
    }
  }

  const columnCount = columnPositions.length / 3;
  const columnInstancedMesh = new InstancedMesh(
    columnGeometry,
    columnMaterial,
    columnCount
  );

  const matrix = new Matrix4();
  for (let i = 0; i < columnCount; i++) {
    const x = columnPositions[i * 3];
    const y = columnPositions[i * 3 + 1];
    const z = columnPositions[i * 3 + 2];
    const scaleY = columnScales[i * 3 + 1];

    matrix.makeScale(1, scaleY, 1);
    matrix.setPosition(x, y, z);
    columnInstancedMesh.setMatrixAt(i, matrix);
  }

  columnInstancedMesh.castShadow = true;
  columnInstancedMesh.receiveShadow = true;
  scene.add(columnInstancedMesh);

  // 2. Add a central feature - the torus knot (kept as regular mesh for animation)
  const torusKnotGeometry = new TorusKnotGeometry(25, 8, 100, 30);
  const torusKnotMaterial = new MeshPhongNodeMaterial({
    color: 0xff6347, // Tomato color
    shininess: 30,
  });

  torusKnot = new Mesh(torusKnotGeometry, torusKnotMaterial);
  torusKnot.scale.multiplyScalar(1 / 18);
  torusKnot.position.x = 5;
  torusKnot.position.y = 5;
  torusKnot.castShadow = true;
  torusKnot.receiveShadow = true;
  scene.add(torusKnot);

  // 3. Cubes using instanced mesh
  const cubeGeometry = new BoxGeometry(3, 3, 3);
  const cubeMaterials = [
    new MeshPhongMaterial({ color: 0x6699cc, shininess: 20 }),
    new MeshPhongMaterial({ color: 0xcc6666, shininess: 20 }),
    new MeshPhongMaterial({ color: 0xcccc66, shininess: 20 }),
  ];

  const cubeCount = 10;
  const cubeInstances = cubeMaterials.map((material) => {
    return new InstancedMesh(cubeGeometry, material, cubeCount);
  });

  for (let i = 0; i < 30; i++) {
    const materialIndex = i % 3;
    const instanceIndex = Math.floor(i / 3);

    const x = Math.random() * 300 - 150;
    const y = 1.5;
    const z = Math.random() * 300 - 150;
    const rotY = Math.random() * Math.PI * 2;

    matrix.makeRotationY(rotY);
    matrix.setPosition(x, y, z);

    cubeInstances[materialIndex].setMatrixAt(instanceIndex, matrix);
  }

  cubeInstances.forEach((instance) => {
    instance.castShadow = true;
    instance.receiveShadow = true;
    scene.add(instance);
  });

  // 4. Spheres using instanced mesh
  const sphereGeometry = new SphereGeometry(2, 32, 32);
  const sphereMaterial = new MeshPhongMaterial({
    color: 0x88ccaa,
    shininess: 40,
  });

  const sphereCount = 25;
  const sphereInstancedMesh = new InstancedMesh(
    sphereGeometry,
    sphereMaterial,
    sphereCount
  );

  for (let i = 0; i < sphereCount; i++) {
    const x = Math.random() * 180 - 90;
    const y = 2;
    const z = Math.random() * 180 - 90;

    matrix.makeScale(1, 1, 1);
    matrix.setPosition(x, y, z);
    sphereInstancedMesh.setMatrixAt(i, matrix);
  }

  sphereInstancedMesh.castShadow = true;
  sphereInstancedMesh.receiveShadow = true;
  scene.add(sphereInstancedMesh);

  // 5. Trees using instanced mesh for trunks and tops separately
  const trunkGeometry = new CylinderGeometry(0.5, 0.5, 2, 8);
  const topGeometry = new ConeGeometry(2, 8, 8);
  const treeMaterial = new MeshPhongMaterial({
    vertexColors: true,
    shininess: 5,
  });

  const treeCount = 40;
  const totalInstanceCount = treeCount * 2;

  const trunkVertexCount = trunkGeometry.attributes.position.count;
  const trunkIndexCount = trunkGeometry.index ? trunkGeometry.index.count : 0;
  const topVertexCount = topGeometry.attributes.position.count;
  const topIndexCount = topGeometry.index ? topGeometry.index.count : 0;

  const totalVertexCount = (trunkVertexCount + topVertexCount) * 2; // Multiple for safety
  const totalIndexCount = (trunkIndexCount + topIndexCount) * 2;
  const treeBatchedMesh = new BatchedMesh(
    totalInstanceCount,
    totalVertexCount,
    totalIndexCount,
    treeMaterial
  );
  treeBatchedMesh.castShadow = true;
  treeBatchedMesh.perObjectFrustumCulled = false;
  const trunkGeometryId = treeBatchedMesh.addGeometry(trunkGeometry);
  const topGeometryId = treeBatchedMesh.addGeometry(topGeometry);

  const trunkColor = new Color(0x8b4513);
  const topColor = new Color(0x336633);

  for (let i = 0; i < treeCount; i++) {
    const x = Math.random() * 300 - 150;
    const z = Math.random() * 300 - 150;

    const trunkId = treeBatchedMesh.addInstance(trunkGeometryId);
    matrix.makeScale(1, 1, 1);
    matrix.setPosition(x, 1, z);
    treeBatchedMesh.setMatrixAt(trunkId, matrix);
    treeBatchedMesh.setColorAt(trunkId, trunkColor);

    const topId = treeBatchedMesh.addInstance(topGeometryId);
    matrix.makeScale(1, 1, 1);
    matrix.setPosition(x, 6, z);
    treeBatchedMesh.setMatrixAt(topId, matrix);
    treeBatchedMesh.setColorAt(topId, topColor);
  }

  scene.add(treeBatchedMesh);

  // 6. Torus shapes using instanced mesh
  const torusGeometry = new TorusGeometry(3, 1, 16, 50);
  const torusMaterial = new MeshPhongMaterial({
    color: 0xff99cc,
    shininess: 30,
  });

  const torusCount = 15;
  const torusInstancedMesh = new InstancedMesh(
    torusGeometry,
    torusMaterial,
    torusCount
  );

  for (let i = 0; i < torusCount; i++) {
    const x = Math.random() * 320 - 160;
    const y = 2;
    const z = Math.random() * 320 - 160;
    const rotZ = Math.random() * Math.PI * 2;

    // Apply rotation (PI/2 on X-axis and random on Z-axis)
    matrix.makeRotationX(Math.PI / 2);
    const rotMatrix = new Matrix4().makeRotationZ(rotZ);
    matrix.multiply(rotMatrix);
    matrix.setPosition(x, y, z);

    torusInstancedMesh.setMatrixAt(i, matrix);
  }

  torusInstancedMesh.castShadow = true;
  torusInstancedMesh.receiveShadow = true;
  scene.add(torusInstancedMesh);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function animate(time) {
  const delta = clock.getDelta();

  // Rotate the central torus knot
  torusKnot.rotation.x += 0.25 * delta;
  torusKnot.rotation.y += 0.5 * delta;
  torusKnot.rotation.z += 1 * delta;

  dirLight.position.x = Math.sin(time * 0.0001) * 30;
  dirLight.position.z = Math.cos(time * 0.0001) * 30;

  renderer.render(scene, camera);

  tsmHelper.update();

  await renderer.resolveTimestampsAsync();
  stats.update();
}
