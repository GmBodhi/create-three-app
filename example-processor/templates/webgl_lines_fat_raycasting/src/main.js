import "./style.css"; // For webpack support

import {
  Vector2,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Raycaster,
  SphereGeometry,
  MeshBasicMaterial,
  Mesh,
  Color,
  Vector3,
  CatmullRomCurve3,
  BufferGeometry,
  Float32BufferAttribute,
} from "three";

import Stats from "three/addons/libs/stats.module.js";
import { GPUStatsPanel } from "three/addons/utils/GPUStatsPanel.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";

let line, thresholdLine, segments, thresholdSegments;
let renderer, scene, camera, camera2, controls;
let raycaster, sphereInter, sphereOnLine;
let matLine, matThresholdLine;
let stats, gpuPanel;
let gui;

// viewport
let insetWidth;
let insetHeight;

const pointer = new Vector2(Infinity, Infinity);

init();
animate();

function init() {
  renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 0.0);
  renderer.setSize(window.innerWidth, window.innerHeight);
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
  controls.minDistance = 10;
  controls.maxDistance = 500;

  raycaster = new Raycaster();
  raycaster.params.Line2 = {};
  raycaster.params.Line2.threshold = 0;

  const sphereGeometry = new SphereGeometry(0.25);
  const sphereInterMaterial = new MeshBasicMaterial({
    color: 0xff0000,
    depthTest: false,
  });
  const sphereOnLineMaterial = new MeshBasicMaterial({
    color: 0x00ff00,
    depthTest: false,
  });

  sphereInter = new Mesh(sphereGeometry, sphereInterMaterial);
  sphereOnLine = new Mesh(sphereGeometry, sphereOnLineMaterial);
  sphereInter.visible = false;
  sphereOnLine.visible = false;
  sphereInter.renderOrder = 10;
  sphereOnLine.renderOrder = 10;
  scene.add(sphereInter);
  scene.add(sphereOnLine);

  // Position and Color Data

  const positions = [];
  const colors = [];
  const points = [];
  for (let i = -50; i < 50; i++) {
    const t = i / 3;
    points.push(new Vector3(t * Math.sin(2 * t), t, t * Math.cos(2 * t)));
  }

  const spline = new CatmullRomCurve3(points);
  const divisions = Math.round(3 * points.length);
  const point = new Vector3();
  const color = new Color();

  for (let i = 0, l = divisions; i < l; i++) {
    const t = i / l;

    spline.getPoint(t, point);
    positions.push(point.x, point.y, point.z);

    color.setHSL(t, 1.0, 0.5);
    colors.push(color.r, color.g, color.b);
  }

  const lineGeometry = new LineGeometry();
  lineGeometry.setPositions(positions);
  lineGeometry.setColors(colors);

  const segmentsGeometry = new LineSegmentsGeometry();
  segmentsGeometry.setPositions(positions);
  segmentsGeometry.setColors(colors);

  matLine = new LineMaterial({
    color: 0xffffff,
    linewidth: 1, // in world units with size attenuation, pixels otherwise
    worldUnits: true,
    vertexColors: true,

    //resolution:  // to be set by renderer, eventually
    alphaToCoverage: true,
  });

  matThresholdLine = new LineMaterial({
    color: 0xffffff,
    linewidth: matLine.linewidth, // in world units with size attenuation, pixels otherwise
    worldUnits: true,
    // vertexColors: true,
    transparent: true,
    opacity: 0.2,
    depthTest: false,
    visible: false,
    //resolution:  // to be set by renderer, eventually
  });

  segments = new LineSegments2(segmentsGeometry, matLine);
  segments.computeLineDistances();
  segments.scale.set(1, 1, 1);
  scene.add(segments);
  segments.visible = false;

  thresholdSegments = new LineSegments2(segmentsGeometry, matThresholdLine);
  thresholdSegments.computeLineDistances();
  thresholdSegments.scale.set(1, 1, 1);
  scene.add(thresholdSegments);
  thresholdSegments.visible = false;

  line = new Line2(lineGeometry, matLine);
  line.computeLineDistances();
  line.scale.set(1, 1, 1);
  scene.add(line);

  thresholdLine = new Line2(lineGeometry, matThresholdLine);
  thresholdLine.computeLineDistances();
  thresholdLine.scale.set(1, 1, 1);
  scene.add(thresholdLine);

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new Float32BufferAttribute(colors, 3));

  //
  document.addEventListener("pointermove", onPointerMove);
  window.addEventListener("resize", onWindowResize);
  onWindowResize();

  stats = new Stats();
  document.body.appendChild(stats.dom);

  gpuPanel = new GPUStatsPanel(renderer.getContext());
  stats.addPanel(gpuPanel);
  stats.showPanel(0);
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

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function animate() {
  requestAnimationFrame(animate);

  stats.update();

  // main scene

  renderer.setClearColor(0x000000, 0);

  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);

  raycaster.setFromCamera(pointer, camera);

  const obj = line.visible ? line : segments;
  const intersects = raycaster.intersectObject(obj, true);

  if (intersects.length > 0) {
    sphereInter.visible = true;
    sphereOnLine.visible = true;
    sphereInter.position.copy(intersects[0].point);
    sphereOnLine.position.copy(intersects[0].pointOnLine);
    const i = intersects[0].faceIndex;
    const colors = obj.geometry.getAttribute("instanceColorStart");
    const color = new Color().setRGB(
      colors.getX(i),
      colors.getY(i),
      colors.getZ(i)
    );
    sphereInter.material.color.copy(color.clone().offsetHSL(0.3, 0, 0));
    sphereOnLine.material.color.copy(color.clone().offsetHSL(0.7, 0, 0));
    renderer.domElement.style.cursor = "crosshair";
  } else {
    sphereInter.visible = false;
    sphereOnLine.visible = false;
    renderer.domElement.style.cursor = "";
  }

  // renderer will set this eventually
  matLine.resolution.set(window.innerWidth, window.innerHeight); // resolution of the viewport
  matThresholdLine.resolution.set(window.innerWidth, window.innerHeight); // resolution of the viewport

  gpuPanel.startQuery();
  renderer.render(scene, camera);
  gpuPanel.endQuery();

  // inset scene

  renderer.setClearColor(0x222222, 1);

  renderer.clearDepth(); // important!

  renderer.setScissorTest(true);

  renderer.setScissor(20, 20, insetWidth, insetHeight);

  renderer.setViewport(20, 20, insetWidth, insetHeight);

  camera2.position.copy(camera.position);
  camera2.quaternion.copy(camera.quaternion);

  // renderer will set this eventually
  matLine.resolution.set(insetWidth, insetHeight); // resolution of the inset viewport

  renderer.render(scene, camera2);

  renderer.setScissorTest(false);
}

