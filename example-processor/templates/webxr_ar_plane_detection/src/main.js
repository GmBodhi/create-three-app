import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  HemisphereLight,
} from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { XRPlanes } from "three/addons/webxr/XRPlanes.js";

//

const renderer = new WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

document.body.appendChild(
  ARButton.createButton(renderer, {
    requiredFeatures: ["plane-detection"],
  })
);

window.addEventListener("resize", onWindowResize);

//

const scene = new Scene();

const planes = new XRPlanes(renderer);
scene.add(planes);

const camera = new PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.01,
  20
);

const light = new HemisphereLight(0xffffff, 0xbbbbff, 3);
light.position.set(0.5, 1, 0.25);
scene.add(light);

//

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.render(scene, camera);
}
