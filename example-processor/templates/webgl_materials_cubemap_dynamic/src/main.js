import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  sRGBEncoding,
  ACESFilmicToneMapping,
  PerspectiveCamera,
  Scene,
  EquirectangularReflectionMapping,
  WebGLCubeRenderTarget,
  HalfFloatType,
  CubeCamera,
  MeshStandardMaterial,
  Mesh,
  IcosahedronGeometry,
  BoxGeometry,
  TorusKnotGeometry,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import Stats from "three/addons/libs/stats.module.js";

let camera, scene, renderer, stats;
let cube, sphere, torus, material;

let cubeCamera, cubeRenderTarget;

let controls;

init();

function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animation);
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMapping = ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResized);

  stats = new Stats();
  document.body.appendChild(stats.dom);

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 75;

  scene = new Scene();
  scene.rotation.y = 0.5; // avoid flying objects occluding the sun

  new RGBELoader()
    .setPath("textures/equirectangular/")
    .load("quarry_01_1k.hdr", function (texture) {
      texture.mapping = EquirectangularReflectionMapping;

      scene.background = texture;
      scene.environment = texture;
    });

  //

  cubeRenderTarget = new WebGLCubeRenderTarget(256);
  cubeRenderTarget.texture.type = HalfFloatType;

  cubeCamera = new CubeCamera(1, 1000, cubeRenderTarget);

  //

  material = new MeshStandardMaterial({
    envMap: cubeRenderTarget.texture,
    roughness: 0.05,
    metalness: 1,
  });

  const gui = new GUI();
  gui.add(material, "roughness", 0, 1);
  gui.add(material, "metalness", 0, 1);
  gui.add(renderer, "toneMappingExposure", 0, 2).name("exposure");

  sphere = new Mesh(new IcosahedronGeometry(15, 8), material);
  scene.add(sphere);

  const material2 = new MeshStandardMaterial({
    roughness: 0.1,
    metalness: 0,
  });

  cube = new Mesh(new BoxGeometry(15, 15, 15), material2);
  scene.add(cube);

  torus = new Mesh(new TorusKnotGeometry(8, 3, 128, 16), material2);
  scene.add(torus);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = true;
}

function onWindowResized() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function animation(msTime) {
  const time = msTime / 1000;

  cube.position.x = Math.cos(time) * 30;
  cube.position.y = Math.sin(time) * 30;
  cube.position.z = Math.sin(time) * 30;

  cube.rotation.x += 0.02;
  cube.rotation.y += 0.03;

  torus.position.x = Math.cos(time + 10) * 30;
  torus.position.y = Math.sin(time + 10) * 30;
  torus.position.z = Math.sin(time + 10) * 30;

  torus.rotation.x += 0.02;
  torus.rotation.y += 0.03;

  cubeCamera.update(renderer, scene);

  controls.update();

  renderer.render(scene, camera);

  stats.update();
}
