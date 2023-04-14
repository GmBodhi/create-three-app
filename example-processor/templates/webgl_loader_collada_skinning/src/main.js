import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Clock,
  AnimationMixer,
  GridHelper,
  AmbientLight,
  PointLight,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { ColladaLoader } from "three/addons/loaders/ColladaLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let container, stats, clock, controls;
let camera, scene, renderer, mixer;

init();
animate();

function init() {
  container = document.getElementById("container");

  camera = new PerspectiveCamera(
    25,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(15, 10, -15);

  scene = new Scene();

  clock = new Clock();

  // collada

  const loader = new ColladaLoader();
  loader.load(
    "three/examples/models/collada/stormtrooper/stormtrooper.dae",
    function (collada) {
      const avatar = collada.scene;
      const animations = avatar.animations;

      mixer = new AnimationMixer(avatar);
      mixer.clipAction(animations[0]).play();

      scene.add(avatar);
    }
  );

  //

  const gridHelper = new GridHelper(10, 20, 0x888888, 0x444444);
  scene.add(gridHelper);

  //

  const ambientLight = new AmbientLight(0xffffff, 0.2);
  scene.add(ambientLight);

  const pointLight = new PointLight(0xffffff, 0.8);
  scene.add(camera);
  camera.add(pointLight);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.screenSpacePanning = true;
  controls.minDistance = 5;
  controls.maxDistance = 40;
  controls.target.set(0, 2, 0);
  controls.update();

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

  if (mixer !== undefined) {
    mixer.update(delta);
  }

  renderer.render(scene, camera);
}
