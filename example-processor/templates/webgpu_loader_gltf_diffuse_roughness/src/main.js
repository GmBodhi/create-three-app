import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Inspector } from "three/addons/inspector/Inspector.js";

let camera, scene, renderer, controls;

init();

async function init() {
  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = NeutralToneMapping;
  renderer.inspector = new Inspector();
  document.body.appendChild(renderer.domElement);

  await renderer.init();

  scene = new Scene();
  scene.backgroundBlurriness = 0.5;

  const pmremGenerator = new PMREMGenerator(renderer);
  const envMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

  scene.background = envMap;
  scene.environment = envMap;

  camera = new PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 10);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const gltf = await new GLTFLoader()
    .setPath("models/gltf/")
    .loadAsync("DiffuseRoughnessParameterSweep.glb");
  const model = gltf.scene;

  // The draft sample asset currently uses clockwise triangle winding.
  const geometries = new Set();

  model.traverse(function (object) {
    const geometry = object.geometry;

    if (geometry === undefined) return;

    if (geometries.has(geometry)) return;

    const index = geometry.index;

    for (let i = 0; i < index.count; i += 3) {
      const second = index.getX(i + 1);
      index.setX(i + 1, index.getX(i + 2));
      index.setX(i + 2, second);
    }

    index.needsUpdate = true;
    geometries.add(geometry);
  });

  scene.add(model);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  controls.update();
  renderer.render(scene, camera);
}
