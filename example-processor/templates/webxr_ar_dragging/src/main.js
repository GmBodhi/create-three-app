import "./style.css"; // For webpack support

import {
  Matrix4,
  Scene,
  PerspectiveCamera,
  HemisphereLight,
  DirectionalLight,
  Group,
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  TorusGeometry,
  MeshStandardMaterial,
  Mesh,
  WebGLRenderer,
  SRGBColorSpace,
  Raycaster,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ARButton } from "three/addons/webxr/ARButton.js";

let container;
let camera, scene, renderer;
let controller1, controller2;

let raycaster;

const intersected = [];
const tempMatrix = new Matrix4();

let group;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  scene = new Scene();

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    10
  );
  camera.position.set(0, 0, 3);

  const controls = new OrbitControls(camera, container);
  controls.minDistance = 0;
  controls.maxDistance = 8;

  scene.add(new HemisphereLight(0x808080, 0x606060));

  const light = new DirectionalLight(0xffffff);
  light.position.set(0, 6, 0);
  scene.add(light);

  group = new Group();
  scene.add(group);

  const geometries = [
    new BoxGeometry(0.2, 0.2, 0.2),
    new ConeGeometry(0.2, 0.2, 64),
    new CylinderGeometry(0.2, 0.2, 0.2, 64),
    new IcosahedronGeometry(0.2, 8),
    new TorusGeometry(0.2, 0.04, 64, 32),
  ];

  for (let i = 0; i < 50; i++) {
    const geometry = geometries[Math.floor(Math.random() * geometries.length)];
    const material = new MeshStandardMaterial({
      color: Math.random() * 0xffffff,
      roughness: 0.7,
      metalness: 0.0,
    });

    const object = new Mesh(geometry, material);

    object.position.x = Math.random() * 4 - 2;
    object.position.y = Math.random() * 4 - 2;
    object.position.z = Math.random() * 4 - 2;

    object.rotation.x = Math.random() * 2 * Math.PI;
    object.rotation.y = Math.random() * 2 * Math.PI;
    object.rotation.z = Math.random() * 2 * Math.PI;

    object.scale.setScalar(Math.random() + 0.5);

    group.add(object);
  }

  //

  renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  document.body.appendChild(ARButton.createButton(renderer));

  // controllers

  controller1 = renderer.xr.getController(0);
  controller1.addEventListener("selectstart", onSelectStart);
  controller1.addEventListener("selectend", onSelectEnd);
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener("selectstart", onSelectStart);
  controller2.addEventListener("selectend", onSelectEnd);
  scene.add(controller2);

  raycaster = new Raycaster();

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onSelectStart(event) {
  const controller = event.target;

  const intersections = getIntersections(controller);

  if (intersections.length > 0) {
    const intersection = intersections[0];

    const object = intersection.object;
    object.material.emissive.b = 1;
    controller.attach(object);

    controller.userData.selected = object;
  }
}

function onSelectEnd(event) {
  const controller = event.target;

  if (controller.userData.selected !== undefined) {
    const object = controller.userData.selected;
    object.material.emissive.b = 0;
    group.attach(object);

    controller.userData.selected = undefined;
  }
}

function getIntersections(controller) {
  tempMatrix.identity().extractRotation(controller.matrixWorld);

  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  return raycaster.intersectObjects(group.children, false);
}

function intersectObjects(controller) {
  // Do not highlight when already selected

  if (controller.userData.selected !== undefined) return;

  const intersections = getIntersections(controller);

  if (intersections.length > 0) {
    const intersection = intersections[0];

    const object = intersection.object;
    object.material.emissive.r = 1;
    intersected.push(object);
  }
}

function cleanIntersected() {
  while (intersected.length) {
    const object = intersected.pop();
    object.material.emissive.r = 0;
  }
}

//

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  cleanIntersected();

  intersectObjects(controller1);
  intersectObjects(controller2);

  renderer.render(scene, camera);
}
