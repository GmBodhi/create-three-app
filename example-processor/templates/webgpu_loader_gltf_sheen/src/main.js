import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer, controls;

init();

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
  //scene.add( new DirectionalLight( 0xffffff, 2 ) );

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

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  container.appendChild(renderer.domElement);

  scene.background = new Color(0xaaaaaa);

  new RGBELoader()
    .setPath("textures/equirectangular/")
    .load("royal_esplanade_1k.hdr", function (texture) {
      texture.mapping = EquirectangularReflectionMapping;

      scene.background = texture;
      //scene.backgroundBlurriness = 1; // @TODO: Needs PMREM
      scene.environment = texture;
    });

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
  controls.update(); // required if damping enabled

  render();
}

function render() {
  renderer.render(scene, camera);
}
