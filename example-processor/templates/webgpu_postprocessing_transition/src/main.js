import "./style.css"; // For webpack support

import {
  Clock,
  InstancedMesh,
  Object3D,
  Color,
  PerspectiveCamera,
  Scene,
  AmbientLight,
  DirectionalLight,
  MeshPhongNodeMaterial,
  BoxGeometry,
  Vector3,
  IcosahedronGeometry,
  TextureLoader,
  WebGPURenderer,
  PostProcessing,
  TextureNode,
} from "three";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import TWEEN from "three/addons/libs/tween.module.js";
import { uniform, transition, pass } from "three/tsl";

let renderer, postProcessing, transitionController, transitionPass;

const textures = [];
const clock = new Clock();

const effectController = {
  animateScene: true,
  animateTransition: true,
  transition: 0,
  _transition: uniform(0),
  useTexture: true,
  _useTexture: uniform(1),
  texture: 5,
  cycle: true,
  threshold: uniform(0.1),
};

function generateInstancedMesh(geometry, material, count) {
  const mesh = new InstancedMesh(geometry, material, count);

  const dummy = new Object3D();
  const color = new Color();

  for (let i = 0; i < count; i++) {
    dummy.position.x = Math.random() * 100 - 50;
    dummy.position.y = Math.random() * 60 - 30;
    dummy.position.z = Math.random() * 80 - 40;

    dummy.rotation.x = Math.random() * 2 * Math.PI;
    dummy.rotation.y = Math.random() * 2 * Math.PI;
    dummy.rotation.z = Math.random() * 2 * Math.PI;

    dummy.scale.x = Math.random() * 2 + 1;

    if (geometry.type === "BoxGeometry") {
      dummy.scale.y = Math.random() * 2 + 1;
      dummy.scale.z = Math.random() * 2 + 1;
    } else {
      dummy.scale.y = dummy.scale.x;
      dummy.scale.z = dummy.scale.x;
    }

    dummy.updateMatrix();

    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, color.setScalar(0.1 + 0.9 * Math.random()));
  }

  return mesh;
}

function FXScene(geometry, rotationSpeed, backgroundColor) {
  const camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 20;

  // Setup scene
  const scene = new Scene();
  scene.background = new Color(backgroundColor);
  scene.add(new AmbientLight(0xaaaaaa, 3));

  const light = new DirectionalLight(0xffffff, 3);
  light.position.set(0, 1, 4);
  scene.add(light);

  this.rotationSpeed = rotationSpeed;

  const color = geometry.type === "BoxGeometry" ? 0x0000ff : 0xff0000;
  const material = new MeshPhongNodeMaterial({
    color: color,
    flatShading: true,
  });
  const mesh = generateInstancedMesh(geometry, material, 500);
  scene.add(mesh);

  this.scene = scene;
  this.camera = camera;
  this.mesh = mesh;

  this.update = function (delta) {
    if (effectController.animateScene) {
      mesh.rotation.x += this.rotationSpeed.x * delta;
      mesh.rotation.y += this.rotationSpeed.y * delta;
      mesh.rotation.z += this.rotationSpeed.z * delta;
    }
  };

  this.resize = function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };
}

const fxSceneA = new FXScene(
  new BoxGeometry(2, 2, 2),
  new Vector3(0, -0.4, 0),
  0xffffff
);
const fxSceneB = new FXScene(
  new IcosahedronGeometry(1, 1),
  new Vector3(0, 0.2, 0.1),
  0x000000
);

function init() {
  // Initialize textures

  const loader = new TextureLoader();

  for (let i = 0; i < 6; i++) {
    textures[i] = loader.load(
      "textures/transition/transition" + (i + 1) + ".png"
    );
  }

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  postProcessing = new PostProcessing(renderer);

  const scenePassA = pass(fxSceneA.scene, fxSceneA.camera);
  const scenePassB = pass(fxSceneB.scene, fxSceneB.camera);

  transitionPass = transition(
    scenePassA,
    scenePassB,
    new TextureNode(textures[effectController.texture]),
    effectController._transition,
    effectController.threshold,
    effectController._useTexture
  );

  postProcessing.outputNode = transitionPass;

  const gui = new GUI();

  gui.add(effectController, "animateScene").name("Animate Scene");
  gui.add(effectController, "animateTransition").name("Animate Transition");
  transitionController = gui
    .add(effectController, "transition", 0, 1, 0.01)
    .name("transition")
    .onChange(() => {
      effectController._transition.value = effectController.transition;
    });
  gui.add(effectController, "useTexture").onChange(() => {
    const value = effectController.useTexture ? 1 : 0;
    effectController._useTexture.value = value;
  });
  gui.add(effectController, "texture", {
    Perlin: 0,
    Squares: 1,
    Cells: 2,
    Distort: 3,
    Gradient: 4,
    Radial: 5,
  });
  gui.add(effectController, "cycle");
  gui.add(effectController.threshold, "value", 0, 1, 0.01).name("threshold");
}

window.addEventListener("resize", onWindowResize);

function onWindowResize() {
  fxSceneA.resize();
  fxSceneB.resize();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

new TWEEN.Tween(effectController)
  .to({ transition: 1 }, 1500)
  .onUpdate(function () {
    transitionController.setValue(effectController.transition);

    // Change the current alpha texture after each transition
    if (effectController.cycle) {
      if (
        effectController.transition == 0 ||
        effectController.transition == 1
      ) {
        effectController.texture =
          (effectController.texture + 1) % textures.length;
      }
    }
  })
  .repeat(Infinity)
  .delay(2000)
  .yoyo(true)
  .start();

function animate() {
  if (effectController.animateTransition) TWEEN.update();

  if (textures[effectController.texture]) {
    const mixTexture = textures[effectController.texture];
    transitionPass.mixTextureNode.value = mixTexture;
  }

  const delta = clock.getDelta();
  fxSceneA.update(delta);
  fxSceneB.update(delta);

  render();
}

function render() {
  // Prevent render both scenes when it's not necessary
  if (effectController.transition === 0) {
    renderer.render(fxSceneB.scene, fxSceneB.camera);
  } else if (effectController.transition === 1) {
    renderer.render(fxSceneA.scene, fxSceneA.camera);
  } else {
    postProcessing.render();
  }
}

init();
