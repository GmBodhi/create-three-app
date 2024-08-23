import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Clock,
  PointLight,
  AmbientLight,
  AnimationMixer,
  WebGPURenderer,
  LinearToneMapping,
} from "three";
import { color, viewportUV } from "three/tsl";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let camera, scene, renderer;

let mixer, clock;

init();

function init() {
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );
  camera.position.set(1, 2, 3);

  scene = new Scene();
  scene.backgroundNode = viewportUV.y.mix(color(0x66bbff), color(0x4466ff));
  camera.lookAt(0, 1, 0);

  clock = new Clock();

  //lights

  const light = new PointLight(0xffffff, 1, 100);
  light.power = 2500;
  camera.add(light);
  scene.add(camera);

  const ambient = new AmbientLight(0x4466ff, 1);
  scene.add(ambient);

  const loader = new GLTFLoader();
  loader.load("models/gltf/Michelle.glb", function (gltf) {
    const object = gltf.scene;
    mixer = new AnimationMixer(object);

    const action = mixer.clipAction(gltf.animations[0]);
    action.play();

    scene.add(object);
  });

  //renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = LinearToneMapping;
  renderer.toneMappingExposure = 0.4;
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
