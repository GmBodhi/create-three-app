import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  LinearMipmapLinearFilter,
  CubeTextureLoader,
  LinearToneMapping,
  sRGBEncoding,
} from "three";
import * as Nodes from "three-nodes/Nodes.js";

import { mix, oscSine, timerLocal } from "three-nodes/Nodes.js";

import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";

import { RGBMLoader } from "three/examples/jsm/loaders/RGBMLoader.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let camera, scene, renderer;

init().then(render).catch(error);

async function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

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

  const rgbmUrls = ["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"];
  const cubeTexture = new RGBMLoader()
    .setMaxRange(16)
    .setPath("three/examples/textures/cube/pisaRGBM16/")
    .loadCubemap(rgbmUrls);

  cubeTexture.generateMipmaps = true;
  cubeTexture.minFilter = LinearMipmapLinearFilter;

  const cube2Urls = [
    "dark-s_px.jpg",
    "dark-s_nx.jpg",
    "dark-s_py.jpg",
    "dark-s_ny.jpg",
    "dark-s_pz.jpg",
    "dark-s_nz.jpg",
  ];
  const cube2Texture = new CubeTextureLoader()
    .setPath("three/examples/textures/cube/MilkyWay/")
    .load(cube2Urls);

  cube2Texture.generateMipmaps = true;
  cube2Texture.minFilter = LinearMipmapLinearFilter;

  scene.environmentNode = mix(
    new Nodes.CubeTextureNode(cube2Texture),
    new Nodes.CubeTextureNode(cubeTexture),
    oscSine(timerLocal(0.1))
  );

  const loader = new GLTFLoader().setPath("models/gltf/DamagedHelmet/glTF/");
  loader.load("DamagedHelmet.gltf", function (gltf) {
    scene.add(gltf.scene);

    render();
  });

  renderer = new WebGPURenderer();

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMappingNode = new Nodes.ToneMappingNode(LinearToneMapping, 1);
  renderer.outputEncoding = sRGBEncoding;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 2;
  controls.maxDistance = 10;

  window.addEventListener("resize", onWindowResize);

  if (renderer.init) return renderer.init();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function render() {
  requestAnimationFrame(render);

  renderer.render(scene, camera);
}

function error(error) {
  console.error(error);
}
