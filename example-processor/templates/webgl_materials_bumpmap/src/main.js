import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  HemisphereLight,
  SpotLight,
  TextureLoader,
  MeshPhongMaterial,
  WebGLRenderer,
  Mesh,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let container, stats, loader;

let camera, scene, renderer;

let mesh;

let spotLight;

let mouseX = 0;
let mouseY = 0;

let targetX = 0;
let targetY = 0;

const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  //

  camera = new PerspectiveCamera(
    27,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 12;

  scene = new Scene();
  scene.background = new Color(0x060708);

  // LIGHTS

  scene.add(new HemisphereLight(0x8d7c7c, 0x494966, 3));

  spotLight = new SpotLight(0xffffde, 200);
  spotLight.position.set(3.5, 0, 7);
  scene.add(spotLight);

  spotLight.castShadow = true;

  spotLight.shadow.mapSize.width = 2048;
  spotLight.shadow.mapSize.height = 2048;

  spotLight.shadow.camera.near = 2;
  spotLight.shadow.camera.far = 15;

  spotLight.shadow.camera.fov = 40;

  spotLight.shadow.bias = -0.005;

  //

  const mapHeight = new TextureLoader().load(
    "models/gltf/LeePerrySmith/Infinite-Level_02_Disp_NoSmoothUV-4096.jpg"
  );

  const material = new MeshPhongMaterial({
    color: 0x9c6e49,
    specular: 0x666666,
    shininess: 25,
    bumpMap: mapHeight,
    bumpScale: 10,
  });

  loader = new GLTFLoader();
  loader.load("models/gltf/LeePerrySmith/LeePerrySmith.glb", function (gltf) {
    createScene(gltf.scene.children[0].geometry, 1, material);
  });

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  renderer.shadowMap.enabled = true;

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  // EVENTS

  document.addEventListener("mousemove", onDocumentMouseMove);
  window.addEventListener("resize", onWindowResize);
}

function createScene(geometry, scale, material) {
  mesh = new Mesh(geometry, material);

  mesh.position.y = -0.5;
  mesh.scale.set(scale, scale, scale);

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  scene.add(mesh);
}

//

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function onDocumentMouseMove(event) {
  mouseX = event.clientX - windowHalfX;
  mouseY = event.clientY - windowHalfY;
}

//

function animate() {
  requestAnimationFrame(animate);

  render();

  stats.update();
}

function render() {
  targetX = mouseX * 0.001;
  targetY = mouseY * 0.001;

  if (mesh) {
    mesh.rotation.y += 0.05 * (targetX - mesh.rotation.y);
    mesh.rotation.x += 0.05 * (targetY - mesh.rotation.x);
  }

  renderer.render(scene, camera);
}
