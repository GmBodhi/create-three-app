import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  AmbientLight,
  PointLight,
  TextureLoader,
  RepeatWrapping,
  SRGBColorSpace,
  MeshPhongMaterial,
  DoubleSide,
  Mesh,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { ParametricGeometry } from "three/addons/geometries/ParametricGeometry.js";
import {
  plane,
  klein,
  mobius,
} from "three/addons/geometries/ParametricFunctions.js";

let camera, scene, renderer, stats;

init();

function init() {
  const container = document.getElementById("container");

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    2000
  );
  camera.position.y = 400;

  scene = new Scene();

  //

  const ambientLight = new AmbientLight(0xcccccc, 1.5);
  scene.add(ambientLight);

  const pointLight = new PointLight(0xffffff, 2.5, 0, 0);
  camera.add(pointLight);
  scene.add(camera);

  //

  const map = new TextureLoader().load("textures/uv_grid_opengl.jpg");
  map.wrapS = map.wrapT = RepeatWrapping;
  map.anisotropy = 16;
  map.colorSpace = SRGBColorSpace;

  const material = new MeshPhongMaterial({ map: map, side: DoubleSide });

  //

  let geometry, object;

  geometry = new ParametricGeometry(plane, 10, 10);
  geometry.scale(100, 100, 100);
  geometry.center();
  object = new Mesh(geometry, material);
  object.position.set(-200, 0, 0);
  scene.add(object);

  geometry = new ParametricGeometry(klein, 20, 20);
  object = new Mesh(geometry, material);
  object.position.set(0, 0, 0);
  object.scale.multiplyScalar(5);
  scene.add(object);

  geometry = new ParametricGeometry(mobius, 20, 20);
  object = new Mesh(geometry, material);
  object.position.set(200, 0, 0);
  object.scale.multiplyScalar(30);
  scene.add(object);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  render();
  stats.update();
}

function render() {
  const timer = Date.now() * 0.0001;

  camera.position.x = Math.cos(timer) * 800;
  camera.position.z = Math.sin(timer) * 800;

  camera.lookAt(scene.position);

  scene.traverse(function (object) {
    if (object.isMesh === true) {
      object.rotation.x = timer * 5;
      object.rotation.y = timer * 2.5;
    }
  });

  renderer.render(scene, camera);
}
