import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { texture, equirectUV } from "three/tsl";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, scene, renderer;
let controls;

init();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.25,
    20
  );
  camera.position.set(1, 0, 0);

  const equirectTexture = new TextureLoader().load(
    "textures/2294472375_24a3b8ef46_o.jpg"
  );
  equirectTexture.colorSpace = SRGBColorSpace;

  scene = new Scene();
  scene.backgroundNode = texture(equirectTexture, equirectUV(), 0);

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(render);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = true;
  controls.rotateSpeed = -0.125; // negative, to track mouse pointer
  controls.autoRotateSpeed = 1.0;

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  controls.update();

  renderer.render(scene, camera);
}

const gui = new GUI();

const params = {
  intensity: 1.0,
};
gui.add(params, "intensity", 0, 1).onChange(function (value) {
  scene.backgroundIntensity = value;
  render();
});
