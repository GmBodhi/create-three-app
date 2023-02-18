import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Clock,
  PointLight,
  AnimationMixer,
  sRGBEncoding,
  LinearToneMapping,
} from "three";
import * as Nodes from "three/nodes";

import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";

let camera, scene, renderer;

let mixer, clock;

init();

function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );
  camera.position.set(1, 2, 3);

  scene = new Scene();
  camera.lookAt(0, 1, 0);

  clock = new Clock();

  //lights

  const light = new PointLight(0xffffff, 1, 100);
  light.power = 1700; // 100W
  camera.add(light);
  scene.add(camera);

  const loader = new FBXLoader();
  loader.load("models/fbx/Samba Dancing.fbx", function (object) {
    object.scale.setScalar(0.01);

    mixer = new AnimationMixer(object);

    const action = mixer.clipAction(object.animations[0]);
    action.play();

    object.traverse(function (child) {
      if (child.isMesh) {
        child.material = new Nodes.MeshStandardNodeMaterial();
        child.material.roughness = 0.1;
      }
    });

    scene.add(object);
  });

  //renderer

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMappingNode = Nodes.toneMapping(LinearToneMapping, 0.15);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const delta = clock.getDelta();

  if (mixer) mixer.update(delta);

  renderer.render(scene, camera);
}
