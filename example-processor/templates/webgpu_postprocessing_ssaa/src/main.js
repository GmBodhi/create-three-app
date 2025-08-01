import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { ssaaPass } from "three/addons/tsl/display/SSAAPassNode.js";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let scene, mesh, renderer, postProcessing;
let camera, ssaaRenderPass;
let gui, stats, timer;

const params = {
  sampleLevel: 3,
  camera: "perspective",
  clearColor: "black",
  clearAlpha: 1.0,
  viewOffsetX: 0,
  autoRotate: true,
};

init();

clearGui();

function clearGui() {
  if (gui) gui.destroy();

  gui = new GUI();

  gui.add(params, "sampleLevel", {
    "Level 0: 1 Sample": 0,
    "Level 1: 2 Samples": 1,
    "Level 2: 4 Samples": 2,
    "Level 3: 8 Samples": 3,
    "Level 4: 16 Samples": 4,
    "Level 5: 32 Samples": 5,
  });
  gui.add(params, "clearColor", ["black", "white", "blue", "green", "red"]);
  gui.add(params, "clearAlpha", 0, 1);
  gui.add(params, "viewOffsetX", -100, 100);
  gui.add(params, "autoRotate");

  gui.open();
}

function init() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  stats = new Stats();
  document.body.appendChild(stats.dom);

  timer = new Timer();
  timer.connect(document);

  camera = new PerspectiveCamera(65, width / height, 3, 10);
  camera.position.z = 7;
  camera.setViewOffset(width, height, params.viewOffsetX, 0, width, height);

  scene = new Scene();

  const group = new Group();
  scene.add(group);

  const light = new PointLight(0xefffef, 500);
  light.position.z = 10;
  light.position.y = -10;
  light.position.x = -10;
  scene.add(light);

  const light2 = new PointLight(0xffefef, 500);
  light2.position.z = 10;
  light2.position.x = -10;
  light2.position.y = 10;
  scene.add(light2);

  const light3 = new PointLight(0xefefff, 500);
  light3.position.z = 10;
  light3.position.x = 10;
  light3.position.y = -10;
  scene.add(light3);

  const light4 = new AmbientLight(0xffffff, 0.2);
  scene.add(light4);

  const geometry = new SphereGeometry(3, 48, 24);
  const material = new MeshStandardMaterial();

  mesh = new InstancedMesh(geometry, material, 120);

  const dummy = new Mesh();
  const color = new Color();

  for (let i = 0; i < mesh.count; i++) {
    dummy.position.x = Math.random() * 4 - 2;
    dummy.position.y = Math.random() * 4 - 2;
    dummy.position.z = Math.random() * 4 - 2;
    dummy.rotation.x = Math.random();
    dummy.rotation.y = Math.random();
    dummy.rotation.z = Math.random();
    dummy.scale.setScalar(Math.random() * 0.2 + 0.05);

    dummy.updateMatrix();

    color.setHSL(Math.random(), 1.0, 0.3);

    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, color);
  }

  scene.add(mesh);

  // postprocessing

  postProcessing = new PostProcessing(renderer);

  ssaaRenderPass = ssaaPass(scene, camera);
  const scenePassColor = ssaaRenderPass.getTextureNode();

  postProcessing.outputNode = scenePassColor;

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.setViewOffset(width, height, params.viewOffsetX, 0, width, height);
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function animate() {
  timer.update();

  if (params.autoRotate) {
    const delta = timer.getDelta();

    mesh.rotation.x += delta * 0.25;
    mesh.rotation.y += delta * 0.5;
  }

  let newColor = ssaaRenderPass.clearColor;

  switch (params.clearColor) {
    case "blue":
      newColor = 0x0000ff;
      break;
    case "red":
      newColor = 0xff0000;
      break;
    case "green":
      newColor = 0x00ff00;
      break;
    case "white":
      newColor = 0xffffff;
      break;
    case "black":
      newColor = 0x000000;
      break;
  }

  ssaaRenderPass.clearColor.set(newColor);
  ssaaRenderPass.clearAlpha = params.clearAlpha;

  ssaaRenderPass.sampleLevel = params.sampleLevel;

  camera.view.offsetX = params.viewOffsetX;

  postProcessing.render();

  stats.update();
}
