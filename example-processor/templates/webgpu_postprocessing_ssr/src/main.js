import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  pass,
  mrt,
  output,
  normalView,
  metalness,
  roughness,
  blendColor,
  screenUV,
  color,
  sample,
  directionToColor,
  colorToDirection,
  vec2,
} from "three/tsl";
import { ssr } from "three/addons/tsl/display/SSRNode.js";
import { smaa } from "three/addons/tsl/display/SMAANode.js";

import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import Stats from "three/addons/libs/stats.module.js";

const params = {
  maxDistance: 0.5,
  opacity: 1,
  thickness: 0.015,
  enabled: true,
};

let camera, scene, renderer, postProcessing, ssrPass;
let gui, stats, controls;

init();

async function init() {
  camera = new PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    50
  );
  camera.position.set(3, 2, 3);

  scene = new Scene();
  scene.backgroundNode = screenUV
    .distance(0.5)
    .remap(0, 0.5)
    .mix(color(0x888877), color(0x776666));

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("jsm/libs/draco/");
  dracoLoader.setDecoderConfig({ type: "js" });

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  loader.load("models/gltf/steampunk_camera.glb", function (gltf) {
    gltf.scene.traverse(function (object) {
      if (object.material) {
        if (object.material.name === "Lense_Casing") {
          object.material.transparent = true;
        }

        // Avoid overdrawing
        object.material.side = FrontSide;
      }
    });

    gltf.scene.position.y = 0.1;
    scene.add(gltf.scene);
  });

  //

  renderer = new WebGPURenderer();
  // renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);

  await renderer.init();

  const environment = new RoomEnvironment();
  const pmremGenerator = new PMREMGenerator(renderer);

  scene.environment = pmremGenerator.fromScene(environment).texture;
  scene.environmentIntensity = 1.25;
  pmremGenerator.dispose();

  //

  postProcessing = new PostProcessing(renderer);

  const scenePass = pass(scene, camera, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
  });
  scenePass.setMRT(
    mrt({
      output: output,
      normal: directionToColor(normalView),
      metalrough: vec2(metalness, roughness),
    })
  );

  const scenePassColor = scenePass.getTextureNode("output");
  const scenePassNormal = scenePass.getTextureNode("normal");
  const scenePassDepth = scenePass.getTextureNode("depth");
  const scenePassMetalRough = scenePass.getTextureNode("metalrough");

  // optimization bandwidth packing the normals and reducing the texture precision if possible

  const normalTexture = scenePass.getTexture("normal");
  normalTexture.type = UnsignedByteType;

  const metalRoughTexture = scenePass.getTexture("metalrough");
  metalRoughTexture.type = UnsignedByteType;

  const customNormal = sample((uv) => {
    return colorToDirection(scenePassNormal.sample(uv));
  });

  const customMetalness = sample((uv) => {
    return scenePassMetalRough.sample(uv).r;
  });

  //

  ssrPass = ssr(
    scenePassColor,
    scenePassDepth,
    customNormal,
    customMetalness,
    camera
  );
  ssrPass.resolutionScale = 1.0;

  // blend SSR over beauty

  const outputNode = smaa(
    blendColor(scenePassColor, ssrPass.mul(scenePassMetalRough.g.oneMinus()))
  );

  postProcessing.outputNode = outputNode;

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.update();

  // stats

  stats = new Stats();
  document.body.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);

  // GUI

  gui = new GUI();
  gui.add(params, "maxDistance").min(0).max(1).onChange(updateParameters);
  gui.add(params, "opacity").min(0).max(1).onChange(updateParameters);
  gui.add(params, "thickness").min(0).max(0.05).onChange(updateParameters);
  gui.add(params, "enabled").onChange(() => {
    if (params.enabled === true) {
      postProcessing.outputNode = outputNode;
    } else {
      postProcessing.outputNode = scenePass;
    }

    postProcessing.needsUpdate = true;
  });

  updateParameters();
}

function updateParameters() {
  ssrPass.maxDistance.value = params.maxDistance;
  ssrPass.opacity.value = params.opacity;
  ssrPass.thickness.value = params.thickness;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  stats.begin();

  controls.update();

  postProcessing.render();

  stats.end();
}
