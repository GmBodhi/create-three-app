import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

let renderer, scene, camera, controls;

init();

async function init() {
  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(render);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  document.body.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.01,
    10
  );
  camera.position.set(-0.35, -0.2, 0.35);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, -0.08, 0.11);
  controls.minDistance = 0.1;
  controls.maxDistance = 2;
  controls.addEventListener("change", render);
  controls.update();

  const rgbeLoader = new RGBELoader().setPath("textures/equirectangular/");
  const gltfLoader = new GLTFLoader().setPath("models/gltf/");

  const [texture, gltf] = await Promise.all([
    rgbeLoader.loadAsync("royal_esplanade_1k.hdr"),
    gltfLoader.loadAsync("AnisotropyBarnLamp.glb"),
  ]);

  // environment

  texture.mapping = EquirectangularReflectionMapping;

  scene.background = texture;
  scene.backgroundBlurriness = 0.5;
  scene.environment = texture;

  // model

  scene.add(gltf.scene);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  renderer.renderAsync(scene, camera);
}
