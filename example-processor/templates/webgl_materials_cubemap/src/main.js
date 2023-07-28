import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  CubeTextureLoader,
  CubeRefractionMapping,
  Scene,
  AmbientLight,
  PointLight,
  MeshLambertMaterial,
  MixOperation,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

let container, stats;

let camera, scene, renderer;

let pointLight;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 13;

  //cubemap
  const path = "textures/cube/SwedishRoyalCastle/";
  const format = ".jpg";
  const urls = [
    path + "px" + format,
    path + "nx" + format,
    path + "py" + format,
    path + "ny" + format,
    path + "pz" + format,
    path + "nz" + format,
  ];

  const reflectionCube = new CubeTextureLoader().load(urls);
  const refractionCube = new CubeTextureLoader().load(urls);
  refractionCube.mapping = CubeRefractionMapping;

  scene = new Scene();
  scene.background = reflectionCube;

  //lights
  const ambient = new AmbientLight(0xffffff, 3);
  scene.add(ambient);

  pointLight = new PointLight(0xffffff, 200);
  scene.add(pointLight);

  //materials
  const cubeMaterial3 = new MeshLambertMaterial({
    color: 0xffaa00,
    envMap: reflectionCube,
    combine: MixOperation,
    reflectivity: 0.3,
  });
  const cubeMaterial2 = new MeshLambertMaterial({
    color: 0xfff700,
    envMap: refractionCube,
    refractionRatio: 0.95,
  });
  const cubeMaterial1 = new MeshLambertMaterial({
    color: 0xffffff,
    envMap: reflectionCube,
  });

  //models
  const objLoader = new OBJLoader();

  objLoader.setPath("models/obj/walt/");
  objLoader.load("WaltHead.obj", function (object) {
    const head = object.children[0];
    head.scale.setScalar(0.1);
    head.position.y = -3;
    head.material = cubeMaterial1;

    const head2 = head.clone();
    head2.position.x = -6;
    head2.material = cubeMaterial2;

    const head3 = head.clone();
    head3.position.x = 6;
    head3.material = cubeMaterial3;

    scene.add(head, head2, head3);
  });

  //renderer
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  //controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.minPolarAngle = Math.PI / 4;
  controls.maxPolarAngle = Math.PI / 1.5;

  //stats
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
  requestAnimationFrame(animate);
  render();
}

function render() {
  renderer.render(scene, camera);
  stats.update();
}
