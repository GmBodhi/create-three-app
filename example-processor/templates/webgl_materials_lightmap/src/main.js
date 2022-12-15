import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  DirectionalLight,
  Color,
  BackSide,
  Mesh,
  SphereGeometry,
  WebGLRenderer,
  sRGBEncoding,
  ObjectLoader,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import {
  MeshBasicNodeMaterial,
  vec4,
  color,
  positionLocal,
  mix,
  max,
  pow,
} from "three/nodes";
import { nodeFrame } from "three/addons/renderers/webgl/nodes/WebGLNodes.js";

let container, stats;
let camera, scene, renderer;

await init();
animate();

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

  const light = new DirectionalLight(0xaabbff, 0.3);
  light.position.x = 300;
  light.position.y = 250;
  light.position.z = -500;
  scene.add(light);

  // SKYDOME

  const topColor = new Color().copy(light.color).convertSRGBToLinear();
  const bottomColor = new Color(0xffffff).convertSRGBToLinear();
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

  // RENDERER

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  container.appendChild(renderer.domElement);
  renderer.outputEncoding = sRGBEncoding;

  // CONTROLS

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = (0.9 * Math.PI) / 2;
  controls.enableZoom = false;

  // STATS

  stats = new Stats();
  container.appendChild(stats.dom);

  // MODEL

  const loader = new ObjectLoader();
  const object = await loader.loadAsync("models/json/lightmap/lightmap.json");
  scene.add(object);

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
  requestAnimationFrame(animate);

  nodeFrame.update();

  renderer.render(scene, camera);
  stats.update();
}
