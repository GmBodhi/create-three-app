import "./style.css"; // For webpack support

import {
  Vector3,
  CatmullRomCurve3,
  MeshLambertMaterial,
  MeshBasicMaterial,
  TubeGeometry,
  Mesh,
  PerspectiveCamera,
  Scene,
  Color,
  AmbientLight,
  DirectionalLight,
  Object3D,
  CameraHelper,
  SphereGeometry,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import * as Curves from "three/addons/curves/CurveExtras.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let container, stats;

let camera, scene, renderer, splineCamera, cameraHelper, cameraEye;

const direction = new Vector3();
const binormal = new Vector3();
const normal = new Vector3();
const position = new Vector3();
const lookAt = new Vector3();

const pipeSpline = new CatmullRomCurve3([
  new Vector3(0, 10, -10),
  new Vector3(10, 0, -10),
  new Vector3(20, 0, 0),
  new Vector3(30, 0, 10),
  new Vector3(30, 0, 20),
  new Vector3(20, 0, 30),
  new Vector3(10, 0, 30),
  new Vector3(0, 0, 30),
  new Vector3(-10, 10, 30),
  new Vector3(-10, 20, 30),
  new Vector3(0, 30, 30),
  new Vector3(10, 30, 30),
  new Vector3(20, 30, 15),
  new Vector3(10, 30, 10),
  new Vector3(0, 30, 10),
  new Vector3(-10, 20, 10),
  new Vector3(-10, 10, 10),
  new Vector3(0, 0, 10),
  new Vector3(10, -10, 10),
  new Vector3(20, -15, 10),
  new Vector3(30, -15, 10),
  new Vector3(40, -15, 10),
  new Vector3(50, -15, 10),
  new Vector3(60, 0, 10),
  new Vector3(70, 0, 0),
  new Vector3(80, 0, 0),
  new Vector3(90, 0, 0),
  new Vector3(100, 0, 0),
]);

const sampleClosedSpline = new CatmullRomCurve3([
  new Vector3(0, -40, -40),
  new Vector3(0, 40, -40),
  new Vector3(0, 140, -40),
  new Vector3(0, 40, 40),
  new Vector3(0, -40, 40),
]);

sampleClosedSpline.curveType = "catmullrom";
sampleClosedSpline.closed = true;

// Keep a dictionary of Curve instances
const splines = {
  GrannyKnot: new Curves.GrannyKnot(),
  HeartCurve: new Curves.HeartCurve(3.5),
  VivianiCurve: new Curves.VivianiCurve(70),
  KnotCurve: new Curves.KnotCurve(),
  HelixCurve: new Curves.HelixCurve(),
  TrefoilKnot: new Curves.TrefoilKnot(),
  TorusKnot: new Curves.TorusKnot(20),
  CinquefoilKnot: new Curves.CinquefoilKnot(20),
  TrefoilPolynomialKnot: new Curves.TrefoilPolynomialKnot(14),
  FigureEightPolynomialKnot: new Curves.FigureEightPolynomialKnot(),
  DecoratedTorusKnot4a: new Curves.DecoratedTorusKnot4a(),
  DecoratedTorusKnot4b: new Curves.DecoratedTorusKnot4b(),
  DecoratedTorusKnot5a: new Curves.DecoratedTorusKnot5a(),
  DecoratedTorusKnot5c: new Curves.DecoratedTorusKnot5c(),
  PipeSpline: pipeSpline,
  SampleClosedSpline: sampleClosedSpline,
};

let parent, tubeGeometry, mesh;

const params = {
  spline: "GrannyKnot",
  scale: 4,
  extrusionSegments: 100,
  radiusSegments: 3,
  closed: true,
  animationView: false,
  lookAhead: false,
  cameraHelper: false,
};

const material = new MeshLambertMaterial({ color: 0xff00ff });

const wireframeMaterial = new MeshBasicMaterial({
  color: 0x000000,
  opacity: 0.3,
  wireframe: true,
  transparent: true,
});

function addTube() {
  if (mesh !== undefined) {
    parent.remove(mesh);
    mesh.geometry.dispose();
  }

  const extrudePath = splines[params.spline];

  tubeGeometry = new TubeGeometry(
    extrudePath,
    params.extrusionSegments,
    2,
    params.radiusSegments,
    params.closed
  );

  addGeometry(tubeGeometry);

  setScale();
}

function setScale() {
  mesh.scale.set(params.scale, params.scale, params.scale);
}

function addGeometry(geometry) {
  // 3D shape

  mesh = new Mesh(geometry, material);
  const wireframe = new Mesh(geometry, wireframeMaterial);
  mesh.add(wireframe);

  parent.add(mesh);
}

function animateCamera() {
  cameraHelper.visible = params.cameraHelper;
  cameraEye.visible = params.cameraHelper;
}

init();

function init() {
  container = document.getElementById("container");

  // camera

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.01,
    10000
  );
  camera.position.set(0, 50, 500);

  // scene

  scene = new Scene();
  scene.background = new Color(0xf0f0f0);

  // light

  scene.add(new AmbientLight(0xffffff));

  const light = new DirectionalLight(0xffffff, 1.5);
  light.position.set(0, 0, 1);
  scene.add(light);

  // tube

  parent = new Object3D();
  scene.add(parent);

  splineCamera = new PerspectiveCamera(
    84,
    window.innerWidth / window.innerHeight,
    0.01,
    1000
  );
  parent.add(splineCamera);

  cameraHelper = new CameraHelper(splineCamera);
  scene.add(cameraHelper);

  addTube();

  // debug camera

  cameraEye = new Mesh(
    new SphereGeometry(5),
    new MeshBasicMaterial({ color: 0xdddddd })
  );
  parent.add(cameraEye);

  cameraHelper.visible = params.cameraHelper;
  cameraEye.visible = params.cameraHelper;

  // renderer

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

  // stats

  stats = new Stats();
  container.appendChild(stats.dom);

  // dat.GUI

  const gui = new GUI({ width: 285 });

  const folderGeometry = gui.addFolder("Geometry");
  folderGeometry
    .add(params, "spline", Object.keys(splines))
    .onChange(function () {
      addTube();
    });
  folderGeometry
    .add(params, "scale", 2, 10)
    .step(2)
    .onChange(function () {
      setScale();
    });
  folderGeometry
    .add(params, "extrusionSegments", 50, 500)
    .step(50)
    .onChange(function () {
      addTube();
    });
  folderGeometry
    .add(params, "radiusSegments", 2, 12)
    .step(1)
    .onChange(function () {
      addTube();
    });
  folderGeometry.add(params, "closed").onChange(function () {
    addTube();
  });
  folderGeometry.open();

  const folderCamera = gui.addFolder("Camera");
  folderCamera.add(params, "animationView").onChange(function () {
    animateCamera();
  });
  folderCamera.add(params, "lookAhead").onChange(function () {
    animateCamera();
  });
  folderCamera.add(params, "cameraHelper").onChange(function () {
    animateCamera();
  });
  folderCamera.open();

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 100;
  controls.maxDistance = 2000;

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  render();
  stats.update();
}

