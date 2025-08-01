import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer;

const spheres = [];

let mouseX = 0;
let mouseY = 0;

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

const params = {
  color: "#ffffff",
  mapping: CubeReflectionMapping,
  refractionRatio: 0.98,
  transparent: false,
  opacity: 1,
};

const mappings = {
  ReflectionMapping: CubeReflectionMapping,
  RefractionMapping: CubeRefractionMapping,
};

document.addEventListener("mousemove", onDocumentMouseMove);

init();

function init() {
  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );
  camera.position.z = 3;

  const path = "three/examples/textures/cube/pisa/";
  const format = ".png";
  const urls = [
    path + "px" + format,
    path + "nx" + format,
    path + "py" + format,
    path + "ny" + format,
    path + "pz" + format,
    path + "nz" + format,
  ];

  const textureCube = new CubeTextureLoader().load(urls);

  scene = new Scene();
  scene.background = textureCube;

  const geometry = new SphereGeometry(0.1, 32, 16);
  const material = new MeshBasicMaterial({
    color: 0xffffff,
    envMap: textureCube,
  });

  for (let i = 0; i < 500; i++) {
    const mesh = new Mesh(geometry, material);

    mesh.position.x = Math.random() * 10 - 5;
    mesh.position.y = Math.random() * 10 - 5;
    mesh.position.z = Math.random() * 10 - 5;

    mesh.scale.x = mesh.scale.y = mesh.scale.z = Math.random() * 3 + 1;

    scene.add(mesh);

    spheres.push(mesh);
  }

  //

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  //

  const gui = new GUI({ width: 300 });

  gui.addColor(params, "color").onChange((value) => material.color.set(value));
  gui.add(params, "mapping", mappings).onChange((value) => {
    textureCube.mapping = value;
    material.needsUpdate = true;
  });
  gui
    .add(params, "refractionRatio")
    .min(0.0)
    .max(1.0)
    .step(0.01)
    .onChange((value) => (material.refractionRatio = value));
  gui.add(params, "transparent").onChange((value) => {
    material.transparent = value;
    material.needsUpdate = true;
  });
  gui
    .add(params, "opacity")
    .min(0.0)
    .max(1.0)
    .step(0.01)
    .onChange((value) => (material.opacity = value));
  gui.open();

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseMove(event) {
  mouseX = (event.clientX - windowHalfX) / 100;
  mouseY = (event.clientY - windowHalfY) / 100;
}

//

function animate() {
  const timer = 0.0001 * Date.now();

  camera.position.x += (mouseX - camera.position.x) * 0.05;
  camera.position.y += (-mouseY - camera.position.y) * 0.05;

  camera.lookAt(scene.position);

  for (let i = 0, il = spheres.length; i < il; i++) {
    const sphere = spheres[i];

    sphere.position.x = 5 * Math.cos(timer + i);
    sphere.position.y = 5 * Math.sin(timer + i * 1.1);
  }

  renderer.render(scene, camera);
}
