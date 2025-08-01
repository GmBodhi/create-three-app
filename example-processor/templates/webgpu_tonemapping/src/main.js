import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

let renderer, scene, camera, controls;
let gui,
  guiExposure = null;

const params = {
  exposure: 1.0,
  toneMapping: "Neutral",
  blurriness: 0.3,
  intensity: 1.0,
};

const toneMappingOptions = {
  None: NoToneMapping,
  Linear: LinearToneMapping,
  Reinhard: ReinhardToneMapping,
  Cineon: CineonToneMapping,
  ACESFilmic: ACESFilmicToneMapping,
  AgX: AgXToneMapping,
  Neutral: NeutralToneMapping,
};

init().catch(function (err) {
  console.error(err);
});

async function init() {
  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  renderer.toneMapping = toneMappingOptions[params.toneMapping];
  renderer.toneMappingExposure = params.exposure;

  scene = new Scene();
  scene.backgroundBlurriness = params.blurriness;

  const light = new DirectionalLight(0xfff3ee, 3); // simulate sun
  light.position.set(1, 0.05, 0.7);
  scene.add(light);

  // scene.add( new DirectionalLightHelper( light, 1, 0x000000 ) );

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.01,
    10
  );
  camera.position.set(-0.02, 0.03, 0.05);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minDistance = 0.03;
  controls.maxDistance = 0.2;
  controls.target.set(0, 0.03, 0);
  controls.update();

  const rgbeLoader = new RGBELoader().setPath("textures/equirectangular/");

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("jsm/libs/draco/gltf/");

  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);
  gltfLoader.setPath("models/gltf/");

  const [texture, gltf] = await Promise.all([
    rgbeLoader.loadAsync("venice_sunset_1k.hdr"),
    gltfLoader.loadAsync("venice_mask.glb"),
  ]);

  // environment

  texture.mapping = EquirectangularReflectionMapping;

  scene.background = texture;
  scene.environment = texture;

  // model

  scene.add(gltf.scene);

  window.addEventListener("resize", onWindowResize);

  //

  gui = new GUI();
  const toneMappingFolder = gui.addFolder("Tone Mapping");

  toneMappingFolder
    .add(params, "toneMapping", Object.keys(toneMappingOptions))

    .name("type")
    .onChange(function () {
      updateGUI(toneMappingFolder);

      renderer.toneMapping = toneMappingOptions[params.toneMapping];
    });

  guiExposure = toneMappingFolder
    .add(params, "exposure", 0, 2)

    .onChange(function (value) {
      renderer.toneMappingExposure = value;
    });

  const backgroundFolder = gui.addFolder("Background");

  backgroundFolder
    .add(params, "blurriness", 0, 1)

    .onChange(function (value) {
      scene.backgroundBlurriness = value;
    });

  backgroundFolder
    .add(params, "intensity", 0, 1)

    .onChange(function (value) {
      scene.backgroundIntensity = value;
    });

  updateGUI(toneMappingFolder);

  gui.open();
}

function updateGUI() {
  if (params.toneMapping === "None") {
    guiExposure.hide();
  } else {
    guiExposure.show();
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  controls.update();

  renderer.render(scene, camera);
}
