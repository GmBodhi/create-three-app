import "./style.css"; // For webpack support

import {
  Scene,
  Color,
  DirectionalLight,
  PerspectiveCamera,
  GridHelper,
  WebGLRenderer,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { KMZLoader } from "three/addons/loaders/KMZLoader.js";

let camera, scene, renderer;

init();

function init() {
  scene = new Scene();
  scene.background = new Color(0x999999);

  const light = new DirectionalLight(0xffffff, 3);
  light.position.set(0.5, 1.0, 0.5).normalize();

  scene.add(light);

  camera = new PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    1,
    500
  );

  camera.position.y = 5;
  camera.position.z = 10;

  scene.add(camera);

  const grid = new GridHelper(50, 50, 0xffffff, 0x7b7b7b);
  scene.add(grid);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const loader = new KMZLoader();
  loader.load("three/examples/models/kmz/Box.kmz", function (kmz) {
    kmz.scene.position.y = 0.5;
    scene.add(kmz.scene);
    render();
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render);
  controls.update();

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
