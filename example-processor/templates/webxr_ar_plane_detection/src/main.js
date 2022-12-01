import "./style.css"; // For webpack support

import {
  Scene,
  PerspectiveCamera,
  HemisphereLight,
  WebGLRenderer,
  BufferGeometry,
  Mesh,
  BoxGeometry,
  MeshBasicMaterial,
} from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";

let camera, scene, renderer;
let controller;

init();
animate();

const planesAdded = new Set();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  scene = new Scene();

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  const light = new HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  //

  renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  //

  document.body.appendChild(
    ARButton.createButton(renderer, {
      requiredFeatures: ["plane-detection"],
    })
  );

  //

  window.addEventListener("resize", onWindowResize);

  renderer.xr.addEventListener("sessionstart", function () {
    camera.position.set(0, 0, 0);
  });

  renderer.xr.addEventListener("planeadded", function (e) {
    console.log("plane added", e.data);
  });

  renderer.xr.addEventListener("planeremoved", function (e) {
    console.log("plane removed", e.data);
  });

  renderer.xr.addEventListener("planechanged", function (e) {
    console.log("plane changed", e.data);
  });

  renderer.xr.addEventListener("planesdetected", function (e) {
    const detectedPlanes = e.data;
    const referenceSpace = renderer.xr.getReferenceSpace();

    console.log(`Detected ${detectedPlanes.size} planes`);

    detectedPlanes.forEach((plane) => {
      if (planesAdded.has(plane)) return;

      planesAdded.add(plane);
      const frame = renderer.xr.getFrame();
      const planePose = frame.getPose(plane.planeSpace, referenceSpace);
      const planeGeometry = new BufferGeometry();
      const polygon = plane.polygon;

      let minX = Number.MAX_SAFE_INTEGER;
      let maxX = Number.MIN_SAFE_INTEGER;
      let minZ = Number.MAX_SAFE_INTEGER;
      let maxZ = Number.MIN_SAFE_INTEGER;

      polygon.forEach((point) => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minZ = Math.min(minZ, point.z);
        maxZ = Math.max(maxZ, point.z);
      });

      const width = maxX - minX;
      const height = maxZ - minZ;

      const boxMesh = new Mesh(
        new BoxGeometry(width, 0.01, height),
        new MeshBasicMaterial({ color: 0xffffff * Math.random() })
      );
      boxMesh.matrixAutoUpdate = false;
      boxMesh.matrix.fromArray(planePose.transform.matrix);
      scene.add(boxMesh);
    });
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  renderer.render(scene, camera);
}
