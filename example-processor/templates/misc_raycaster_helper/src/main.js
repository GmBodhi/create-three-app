import "./style.css"; // For webpack support

import {
  WebGPURenderer,
  PerspectiveCamera,
  Scene,
  CapsuleGeometry,
  MeshNormalMaterial,
  DoubleSide,
  Mesh,
  Raycaster,
  Vector3,
} from "three";
import { RaycasterHelper } from "https://cdn.jsdelivr.net/npm/@gsimone/three-raycaster-helper@0.1.0/dist/gsimone-three-raycaster-helper.esm.js";

let scene, renderer;
let camera;

let capsule1, capsule2, capsule3;
let raycaster, raycasterHelper;

init();

function init() {
  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  //

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 10;

  scene = new Scene();

  //

  const geometry = new CapsuleGeometry(0.5, 0.5, 4, 32);
  const material = new MeshNormalMaterial();
  material.side = DoubleSide;

  capsule1 = new Mesh(geometry, material);
  capsule1.position.x = -2;
  capsule2 = new Mesh(geometry, material);
  capsule2.position.x = 0;
  capsule3 = new Mesh(geometry, material);
  capsule3.position.x = 2;

  scene.add(capsule1);
  scene.add(capsule2);
  scene.add(capsule3);

  raycaster = new Raycaster(new Vector3(-4, 0, 0), new Vector3(1, 0, 0));
  raycaster.near = 1;
  raycaster.far = 8;
  raycasterHelper = new RaycasterHelper(raycaster);
  scene.add(raycasterHelper);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(time) {
  const elapsedTime = time / 1000; // ms to s

  [capsule1, capsule2, capsule3].forEach((capsule) => {
    capsule.position.y = Math.sin(elapsedTime * 0.5 + capsule.position.x);
    capsule.rotation.z = Math.sin(elapsedTime * 0.5) * Math.PI * 1;
  });

  raycasterHelper.hits = raycaster.intersectObjects(scene.children);
  raycasterHelper.update();

  renderer.render(scene, camera);
}
