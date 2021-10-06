import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  AmbientLight,
  DirectionalLight,
  GridHelper,
  WebGLRenderer,
  sRGBEncoding,
  ACESFilmicToneMapping,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { LWOLoader } from "three/examples/jsm/loaders/LWOLoader.js";

let camera, scene, renderer;

init();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    200
  );
  camera.position.set(-0.7, 14.6, 43.2);

  scene = new Scene();
  scene.background = new Color(0xa0a0a0);

  const ambientLight = new AmbientLight(0x222222);
  scene.add(ambientLight);

  const light1 = new DirectionalLight(0x888888);
  light1.position.set(0, 200, 100);
  scene.add(light1);

  const grid = new GridHelper(200, 20, 0x000000, 0x000000);
  grid.material.opacity = 0.3;
  grid.material.transparent = true;
  scene.add(grid);

  const loader = new LWOLoader();
  loader.load("models/lwo/Objects/LWO3/Demo.lwo", function (object) {
    const phong = object.meshes[0];
    phong.position.set(-2, 12, 0);

    const standard = object.meshes[1];
    standard.position.set(2, 12, 0);

    const rocket = object.meshes[2];
    rocket.position.set(0, 10.5, -1);

    scene.add(phong, standard, rocket);
  });

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animation);
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMapping = ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(1.33, 10, -6.7);
  controls.update();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animation() {
  renderer.render(scene, camera);
}
