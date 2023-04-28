import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Clock,
  LoadingManager,
  AmbientLight,
  DirectionalLight,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { ColladaLoader } from "three/addons/loaders/ColladaLoader.js";

let container, stats, clock;
let camera, scene, renderer, elf;

init();
animate();

function init() {
  container = document.getElementById("container");

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(8, 10, 8);
  camera.lookAt(0, 3, 0);

  scene = new Scene();

  clock = new Clock();

  // loading manager

  const loadingManager = new LoadingManager(function () {
    scene.add(elf);
  });

  // collada

  const loader = new ColladaLoader(loadingManager);
  loader.load("three/examples/models/collada/elf/elf.dae", function (collada) {
    elf = collada.scene;
  });

  //

  const ambientLight = new AmbientLight(0xcccccc, 0.4);
  scene.add(ambientLight);

  const directionalLight = new DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 0).normalize();
  scene.add(directionalLight);

  //

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  const delta = clock.getDelta();

  if (elf !== undefined) {
    elf.rotation.z += delta * 0.5;
  }

  renderer.render(scene, camera);
}
