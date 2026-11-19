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

  // Earth is the base, the other planets override it

  const presets = {
    Earth: {
      rayleigh: 3,
      mieCoefficient: 0.025,
      mieDirectionalG: 0.7,
      mieDirectionalGSpread: 0,
      mieColor: new Color(0.451084, 0.681483, 1.0),
      mieAlbedo: new Color(1, 1, 1),
      absorptionScale: 1,
      absorptionColor: new Color(0.3125, 1.0, 0.04375),
      sunSize: 1,
      cloudCoverage: 0.4,
      cloudDensity: 0.4,
      cloudElevation: 0.5,
    },
    Mars: {
      // thin air, large butterscotch dust grains, wispy ice clouds, blue sunsets
      rayleigh: 0.05,
      mieCoefficient: 0.75,
      mieDirectionalG: 0.55,
      mieDirectionalGSpread: 0.22,
      mieColor: new Color(1, 1, 1),
      mieAlbedo: new Color(0.95, 0.6, 0.48),
      absorptionScale: 0,
      sunSize: 0.66,
      cloudCoverage: 0.35,
      cloudDensity: 0.05,
      cloudElevation: 0.8,
    },
    Titan: {
      // dense nitrogen, orange smog under a high haze that absorbs blue
      rayleigh: 1,
      mieCoefficient: 0.5,
      mieColor: new Color(1, 1, 1),
      mieAlbedo: new Color(0.9, 0.55, 0.25),
      absorptionScale: 50,
      absorptionColor: new Color(0.1, 0.4, 1.0),
      sunSize: 0.11,
      cloudCoverage: 0.2,
    },
  };

  const effectController = {
    planet: "Earth",
    elevation: 3,
    azimuth: -150,
    exposure: 0.05,
    showSunDisc: true,
  };

  const copy = (value) => (value.isColor ? value.clone() : value);

  for (const key in presets.Earth)
    effectController[key] = copy(presets.Earth[key]);

  function applyPreset() {
    const preset = { ...presets.Earth, ...presets[effectController.planet] };

    for (const key in preset) controllers[key].setValue(copy(preset[key]));

    guiChanged();
  }

  function guiChanged() {
    sky.rayleigh.value = effectController.rayleigh;
    sky.mieCoefficient.value = effectController.mieCoefficient;
    sky.mieDirectionalG.value = effectController.mieDirectionalG;
    sky.mieDirectionalGSpread.value = effectController.mieDirectionalGSpread;
    sky.mieColor.value.copy(effectController.mieColor);
    sky.mieAlbedo.value.copy(effectController.mieAlbedo);
    sky.absorptionScale.value = effectController.absorptionScale;
    sky.absorptionColor.value.copy(effectController.absorptionColor);
    sky.cloudCoverage.value = effectController.cloudCoverage;
    sky.cloudDensity.value = effectController.cloudDensity;
    sky.cloudElevation.value = effectController.cloudElevation;
    sky.showSunDisc.value = effectController.showSunDisc;

    const phi = MathUtils.degToRad(90 - effectController.elevation);
    const theta = MathUtils.degToRad(effectController.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    sky.sunPosition.value.copy(sun);
    sky.sunSize.value = effectController.sunSize;

    renderer.toneMappingExposure = effectController.exposure;
  }

  const gui = renderer.inspector.createParameters("Settings");
  const controllers = {};

  gui
    .add(effectController, "planet", Object.keys(presets))
    .onChange(applyPreset);
  controllers.rayleigh = gui
    .add(effectController, "rayleigh", 0.0, 4, 0.001)
    .onChange(guiChanged);
  controllers.mieCoefficient = gui
    .add(effectController, "mieCoefficient", 0.0, 1, 0.001)
    .onChange(guiChanged);
  controllers.mieDirectionalG = gui
    .add(effectController, "mieDirectionalG", 0.0, 1, 0.001)
    .onChange(guiChanged);
  controllers.mieDirectionalGSpread = gui
    .add(effectController, "mieDirectionalGSpread", 0.0, 0.3, 0.001)
    .onChange(guiChanged);
  controllers.mieColor = gui
    .addColor(effectController, "mieColor")
    .onChange(guiChanged);
  controllers.mieAlbedo = gui
    .addColor(effectController, "mieAlbedo")
    .onChange(guiChanged);
  controllers.absorptionScale = gui
    .add(effectController, "absorptionScale", 0.0, 50, 0.1)
    .onChange(guiChanged);
  controllers.absorptionColor = gui
    .addColor(effectController, "absorptionColor")
    .onChange(guiChanged);
  gui.add(effectController, "elevation", 0, 90, 0.1).onChange(guiChanged);
  gui.add(effectController, "azimuth", -180, 180, 0.1).onChange(guiChanged);
  controllers.sunSize = gui
    .add(effectController, "sunSize", 0.05, 2, 0.01)
    .onChange(guiChanged);
  gui.add(effectController, "exposure", 0, 1, 0.0001).onChange(guiChanged);
  gui.add(effectController, "showSunDisc").onChange(guiChanged);

  const folderClouds = gui.addFolder("Clouds");
  controllers.cloudCoverage = folderClouds
    .add(effectController, "cloudCoverage", 0, 1, 0.01)
    .name("coverage")
    .onChange(guiChanged);
  controllers.cloudDensity = folderClouds
    .add(effectController, "cloudDensity", 0, 1, 0.01)
    .name("density")
    .onChange(guiChanged);
  controllers.cloudElevation = folderClouds
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
