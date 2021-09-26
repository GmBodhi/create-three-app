import "./style.css"; // For webpack support

import * as THREE from "three";

import { DeviceOrientationControls } from "three/examples/jsm/controls/DeviceOrientationControls.js";

let camera, scene, renderer, controls;

const startButton = document.getElementById("startButton");
startButton.addEventListener("click", function () {
  init();
  animate();
});

function init() {
  const overlay = document.getElementById("overlay");
  overlay.remove();

  camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1100
  );

  controls = new DeviceOrientationControls(camera);

  scene = new Scene();

  const geometry = new SphereGeometry(500, 60, 40);
  // invert the geometry on the x-axis so that all of the faces point inward
  geometry.scale(-1, 1, 1);

  const material = new MeshBasicMaterial({
    map: new TextureLoader().load("textures/2294472375_24a3b8ef46_o.jpg"),
  });

  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  const helperGeometry = new BoxGeometry(100, 100, 100, 4, 4, 4);
  const helperMaterial = new MeshBasicMaterial({
    color: 0xff00ff,
    wireframe: true,
  });
  const helper = new Mesh(helperGeometry, helperMaterial);
  scene.add(helper);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //

  window.addEventListener("resize", onWindowResize);
}

function animate() {
  window.requestAnimationFrame(animate);

  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}
