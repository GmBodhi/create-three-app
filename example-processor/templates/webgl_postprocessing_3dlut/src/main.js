import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  EquirectangularReflectionMapping,
  WebGLRenderer,
  ACESFilmicToneMapping,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { LUTPass } from "three/addons/postprocessing/LUTPass.js";
import { LUTCubeLoader } from "three/addons/loaders/LUTCubeLoader.js";
import { LUT3dlLoader } from "three/addons/loaders/LUT3dlLoader.js";
import { LUTImageLoader } from "three/addons/loaders/LUTImageLoader.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

const params = {
  enabled: true,
  lut: "Bourbon 64.CUBE",
  intensity: 1,
};

const lutMap = {
  "Bourbon 64.CUBE": null,
  "Chemical 168.CUBE": null,
  "Clayton 33.CUBE": null,
  "Cubicle 99.CUBE": null,
  "Remy 24.CUBE": null,
  "Presetpro-Cinematic.3dl": null,
  NeutralLUT: null,
  "B&WLUT": null,
  NightLUT: null,
};

let gui;
let camera, scene, renderer;
let composer, lutPass;

init();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.25,
    20
  );
  camera.position.set(-1.8, 0.6, 2.7);

  scene = new Scene();

  new RGBELoader()
    .setPath("textures/equirectangular/")
    .load("royal_esplanade_1k.hdr", function (texture) {
      texture.mapping = EquirectangularReflectionMapping;

      scene.background = texture;
      scene.environment = texture;

      // model

      const loader = new GLTFLoader().setPath(
        "models/gltf/DamagedHelmet/glTF/"
      );
      loader.load("DamagedHelmet.gltf", function (gltf) {
        scene.add(gltf.scene);
      });
    });

  Object.keys(lutMap).forEach((name) => {
    if (/\.CUBE$/i.test(name)) {
      new LUTCubeLoader().load("luts/" + name, function (result) {
        lutMap[name] = result;
      });
    } else if (/\LUT$/i.test(name)) {
      new LUTImageLoader().load(`luts/${name}.png`, function (result) {
        lutMap[name] = result;
      });
    } else {
      new LUT3dlLoader().load("luts/" + name, function (result) {
        lutMap[name] = result;
      });
    }
  });

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  composer = new EffectComposer(renderer);
  composer.setPixelRatio(window.devicePixelRatio);
  composer.setSize(window.innerWidth, window.innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new OutputPass());

  lutPass = new LUTPass();
  composer.addPass(lutPass);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.target.set(0, 0, -0.2);
  controls.update();

  gui = new GUI();
  gui.width = 350;
  gui.add(params, "enabled");
  gui.add(params, "lut", Object.keys(lutMap));
  gui.add(params, "intensity").min(0).max(1);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  lutPass.enabled = params.enabled && Boolean(lutMap[params.lut]);
  lutPass.intensity = params.intensity;
  if (lutMap[params.lut]) {
    const lut = lutMap[params.lut];
    lutPass.lut = lut.texture3D;
  }

  composer.render();
}
