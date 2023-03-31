import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Clock,
  AnimationMixer,
  Color,
  Points,
  sRGBEncoding,
} from "three";
import { uniform, skinning, PointsNodeMaterial } from "three/nodes";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

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
    1,
    1000
  );
  camera.position.set(0, 300, -85);

  scene = new Scene();
  camera.lookAt(0, 0, -85);

  clock = new Clock();

  const loader = new GLTFLoader();
  loader.load("models/gltf/Michelle.glb", function (gltf) {
    const object = gltf.scene;
    mixer = new AnimationMixer(object);

    const action = mixer.clipAction(gltf.animations[0]);
    action.play();

    object.traverse(function (child) {
      if (child.isMesh) {
        child.visible = false;

        const materialPoints = new PointsNodeMaterial();
        materialPoints.colorNode = uniform(new Color());
        materialPoints.positionNode = skinning(child);

        const pointCloud = new Points(child.geometry, materialPoints);
        scene.add(pointCloud);
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
