import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  PCFSoftShadowMap,
  sRGBEncoding,
  Scene,
  PerspectiveCamera,
  AmbientLight,
  SpotLight,
  SpotLightHelper,
  CameraHelper,
  MeshPhongMaterial,
  PlaneGeometry,
  Mesh,
  CylinderGeometry,
} from "three";

import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let renderer, scene, camera;

let spotLight, lightHelper, shadowCameraHelper;

let gui;

function init() {
  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  renderer.shadowMap.enabled = true;

  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.outputEncoding = sRGBEncoding;

  scene = new Scene();

  camera = new PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(160, 40, 10);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render);
  controls.minDistance = 20;
  controls.maxDistance = 500;
  controls.enablePan = false;

  const ambient = new AmbientLight(0xffffff, 0.1);
  scene.add(ambient);

  spotLight = new SpotLight(0xffffff, 1);
  spotLight.position.set(15, 40, 35);
  spotLight.angle = Math.PI / 4;
  spotLight.penumbra = 0.1;
  spotLight.decay = 2;
  spotLight.distance = 200;

  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 512;
  spotLight.shadow.mapSize.height = 512;
  spotLight.shadow.camera.near = 10;
  spotLight.shadow.camera.far = 200;
  spotLight.shadow.focus = 1;
  scene.add(spotLight);

  lightHelper = new SpotLightHelper(spotLight);
  scene.add(lightHelper);

  shadowCameraHelper = new CameraHelper(spotLight.shadow.camera);
  scene.add(shadowCameraHelper);

  //

  let material = new MeshPhongMaterial({ color: 0x808080, dithering: true });

  let geometry = new PlaneGeometry(2000, 2000);

  let mesh = new Mesh(geometry, material);
  mesh.position.set(0, -1, 0);
  mesh.rotation.x = -Math.PI * 0.5;
  mesh.receiveShadow = true;
  scene.add(mesh);

  //

  material = new MeshPhongMaterial({ color: 0x4080ff, dithering: true });

  geometry = new CylinderGeometry(5, 5, 2, 32, 1, false);

  mesh = new Mesh(geometry, material);
  mesh.position.set(0, 5, 0);
  mesh.castShadow = true;
  scene.add(mesh);

  render();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  lightHelper.update();

  shadowCameraHelper.update();

  renderer.render(scene, camera);
}

function buildGui() {
  gui = new GUI();

  const params = {
    "light color": spotLight.color.getHex(),
    intensity: spotLight.intensity,
    distance: spotLight.distance,
    angle: spotLight.angle,
    penumbra: spotLight.penumbra,
    decay: spotLight.decay,
    focus: spotLight.shadow.focus,
  };

  gui.addColor(params, "light color").onChange(function (val) {
    spotLight.color.setHex(val);
    render();
  });

  gui.add(params, "intensity", 0, 2).onChange(function (val) {
    spotLight.intensity = val;
    render();
  });

  gui.add(params, "distance", 50, 200).onChange(function (val) {
    spotLight.distance = val;
    render();
  });

  gui.add(params, "angle", 0, Math.PI / 3).onChange(function (val) {
    spotLight.angle = val;
    render();
  });

  gui.add(params, "penumbra", 0, 1).onChange(function (val) {
    spotLight.penumbra = val;
    render();
  });

  gui.add(params, "decay", 1, 2).onChange(function (val) {
    spotLight.decay = val;
    render();
  });

  gui.add(params, "focus", 0, 1).onChange(function (val) {
    spotLight.shadow.focus = val;
    render();
  });

  gui.open();
}

init();

buildGui();

render();
