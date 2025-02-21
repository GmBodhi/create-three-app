import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  FogExp2,
  PlaneGeometry,
  DynamicDrawUsage,
  TextureLoader,
  RepeatWrapping,
  SRGBColorSpace,
  MeshBasicMaterial,
  Mesh,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { FirstPersonControls } from "three/addons/controls/FirstPersonControls.js";
import { Timer } from "three/addons/misc/Timer.js";

let camera, controls, scene, renderer, stats;

let mesh, geometry, material, timer;

const worldWidth = 128,
  worldDepth = 128;

init();

function init() {
  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    20000
  );
  camera.position.y = 200;

  timer = new Timer();
  timer.connect(document);

  scene = new Scene();
  scene.background = new Color(0xaaccff);
  scene.fog = new FogExp2(0xaaccff, 0.0007);

  geometry = new PlaneGeometry(20000, 20000, worldWidth - 1, worldDepth - 1);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.attributes.position;
  position.usage = DynamicDrawUsage;

  for (let i = 0; i < position.count; i++) {
    const y = 35 * Math.sin(i / 2);
    position.setY(i, y);
  }

  const texture = new TextureLoader().load("textures/water.jpg");
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(5, 5);
  texture.colorSpace = SRGBColorSpace;

  material = new MeshBasicMaterial({ color: 0x0044ff, map: texture });

  mesh = new Mesh(geometry, material);
  scene.add(mesh);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  controls = new FirstPersonControls(camera, renderer.domElement);

  controls.movementSpeed = 500;
  controls.lookSpeed = 0.1;

  stats = new Stats();
  document.body.appendChild(stats.dom);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  controls.handleResize();
}

//

function animate() {
  timer.update();
  render();
  stats.update();
}

function render() {
  const delta = timer.getDelta();
  const time = timer.getElapsed() * 10;

  const position = geometry.attributes.position;

  for (let i = 0; i < position.count; i++) {
    const y = 35 * Math.sin(i / 5 + (time + i) / 7);
    position.setY(i, y);
  }

  position.needsUpdate = true;

  controls.update(delta);
  renderer.render(scene, camera);
}
