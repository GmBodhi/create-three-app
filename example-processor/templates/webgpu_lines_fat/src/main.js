import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { color } from "three/tsl";

import Stats from "three/addons/libs/stats.module.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Line2 } from "three/addons/lines/webgpu/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import * as GeometryUtils from "three/addons/utils/GeometryUtils.js";

let line, renderer, scene, camera, camera2, controls, backgroundNode;
let line1;
let matLine, matLineBasic, matLineDashed;
let stats;
let gui;

// viewport
let insetWidth;
let insetHeight;

init();

function init() {
  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 0.0);
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
  const divisions = Math.round(12 * points.length);
  const point = new Vector3();
  const lineColor = new Color();

  for (let i = 0, l = divisions; i < l; i++) {
    const t = i / l;

    spline.getPoint(t, point);
    positions.push(point.x, point.y, point.z);

    lineColor.setHSL(t, 1.0, 0.5, SRGBColorSpace);
    colors.push(lineColor.r, lineColor.g, lineColor.b);
  }

  // Line2 ( LineGeometry, LineMaterial )

  const geometry = new LineGeometry();
  geometry.setPositions(positions);
  geometry.setColors(colors);

  matLine = new Line2NodeMaterial({
    color: 0xffffff,
    linewidth: 5, // in world units with size attenuation, pixels otherwise
    vertexColors: true,
    dashed: false,
    alphaToCoverage: true,
  });

  line = new Line2(geometry, matLine);
  line.computeLineDistances();
  line.scale.set(1, 1, 1);
  scene.add(line);

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new Float32BufferAttribute(colors, 3));

  matLineBasic = new LineBasicNodeMaterial({ vertexColors: true });
  matLineDashed = new LineDashedNodeMaterial({
    vertexColors: true,
    scale: 2,
    dashSize: 1,
    gapSize: 1,
  });

  line1 = new Line(geo, matLineBasic);
  line1.computeLineDistances();
  line1.visible = false;
  scene.add(line1);

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

  renderer.setClearColor(0x000000, 0);

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
    "line type": 0,
    "world units": false,
    width: 5,
    alphaToCoverage: true,
    dashed: false,
    "dash offset": 0,
    "dash scale": 1,
    "dash / gap": 1,
  };

  gui
    .add(param, "line type", { LineGeometry: 0, '"line-strip"': 1 })
    .onChange(function (val) {
      switch (val) {
        case 0:
          line.visible = true;

          line1.visible = false;

          break;

        case 1:
          line.visible = false;

          line1.visible = true;

          break;
      }
    });

  gui.add(param, "world units").onChange(function (val) {
    matLine.worldUnits = val;
    matLine.needsUpdate = true;
  });

  gui.add(param, "width", 1, 10).onChange(function (val) {
    matLine.linewidth = val;
  });

  gui.add(param, "alphaToCoverage").onChange(function (val) {
    matLine.alphaToCoverage = val;
  });

  gui.add(param, "dashed").onChange(function (val) {
    matLine.dashed = val;
    line1.material = val ? matLineDashed : matLineBasic;
  });

  gui.add(param, "dash scale", 0.5, 2, 0.1).onChange(function (val) {
    matLine.scale = val;
    matLineDashed.scale = val;
  });

  gui.add(param, "dash offset", 0, 5, 0.1).onChange(function (val) {
    matLine.dashOffset = val;
    matLineDashed.dashOffset = val;
  });

  gui
    .add(param, "dash / gap", { "2 : 1": 0, "1 : 1": 1, "1 : 2": 2 })
    .onChange(function (val) {
      switch (val) {
        case 0:
          matLine.dashSize = 2;
          matLine.gapSize = 1;

          matLineDashed.dashSize = 2;
          matLineDashed.gapSize = 1;

          break;

        case 1:
          matLine.dashSize = 1;
          matLine.gapSize = 1;

          matLineDashed.dashSize = 1;
          matLineDashed.gapSize = 1;

          break;

        case 2:
          matLine.dashSize = 1;
          matLine.gapSize = 2;

          matLineDashed.dashSize = 1;
          matLineDashed.gapSize = 2;

          break;
      }
    });
}
