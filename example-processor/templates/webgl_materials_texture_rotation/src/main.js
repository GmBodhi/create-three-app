import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  BoxGeometry,
  TextureLoader,
  RepeatWrapping,
  SRGBColorSpace,
  MeshBasicMaterial,
  Mesh,
} from "three";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let mesh, renderer, scene, camera;

let gui;

const API = {
  offsetX: 0,
  offsetY: 0,
  repeatX: 0.25,
  repeatY: 0.25,
  rotation: Math.PI / 4, // positive is counterclockwise
  centerX: 0.5,
  centerY: 0.5,
};

init();

function init() {
  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(10, 15, 25);
  scene.add(camera);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render);
  controls.minDistance = 20;
  controls.maxDistance = 50;
  controls.maxPolarAngle = Math.PI / 2;

  const geometry = new BoxGeometry(10, 10, 10);

  new TextureLoader().load("textures/uv_grid_opengl.jpg", function (texture) {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.colorSpace = SRGBColorSpace;

    //texture.matrixAutoUpdate = false; // default is true; set to false to update texture.matrix manually

    const material = new MeshBasicMaterial({ map: texture });

    mesh = new Mesh(geometry, material);
    scene.add(mesh);

    updateUvTransform();

    initGui();

    render();
  });

  window.addEventListener("resize", onWindowResize);
}

function render() {
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

function updateUvTransform() {
  const texture = mesh.material.map;

  if (texture.matrixAutoUpdate === true) {
    texture.offset.set(API.offsetX, API.offsetY);
    texture.repeat.set(API.repeatX, API.repeatY);
    texture.center.set(API.centerX, API.centerY);
    texture.rotation = API.rotation; // rotation is around center
  } else {
    // setting the matrix uv transform directly
    texture.matrix.setUvTransform(
      API.offsetX,
      API.offsetY,
      API.repeatX,
      API.repeatY,
      API.rotation,
      API.centerX,
      API.centerY
    );
  }

  render();
}

function initGui() {
  gui = new GUI();

  gui
    .add(API, "offsetX", 0.0, 1.0)
    .name("offset.x")
    .onChange(updateUvTransform);
  gui
    .add(API, "offsetY", 0.0, 1.0)
    .name("offset.y")
    .onChange(updateUvTransform);
  gui
    .add(API, "repeatX", 0.25, 2.0)
    .name("repeat.x")
    .onChange(updateUvTransform);
  gui
    .add(API, "repeatY", 0.25, 2.0)
    .name("repeat.y")
    .onChange(updateUvTransform);
  gui
    .add(API, "rotation", -2.0, 2.0)
    .name("rotation")
    .onChange(updateUvTransform);
  gui
    .add(API, "centerX", 0.0, 1.0)
    .name("center.x")
    .onChange(updateUvTransform);
  gui
    .add(API, "centerY", 0.0, 1.0)
    .name("center.y")
    .onChange(updateUvTransform);
}
