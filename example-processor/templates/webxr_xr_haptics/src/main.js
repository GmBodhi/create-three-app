import "./style.css"; // For webpack support

import {
  Box3,
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
  MeshStandardMaterial,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { XRButton } from "three/addons/webxr/XRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

let container;
let camera, scene, renderer;
let controller1, controller2;
let controllerGrip1, controllerGrip2;
const box = new Box3();

const controllers = [];
const oscillators = [];
let controls, group;
let audioCtx = null;

// minor pentatonic scale, so whichever notes is stricken would be more pleasant
const musicScale = [0, 3, 5, 7, 10];

init();

function initAudio() {
  if (audioCtx !== null) {
    return;
  }

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function createOscillator() {
    // creates oscillator
    const oscillator = audioCtx.createOscillator();
    oscillator.type = "sine"; // possible values: sine, triangle, square
    oscillator.start();
    return oscillator;
  }

  oscillators.push(createOscillator());
  oscillators.push(createOscillator());
  window.oscillators = oscillators;
}

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

  document.getElementById("XRButton").addEventListener("click", initAudio);

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

function controllerConnected(evt) {
  controllers.push({
    gamepad: evt.data.gamepad,
    grip: evt.target,
    colliding: false,
    playing: false,
  });
}

function controllerDisconnected(evt) {
  const index = controllers.findIndex((o) => o.controller === evt.target);
  if (index !== -1) {
    controllers.splice(index, 1);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function handleCollisions() {
  for (let i = 0; i < group.children.length; i++) {
    group.children[i].collided = false;
  }

  for (let g = 0; g < controllers.length; g++) {
    const controller = controllers[g];
    controller.colliding = false;

    const { grip, gamepad } = controller;
    const sphere = {
      radius: 0.03,
      center: grip.position,
    };

    const supportHaptic =
      "hapticActuators" in gamepad &&
      gamepad.hapticActuators != null &&
      gamepad.hapticActuators.length > 0;

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
        oscillators[g].frequency.value = 110 * Math.pow(2, musicInterval / 12);
        controller.colliding = true;
        group.children[i].collided = true;
      }
    }

    if (controller.colliding) {
      if (!controller.playing) {
        controller.playing = true;
        oscillators[g].connect(audioCtx.destination);
      }
    } else {
      if (controller.playing) {
        controller.playing = false;
        oscillators[g].disconnect(audioCtx.destination);
      }
    }
  }

  for (let i = 0; i < group.children.length; i++) {
    const child = group.children[i];
    if (!child.collided) {
      // reset uncollided boxes
      child.material.emissive.b = 0;
      child.scale.setScalar(1);
    }
  }
}

function animate() {
  handleCollisions();

  renderer.render(scene, camera);
}
