import "./style.css"; // For webpack support

import {
  Scene,
  Color,
  PerspectiveCamera,
  PlaneGeometry,
  ShadowMaterial,
  CustomBlending,
  Mesh,
  HemisphereLight,
  DirectionalLight,
  Group,
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  TorusGeometry,
  MeshStandardMaterial,
  WebGLRenderer,
  BufferGeometry,
  Vector3,
  Line,
  Raycaster,
} from "three";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { XRButton } from "three/addons/webxr/XRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

let container;
let camera, scene, renderer;
let controller1, controller2, line;
let controllerGrip1, controllerGrip2;

let raycaster;

let controls, group;

init();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  scene = new Scene();
  scene.background = new Color(0x808080);

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    10
  );
  camera.position.set(0, 1.6, 0);

  const floorGeometry = new PlaneGeometry(6, 6);
  const floorMaterial = new ShadowMaterial({
    opacity: 0.25,
    blending: CustomBlending,
    transparent: false,
  });
  const floor = new Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  scene.add(new HemisphereLight(0xbcbcbc, 0xa5a5a5, 3));

  const light = new DirectionalLight(0xffffff, 3);
  light.position.set(0, 6, 0);
  light.castShadow = true;
  light.shadow.camera.top = 3;
  light.shadow.camera.bottom = -3;
  light.shadow.camera.right = 3;
  light.shadow.camera.left = -3;
  light.shadow.mapSize.set(4096, 4096);
  scene.add(light);

  group = new Group();
  scene.add(group);

  const geometries = [
    new BoxGeometry(0.2, 0.2, 0.2),
    new ConeGeometry(0.2, 0.4, 64),
    new CylinderGeometry(0.2, 0.2, 0.2, 64),
    new IcosahedronGeometry(0.2, 8),
    new TorusGeometry(0.2, 0.04, 64, 32),
  ];

  for (let i = 0; i < 16; i++) {
    const geometry = geometries[Math.floor(Math.random() * geometries.length)];
    const material = new MeshStandardMaterial({
      color: Math.random() * 0xffffff,
      roughness: 0.7,
      metalness: 0.0,
    });

    const object = new Mesh(geometry, material);

    object.position.x = Math.random() - 0.5;
    object.position.y = Math.random() * 2 + 0.5;
    object.position.z = Math.random() - 2.5;

    object.rotation.x = Math.random() * 2 * Math.PI;
    object.rotation.y = Math.random() * 2 * Math.PI;
    object.rotation.z = Math.random() * 2 * Math.PI;

    object.scale.setScalar(Math.random() + 0.5);

    object.castShadow = true;
    object.receiveShadow = true;

    group.add(object);
  }

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  document.body.appendChild(XRButton.createButton(renderer));

  // controllers

  controller1 = renderer.xr.getController(0);
  controller1.addEventListener("select", onSelect);
  controller1.addEventListener("selectstart", onControllerEvent);
  controller1.addEventListener("selectend", onControllerEvent);
  controller1.addEventListener("move", onControllerEvent);
  controller1.userData.active = false;
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener("select", onSelect);
  controller2.addEventListener("selectstart", onControllerEvent);
  controller2.addEventListener("selectend", onControllerEvent);
  controller2.addEventListener("move", onControllerEvent);
  controller2.userData.active = true;
  scene.add(controller2);

  const controllerModelFactory = new XRControllerModelFactory();

  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(
    controllerModelFactory.createControllerModel(controllerGrip1)
  );
  scene.add(controllerGrip1);

  controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add(
    controllerModelFactory.createControllerModel(controllerGrip2)
  );
  scene.add(controllerGrip2);

  //

  const geometry = new BufferGeometry().setFromPoints([
    new Vector3(0, 0, 0),
    new Vector3(0, 0, -1),
  ]);

  line = new Line(geometry);
  line.name = "line";
  line.scale.z = 5;

  raycaster = new Raycaster();

  // controls

  controls = new TransformControls(camera, renderer.domElement);
  controls.attach(group.children[0]);
  scene.add(controls.getHelper());

  //

  window.addEventListener("resize", onWindowResize);
}

function onSelect(event) {
  const controller = event.target;

  controller1.userData.active = false;
  controller2.userData.active = false;

  if (controller === controller1) {
    controller1.userData.active = true;
    controller1.add(line);
  }

  if (controller === controller2) {
    controller2.userData.active = true;
    controller2.add(line);
  }

  raycaster.setFromXRController(controller);

  const intersects = raycaster.intersectObjects(group.children);

  if (intersects.length > 0) {
    controls.attach(intersects[0].object);
  }
}

function onControllerEvent(event) {
  const controller = event.target;

  if (controller.userData.active === false) return;

  controls.getRaycaster().setFromXRController(controller);

  switch (event.type) {
    case "selectstart":
      controls.pointerDown(null);
      break;

    case "selectend":
      controls.pointerUp(null);
      break;

    case "move":
      controls.pointerHover(null);
      controls.pointerMove(null);
      break;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  renderer.render(scene, camera);
}
