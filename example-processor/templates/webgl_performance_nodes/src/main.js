import "./style.css"; // For webpack support

import {
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  PointLight,
  Color,
  BufferGeometryLoader,
  WebGLRenderer,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import {
  StandardNodeMaterial,
  MeshStandardNodeMaterial,
} from "three/examples/jsm/nodes/Nodes.js";

let stats;

let camera, scene, renderer;

let geometry;

let mouseX = 0,
  mouseY = 0;

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

const meshes = [];

document.addEventListener("mousemove", onDocumentMouseMove);

init();
animate();

function createScene(MaterialClass, count) {
  count = count !== undefined ? count : 70;

  let i = 0;

  for (i = 0; i < meshes.length; i++) {
    meshes[i].material.dispose();

    scene.remove(meshes[i]);
  }

  meshes.length = 0;

  for (i = 0; i < count; i++) {
    const material = new MaterialClass(),
      color = 0xffffff * Math.random();

    if (material.color.isNode) material.color.value.setHex(color);
    else material.color.setHex(color);

    // prevent share code
    material.defines.UUID = material.uuid;

    const mesh = new Mesh(geometry, material);

    mesh.position.x = Math.random() * 1000 - 500;
    mesh.position.y = Math.random() * 1000 - 500;
    mesh.position.z = Math.random() * 1000 - 500;
    mesh.rotation.x = Math.random() * 2 * Math.PI;
    mesh.rotation.y = Math.random() * 2 * Math.PI;
    mesh.scale.x = mesh.scale.y = mesh.scale.z = Math.random() * 50 + 100;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();

    scene.add(mesh);

    meshes.push(mesh);
  }
}

function benchmark() {
  let time, benchmarkTime;

  // Stabilizes CPU

  createScene(MeshStandardMaterial, 10);

  render();

  // Standard *Node* Material

  time = performance.now();

  createScene(StandardNodeMaterial);

  render();

  benchmarkTime = (performance.now() - time) / 1000;

  document.getElementById("node").textContent =
    benchmarkTime.toFixed(3) + " seconds";

  // Mesh Standard *Node* Material

  time = performance.now();

  createScene(MeshStandardNodeMaterial);

  render();

  benchmarkTime = (performance.now() - time) / 1000;

  document.getElementById("nodeBased").textContent =
    benchmarkTime.toFixed(3) + " seconds";

  // Mesh Standard Material

  time = performance.now();

  createScene(MeshStandardMaterial);

  render();

  benchmarkTime = (performance.now() - time) / 1000;

  document.getElementById("default").textContent =
    benchmarkTime.toFixed(3) + " seconds";
}

document.getElementById("startButton").addEventListener("click", function () {
  if (geometry) {
    benchmark();
  }
});

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 1800;

  scene = new Scene();
  scene.add(new PointLight(0xffffff));
  //scene.background = new Color( 0xffffff );

  const loader = new BufferGeometryLoader();
  loader.load("models/json/suzanne_buffergeometry.json", function (geo) {
    geo.computeVertexNormals();

    geometry = geo;
  });

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  container.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

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
  mouseX = (event.clientX - windowHalfX) * 10;
  mouseY = (event.clientY - windowHalfY) * 10;
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  camera.position.x += (mouseX - camera.position.x) * 0.05;
  camera.position.y += (-mouseY - camera.position.y) * 0.05;

  camera.lookAt(scene.position);

  renderer.render(scene, camera);
}
