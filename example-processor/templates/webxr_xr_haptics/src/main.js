import "./style.css"; // For webpack support

import {
  Box3,
  Scene,
  Color,
  PerspectiveCamera,
  AudioListener,
  PlaneGeometry,
  ShadowMaterial,
  CustomBlending,
  Mesh,
  HemisphereLight,
  DirectionalLight,
  Group,
  BoxGeometry,
  MeshStandardMaterial,
  WebGLRenderer,
  PositionalAudio,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { XRButton } from "three/addons/webxr/XRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

let container;
let camera, scene, renderer;

let listener;
let controller1, controller2;
let controllerGrip1, controllerGrip2;

const box = new Box3();

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
  camera.position.set(0, 1.6, 3);

  listener = new AudioListener();
  camera.add(listener);

  controls = new OrbitControls(camera, container);
  controls.target.set(0, 1.6, 0);
  controls.update();

  const floorGeometry = new PlaneGeometry(4, 4);
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
  light.shadow.camera.top = 2;
  light.shadow.camera.bottom = -2;
  light.shadow.camera.right = 2;
  light.shadow.camera.left = -2;
  light.shadow.mapSize.set(4096, 4096);
  scene.add(light);

  group = new Group();
  group.position.z = -0.5;
  scene.add(group);
  const BOXES = 10;

  for (let i = 0; i < BOXES; i++) {
    const intensity = (i + 1) / BOXES;
    const w = 0.1;
    const h = 0.05 * i + 0.5;
    const geometry = new BoxGeometry(w, h, w);
    geometry.translate(0, h / 2, 0);
    const material = new MeshStandardMaterial({
      color: new Color(intensity, 0.1, 0.1),
      roughness: 0.7,
      metalness: 0.0,
    });

    const object = new Mesh(geometry, material);
    object.position.x = (i - 5) * (w + 0.05);
    object.castShadow = true;
    object.receiveShadow = true;
    object.userData = {
      index: i + 1,
      intensity: intensity,
    };

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
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  scene.add(controller2);

  const controllerModelFactory = new XRControllerModelFactory();

  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.addEventListener("connected", controllerConnected);
  controllerGrip1.addEventListener("disconnected", controllerDisconnected);
  controllerGrip1.add(
    controllerModelFactory.createControllerModel(controllerGrip1)
  );
  scene.add(controllerGrip1);

  controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.addEventListener("connected", controllerConnected);
  controllerGrip2.addEventListener("disconnected", controllerDisconnected);
  controllerGrip2.add(
    controllerModelFactory.createControllerModel(controllerGrip2)
  );
  scene.add(controllerGrip2);

  //

  window.addEventListener("resize", onWindowResize);
}

function controllerConnected(event) {
  const oscillator = listener.context.createOscillator();
  oscillator.type = "sine";
  oscillator.start();

  const audio = new PositionalAudio(listener);
  audio.setNodeSource(oscillator);
  audio.setRefDistance(20);
  audio.setVolume(0);

  this.userData.gamepad = event.data.gamepad;
  this.userData.colliding = false;
  this.userData.audio = audio;

  this.add(audio);
}

function controllerDisconnected(event) {
  const audio = this.userData.audio;
  audio.source.stop();

  this.remove(audio);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function handleCollisions(controller) {
  for (let i = 0; i < group.children.length; i++) {
    group.children[i].collided = false;
  }

  handleController(controllerGrip1);
  handleController(controllerGrip2);

  for (let i = 0; i < group.children.length; i++) {
    const child = group.children[i];
    if (!child.collided) {
      // reset uncollided boxes
      child.material.emissive.b = 0;
      child.scale.setScalar(1);
    }
  }
}

// minor pentatonic scale, so whichever notes is stricken would be more pleasant
const musicScale = [0, 3, 5, 7, 10];

function handleController(controller) {
  controller.userData.colliding = false;

  const audio = controller.userData.audio;
  const gamepad = controller.userData.gamepad;

  if (audio === undefined || gamepad === undefined) return;

  const oscillator = audio.source;
  const supportHaptic =
    "hapticActuators" in gamepad &&
    gamepad.hapticActuators != null &&
    gamepad.hapticActuators.length > 0;

  const sphere = {
    radius: 0.03,
    center: controller.position,
  };

  for (let i = 0; i < group.children.length; i++) {
    const child = group.children[i];
    box.setFromObject(child);

    if (box.intersectsSphere(sphere)) {
      child.material.emissive.b = 1;
      const intensity = child.userData.index / group.children.length;
      child.scale.setScalar(1 + Math.random() * 0.1 * intensity);

      if (supportHaptic) {
        gamepad.hapticActuators[0].pulse(intensity, 100);
      }

      const musicInterval =
        musicScale[child.userData.index % musicScale.length] +
        12 * Math.floor(child.userData.index / musicScale.length);
      oscillator.frequency.value = 110 * Math.pow(2, musicInterval / 12);
      controller.userData.colliding = true;
      group.children[i].collided = true;
    }
  }

  if (controller.userData.colliding) {
    audio.setVolume(0.5);
  } else {
    audio.setVolume(0);
  }
}

function animate() {
  handleCollisions();

  renderer.render(scene, camera);
}
