import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import { Inspector } from "three/addons/inspector/Inspector.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SkyMesh } from "three/addons/objects/SkyMesh.js";

let camera, scene, renderer;

let sky, sun;

let sphere, cubeCamera;

init();

function initSky() {
  // Add Sky
  sky = new SkyMesh();
  sky.scale.setScalar(450000);
  scene.add(sky);

  sun = new Vector3();

  /// GUI

  const effectController = {
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    elevation: 65,
    azimuth: 0,
    exposure: 0.05,
    cloudCoverage: 0.4,
    cloudDensity: 0.4,
    cloudElevation: 0.5,
    showSunDisc: true,
  };

  function guiChanged() {
    sky.turbidity.value = effectController.turbidity;
    sky.rayleigh.value = effectController.rayleigh;
    sky.mieCoefficient.value = effectController.mieCoefficient;
    sky.mieDirectionalG.value = effectController.mieDirectionalG;
    sky.cloudCoverage.value = effectController.cloudCoverage;
    sky.cloudDensity.value = effectController.cloudDensity;
    sky.cloudElevation.value = effectController.cloudElevation;
    sky.showSunDisc.value = effectController.showSunDisc;

    const phi = MathUtils.degToRad(90 - effectController.elevation);
    const theta = MathUtils.degToRad(effectController.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    sky.sunPosition.value.copy(sun);

    renderer.toneMappingExposure = effectController.exposure;
  }

  const gui = renderer.inspector.createParameters("Settings");

  gui.add(effectController, "turbidity", 0.0, 20.0, 0.1).onChange(guiChanged);
  gui.add(effectController, "rayleigh", 0.0, 4, 0.001).onChange(guiChanged);
  gui
    .add(effectController, "mieCoefficient", 0.0, 0.1, 0.001)
    .onChange(guiChanged);
  gui
    .add(effectController, "mieDirectionalG", 0.0, 1, 0.001)
    .onChange(guiChanged);
  gui.add(effectController, "elevation", 0, 90, 0.1).onChange(guiChanged);
  gui.add(effectController, "azimuth", -180, 180, 0.1).onChange(guiChanged);
  gui.add(effectController, "exposure", 0, 1, 0.0001).onChange(guiChanged);
  gui.add(effectController, "showSunDisc").onChange(guiChanged);

  const folderClouds = gui.addFolder("Clouds");
  folderClouds
    .add(effectController, "cloudCoverage", 0, 1, 0.01)
    .name("coverage")
    .onChange(guiChanged);
  folderClouds
    .add(effectController, "cloudDensity", 0, 1, 0.01)
    .name("density")
    .onChange(guiChanged);
  folderClouds
    .add(effectController, "cloudElevation", 0, 1, 0.01)
    .name("elevation")
    .onChange(guiChanged);

  guiChanged();
}

function init() {
  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    100,
    2000000
  );
  camera.position.set(0, 100, 2000);

  scene = new Scene();

  const cubeRenderTarget = new CubeRenderTarget(256, { type: HalfFloatType });
  cubeCamera = new CubeCamera(1, 1000, cubeRenderTarget);

  sphere = new Mesh(
    new SphereGeometry(400, 64, 32),
    new MeshBasicNodeMaterial({ envMap: cubeRenderTarget.texture })
  );
  scene.add(sphere);

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;
  renderer.inspector = new Inspector();
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  //controls.maxPolarAngle = Math.PI / 2;
  controls.enableZoom = false;
  controls.enablePan = false;

  initSky();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  sphere.visible = false;
  cubeCamera.update(renderer, scene);
  sphere.visible = true;

  renderer.render(scene, camera);
}
