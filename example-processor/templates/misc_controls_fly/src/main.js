import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { pass } from "three/tsl";
import { film } from "three/addons/tsl/display/FilmNode.js";

import Stats from "three/addons/libs/stats.module.js";
import { FlyControls } from "three/addons/controls/FlyControls.js";

const radius = 6371;
const tilt = 0.41;
const rotationSpeed = 0.02;

const cloudsScale = 1.005;
const moonScale = 0.23;

const MARGIN = 0;
let SCREEN_HEIGHT = window.innerHeight - MARGIN * 2;
let SCREEN_WIDTH = window.innerWidth;

let camera, controls, scene, renderer, stats;
let geometry, meshPlanet, meshClouds, meshMoon;
let dirLight;

let postProcessing;

const textureLoader = new TextureLoader();

let d, dPlanet, dMoon;
const dMoonVec = new Vector3();

const clock = new Clock();

init();

function init() {
  camera = new PerspectiveCamera(25, SCREEN_WIDTH / SCREEN_HEIGHT, 50, 1e7);
  camera.position.z = radius * 5;

  scene = new Scene();
  scene.fog = new FogExp2(0x000000, 0.00000025);

  dirLight = new DirectionalLight(0xffffff, 3);
  dirLight.position.set(-1, 0, 1).normalize();
  scene.add(dirLight);

  const materialNormalMap = new MeshPhongMaterial({
    specular: 0x7c7c7c,
    shininess: 15,
    map: textureLoader.load("textures/planets/earth_atmos_2048.jpg"),
    specularMap: textureLoader.load("textures/planets/earth_specular_2048.jpg"),
    normalMap: textureLoader.load("textures/planets/earth_normal_2048.jpg"),

    // y scale is negated to compensate for normal map handedness.
    normalScale: new Vector2(0.85, -0.85),
  });
  materialNormalMap.map.colorSpace = SRGBColorSpace;

  // planet

  geometry = new SphereGeometry(radius, 100, 50);

  meshPlanet = new Mesh(geometry, materialNormalMap);
  meshPlanet.rotation.y = 0;
  meshPlanet.rotation.z = tilt;
  scene.add(meshPlanet);

  // clouds

  const materialClouds = new MeshLambertMaterial({
    map: textureLoader.load("textures/planets/earth_clouds_1024.png"),
    transparent: true,
  });
  materialClouds.map.colorSpace = SRGBColorSpace;

  meshClouds = new Mesh(geometry, materialClouds);
  meshClouds.scale.set(cloudsScale, cloudsScale, cloudsScale);
  meshClouds.rotation.z = tilt;
  scene.add(meshClouds);

  // moon

  const materialMoon = new MeshPhongMaterial({
    map: textureLoader.load("textures/planets/moon_1024.jpg"),
  });
  materialMoon.map.colorSpace = SRGBColorSpace;

  meshMoon = new Mesh(geometry, materialMoon);
  meshMoon.position.set(radius * 5, 0, 0);
  meshMoon.scale.set(moonScale, moonScale, moonScale);
  scene.add(meshMoon);

  // stars

  const r = radius,
    starsGeometry = [new BufferGeometry(), new BufferGeometry()];

  const vertices1 = [];
  const vertices2 = [];

  const vertex = new Vector3();

  for (let i = 0; i < 250; i++) {
    vertex.x = Math.random() * 2 - 1;
    vertex.y = Math.random() * 2 - 1;
    vertex.z = Math.random() * 2 - 1;
    vertex.multiplyScalar(r);

    vertices1.push(vertex.x, vertex.y, vertex.z);
  }

  for (let i = 0; i < 1500; i++) {
    vertex.x = Math.random() * 2 - 1;
    vertex.y = Math.random() * 2 - 1;
    vertex.z = Math.random() * 2 - 1;
    vertex.multiplyScalar(r);

    vertices2.push(vertex.x, vertex.y, vertex.z);
  }

  starsGeometry[0].setAttribute(
    "position",
    new Float32BufferAttribute(vertices1, 3)
  );
  starsGeometry[1].setAttribute(
    "position",
    new Float32BufferAttribute(vertices2, 3)
  );

  const starsMaterials = [
    new PointsMaterial({ color: 0x9c9c9c }),
    new PointsMaterial({ color: 0x838383 }),
    new PointsMaterial({ color: 0x5a5a5a }),
  ];

  for (let i = 10; i < 30; i++) {
    const stars = new Points(starsGeometry[i % 2], starsMaterials[i % 3]);

    stars.rotation.x = Math.random() * 6;
    stars.rotation.y = Math.random() * 6;
    stars.rotation.z = Math.random() * 6;
    stars.scale.setScalar(i * 10);

    stars.matrixAutoUpdate = false;
    stars.updateMatrix();

    scene.add(stars);
  }

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  //

  controls = new FlyControls(camera, renderer.domElement);

  controls.movementSpeed = 1000;
  controls.domElement = renderer.domElement;
  controls.rollSpeed = Math.PI / 24;
  controls.autoForward = false;
  controls.dragToLook = false;

  //

  stats = new Stats();
  document.body.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);

  // postprocessing

  postProcessing = new PostProcessing(renderer);

  const scenePass = pass(scene, camera);
  const scenePassColor = scenePass.getTextureNode();

  postProcessing.outputNode = film(scenePassColor);
}

function onWindowResize() {
  SCREEN_HEIGHT = window.innerHeight;
  SCREEN_WIDTH = window.innerWidth;

  camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
  camera.updateProjectionMatrix();

  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
}

function animate() {
  render();
  stats.update();
}

function render() {
  // rotate the planet and clouds

  const delta = clock.getDelta();

  meshPlanet.rotation.y += rotationSpeed * delta;
  meshClouds.rotation.y += 1.25 * rotationSpeed * delta;

  // slow down as we approach the surface

  dPlanet = camera.position.length();

  dMoonVec.subVectors(camera.position, meshMoon.position);
  dMoon = dMoonVec.length();

  if (dMoon < dPlanet) {
    d = dMoon - radius * moonScale * 1.01;
  } else {
    d = dPlanet - radius * 1.01;
  }

  controls.movementSpeed = 0.33 * d;
  controls.update(delta);

  postProcessing.render();
}
