//Shaders

undefined;

import "./style.css"; // For webpack support

import { PerspectiveCamera, Scene, WebGLRenderer } from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GCodeLoader } from "three/examples/jsm/loaders/GCodeLoader.js";

let camera, scene, renderer;

init();
render();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(0, 0, 70);

  scene = new Scene();

  const loader = new GCodeLoader();
  loader.load("models/gcode/benchy.gcode", function (object) {
    object.position.set(-100, -20, 100);
    scene.add(object);

    render();
  });

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render); // use if there is no animation loop
  controls.minDistance = 10;
  controls.maxDistance = 100;

  window.addEventListener("resize", resize);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

function render() {
  renderer.render(scene, camera);
}
