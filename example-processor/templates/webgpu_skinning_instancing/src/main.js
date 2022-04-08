import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Clock,
  PointLight,
  AnimationMixer,
  Object3D,
  InstancedBufferAttribute,
} from "three";
import * as Nodes from "three-nodes/Nodes.js";

import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";

let camera, scene, renderer;

let mixer, clock;

init().then(animate).catch(error);

async function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    5000
  );
  camera.position.set(100, 200, 300);

  scene = new Scene();
  camera.lookAt(0, 100, 0);

  clock = new Clock();

  //lights

  const centerLight = new PointLight(0xffffff, 0.8, 7000);
  centerLight.position.y = 450;
  centerLight.position.z = -200;
  scene.add(centerLight);

  const cameraLight = new PointLight(0x0099ff, 0.7, 7000);
  camera.add(cameraLight);
  scene.add(camera);

  const loader = new FBXLoader();
  loader.load("models/fbx/Samba Dancing.fbx", (object) => {
    mixer = new AnimationMixer(object);

    const action = mixer.clipAction(object.animations[0]);
    action.play();

    const instanceCount = 30;
    const dummy = new Object3D();

    object.traverse((child) => {
      if (child.isMesh) {
        child.material = new Nodes.MeshStandardNodeMaterial();

        child.isInstancedMesh = true;
        child.instanceMatrix = new InstancedBufferAttribute(
          new Float32Array(instanceCount * 16),
          16
        );
        child.count = instanceCount;

        for (let i = 0; i < instanceCount; i++) {
          dummy.position.x = -200 + (i % 5) * 70;
          dummy.position.z = Math.floor(i / 5) * -200;

          dummy.updateMatrix();

          dummy.matrix.toArray(child.instanceMatrix.array, i * 16);
        }
      }
    });

    scene.add(object);
  });

  //renderer

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);

  return renderer.init();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (mixer) mixer.update(delta);

  renderer.render(scene, camera);
}

function error(error) {
  console.error(error);
}
