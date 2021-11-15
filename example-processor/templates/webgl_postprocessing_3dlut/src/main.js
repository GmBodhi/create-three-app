import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  EquirectangularReflectionMapping,
  WebGLRenderer,
  ACESFilmicToneMapping,
  WebGLRenderTarget,
  LinearFilter,
  RGBAFormat,
  sRGBEncoding,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { LUTPass } from "three/examples/jsm/postprocessing/LUTPass.js";
import { LUTCubeLoader } from "three/examples/jsm/loaders/LUTCubeLoader.js";
import { GammaCorrectionShader } from "three/examples/jsm/shaders/GammaCorrectionShader.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

const params = {
  enabled: true,
  lut: "Bourbon 64.CUBE",
  intensity: 1,
  use2DLut: false,
};

const lutMap = {
  "Bourbon 64.CUBE": null,
  "Chemical 168.CUBE": null,
  "Clayton 33.CUBE": null,
  "Cubicle 99.CUBE": null,
  "Remy 24.CUBE": null,
};

let gui;
let camera, scene, renderer;
let composer, lutPass;

init();
render();

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
    new LUTCubeLoader().load("luts/" + name, function (result) {
      lutMap[name] = result;
    });
  });

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  container.appendChild(renderer.domElement);

  const target = new WebGLRenderTarget({
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    format: RGBAFormat,
    encoding: sRGBEncoding,
  });

  composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(window.devicePixelRatio);
  composer.setSize(window.innerWidth, window.innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new ShaderPass(GammaCorrectionShader));

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

  if (renderer.capabilities.isWebGL2) {
    gui.add(params, "use2DLut");
  } else {
    params.use2DLut = true;
  }

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);

  render();
}

//

function render() {
  requestAnimationFrame(render);

  lutPass.enabled = params.enabled && Boolean(lutMap[params.lut]);
  lutPass.intensity = params.intensity;
  if (lutMap[params.lut]) {
    const lut = lutMap[params.lut];
    lutPass.lut = params.use2DLut ? lut.texture : lut.texture3D;
  }

  composer.render();
}