//

function switchLine(val) {
  switch (val) {
    case 0:
      line.visible = true;
      thresholdLine.visible = true;

      segments.visible = false;
      thresholdSegments.visible = false;

      break;

    case 1:
      line.visible = false;
      thresholdLine.visible = false;

      segments.visible = true;
      thresholdSegments.visible = true;

      break;
  }
}

function initGui() {
  gui = new GUI();

  const param = {
    "line type": 0,
    "world units": matLine.worldUnits,
    "visualize threshold": matThresholdLine.visible,
    width: matLine.linewidth,
    alphaToCoverage: matLine.alphaToCoverage,
    threshold: raycaster.params.Line2.threshold,
  };

  gui
    .add(param, "line type", { LineGeometry: 0, LineSegmentsGeometry: 1 })
    .onChange(function (val) {
      switchLine(val);
    })
    .setValue(1);

  gui.add(param, "world units").onChange(function (val) {
    matLine.worldUnits = val;
    matLine.needsUpdate = true;
    matThresholdLine.worldUnits = val;
    matThresholdLine.needsUpdate = true;
  });

  gui.add(param, "visualize threshold").onChange(function (val) {
    matThresholdLine.visible = val;
  });

  gui.add(param, "width", 1, 10).onChange(function (val) {
    matLine.linewidth = val;
    matThresholdLine.linewidth =
      matLine.linewidth + raycaster.params.Line2.threshold;
  });

  gui.add(param, "alphaToCoverage").onChange(function (val) {
    matLine.alphaToCoverage = val;
  });

  gui.add(param, "threshold", 0, 10).onChange(function (val) {
    raycaster.params.Line2.threshold = val;
    matThresholdLine.linewidth =
      matLine.linewidth + raycaster.params.Line2.threshold;
  });
}
