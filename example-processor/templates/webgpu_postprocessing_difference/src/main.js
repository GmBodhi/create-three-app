import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { pass, luminance, saturation } from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { Inspector } from "three/addons/inspector/Inspector.js";

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
  renderer.inspector = new Inspector();
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
  timer.connect(document);

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

  postProcessing.outputNode = saturation(currentTexture, saturationAmount);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.enableDamping = true;
  controls.dampingFactor = 0.01;

  window.addEventListener("resize", onWindowResize);

  //

  const gui = renderer.inspector.createParameters("Settings");
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
