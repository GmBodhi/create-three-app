import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Group,
  BoxGeometry,
  Color,
  Float32BufferAttribute,
  MeshBasicMaterial,
  Mesh,
  WebGLRenderer,
} from "three";

import { PeppersGhostEffect } from "three/addons/effects/PeppersGhostEffect.js";

let container;

let camera, scene, renderer, effect;
let group;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    100000
  );

  scene = new Scene();

  group = new Group();
  scene.add(group);

  // Cube

  const geometry = new BoxGeometry().toNonIndexed(); // ensure unique vertices for each triangle

  const position = geometry.attributes.position;
  const colors = [];
  const color = new Color();

  // generate for each side of the cube a different color

  for (let i = 0; i < position.count; i += 6) {
    color.setHex(Math.random() * 0xffffff);

    // first face

    colors.push(color.r, color.g, color.b);
    colors.push(color.r, color.g, color.b);
    colors.push(color.r, color.g, color.b);

    // second face

    colors.push(color.r, color.g, color.b);
    colors.push(color.r, color.g, color.b);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));

  const material = new MeshBasicMaterial({ vertexColors: true });

  for (let i = 0; i < 10; i++) {
    const cube = new Mesh(geometry, material);
    cube.position.x = Math.random() * 2 - 1;
    cube.position.y = Math.random() * 2 - 1;
    cube.position.z = Math.random() * 2 - 1;
    cube.scale.multiplyScalar(Math.random() + 0.5);
    group.add(cube);
  }

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  effect = new PeppersGhostEffect(renderer);
  effect.setSize(window.innerWidth, window.innerHeight);
  effect.cameraDistance = 5;

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  effect.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  group.rotation.y += 0.01;

  effect.render(scene, camera);
}
