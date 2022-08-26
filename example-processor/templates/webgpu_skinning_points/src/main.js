import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Clock,
  AnimationMixer,
  Color,
  Points,
} from "three";
import * as Nodes from "three/nodes";

import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";

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
    1000
  );
  camera.position.set(100, 200, 300);

  scene = new Scene();
  camera.lookAt(0, 100, 0);

  clock = new Clock();

  const loader = new FBXLoader();
  loader.load("models/fbx/Samba Dancing.fbx", function (object) {
    mixer = new AnimationMixer(object);

    const action = mixer.clipAction(object.animations[0]);
    action.play();

    object.traverse(function (child) {
      if (child.isMesh) {
        child.visible = false;

        const materialPoints = new Nodes.PointsNodeMaterial();
        materialPoints.colorNode = new Nodes.UniformNode(new Color());
        materialPoints.positionNode = new Nodes.SkinningNode(child);

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
