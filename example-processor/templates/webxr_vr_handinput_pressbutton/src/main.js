import "./style.css"; // For webpack support

import {
  ColorManagement,
  AudioListener,
  Audio,
  AudioLoader,
  Clock,
  BoxGeometry,
  MeshPhongMaterial,
  Mesh,
  Scene,
  Color,
  PerspectiveCamera,
  HemisphereLight,
  DirectionalLight,
  WebGLRenderer,
  PlaneGeometry,
  TorusKnotGeometry,
} from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { OculusHandModel } from "three/addons/webxr/OculusHandModel.js";
import { createText } from "three/addons/webxr/Text2D.js";

import {
  World,
  System,
  Component,
  TagComponent,
  Types,
} from "three/addons/libs/ecsy.module.js";

ColorManagement.enabled = false; // TODO: Consider enabling color management.

class Object3D extends Component {}

Object3D.schema = {
  object: { type: Types.Ref },
};

class Button extends Component {}

Button.schema = {
  // button states: [resting, pressed, fully_pressed, recovering]
  currState: { type: Types.String, default: "resting" },
  prevState: { type: Types.String, default: "resting" },
  pressSound: { type: Types.Ref, default: null },
  releaseSound: { type: Types.Ref, default: null },
  restingY: { type: Types.Number, default: null },
  surfaceY: { type: Types.Number, default: null },
  recoverySpeed: { type: Types.Number, default: 0.4 },
  fullPressDistance: { type: Types.Number, default: null },
  action: { type: Types.Ref, default: () => {} },
};

class ButtonSystem extends System {
  init(attributes) {
    this.renderer = attributes.renderer;
    this.soundAdded = false;
  }

  execute(/*delta, time*/) {
    let buttonPressSound, buttonReleaseSound;
    if (this.renderer.xr.getSession() && !this.soundAdded) {
      const xrCamera = this.renderer.xr.getCamera();

      const listener = new AudioListener();
      xrCamera.add(listener);

      // create a global audio source
      buttonPressSound = new Audio(listener);
      buttonReleaseSound = new Audio(listener);

      // load a sound and set it as the Audio object's buffer
      const audioLoader = new AudioLoader();
      audioLoader.load("sounds/button-press.ogg", function (buffer) {
        buttonPressSound.setBuffer(buffer);
      });
      audioLoader.load("sounds/button-release.ogg", function (buffer) {
        buttonReleaseSound.setBuffer(buffer);
      });
      this.soundAdded = true;
    }

    this.queries.buttons.results.forEach((entity) => {
      const button = entity.getMutableComponent(Button);
      const buttonMesh = entity.getComponent(Object3D).object;
      // populate restingY
      if (button.restingY == null) {
        button.restingY = buttonMesh.position.y;
      }

      if (buttonPressSound) {
        button.pressSound = buttonPressSound;
      }

      if (buttonReleaseSound) {
        button.releaseSound = buttonReleaseSound;
      }

      if (
        button.currState == "fully_pressed" &&
        button.prevState != "fully_pressed"
      ) {
        if (button.pressSound) button.pressSound.play();
        button.action();
      }

      if (
        button.currState == "recovering" &&
        button.prevState != "recovering"
      ) {
        if (button.releaseSound) button.releaseSound.play();
      }

      // preserve prevState, clear currState
      // FingerInputSystem will update currState
      button.prevState = button.currState;
      button.currState = "resting";
    });
  }
}

ButtonSystem.queries = {
  buttons: {
    components: [Button],
  },
};

class Pressable extends TagComponent {}

class FingerInputSystem extends System {
  init(attributes) {
    this.hands = attributes.hands;
  }

  execute(delta /*, time*/) {
    this.queries.pressable.results.forEach((entity) => {
      const button = entity.getMutableComponent(Button);
      const object = entity.getComponent(Object3D).object;
      const pressingDistances = [];
      this.hands.forEach((hand) => {
        if (hand && hand.intersectBoxObject(object)) {
          const pressingPosition = hand.getPointerPosition();
          pressingDistances.push(
            button.surfaceY - object.worldToLocal(pressingPosition).y
          );
        }
      });
      if (pressingDistances.length == 0) {
        // not pressed this frame

        if (object.position.y < button.restingY) {
          object.position.y += button.recoverySpeed * delta;
          button.currState = "recovering";
        } else {
          object.position.y = button.restingY;
          button.currState = "resting";
        }
      } else {
        button.currState = "pressed";
        const pressingDistance = Math.max(pressingDistances);
        if (pressingDistance > 0) {
          object.position.y -= pressingDistance;
        }

        if (object.position.y <= button.restingY - button.fullPressDistance) {
          button.currState = "fully_pressed";
          object.position.y = button.restingY - button.fullPressDistance;
        }
      }
    });
  }
}

FingerInputSystem.queries = {
  pressable: {
    components: [Pressable],
  },
};

class Rotating extends TagComponent {}

