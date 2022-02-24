import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  sRGBEncoding,
  ACESFilmicToneMapping,
  PerspectiveCamera,
  Scene,
  EquirectangularReflectionMapping,
  WebGLCubeRenderTarget,
  CubeCamera,
  MeshStandardMaterial,
  Mesh,
  IcosahedronGeometry,
  BoxGeometry,
  TorusKnotGeometry,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import Stats from "three/examples/jsm/libs/stats.module.js";

let camera, scene, renderer, stats;
let cube, sphere, torus, material;

let count = 0,
  cubeCamera1,
  cubeCamera2,
  cubeRenderTarget1,
  cubeRenderTarget2;

let controls;

init();
animate();

function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
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

  new RGBELoader()
    .setPath("textures/equirectangular/")
    .load("quarry_01_1k.hdr", function (texture) {
      texture.mapping = EquirectangularReflectionMapping;
      scene.background = texture;
    });

  //

  const envSize = 256;

  cubeRenderTarget1 = new WebGLCubeRenderTarget(envSize);
  cubeRenderTarget2 = new WebGLCubeRenderTarget(envSize);

  cubeCamera1 = new CubeCamera(1, 1000, cubeRenderTarget1);
  cubeCamera2 = new CubeCamera(1, 1000, cubeRenderTarget2);

  //

  material = new MeshStandardMaterial({
    envMap: cubeRenderTarget2.texture,
    roughness: 0.05,
    metalness: 0,
  });

  const gui = new GUI();
  gui.add(material, "roughness", 0, 1);
  gui.add(material, "metalness", 0, 1);
  gui.add(renderer, "toneMappingExposure", 0, 2).name("exposure");

  sphere = new Mesh(new IcosahedronGeometry(15, 8), material);
  scene.add(sphere);

  cube = new Mesh(new BoxGeometry(15, 15, 15), material);
  scene.add(cube);

  torus = new Mesh(new TorusKnotGeometry(10, 3, 128, 16), material);
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

function animate() {
  requestAnimationFrame(animate);

  const time = Date.now();

  cube.position.x = Math.cos(time * 0.001) * 30;
  cube.position.y = Math.sin(time * 0.001) * 30;
  cube.position.z = Math.sin(time * 0.001) * 30;

  cube.rotation.x += 0.02;
  cube.rotation.y += 0.03;

  torus.position.x = Math.cos(time * 0.001 + 10) * 30;
  torus.position.y = Math.sin(time * 0.001 + 10) * 30;
  torus.position.z = Math.sin(time * 0.001 + 10) * 30;

  torus.rotation.x += 0.02;
  torus.rotation.y += 0.03;

  // pingpong

  if (count % 2 === 0) {
    cubeCamera1.update(renderer, scene);
    material.envMap = cubeRenderTarget1.texture;
  } else {
    cubeCamera2.update(renderer, scene);
    material.envMap = cubeRenderTarget2.texture;
  }

  count++;

  controls.update();

  renderer.render(scene, camera);

  stats.update();
}
