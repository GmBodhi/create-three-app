import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Clock,
  PointsMaterial,
  Points,
  WebGLRenderer,
} from "three";

import { XYZLoader } from "three/addons/loaders/XYZLoader.js";

let camera, scene, renderer, clock;

let points;

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(10, 7, 10);

  scene = new Scene();
  scene.add(camera);
  camera.lookAt(scene.position);

  clock = new Clock();

  const loader = new XYZLoader();
  loader.load("models/xyz/helix_201.xyz", function (geometry) {
    geometry.center();

    const vertexColors = geometry.hasAttribute("color") === true;

    const material = new PointsMaterial({
      size: 0.1,
      vertexColors: vertexColors,
    });

    points = new Points(geometry, material);
    scene.add(points);
  });

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.useLegacyLights = false;
  document.body.appendChild(renderer.domElement);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (points) {
    points.rotation.x += delta * 0.2;
    points.rotation.y += delta * 0.5;
  }

  renderer.render(scene, camera);
}