class RotatingSystem extends System {
  execute(delta /*, time*/) {
    this.queries.rotatingObjects.results.forEach((entity) => {
      const object = entity.getComponent(Object3D).object;
      object.rotation.x += 0.4 * delta;
      object.rotation.y += 0.4 * delta;
    });
  }
}

RotatingSystem.queries = {
  rotatingObjects: {
    components: [Rotating],
  },
};

class HandsInstructionText extends TagComponent {}

class InstructionSystem extends System {
  init(attributes) {
    this.controllers = attributes.controllers;
  }

  execute(/*delta, time*/) {
    let visible = false;
    this.controllers.forEach((controller) => {
      if (controller.visible) {
        visible = true;
      }
    });

    this.queries.instructionTexts.results.forEach((entity) => {
      const object = entity.getComponent(Object3D).object;
      object.visible = visible;
    });
  }
}

InstructionSystem.queries = {
  instructionTexts: {
    components: [HandsInstructionText],
  },
};

class OffsetFromCamera extends Component {}

OffsetFromCamera.schema = {
  x: { type: Types.Number, default: 0 },
  y: { type: Types.Number, default: 0 },
  z: { type: Types.Number, default: 0 },
};

class NeedCalibration extends TagComponent {}

class CalibrationSystem extends System {
  init(attributes) {
    this.camera = attributes.camera;
    this.renderer = attributes.renderer;
  }

  execute(/*delta, time*/) {
    this.queries.needCalibration.results.forEach((entity) => {
      if (this.renderer.xr.getSession()) {
        const offset = entity.getComponent(OffsetFromCamera);
        const object = entity.getComponent(Object3D).object;
        const xrCamera = this.renderer.xr.getCamera();
        object.position.x = xrCamera.position.x + offset.x;
        object.position.y = xrCamera.position.y + offset.y;
        object.position.z = xrCamera.position.z + offset.z;
        entity.removeComponent(NeedCalibration);
      }
    });
  }
}

CalibrationSystem.queries = {
  needCalibration: {
    components: [NeedCalibration],
  },
};

const world = new World();
const clock = new Clock();
let camera, scene, renderer;

init();
animate();

