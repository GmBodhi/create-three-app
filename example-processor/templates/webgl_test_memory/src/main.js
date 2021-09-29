import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  WebGLRenderer,
  SphereGeometry,
  CanvasTexture,
  MeshBasicMaterial,
  Mesh,
} from "three";

let camera, scene, renderer;

init();
animate();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 200;

  scene = new Scene();
  scene.background = new Color(0xffffff);

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);
}

function createImage() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;

  const context = canvas.getContext("2d");
  context.fillStyle =
    "rgb(" +
    Math.floor(Math.random() * 256) +
    "," +
    Math.floor(Math.random() * 256) +
    "," +
    Math.floor(Math.random() * 256) +
    ")";
  context.fillRect(0, 0, 256, 256);

  return canvas;
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
}

function render() {
  const geometry = new SphereGeometry(
    50,
    Math.random() * 64,
    Math.random() * 32
  );

  const texture = new CanvasTexture(createImage());

  const material = new MeshBasicMaterial({ map: texture, wireframe: true });

  const mesh = new Mesh(geometry, material);

  scene.add(mesh);

  renderer.render(scene, camera);

  scene.remove(mesh);

  // clean up

  geometry.dispose();
  material.dispose();
  texture.dispose();
}