function render() {
  // animate camera along spline

  const time = Date.now();
  const looptime = 20 * 1000;
  const t = (time % looptime) / looptime;

  tubeGeometry.parameters.path.getPointAt(t, position);
  position.multiplyScalar(params.scale);

  // interpolation

  const segments = tubeGeometry.tangents.length;
  const pickt = t * segments;
  const pick = Math.floor(pickt);
  const pickNext = (pick + 1) % segments;

  binormal.subVectors(
    tubeGeometry.binormals[pickNext],
    tubeGeometry.binormals[pick]
  );
  binormal.multiplyScalar(pickt - pick).add(tubeGeometry.binormals[pick]);

  tubeGeometry.parameters.path.getTangentAt(t, direction);
  const offset = 15;

  normal.copy(binormal).cross(direction);

  // we move on a offset on its binormal

  position.add(normal.clone().multiplyScalar(offset));

  splineCamera.position.copy(position);
  cameraEye.position.copy(position);

  // using arclength for stabilization in look ahead

  tubeGeometry.parameters.path.getPointAt(
    (t + 30 / tubeGeometry.parameters.path.getLength()) % 1,
    lookAt
  );
  lookAt.multiplyScalar(params.scale);

  // camera orientation 2 - up orientation via normal

  if (!params.lookAhead) lookAt.copy(position).add(direction);
  splineCamera.matrix.lookAt(splineCamera.position, lookAt, normal);
  splineCamera.quaternion.setFromRotationMatrix(splineCamera.matrix);

  cameraHelper.update();

  renderer.render(scene, params.animationView === true ? splineCamera : camera);
}
