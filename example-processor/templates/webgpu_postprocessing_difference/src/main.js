import "./style.css"; // For webpack support

import {
  WebGPURenderer,
  NeutralToneMapping,
  PerspectiveCamera,
  Scene,
  Fog,
  Color,
  TextureLoader,
  SRGBColorSpace,
  BoxGeometry,
  MeshBasicMaterial,
  Mesh,
  PostProcessing,
} from "three";
import { pass, luminance } from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Timer } from "three/addons/misc/Timer.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

const params = {
  speed: 0,
};

let camera, renderer, postProcessing;
let timer, mesh, controls;

init();

function init() {
  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = NeutralToneMapping;
  document.body.appendChild(renderer.domElement);

  //

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    100
  );
  camera.position.set(1, 2, 3);

  const scene = new Scene();
  scene.fog = new Fog(0x0487e2, 7, 25);
  scene.background = new Color(0x0487e2);

  timer = new Timer();

  const texture = new TextureLoader().load("textures/crate.gif");
  texture.colorSpace = SRGBColorSpace;

  const geometry = new BoxGeometry();
  const material = new MeshBasicMaterial({ map: texture });

  mesh = new Mesh(geometry, material);
  scene.add(mesh);

  // post processing

  postProcessing = new PostProcessing(renderer);

  const scenePass = pass(scene, camera);

  const currentTexture = scenePass.getTextureNode();
  const previousTexture = scenePass.getPreviousTextureNode();

  const frameDiff = previousTexture.sub(currentTexture).abs();

  const saturationAmount = luminance(frameDiff).mul(1000).clamp(0, 3);

  postProcessing.outputNode = currentTexture.saturation(saturationAmount);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.enableDamping = true;
  controls.dampingFactor = 0.01;

  window.addEventListener("resize", onWindowResize);

  //

  const gui = new GUI();
  gui.add(params, "speed", 0, 2);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  timer.update();

  controls.update();

  mesh.rotation.y += timer.getDelta() * 5 * params.speed;

  postProcessing.render();
}
