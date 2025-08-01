import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import { texture, uniform, uv } from "three/tsl";

import Stats from "three/addons/libs/stats.module.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";

let camera, scene, mesh, renderer, stats, clock;

const depth = uniform(0);

const planeWidth = 50;
const planeHeight = 25;

let depthStep = 1;

init();

async function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.z = 70;

  scene = new Scene();

  //
  clock = new Clock();

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

  //

  const ktx2Loader = new KTX2Loader();
  ktx2Loader.setTranscoderPath("jsm/libs/basis/");
  await ktx2Loader.detectSupportAsync(renderer);

  ktx2Loader.load("textures/spiritedaway.ktx2", function (texturearray) {
    const material = new NodeMaterial();

    material.colorNode = texture(texturearray, uv().flipY()).depth(depth);
    const geometry = new PlaneGeometry(planeWidth, planeHeight);

    mesh = new Mesh(geometry, material);

    scene.add(mesh);
  });

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
  if (mesh) {
    const delta = clock.getDelta() * 10;

    depthStep += delta;

    const value = depthStep % 5;

    depth.value = value;
  }

  render();
  stats.update();
}

function render() {
  renderer.render(scene, camera);
}
