import "./style.css"; // For webpack support

import {
  Vector3,
  Scene,
  Color,
  PerspectiveCamera,
  GridHelper,
  HemisphereLight,
  DirectionalLight,
  WebGLRenderer,
  Mesh,
  IcosahedronGeometry,
  Group,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TubePainter } from "three/addons/misc/TubePainter.js";
import { XRButton } from "three/addons/webxr/XRButton.js";

let camera, scene, renderer;
let controller1, controller2;

const cursor = new Vector3();

let controls;

init();
animate();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  scene = new Scene();
  scene.background = new Color(0x222222);

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.01,
    50
  );
  camera.position.set(0, 1.6, 3);

  controls = new OrbitControls(camera, container);
  controls.target.set(0, 1.6, 0);
  controls.update();

  const grid = new GridHelper(4, 1, 0x111111, 0x111111);
  scene.add(grid);

  scene.add(new HemisphereLight(0x888877, 0x777788));

  const light = new DirectionalLight(0xffffff, 0.5);
  light.position.set(0, 4, 0);
  scene.add(light);

  //

  const painter1 = new TubePainter();
  scene.add(painter1.mesh);

  const painter2 = new TubePainter();
  scene.add(painter2.mesh);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  document.body.appendChild(XRButton.createButton(renderer));

  // controllers

  function onSelectStart() {
    this.userData.isSelecting = true;
  }

  function onSelectEnd() {
    this.userData.isSelecting = false;
  }

  function onSqueezeStart() {
    this.userData.isSqueezing = true;
    this.userData.positionAtSqueezeStart = this.position.y;
    this.userData.scaleAtSqueezeStart = this.scale.x;
  }

  function onSqueezeEnd() {
    this.userData.isSqueezing = false;
  }

  controller1 = renderer.xr.getController(0);
  controller1.addEventListener("selectstart", onSelectStart);
  controller1.addEventListener("selectend", onSelectEnd);
  controller1.addEventListener("squeezestart", onSqueezeStart);
  controller1.addEventListener("squeezeend", onSqueezeEnd);
  controller1.userData.painter = painter1;
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener("selectstart", onSelectStart);
  controller2.addEventListener("selectend", onSelectEnd);
  controller2.addEventListener("squeezestart", onSqueezeStart);
  controller2.addEventListener("squeezeend", onSqueezeEnd);
  controller2.userData.painter = painter2;
  scene.add(controller2);

  //

  const pivot = new Mesh(new IcosahedronGeometry(0.01, 3));
  pivot.name = "pivot";
  pivot.position.z = -0.05;

  const group = new Group();
  group.add(pivot);

  controller1.add(group.clone());
  controller2.add(group.clone());

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function handleController(controller) {
  const userData = controller.userData;
  const painter = userData.painter;

  const pivot = controller.getObjectByName("pivot");

  if (userData.isSqueezing === true) {
    const delta = (controller.position.y - userData.positionAtSqueezeStart) * 5;
    const scale = Math.max(0.1, userData.scaleAtSqueezeStart + delta);

    pivot.scale.setScalar(scale);
    painter.setSize(scale);
  }

  cursor.setFromMatrixPosition(pivot.matrixWorld);

  if (userData.isSelecting === true) {
    painter.lineTo(cursor);
    painter.update();
  } else {
    painter.moveTo(cursor);
  }
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  handleController(controller1);
  handleController(controller2);

  renderer.render(scene, camera);
}
