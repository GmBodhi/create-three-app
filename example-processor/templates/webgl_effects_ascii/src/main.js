import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  PointLight,
  Mesh,
  SphereGeometry,
  MeshPhongMaterial,
  PlaneGeometry,
  MeshBasicMaterial,
  WebGLRenderer,
} from "three";

import { AsciiEffect } from "three/addons/effects/AsciiEffect.js";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";

let camera, controls, scene, renderer, effect;

let sphere, plane;

const start = Date.now();

init();
animate();

function init() {
  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.y = 150;
  camera.position.z = 500;

  scene = new Scene();
  scene.background = new Color(0, 0, 0);

  const pointLight1 = new PointLight(0xffffff);
  pointLight1.position.set(500, 500, 500);
  scene.add(pointLight1);

  const pointLight2 = new PointLight(0xffffff, 0.25);
  pointLight2.position.set(-500, -500, -500);
  scene.add(pointLight2);

  sphere = new Mesh(
    new SphereGeometry(200, 20, 10),
    new MeshPhongMaterial({ flatShading: true })
  );
  scene.add(sphere);

  // Plane

  plane = new Mesh(
    new PlaneGeometry(400, 400),
    new MeshBasicMaterial({ color: 0xe0e0e0 })
  );
  plane.position.y = -200;
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);

  renderer = new WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  effect = new AsciiEffect(renderer, " .:-+*=%@#", { invert: true });
  effect.setSize(window.innerWidth, window.innerHeight);
  effect.domElement.style.color = "white";
  effect.domElement.style.backgroundColor = "black";

  // Special case: append effect.domElement, instead of renderer.domElement.
  // AsciiEffect creates a custom domElement (a div container) where the ASCII elements are placed.

  document.body.appendChild(effect.domElement);

  controls = new TrackballControls(camera, effect.domElement);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  effect.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
}

function render() {
  const timer = Date.now() - start;

  sphere.position.y = Math.abs(Math.sin(timer * 0.002)) * 150;
  sphere.rotation.x = timer * 0.0003;
  sphere.rotation.z = timer * 0.0002;

  controls.update();

  effect.render(scene, camera);
}
