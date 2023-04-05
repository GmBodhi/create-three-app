import "./style.css"; // For webpack support

import {
  ColorManagement,
  PerspectiveCamera,
  Scene,
  HemisphereLight,
  DirectionalLight,
  GridHelper,
  WebGLRenderer,
  SRGBColorSpace,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

ColorManagement.enabled = true;

let camera, scene, renderer, stats;

init();
animate();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    2000
  );
  camera.position.set(2, 18, 28);

  scene = new Scene();

  const hemiLight = new HemisphereLight(0xffffff, 0x444444);
  hemiLight.position.set(0, 1, 0);
  scene.add(hemiLight);

  const dirLight = new DirectionalLight(0xffffff);
  dirLight.position.set(0, 1, 0);
  scene.add(dirLight);

  // grid
  const gridHelper = new GridHelper(28, 28, 0x303030, 0x303030);
  scene.add(gridHelper);

  // stats
  stats = new Stats();
  container.appendChild(stats.dom);

  // model
  const loader = new FBXLoader();
  loader.load("models/fbx/nurbs.fbx", function (object) {
    scene.add(object);
  });

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 12, 0);
  controls.update();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  renderer.render(scene, camera);

  stats.update();
}
