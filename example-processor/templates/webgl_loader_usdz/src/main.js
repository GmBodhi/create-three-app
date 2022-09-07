import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  GridHelper,
  DirectionalLight,
  HemisphereLight,
  WebGLRenderer,
  sRGBEncoding,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { USDZLoader } from "three/addons/loaders/USDZLoader.js";

let camera, controls, scene, renderer;

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0.75, -1);

  scene = new Scene();
  scene.background = new Color(0xeeeeee);

  scene.add(new GridHelper(2, 4));

  const light = new DirectionalLight(0xffffff);
  light.position.set(1, 1, 1);
  scene.add(light);

  const light2 = new HemisphereLight(0xffffff, 0x888888);
  scene.add(light2);

  // renderer
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = sRGBEncoding;
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);

  const loader = new USDZLoader();
  loader.load("models/usdz/saeukkang.usdz", function (usd) {
    scene.add(usd);
  });

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  renderer.render(scene, camera);
}
