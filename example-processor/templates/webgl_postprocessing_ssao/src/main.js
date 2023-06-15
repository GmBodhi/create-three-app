import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Color,
  DirectionalLight,
  HemisphereLight,
  Group,
  BoxGeometry,
  MeshLambertMaterial,
  Mesh,
} from "three";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

let container, stats;
let camera, scene, renderer;
let composer;
let group;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  renderer = new WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camera = new PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    100,
    700
  );
  camera.position.z = 500;

  scene = new Scene();
  scene.background = new Color(0xaaaaaa);

  scene.add(new DirectionalLight());
  scene.add(new HemisphereLight());

  group = new Group();
  scene.add(group);

  const geometry = new BoxGeometry(10, 10, 10);

  for (let i = 0; i < 100; i++) {
    const material = new MeshLambertMaterial({
      color: Math.random() * 0xffffff,
    });

    const mesh = new Mesh(geometry, material);
    mesh.position.x = Math.random() * 400 - 200;
    mesh.position.y = Math.random() * 400 - 200;
    mesh.position.z = Math.random() * 400 - 200;
    mesh.rotation.x = Math.random();
    mesh.rotation.y = Math.random();
    mesh.rotation.z = Math.random();

    mesh.scale.setScalar(Math.random() * 10 + 2);
    group.add(mesh);
  }

  stats = new Stats();
  container.appendChild(stats.dom);

  const width = window.innerWidth;
  const height = window.innerHeight;

  composer = new EffectComposer(renderer);

  const ssaoPass = new SSAOPass(scene, camera, width, height);
  ssaoPass.kernelRadius = 16;
  composer.addPass(ssaoPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  // Init gui
  const gui = new GUI();

  gui
    .add(ssaoPass, "output", {
      Default: SSAOPass.OUTPUT.Default,
      "SSAO Only": SSAOPass.OUTPUT.SSAO,
      "SSAO Only + Blur": SSAOPass.OUTPUT.Blur,
      Beauty: SSAOPass.OUTPUT.Beauty,
      Depth: SSAOPass.OUTPUT.Depth,
      Normal: SSAOPass.OUTPUT.Normal,
    })
    .onChange(function (value) {
      ssaoPass.output = parseInt(value);
    });
  gui.add(ssaoPass, "kernelRadius").min(0).max(32);
  gui.add(ssaoPass, "minDistance").min(0.001).max(0.02);
  gui.add(ssaoPass, "maxDistance").min(0.01).max(0.3);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);

  stats.begin();
  render();
  stats.end();
}

function render() {
  const timer = performance.now();
  group.rotation.x = timer * 0.0002;
  group.rotation.y = timer * 0.0001;

  composer.render();
}
