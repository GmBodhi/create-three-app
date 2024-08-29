import "./style.css"; // For webpack support

import {
  WebGPURenderer,
  Scene,
  PerspectiveCamera,
  Color,
  Vector3,
  CatmullRomCurve3,
  SRGBColorSpace,
  InstancedPointsNodeMaterial,
} from "three";
import { color } from "three/tsl";

import Stats from "three/addons/libs/stats.module.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import InstancedPoints from "three/addons/objects/InstancedPoints.js";
import InstancedPointsGeometry from "three/addons/geometries/InstancedPointsGeometry.js";

import * as GeometryUtils from "three/addons/utils/GeometryUtils.js";

let renderer, scene, camera, camera2, controls, backgroundNode;
let material;
let stats;
let gui;

// viewport
let insetWidth;
let insetHeight;

init();

function init() {
  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(-40, 0, 60);

  camera2 = new PerspectiveCamera(40, 1, 1, 1000);
  camera2.position.copy(camera.position);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 10;
  controls.maxDistance = 500;

  backgroundNode = color(0x222222);

  // Position and Color Data

  const positions = [];
  const colors = [];

  const points = GeometryUtils.hilbert3D(
    new Vector3(0, 0, 0),
    20.0,
    1,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7
  );

  const spline = new CatmullRomCurve3(points);
  const divisions = Math.round(4 * points.length);
  const point = new Vector3();
  const pointColor = new Color();

  for (let i = 0, l = divisions; i < l; i++) {
    const t = i / l;

    spline.getPoint(t, point);
    positions.push(point.x, point.y, point.z);

    pointColor.setHSL(t, 1.0, 0.5, SRGBColorSpace);
    colors.push(pointColor.r, pointColor.g, pointColor.b);
  }

  // Instanced Points

  const geometry = new InstancedPointsGeometry();
  geometry.setPositions(positions);
  geometry.setColors(colors);

  geometry.instanceCount = positions.length / 3; // this should not be necessary

  material = new InstancedPointsNodeMaterial({
    color: 0xffffff,
    pointWidth: 10, // in pixel units

    vertexColors: true,
    alphaToCoverage: true,
  });

  const instancedPoints = new InstancedPoints(geometry, material);
  instancedPoints.scale.set(1, 1, 1);
  scene.add(instancedPoints);

  //

  window.addEventListener("resize", onWindowResize);
  onWindowResize();

  stats = new Stats();
  document.body.appendChild(stats.dom);

  initGui();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  insetWidth = window.innerHeight / 4; // square
  insetHeight = window.innerHeight / 4;

  camera2.aspect = insetWidth / insetHeight;
  camera2.updateProjectionMatrix();
}

function animate() {
  stats.update();

  // main scene

  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);

  controls.update();

  renderer.autoClear = true;

  scene.backgroundNode = null;

  renderer.render(scene, camera);

  // inset scene

  const posY = window.innerHeight - insetHeight - 20;

  renderer.clearDepth(); // important!

  renderer.setScissorTest(true);

  renderer.setScissor(20, posY, insetWidth, insetHeight);

  renderer.setViewport(20, posY, insetWidth, insetHeight);

  camera2.position.copy(camera.position);

  camera2.quaternion.copy(camera.quaternion);

  renderer.autoClear = false;

  scene.backgroundNode = backgroundNode;

  renderer.render(scene, camera2);

  renderer.setScissorTest(false);
}

//

function initGui() {
  gui = new GUI();

  const param = {
    width: 10,
    alphaToCoverage: true,
  };

  gui.add(param, "width", 1, 20, 1).onChange(function (val) {
    material.pointWidth = val;
  });

  gui.add(param, "alphaToCoverage").onChange(function (val) {
    material.alphaToCoverage = val;
  });
}
