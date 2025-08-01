import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  cubeTexture,
  positionWorld,
  oscSine,
  time,
  pass,
  uniform,
} from "three/tsl";
import { dof } from "three/addons/tsl/display/DepthOfFieldNode.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import Stats from "three/addons/libs/stats.module.js";

//

let camera, scene, renderer, mesh, stats;

let mouseX = 0,
  mouseY = 0;

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

let width = window.innerWidth;
let height = window.innerHeight;

let postProcessing;

init();

function init() {
  camera = new PerspectiveCamera(70, width / height, 1, 3000);
  camera.position.z = 200;

  scene = new Scene();

  const path = "textures/cube/SwedishRoyalCastle/";
  const format = ".jpg";
  const urls = [
    path + "px" + format,
    path + "nx" + format,
    path + "py" + format,
    path + "ny" + format,
    path + "pz" + format,
    path + "nz" + format,
  ];

  const xgrid = 14,
    ygrid = 9,
    zgrid = 14;
  const count = xgrid * ygrid * zgrid;

  const textureCube = new CubeTextureLoader().load(urls);
  const cubeTextureNode = cubeTexture(textureCube);
  const oscPos = oscSine(
    positionWorld.div(1000 /* scene distance */).add(time.mul(0.2))
  );

  const geometry = new SphereGeometry(60, 20, 10);
  const material = new MeshBasicNodeMaterial();
  material.colorNode = cubeTextureNode.mul(oscPos);

  mesh = new InstancedMesh(geometry, material, count);
  scene.add(mesh);

  const matrix = new Matrix4();

  let index = 0;

  for (let i = 0; i < xgrid; i++) {
    for (let j = 0; j < ygrid; j++) {
      for (let k = 0; k < zgrid; k++) {
        const x = 200 * (i - xgrid / 2);
        const y = 200 * (j - ygrid / 2);
        const z = 200 * (k - zgrid / 2);

        mesh.setMatrixAt(index, matrix.identity().setPosition(x, y, z));
        index++;
      }
    }
  }

  // renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  const effectController = {
    focus: uniform(500.0),
    aperture: uniform(5),
    maxblur: uniform(0.01),
  };

  // post processing

  postProcessing = new PostProcessing(renderer);

  const scenePass = pass(scene, camera);

  const scenePassColor = scenePass.getTextureNode();
  const scenePassViewZ = scenePass.getViewZNode();

  const dofPass = dof(
    scenePassColor,
    scenePassViewZ,
    effectController.focus,
    effectController.aperture.mul(0.00001),
    effectController.maxblur
  );

  postProcessing.outputNode = dofPass;

  // controls

  renderer.domElement.style.touchAction = "none";
  renderer.domElement.addEventListener("pointermove", onPointerMove);

  window.addEventListener("resize", onWindowResize);

  // stats

  stats = new Stats();
  document.body.appendChild(stats.dom);

  // gui

  const gui = new GUI();
  gui.add(effectController.focus, "value", 10.0, 3000.0, 10).name("focus");
  gui.add(effectController.aperture, "value", 0, 10, 0.1).name("aperture");
  gui.add(effectController.maxblur, "value", 0.0, 0.01, 0.001).name("maxblur");
}

function onPointerMove(event) {
  if (event.isPrimary === false) return;

  mouseX = event.clientX - windowHalfX;
  mouseY = event.clientY - windowHalfY;
}

function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;

  width = window.innerWidth;
  height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function animate() {
  render();

  stats.update();
}

function render() {
  camera.position.x += (mouseX - camera.position.x) * 0.036;
  camera.position.y += (-mouseY - camera.position.y) * 0.036;

  camera.lookAt(scene.position);

  postProcessing.render();
}
