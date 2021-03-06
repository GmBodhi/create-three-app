import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  ACESFilmicToneMapping,
  sRGBEncoding,
  PMREMGenerator,
  Color,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

let camera, scene, renderer, controls;

init();
animate();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    20
  );
  camera.position.set(-0.75, 0.7, 1.25);

  scene = new Scene();

  // model

  new GLTFLoader()
    .setPath("models/gltf/")
    .load("SheenChair.glb", function (gltf) {
      scene.add(gltf.scene);

      const object = gltf.scene.getObjectByName("SheenChair_fabric");

      const gui = new GUI();

      gui.add(object.material, "sheen", 0, 1);
      gui.open();
    });

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputEncoding = sRGBEncoding;
  container.appendChild(renderer.domElement);

  const environment = new RoomEnvironment();
  const pmremGenerator = new PMREMGenerator(renderer);

  scene.background = new Color(0xbbbbbb);
  scene.environment = pmremGenerator.fromScene(environment).texture;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 1;
  controls.maxDistance = 10;
  controls.target.set(0, 0.35, 0);
  controls.update();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  controls.update(); // required if damping enabled

  render();
}

function render() {
  renderer.render(scene, camera);
}
