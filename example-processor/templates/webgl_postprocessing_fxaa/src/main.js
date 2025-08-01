import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  HemisphereLight,
  DirectionalLight,
  TetrahedronGeometry,
  MeshStandardMaterial,
  Mesh,
  WebGLRenderer,
} from "three";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { FXAAPass } from "three/addons/postprocessing/FXAAPass.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, scene, renderer, controls, container;

let composer1, composer2, fxaaPass;

init();

function init() {
  container = document.getElementById("container");

  camera = new PerspectiveCamera(
    45,
    container.offsetWidth / container.offsetHeight,
    1,
    2000
  );
  camera.position.z = 500;

  scene = new Scene();

  //

  const hemiLight = new HemisphereLight(0xffffff, 0x8d8d8d);
  hemiLight.position.set(0, 1000, 0);
  scene.add(hemiLight);

  const dirLight = new DirectionalLight(0xffffff, 3);
  dirLight.position.set(-3000, 1000, -1000);
  scene.add(dirLight);

  //

  const geometry = new TetrahedronGeometry(10);
  const material = new MeshStandardMaterial({
    color: 0xf73232,
    flatShading: true,
  });

  for (let i = 0; i < 100; i++) {
    const mesh = new Mesh(geometry, material);

    mesh.position.x = Math.random() * 500 - 250;
    mesh.position.y = Math.random() * 500 - 250;
    mesh.position.z = Math.random() * 500 - 250;

    mesh.scale.setScalar(Math.random() * 2 + 1);

    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;
    mesh.rotation.z = Math.random() * Math.PI;

    scene.add(mesh);
  }

  //

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  renderer.setAnimationLoop(animate);
  renderer.autoClear = false;
  controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = true;
  container.appendChild(renderer.domElement);

  //

  const renderPass = new RenderPass(scene, camera);
  renderPass.clearAlpha = 0;

  //

  fxaaPass = new FXAAPass();

  const outputPass = new OutputPass();

  composer1 = new EffectComposer(renderer);
  composer1.addPass(renderPass);
  composer1.addPass(outputPass);

  //

  composer2 = new EffectComposer(renderer);
  composer2.addPass(renderPass);
  composer2.addPass(outputPass);

  // FXAA is engineered to be applied towards the end of engine post processing after conversion to low dynamic range and conversion to the sRGB color space for display.

  composer2.addPass(fxaaPass);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = container.offsetWidth / container.offsetHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(container.offsetWidth, container.offsetHeight);
  composer1.setSize(container.offsetWidth, container.offsetHeight);
  composer2.setSize(container.offsetWidth, container.offsetHeight);
}

function animate() {
  const halfWidth = container.offsetWidth / 2;

  controls.update();

  renderer.setScissorTest(true);

  renderer.setScissor(0, 0, halfWidth - 1, container.offsetHeight);
  composer1.render();

  renderer.setScissor(halfWidth, 0, halfWidth, container.offsetHeight);
  composer2.render();

  renderer.setScissorTest(false);
}
