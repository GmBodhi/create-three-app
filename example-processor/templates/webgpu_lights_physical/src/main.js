import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, scene, renderer, bulbLight, bulbMat, hemiLight, stats;
let ballMat, cubeMat, floorMat;

let previousShadowMap = false;

// ref for lumens: http://www.power-sure.com/lumens.htm
const bulbLuminousPowers = {
  "110000 lm (1000W)": 110000,
  "3500 lm (300W)": 3500,
  "1700 lm (100W)": 1700,
  "800 lm (60W)": 800,
  "400 lm (40W)": 400,
  "180 lm (25W)": 180,
  "20 lm (4W)": 20,
  Off: 0,
};

// ref for solar irradiances: https://en.wikipedia.org/wiki/Lux
const hemiLuminousIrradiances = {
  "0.0001 lx (Moonless Night)": 0.0001,
  "0.002 lx (Night Airglow)": 0.002,
  "0.5 lx (Full Moon)": 0.5,
  "3.4 lx (City Twilight)": 3.4,
  "50 lx (Living Room)": 50,
  "100 lx (Very Overcast)": 100,
  "350 lx (Office Room)": 350,
  "400 lx (Sunrise/Sunset)": 400,
  "1000 lx (Overcast)": 1000,
  "18000 lx (Daylight)": 18000,
  "50000 lx (Direct Sun)": 50000,
};

const params = {
  shadows: true,
  exposure: 0.68,
  bulbPower: Object.keys(bulbLuminousPowers)[4],
  hemiIrradiance: Object.keys(hemiLuminousIrradiances)[0],
};

init();

