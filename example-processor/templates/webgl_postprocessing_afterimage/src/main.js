import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Fog,
  BoxGeometry,
  MeshNormalMaterial,
  Mesh,
} from "three";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { AfterimagePass } from "three/addons/postprocessing/AfterimagePass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

let camera, scene, renderer, composer;
let mesh;

let afterimagePass;

const params = {
  enable: true,
};

init();

function init() {
  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 400;

  scene = new Scene();
  scene.fog = new Fog(0x000000, 1, 1000);

  const geometry = new BoxGeometry(150, 150, 150, 2, 2, 2);
  const material = new MeshNormalMaterial();
  mesh = new Mesh(geometry, material);
  scene.add(mesh);

  // postprocessing

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  afterimagePass = new AfterimagePass();
  composer.addPass(afterimagePass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  window.addEventListener("resize", onWindowResize);

  const gui = new GUI({ title: "Damp setting" });
  gui.add(afterimagePass, "damp", 0, 1).step(0.001);
  gui.add(params, "enable");
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  mesh.rotation.x += 0.005;
  mesh.rotation.y += 0.01;

  afterimagePass.enabled = params.enable;

  composer.render();
}
