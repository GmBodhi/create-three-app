import "./style.css"; // For webpack support

import {
  Clock,
  WebGLRenderer,
  PMREMGenerator,
  Scene,
  Color,
  PerspectiveCamera,
  AnimationMixer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { GLTFAnimationPointerExtension } from "@needle-tools/three-animation-pointer";

let mixer;

const clock = new Clock();
const container = document.getElementById("container");

const stats = new Stats();
container.appendChild(stats.dom);

const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const pmremGenerator = new PMREMGenerator(renderer);

const scene = new Scene();
scene.background = new Color(0xbfe3dd);
scene.environment = pmremGenerator.fromScene(
  new RoomEnvironment(),
  0.04
).texture;

const camera = new PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.2,
  100
);
camera.position.set(-3, 2, 6);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.5, 0);
controls.update();
controls.enablePan = false;
controls.enableDamping = true;

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("jsm/libs/draco/gltf/");

const ktx2Loader = new KTX2Loader()
  .setTranscoderPath("jsm/libs/basis/")
  .detectSupport(renderer);

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
loader.setKTX2Loader(ktx2Loader);

loader.register((p) => {
  return new GLTFAnimationPointerExtension(p);
});

loader.load(
  "https://cloud.needle.tools/-/assets/Z23hmXB27L6Db-optimized/file",
  function (gltf) {
    const model = gltf.scene;
    scene.add(model);

    mixer = new AnimationMixer(model);
    mixer.clipAction(gltf.animations[0]).play();

    renderer.setAnimationLoop(animate);
  },
  undefined,
  function (e) {
    console.error(e);
  }
);

window.onresize = function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
};

function animate() {
  const delta = clock.getDelta();

  mixer.update(delta);

  controls.update();

  stats.update();

  renderer.render(scene, camera);
}
