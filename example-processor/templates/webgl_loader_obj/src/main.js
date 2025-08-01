import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  AmbientLight,
  PointLight,
  WebGLRenderer,
} from "three";

import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, scene, renderer, controls;

init();

async function init() {
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    20
  );
  camera.position.z = 2.5;

  // scene

  scene = new Scene();

  const ambientLight = new AmbientLight(0xffffff);
  scene.add(ambientLight);

  const pointLight = new PointLight(0xffffff, 15);
  camera.add(pointLight);
  scene.add(camera);

  // model

  const mtlLoader = new MTLLoader().setPath("models/obj/male02/");
  const materials = await mtlLoader.loadAsync("male02.mtl");
  materials.preload();

  const objLoader = new OBJLoader().setPath("models/obj/male02/");
  objLoader.setMaterials(materials); // optional since OBJ assets can be loaded without an accompanying MTL file

  const object = await objLoader.loadAsync("male02.obj");

  object.position.y = -0.95;
  object.scale.setScalar(0.01);
  scene.add(object);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 2;
  controls.maxDistance = 5;

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  controls.update();

  renderer.render(scene, camera);
}
