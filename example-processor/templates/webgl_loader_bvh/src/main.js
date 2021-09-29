import "./style.css"; // For webpack support

import {
  Clock,
  SkeletonHelper,
  Group,
  AnimationMixer,
  PerspectiveCamera,
  Scene,
  Color,
  GridHelper,
  WebGLRenderer,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BVHLoader } from "three/examples/jsm/loaders/BVHLoader.js";

const clock = new Clock();

let camera, controls, scene, renderer;
let mixer, skeletonHelper;

init();
animate();

const loader = new BVHLoader();
loader.load("models/bvh/pirouette.bvh", function (result) {
  skeletonHelper = new SkeletonHelper(result.skeleton.bones[0]);
  skeletonHelper.skeleton = result.skeleton; // allow animation mixer to bind to SkeletonHelper directly

  const boneContainer = new Group();
  boneContainer.add(result.skeleton.bones[0]);

  scene.add(skeletonHelper);
  scene.add(boneContainer);

  // play animation
  mixer = new AnimationMixer(skeletonHelper);
  mixer.clipAction(result.clip).setEffectiveWeight(1.0).play();
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
