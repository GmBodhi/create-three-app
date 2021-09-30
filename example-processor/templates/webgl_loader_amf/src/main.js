//Shaders

undefined;

import "./style.css"; // For webpack support

import {
  Scene,
  Color,
  AmbientLight,
  PerspectiveCamera,
  PointLight,
  GridHelper,
  Vector3,
  WebGLRenderer,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { AMFLoader } from "three/examples/jsm/loaders/AMFLoader.js";

let camera, scene, renderer;

init();

function init() {
  scene = new Scene();
  scene.background = new Color(0x999999);

  scene.add(new AmbientLight(0x999999));

  camera = new PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    1,
    500
  );

  // Z is up for objects intended to be 3D printed.

  camera.up.set(0, 0, 1);
  camera.position.set(0, -9, 6);

  camera.add(new PointLight(0xffffff, 0.8));

  scene.add(camera);

  const grid = new GridHelper(50, 50, 0xffffff, 0x555555);
  grid.rotateOnAxis(new Vector3(1, 0, 0), 90 * (Math.PI / 180));
  scene.add(grid);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const loader = new AMFLoader();
  loader.load("three/examples/models/amf/rook.amf", function (amfobject) {
    scene.add(amfobject);
    render();
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render);
  controls.target.set(0, 1.2, 2);
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
