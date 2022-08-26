import "./style.css"; // For webpack support

import {
  Clock,
  TextureLoader,
  PerspectiveCamera,
  Scene,
  DirectionalLight,
  AxesHelper,
  SphereGeometry,
  MeshPhongMaterial,
  Vector2,
  Mesh,
  WebGLRenderer,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/addons/renderers/CSS2DRenderer.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let gui;

let camera, scene, renderer, labelRenderer;

const layers = {
  "Toggle Name": function () {
    camera.layers.toggle(0);
  },
  "Toggle Mass": function () {
    camera.layers.toggle(1);
  },
  "Enable All": function () {
    camera.layers.enableAll();
  },

  "Disable All": function () {
    camera.layers.disableAll();
  },
};

const clock = new Clock();
const textureLoader = new TextureLoader();

let moon;

init();
animate();

function init() {
  const EARTH_RADIUS = 1;
  const MOON_RADIUS = 0.27;

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(10, 5, 20);
  camera.layers.enableAll();
  camera.layers.toggle(1);

  scene = new Scene();

  const dirLight = new DirectionalLight(0xffffff);
  dirLight.position.set(0, 0, 1);
  dirLight.layers.enableAll();
  scene.add(dirLight);

  const axesHelper = new AxesHelper(5);
  axesHelper.layers.enableAll();
  scene.add(axesHelper);

  //

  const earthGeometry = new SphereGeometry(EARTH_RADIUS, 16, 16);
  const earthMaterial = new MeshPhongMaterial({
    specular: 0x333333,
    shininess: 5,
    map: textureLoader.load("textures/planets/earth_atmos_2048.jpg"),
    specularMap: textureLoader.load("textures/planets/earth_specular_2048.jpg"),
    normalMap: textureLoader.load("textures/planets/earth_normal_2048.jpg"),
    normalScale: new Vector2(0.85, 0.85),
  });
  const earth = new Mesh(earthGeometry, earthMaterial);
  scene.add(earth);

  const moonGeometry = new SphereGeometry(MOON_RADIUS, 16, 16);
  const moonMaterial = new MeshPhongMaterial({
    shininess: 5,
    map: textureLoader.load("textures/planets/moon_1024.jpg"),
  });
  moon = new Mesh(moonGeometry, moonMaterial);
  scene.add(moon);

  //

  earth.layers.enableAll();
  moon.layers.enableAll();

  const earthDiv = document.createElement("div");
  earthDiv.className = "label";
  earthDiv.textContent = "Earth";
  earthDiv.style.marginTop = "-1em";
  const earthLabel = new CSS2DObject(earthDiv);
  earthLabel.position.set(0, EARTH_RADIUS, 0);
  earth.add(earthLabel);
  earthLabel.layers.set(0);

  const earthMassDiv = document.createElement("div");
  earthMassDiv.className = "label";
  earthMassDiv.textContent = "5.97237e24 kg";
  earthMassDiv.style.marginTop = "-1em";
  const earthMassLabel = new CSS2DObject(earthMassDiv);
  earthMassLabel.position.set(0, -2 * EARTH_RADIUS, 0);
  earth.add(earthMassLabel);
  earthMassLabel.layers.set(1);

  const moonDiv = document.createElement("div");
  moonDiv.className = "label";
  moonDiv.textContent = "Moon";
  moonDiv.style.marginTop = "-1em";
  const moonLabel = new CSS2DObject(moonDiv);
  moonLabel.position.set(0, MOON_RADIUS, 0);
  moon.add(moonLabel);
  moonLabel.layers.set(0);

  const moonMassDiv = document.createElement("div");
  moonMassDiv.className = "label";
  moonMassDiv.textContent = "7.342e22 kg";
  moonMassDiv.style.marginTop = "-1em";
  const moonMassLabel = new CSS2DObject(moonMassDiv);
  moonMassLabel.position.set(0, -2 * MOON_RADIUS, 0);
  moon.add(moonMassLabel);
  moonMassLabel.layers.set(1);

  //

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.top = "0px";
  document.body.appendChild(labelRenderer.domElement);

  const controls = new OrbitControls(camera, labelRenderer.domElement);
  controls.minDistance = 5;
  controls.maxDistance = 100;

  //

  window.addEventListener("resize", onWindowResize);

  initGui();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();

  moon.position.set(Math.sin(elapsed) * 5, 0, Math.cos(elapsed) * 5);

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

//

function initGui() {
  gui = new GUI();

  gui.add(layers, "Toggle Name");
  gui.add(layers, "Toggle Mass");
  gui.add(layers, "Enable All");
  gui.add(layers, "Disable All");
}
