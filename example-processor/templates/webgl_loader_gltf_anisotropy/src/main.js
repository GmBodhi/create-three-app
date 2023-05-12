import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  ACESFilmicToneMapping,
  Scene,
  PerspectiveCamera,
  EquirectangularReflectionMapping,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

let renderer, scene, camera, controls;

init().catch(function (err) {
  console.error(err);
});

async function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.25,
    20
  );
  camera.position.set(0.35, 0.05, 0.35);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render);
  controls.target.set(0, -0.05, 0.1);
  controls.update();

  const rgbeLoader = new RGBELoader().setPath("textures/equirectangular/");

  const gltfLoader = new GLTFLoader().setPath("models/gltf/");

  const [texture, gltf] = await Promise.all([
    rgbeLoader.loadAsync("venice_sunset_1k.hdr"),
    gltfLoader.loadAsync("AnisotropyBarnLamp.glb"),
  ]);

  // environment

  texture.mapping = EquirectangularReflectionMapping;

  scene.background = texture;
  scene.environment = texture;

  // model

  scene.add(gltf.scene);

  render();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

function render() {
  renderer.render(scene, camera);
}
