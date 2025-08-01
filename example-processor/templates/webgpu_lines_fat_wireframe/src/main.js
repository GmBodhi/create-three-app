import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { color } from "three/tsl";

import Stats from "three/addons/libs/stats.module.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Wireframe } from "three/addons/lines/webgpu/Wireframe.js";
import { WireframeGeometry2 } from "three/addons/lines/WireframeGeometry2.js";

let wireframe, renderer, scene, camera, camera2, controls, backgroundNode;
let wireframe1;
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
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0.0);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(-50, 0, 50);

  camera2 = new PerspectiveCamera(40, 1, 1, 1000);
  camera2.position.copy(camera.position);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 10;
  controls.maxDistance = 500;

  backgroundNode = color(0x222222);

  // Wireframe ( WireframeGeometry2, Line2NodeMaterial )

  let geo = new IcosahedronGeometry(20, 1);

  const geometry = new WireframeGeometry2(geo);

  matLine = new Line2NodeMaterial({
    color: 0x4080ff,
    linewidth: 5, // in world units with size attenuation, pixels otherwise
    dashed: false,
  });

  wireframe = new Wireframe(geometry, matLine);
  wireframe.computeLineDistances();
  wireframe.scale.set(1, 1, 1);
  scene.add(wireframe);

  // Line ( WireframeGeometry, LineBasicMaterial ) - rendered with gl.LINE

  geo = new WireframeGeometry(geo);

  matLineBasic = new LineBasicMaterial({ color: 0x4080ff });
  matLineDashed = new LineDashedMaterial({ scale: 2, dashSize: 1, gapSize: 1 });

  wireframe1 = new LineSegments(geo, matLineBasic);
  wireframe1.computeLineDistances();
  wireframe1.visible = false;
  scene.add(wireframe1);

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
  // main scene

  renderer.setClearColor(0x000000, 0);

  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);

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

  stats.update();
}

//

function initGui() {
  gui = new GUI();

  const param = {
    "line type": 0,
    "width (px)": 5,
    dashed: false,
    "dash scale": 1,
    "dash / gap": 1,
  };

  gui
    .add(param, "line type", { LineGeometry: 0, "gl.LINE": 1 })
    .onChange(function (val) {
      switch (val) {
        case 0:
          wireframe.visible = true;

          wireframe1.visible = false;

          break;

        case 1:
          wireframe.visible = false;

          wireframe1.visible = true;

          break;
      }
    });

  gui.add(param, "width (px)", 1, 10).onChange(function (val) {
    matLine.linewidth = val;
  });

  gui.add(param, "dashed").onChange(function (val) {
    matLine.dashed = val;
    wireframe1.material = val ? matLineDashed : matLineBasic;
  });

  gui.add(param, "dash scale", 0.5, 1, 0.1).onChange(function (val) {
    matLine.scale = val;
    matLineDashed.scale = val;
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
