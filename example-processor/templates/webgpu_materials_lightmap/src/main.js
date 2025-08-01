import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { vec4, color, positionLocal, mix } from "three/tsl";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let container;
let camera, scene, renderer;

const params = {
  intensity: 1,
};

init();

async function init() {
  const { innerWidth, innerHeight } = window;

  container = document.createElement("div");
  document.body.appendChild(container);

  // CAMERA

  camera = new PerspectiveCamera(40, innerWidth / innerHeight, 1, 10000);
  camera.position.set(700, 200, -500);

  // SCENE

  scene = new Scene();

  // LIGHTS

  const light = new DirectionalLight(0xd5deff);
  light.position.x = 300;
  light.position.y = 250;
  light.position.z = -500;
  scene.add(light);

  // SKYDOME

  const topColor = new Color().copy(light.color);
  const bottomColor = new Color(0xffffff);
  const offset = 400;
  const exponent = 0.6;

  const h = positionLocal.add(offset).normalize().y;

  const skyMat = new MeshBasicNodeMaterial();
  skyMat.colorNode = vec4(
    mix(color(bottomColor), color(topColor), h.max(0.0).pow(exponent)),
    1.0
  );
  skyMat.side = BackSide;

  const sky = new Mesh(new SphereGeometry(4000, 32, 15), skyMat);
  scene.add(sky);

  // MODEL

  const loader = new ObjectLoader();
  const object = await loader.loadAsync("models/json/lightmap/lightmap.json");
  scene.add(object);

  // RENDERER

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setAnimationLoop(animate);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  container.appendChild(renderer.domElement);

  // CONTROLS

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = (0.9 * Math.PI) / 2;
  controls.enableZoom = false;

  // GUI

  const gui = new GUI();

  gui
    .add(params, "intensity", 0, 1)
    .name("Light Map Intensity")
    .onChange((value) => {
      for (const material of object.material) {
        material.lightMapIntensity = value;
      }
    });
  gui.open();

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  renderer.render(scene, camera);
}
