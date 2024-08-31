import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  WebGPURenderer,
  ACESFilmicToneMapping,
  EquirectangularReflectionMapping,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

let camera, scene, renderer, stats;

init();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(60, 60, 60);

  scene = new Scene();

  renderer = new WebGPURenderer({ antialias: true, forceWebGL: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  renderer.setAnimationLoop(render);
  container.appendChild(renderer.domElement);

  //

  stats = new Stats();
  document.body.appendChild(stats.dom);

  new RGBELoader()
    .setPath("textures/equirectangular/")
    .load("royal_esplanade_1k.hdr", function (texture) {
      texture.mapping = EquirectangularReflectionMapping;

      scene.environment = texture;

      // model

      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("jsm/libs/draco/gltf/");

      const loader = new GLTFLoader().setPath("models/gltf/");
      loader.setDRACOLoader(dracoLoader);

      loader.load("dungeon_warkarma.glb", async function (gltf) {
        const model = gltf.scene;

        // wait until the model can be added to the scene without blocking due to shader compilation

        await renderer.compileAsync(model, camera, scene);

        scene.add(model);
      });
    });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 2;
  controls.maxDistance = 60;
  controls.target.set(0, 0, -0.2);
  controls.update();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function render() {
  renderer.renderAsync(scene, camera);

  stats.update();
}
