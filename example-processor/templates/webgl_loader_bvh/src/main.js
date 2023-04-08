import "./style.css"; // For webpack support

import {
  ColorManagement,
  Clock,
  SkinnedMesh,
  SkeletonHelper,
  AnimationMixer,
  PerspectiveCamera,
  Scene,
  Color,
  GridHelper,
  WebGLRenderer,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { BVHLoader } from "three/addons/loaders/BVHLoader.js";

ColorManagement.enabled = true;

const clock = new Clock();

let camera, controls, scene, renderer;
let mixer;

init();
animate();

const loader = new BVHLoader();
loader.load("models/bvh/pirouette.bvh", function (result) {
  const skinnedMesh = new SkinnedMesh();
  skinnedMesh.visible = false; // dummy skinned mesh for animating the skeleton

  skinnedMesh.add(result.skeleton.bones[0]);
  skinnedMesh.bind(result.skeleton);

  const skeletonHelper = new SkeletonHelper(skinnedMesh);

  scene.add(skinnedMesh);
  scene.add(skeletonHelper);

  // play animation
  mixer = new AnimationMixer(skinnedMesh);
  mixer.clipAction(result.clip).play();
});

function init() {
  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(0, 200, 300);

  scene = new Scene();
  scene.background = new Color(0xeeeeee);

  scene.add(new GridHelper(400, 10));

  // renderer
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 300;
  controls.maxDistance = 700;

  window.addEventListener("resize", onWindowResize);
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