function init() {
  const container = document.getElementById("container");

  stats = new Stats();
  container.appendChild(stats.dom);

  //

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.x = -4;
  camera.position.z = 4;
  camera.position.y = 2;

  scene = new Scene();

  const bulbGeometry = new SphereGeometry(0.02, 16, 8);
  bulbLight = new PointLight(0xffee88, 1, 100, 2);

  bulbMat = new MeshStandardMaterial({
    emissive: 0xffffee,
    emissiveIntensity: 1,
    color: 0x000000,
  });
  bulbLight.add(new Mesh(bulbGeometry, bulbMat));
  bulbLight.position.set(0, 2, 0);
  bulbLight.castShadow = true;
  scene.add(bulbLight);

  hemiLight = new HemisphereLight(0xddeeff, 0x0f0e0d, 0.02);
  scene.add(hemiLight);

  floorMat = new MeshStandardMaterial({
    roughness: 0.8,
    color: 0xffffff,
    metalness: 0.2,
    bumpScale: 1,
  });
  const textureLoader = new TextureLoader();
  textureLoader.load("textures/hardwood2_diffuse.jpg", function (map) {
    map.wrapS = RepeatWrapping;
    map.wrapT = RepeatWrapping;
    map.anisotropy = 4;
    map.repeat.set(10, 24);
    map.colorSpace = SRGBColorSpace;
    floorMat.map = map;
    floorMat.needsUpdate = true;
  });
  textureLoader.load("textures/hardwood2_bump.jpg", function (map) {
    map.wrapS = RepeatWrapping;
    map.wrapT = RepeatWrapping;
    map.anisotropy = 4;
    map.repeat.set(10, 24);
    floorMat.bumpMap = map;
    floorMat.needsUpdate = true;
  });
  textureLoader.load("textures/hardwood2_roughness.jpg", function (map) {
    map.wrapS = RepeatWrapping;
    map.wrapT = RepeatWrapping;
    map.anisotropy = 4;
    map.repeat.set(10, 24);
    floorMat.roughnessMap = map;
    floorMat.needsUpdate = true;
  });

  cubeMat = new MeshStandardMaterial({
    roughness: 0.7,
    color: 0xffffff,
    bumpScale: 1,
    metalness: 0.2,
  });
  textureLoader.load("textures/brick_diffuse.jpg", function (map) {
    map.wrapS = RepeatWrapping;
    map.wrapT = RepeatWrapping;
    map.anisotropy = 4;
    map.repeat.set(1, 1);
    map.colorSpace = SRGBColorSpace;
    cubeMat.map = map;
    cubeMat.needsUpdate = true;
  });
  textureLoader.load("textures/brick_bump.jpg", function (map) {
    map.wrapS = RepeatWrapping;
    map.wrapT = RepeatWrapping;
    map.anisotropy = 4;
    map.repeat.set(1, 1);
    cubeMat.bumpMap = map;
    cubeMat.needsUpdate = true;
  });

  ballMat = new MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    metalness: 1.0,
  });
  textureLoader.load("textures/planets/earth_atmos_2048.jpg", function (map) {
    map.anisotropy = 4;
    map.colorSpace = SRGBColorSpace;
    ballMat.map = map;
    ballMat.needsUpdate = true;
  });
  textureLoader.load(
    "textures/planets/earth_specular_2048.jpg",
    function (map) {
      map.anisotropy = 4;
      map.colorSpace = SRGBColorSpace;
      ballMat.metalnessMap = map;
      ballMat.needsUpdate = true;
    }
  );

  const floorGeometry = new PlaneGeometry(20, 20);
  const floorMesh = new Mesh(floorGeometry, floorMat);
  floorMesh.receiveShadow = true;
  floorMesh.rotation.x = -Math.PI / 2.0;
  scene.add(floorMesh);

  const ballGeometry = new SphereGeometry(0.25, 32, 32);
  const ballMesh = new Mesh(ballGeometry, ballMat);
  ballMesh.position.set(1, 0.25, 1);
  ballMesh.rotation.y = Math.PI;
  ballMesh.castShadow = true;
  scene.add(ballMesh);

  const boxGeometry = new BoxGeometry(0.5, 0.5, 0.5);
  const boxMesh = new Mesh(boxGeometry, cubeMat);
  boxMesh.position.set(-0.5, 0.25, -1);
  boxMesh.castShadow = true;
  scene.add(boxMesh);

  const boxMesh2 = new Mesh(boxGeometry, cubeMat);
  boxMesh2.position.set(0, 0.25, -5);
  boxMesh2.castShadow = true;
  scene.add(boxMesh2);

  const boxMesh3 = new Mesh(boxGeometry, cubeMat);
  boxMesh3.position.set(7, 0.25, 0);
  boxMesh3.castShadow = true;
  scene.add(boxMesh3);

  //

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = ReinhardToneMapping;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 1;
  controls.maxDistance = 20;

  window.addEventListener("resize", onWindowResize);

  //

  const gui = new GUI();

  gui.add(params, "hemiIrradiance", Object.keys(hemiLuminousIrradiances));
  gui.add(params, "bulbPower", Object.keys(bulbLuminousPowers));
  gui.add(params, "exposure", 0, 1);
  gui.add(params, "shadows");
  gui.open();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  renderer.toneMappingExposure = Math.pow(params.exposure, 5.0); // to allow for very bright scenes.
  renderer.shadowMap.enabled = params.shadows;
  bulbLight.castShadow = params.shadows;

  if (params.shadows !== previousShadowMap) {
    ballMat.needsUpdate = true;
    cubeMat.needsUpdate = true;
    floorMat.needsUpdate = true;
    previousShadowMap = params.shadows;
  }

  bulbLight.power = bulbLuminousPowers[params.bulbPower];
  bulbMat.emissiveIntensity = bulbLight.intensity / Math.pow(0.02, 2.0); // convert from intensity to irradiance at bulb surface

  hemiLight.intensity = hemiLuminousIrradiances[params.hemiIrradiance];
  const time = Date.now() * 0.0005;

  bulbLight.position.y = Math.cos(time) * 0.75 + 1.25;

  renderer.render(scene, camera);

  stats.update();
}
