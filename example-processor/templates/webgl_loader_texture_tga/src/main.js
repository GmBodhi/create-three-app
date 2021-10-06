import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  BoxGeometry,
  MeshPhongMaterial,
  Mesh,
  AmbientLight,
  DirectionalLight,
  WebGLRenderer,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TGALoader } from "three/examples/jsm/loaders/TGALoader.js";

let camera, scene, renderer, stats;

init();
animate();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 50, 250);

  scene = new Scene();

  //

  const loader = new TGALoader();
  const geometry = new BoxGeometry(50, 50, 50);

  // add box 1 - grey8 texture

  const texture1 = loader.load("textures/crate_grey8.tga");
  const material1 = new MeshPhongMaterial({ color: 0xffffff, map: texture1 });

  const mesh1 = new Mesh(geometry, material1);
  mesh1.position.x = -50;

  scene.add(mesh1);

  // add box 2 - tga texture

  const texture2 = loader.load("textures/crate_color8.tga");
  const material2 = new MeshPhongMaterial({ color: 0xffffff, map: texture2 });

  const mesh2 = new Mesh(geometry, material2);
  mesh2.position.x = 50;

  scene.add(mesh2);

  //

  const ambientLight = new AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const light = new DirectionalLight(0xffffff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  //

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;

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
  renderer.render(scene, camera);
}
