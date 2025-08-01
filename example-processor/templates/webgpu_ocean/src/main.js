import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import Stats from "three/addons/libs/stats.module.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { WaterMesh } from "three/addons/objects/WaterMesh.js";
import { SkyMesh } from "three/addons/objects/SkyMesh.js";

let container, stats;
let camera, scene, renderer;
let controls, water, sun, mesh;

init();

function init() {
  container = document.getElementById("container");

  //

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;
  container.appendChild(renderer.domElement);

  //

  scene = new Scene();

  camera = new PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    1,
    20000
  );
  camera.position.set(30, 30, 100);

  //

  sun = new Vector3();

  // Water

  const waterGeometry = new PlaneGeometry(10000, 10000);
  const loader = new TextureLoader();
  const waterNormals = loader.load("textures/waternormals.jpg");
  waterNormals.wrapS = waterNormals.wrapT = RepeatWrapping;

  water = new WaterMesh(waterGeometry, {
    waterNormals: waterNormals,
    sunDirection: new Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 3.7,
  });

  water.rotation.x = -Math.PI / 2;

  scene.add(water);

  // Skybox

  const sky = new SkyMesh();
  sky.scale.setScalar(10000);
  scene.add(sky);

  sky.turbidity.value = 10;
  sky.rayleigh.value = 2;
  sky.mieCoefficient.value = 0.005;
  sky.mieDirectionalG.value = 0.8;

  const parameters = {
    elevation: 2,
    azimuth: 180,
  };

  const pmremGenerator = new PMREMGenerator(renderer);
  const sceneEnv = new Scene();

  let renderTarget;

  function updateSun() {
    const phi = MathUtils.degToRad(90 - parameters.elevation);
    const theta = MathUtils.degToRad(parameters.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    sky.sunPosition.value.copy(sun);
    water.sunDirection.value.copy(sun).normalize();

    if (renderTarget !== undefined) renderTarget.dispose();

    sceneEnv.add(sky);
    renderTarget = pmremGenerator.fromScene(sceneEnv);
    scene.add(sky);

    scene.environment = renderTarget.texture;
  }

  renderer.init().then(updateSun);

  //

  const geometry = new BoxGeometry(30, 30, 30);
  const material = new MeshStandardMaterial({ roughness: 0 });

  mesh = new Mesh(geometry, material);
  scene.add(mesh);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 10, 0);
  controls.minDistance = 40.0;
  controls.maxDistance = 200.0;
  controls.update();

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  // GUI

  const gui = new GUI();

  const folderSky = gui.addFolder("Sky");
  folderSky.add(parameters, "elevation", 0, 90, 0.1).onChange(updateSun);
  folderSky.add(parameters, "azimuth", -180, 180, 0.1).onChange(updateSun);
  folderSky.open();

  const folderWater = gui.addFolder("Water");
  folderWater
    .add(water.distortionScale, "value", 0, 8, 0.1)
    .name("distortionScale");
  folderWater.add(water.size, "value", 0.1, 10, 0.1).name("size");
  folderWater.open();

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  render();
  stats.update();
}

function render() {
  const time = performance.now() * 0.001;

  mesh.position.y = Math.sin(time) * 20 + 5;
  mesh.rotation.x = time * 0.5;
  mesh.rotation.z = time * 0.51;

  renderer.render(scene, camera);
}
