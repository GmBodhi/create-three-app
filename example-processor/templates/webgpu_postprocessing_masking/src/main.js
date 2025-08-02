import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { pass, texture } from "three/tsl";

let camera, postProcessing, renderer;
let box, torus;

init();

function init() {
  // scene

  const baseScene = new Scene();
  baseScene.background = new Color(0xe0e0e0);

  const maskScene1 = new Scene();
  box = new Mesh(new BoxGeometry(4, 4, 4));
  maskScene1.add(box);

  const maskScene2 = new Scene();
  torus = new Mesh(new TorusGeometry(3, 1, 16, 32));
  maskScene2.add(torus);

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 10;

  // textures

  const texture1 = new TextureLoader().load(
    "textures/758px-Canestra_di_frutta_(Caravaggio).jpg"
  );
  texture1.colorSpace = SRGBColorSpace;
  texture1.minFilter = LinearFilter;
  texture1.generateMipmaps = false;
  texture1.flipY = false;

  const texture2 = new TextureLoader().load(
    "textures/2294472375_24a3b8ef46_o.jpg"
  );
  texture2.colorSpace = SRGBColorSpace;
  texture2.flipY = false;

  // renderer

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);

  // post processing

  const base = pass(baseScene, camera);
  const sceneMask1 = pass(maskScene1, camera).a;
  const sceneMask2 = pass(maskScene2, camera).a;

  let compose = base;
  compose = sceneMask1.mix(compose, texture(texture1));
  compose = sceneMask2.mix(compose, texture(texture2));

  postProcessing = new PostProcessing(renderer);
  postProcessing.outputNode = compose;
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function animate() {
  const time = performance.now() * 0.001 + 6000;

  box.position.x = Math.cos(time / 1.5) * 2;
  box.position.y = Math.sin(time) * 2;
  box.rotation.x = time;
  box.rotation.y = time / 2;

  torus.position.x = Math.cos(time) * 2;
  torus.position.y = Math.sin(time / 1.5) * 2;
  torus.rotation.x = time;
  torus.rotation.y = time / 2;

  postProcessing.render();
}
