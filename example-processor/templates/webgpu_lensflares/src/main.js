import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import Stats from "three/addons/libs/stats.module.js";

import { FlyControls } from "three/addons/controls/FlyControls.js";
import {
  LensflareMesh,
  LensflareElement,
} from "three/addons/objects/LensflareMesh.js";

let container, stats;

let camera, scene, renderer;
let controls;

const clock = new Clock();

init();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  // camera

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    15000
  );
  camera.position.z = 250;

  // scene

  scene = new Scene();
  scene.background = new Color().setHSL(0.51, 0.4, 0.01, SRGBColorSpace);
  scene.fog = new Fog(scene.background, 3500, 15000);

  // world

  const s = 250;

  const geometry = new BoxGeometry(s, s, s);
  const material = new MeshPhongNodeMaterial({
    color: 0xffffff,
    specular: 0xffffff,
    shininess: 50,
  });

  for (let i = 0; i < 3000; i++) {
    const mesh = new Mesh(geometry, material);

    mesh.position.x = 8000 * (2.0 * Math.random() - 1.0);
    mesh.position.y = 8000 * (2.0 * Math.random() - 1.0);
    mesh.position.z = 8000 * (2.0 * Math.random() - 1.0);

    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;
    mesh.rotation.z = Math.random() * Math.PI;

    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();

    scene.add(mesh);
  }

  // lights

  const dirLight = new DirectionalLight(0xffffff, 0.15);
  dirLight.position.set(0, -1, 0).normalize();
  dirLight.color.setHSL(0.1, 0.7, 0.5);
  scene.add(dirLight);

  // lensflares
  const textureLoader = new TextureLoader();

  const textureFlare0 = textureLoader.load("textures/lensflare/lensflare0.png");
  const textureFlare3 = textureLoader.load("textures/lensflare/lensflare3.png");

  textureFlare0.colorSpace = SRGBColorSpace;
  textureFlare3.colorSpace = SRGBColorSpace;

  addLight(0.55, 0.95, 0.6, 5000, 0, -1000);
  addLight(0.1, 0.85, 0.65, 0, 0, -1000);
  addLight(0.995, 0.5, 0.95, 5000, 5000, -1000);

  function addLight(h, s, l, x, y, z) {
    const light = new PointLight(0xffffff, 1.5, 2000, 0);
    light.color.setHSL(h, s, l);
    light.position.set(x, y, z);
    scene.add(light);

    const lensflare = new LensflareMesh();
    lensflare.addElement(
      new LensflareElement(textureFlare0, 700, 0, light.color)
    );
    lensflare.addElement(new LensflareElement(textureFlare3, 60, 0.6));
    lensflare.addElement(new LensflareElement(textureFlare3, 70, 0.7));
    lensflare.addElement(new LensflareElement(textureFlare3, 120, 0.9));
    lensflare.addElement(new LensflareElement(textureFlare3, 70, 1));
    light.add(lensflare);
  }

  // renderer

  renderer = new WebGPURenderer({ antialias: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

  //

  controls = new FlyControls(camera, renderer.domElement);

  controls.movementSpeed = 2500;
  controls.domElement = container;
  controls.rollSpeed = Math.PI / 6;
  controls.autoForward = false;
  controls.dragToLook = false;

  // stats

  stats = new Stats();
  container.appendChild(stats.dom);

  // events

  window.addEventListener("resize", onWindowResize);
}

//

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

//

function animate() {
  render();
  stats.update();
}

function render() {
  const delta = clock.getDelta();

  controls.update(delta);
  renderer.render(scene, camera);
}
