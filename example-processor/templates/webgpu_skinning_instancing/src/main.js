import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Clock,
  PointLight,
  AnimationMixer,
  Object3D,
  Color,
  InstancedBufferAttribute,
  sRGBEncoding,
  LinearToneMapping,
} from "three";
import * as Nodes from "three/nodes";

import {
  mix,
  range,
  color,
  oscSine,
  timerLocal,
  toneMapping,
} from "three/nodes";

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

  const centerLight = new PointLight(0xff9900, 1, 100);
  centerLight.position.y = 4.5;
  centerLight.position.z = -2;
  centerLight.power = 1700;
  scene.add(centerLight);

  const cameraLight = new PointLight(0x0099ff, 1, 100);
  cameraLight.power = 1700;
  camera.add(cameraLight);
  scene.add(camera);

  const loader = new FBXLoader();
  loader.load("models/fbx/Samba Dancing.fbx", (object) => {
    object.scale.setScalar(0.01);

    mixer = new AnimationMixer(object);

    const action = mixer.clipAction(object.animations[0]);
    action.play();

    const instanceCount = 30;
    const dummy = new Object3D();

    object.traverse((child) => {
      if (child.isMesh) {
        const oscNode = oscSine(timerLocal(0.1));

        // random colors between instances from 0x000000 to 0xFFFFFF
        const randomColors = range(new Color(0x000000), new Color(0xffffff));

        // random [ 0, 1 ] values between instances
        const randomMetalness = range(0, 1);

        child.material = new Nodes.MeshStandardNodeMaterial();
        child.material.roughness = 0.1;
        child.material.metalnessNode = mix(0.0, randomMetalness, oscNode);
        child.material.colorNode = mix(color(0xffffff), randomColors, oscNode);

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
  renderer.setAnimationLoop(animate);
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMappingNode = toneMapping(LinearToneMapping, 0.17);
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