function makeButtonMesh(x, y, z, color) {
  const geometry = new BoxGeometry(x, y, z);
  const material = new MeshPhongMaterial({ color: color });
  const buttonMesh = new Mesh(geometry, material);
  buttonMesh.castShadow = true;
  buttonMesh.receiveShadow = true;
  return buttonMesh;
}

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  scene = new Scene();
  scene.background = new Color(0x444444);

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    10
  );
  camera.position.set(0, 1.2, 0.3);

  scene.add(new HemisphereLight(0x808080, 0x606060));

  const light = new DirectionalLight(0xffffff);
  light.position.set(0, 6, 0);
  light.castShadow = true;
  light.shadow.camera.top = 2;
  light.shadow.camera.bottom = -2;
  light.shadow.camera.right = 2;
  light.shadow.camera.left = -2;
  light.shadow.mapSize.set(4096, 4096);
  scene.add(light);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;
  renderer.xr.cameraAutoUpdate = false;

  container.appendChild(renderer.domElement);

  document.body.appendChild(VRButton.createButton(renderer));

  // controllers
  const controller1 = renderer.xr.getController(0);
  scene.add(controller1);

  const controller2 = renderer.xr.getController(1);
  scene.add(controller2);

  const controllerModelFactory = new XRControllerModelFactory();

  // Hand 1
  const controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(
    controllerModelFactory.createControllerModel(controllerGrip1)
  );
  scene.add(controllerGrip1);

  const hand1 = renderer.xr.getHand(0);
  const handModel1 = new OculusHandModel(hand1);
  hand1.add(handModel1);
  scene.add(hand1);

  // Hand 2
  const controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add(
    controllerModelFactory.createControllerModel(controllerGrip2)
  );
  scene.add(controllerGrip2);

  const hand2 = renderer.xr.getHand(1);
  const handModel2 = new OculusHandModel(hand2);
  hand2.add(handModel2);
  scene.add(hand2);

  // buttons
  const floorGeometry = new PlaneGeometry(4, 4);
  const floorMaterial = new MeshPhongMaterial({ color: 0x222222 });
  const floor = new Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const consoleGeometry = new BoxGeometry(0.5, 0.12, 0.15);
  const consoleMaterial = new MeshPhongMaterial({ color: 0x595959 });
  const consoleMesh = new Mesh(consoleGeometry, consoleMaterial);
  consoleMesh.position.set(0, 1, -0.3);
  consoleMesh.castShadow = true;
  consoleMesh.receiveShadow = true;
  scene.add(consoleMesh);

  const orangeButton = makeButtonMesh(0.08, 0.1, 0.08, 0xffd3b5);
  orangeButton.position.set(-0.15, 0.04, 0);
  consoleMesh.add(orangeButton);

  const pinkButton = makeButtonMesh(0.08, 0.1, 0.08, 0xe84a5f);
  pinkButton.position.set(-0.05, 0.04, 0);
  consoleMesh.add(pinkButton);

  const resetButton = makeButtonMesh(0.08, 0.1, 0.08, 0x355c7d);
  const resetButtonText = createText("reset", 0.03);
  resetButton.add(resetButtonText);
  resetButtonText.rotation.x = -Math.PI / 2;
  resetButtonText.position.set(0, 0.051, 0);
  resetButton.position.set(0.05, 0.04, 0);
  consoleMesh.add(resetButton);

  const exitButton = makeButtonMesh(0.08, 0.1, 0.08, 0xff0000);
  const exitButtonText = createText("exit", 0.03);
  exitButton.add(exitButtonText);
  exitButtonText.rotation.x = -Math.PI / 2;
  exitButtonText.position.set(0, 0.051, 0);
  exitButton.position.set(0.15, 0.04, 0);
  consoleMesh.add(exitButton);

  const tkGeometry = new TorusKnotGeometry(0.5, 0.2, 200, 32);
  const tkMaterial = new MeshPhongMaterial({ color: 0xffffff });
  tkMaterial.metalness = 0.8;
  const torusKnot = new Mesh(tkGeometry, tkMaterial);
  torusKnot.position.set(0, 1, -5);
  scene.add(torusKnot);

  const instructionText = createText(
    "This is a WebXR Hands demo, please explore with hands.",
    0.04
  );
  instructionText.position.set(0, 1.6, -0.6);
  scene.add(instructionText);

  const exitText = createText("Exiting session...", 0.04);
  exitText.position.set(0, 1.5, -0.6);
  exitText.visible = false;
  scene.add(exitText);

  world
    .registerComponent(Object3D)
    .registerComponent(Button)
    .registerComponent(Pressable)
    .registerComponent(Rotating)
    .registerComponent(HandsInstructionText)
    .registerComponent(OffsetFromCamera)
    .registerComponent(NeedCalibration);

  world
    .registerSystem(RotatingSystem)
    .registerSystem(InstructionSystem, {
      controllers: [controllerGrip1, controllerGrip2],
    })
    .registerSystem(CalibrationSystem, { renderer: renderer, camera: camera })
    .registerSystem(ButtonSystem, { renderer: renderer, camera: camera })
    .registerSystem(FingerInputSystem, { hands: [handModel1, handModel2] });

  const csEntity = world.createEntity();
  csEntity.addComponent(OffsetFromCamera, { x: 0, y: -0.4, z: -0.3 });
  csEntity.addComponent(NeedCalibration);
  csEntity.addComponent(Object3D, { object: consoleMesh });

  const obEntity = world.createEntity();
  obEntity.addComponent(Pressable);
  obEntity.addComponent(Object3D, { object: orangeButton });
  const obAction = function () {
    torusKnot.material.color.setHex(0xffd3b5);
  };

  obEntity.addComponent(Button, {
    action: obAction,
    surfaceY: 0.05,
    fullPressDistance: 0.02,
  });

  const pbEntity = world.createEntity();
  pbEntity.addComponent(Pressable);
  pbEntity.addComponent(Object3D, { object: pinkButton });
  const pbAction = function () {
    torusKnot.material.color.setHex(0xe84a5f);
  };

  pbEntity.addComponent(Button, {
    action: pbAction,
    surfaceY: 0.05,
    fullPressDistance: 0.02,
  });

  const rbEntity = world.createEntity();
  rbEntity.addComponent(Pressable);
  rbEntity.addComponent(Object3D, { object: resetButton });
  const rbAction = function () {
    torusKnot.material.color.setHex(0xffffff);
  };

  rbEntity.addComponent(Button, {
    action: rbAction,
    surfaceY: 0.05,
    fullPressDistance: 0.02,
  });

  const ebEntity = world.createEntity();
  ebEntity.addComponent(Pressable);
  ebEntity.addComponent(Object3D, { object: exitButton });
  const ebAction = function () {
    exitText.visible = true;
    setTimeout(function () {
      exitText.visible = false;
      renderer.xr.getSession().end();
    }, 2000);
  };

  ebEntity.addComponent(Button, {
    action: ebAction,
    surfaceY: 0.05,
    recoverySpeed: 0.2,
    fullPressDistance: 0.03,
  });

  const tkEntity = world.createEntity();
  tkEntity.addComponent(Rotating);
  tkEntity.addComponent(Object3D, { object: torusKnot });

  const itEntity = world.createEntity();
  itEntity.addComponent(HandsInstructionText);
  itEntity.addComponent(Object3D, { object: instructionText });

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  const delta = clock.getDelta();
  const elapsedTime = clock.elapsedTime;
  renderer.xr.updateCamera(camera);
  world.execute(delta, elapsedTime);
  renderer.render(scene, camera);
}
