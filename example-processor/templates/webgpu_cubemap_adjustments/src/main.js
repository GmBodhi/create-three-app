import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  LinearMipmapLinearFilter,
  CubeTextureLoader,
  Matrix4,
  SphereGeometry,
  Mesh,
  MeshStandardMaterial,
  LinearToneMapping,
  sRGBEncoding,
} from "three";
import * as Nodes from "three-nodes/Nodes.js";

import {
  uniform,
  mix,
  cubeTexture,
  mul,
  reference,
  add,
  positionWorld,
  normalWorld,
  saturate,
  saturation,
  hue,
  reflectCube,
} from "three-nodes/Nodes.js";

import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";

import { RGBMLoader } from "three/examples/jsm/loaders/RGBMLoader.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

let camera, scene, renderer;

init().then(render).catch(error);

async function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  const container = document.createElement("div");
  document.body.appendChild(container);

  const initialDistance = 2;

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.25,
    20
  );
  camera.position.set(
    -1.8 * initialDistance,
    0.6 * initialDistance,
    2.7 * initialDistance
  );

  scene = new Scene();

  // cube textures

  const rgbmUrls = ["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"];
  const cube1Texture = new RGBMLoader()
    .setMaxRange(16)
    .setPath("three/examples/textures/cube/pisaRGBM16/")
    .loadCubemap(rgbmUrls);

  cube1Texture.generateMipmaps = true;
  cube1Texture.minFilter = LinearMipmapLinearFilter;

  const cube2Urls = [
    "posx.jpg",
    "negx.jpg",
    "posy.jpg",
    "negy.jpg",
    "posz.jpg",
    "negz.jpg",
  ];
  const cube2Texture = new CubeTextureLoader()
    .setPath("three/examples/textures/cube/Park2/")
    .load(cube2Urls);

  cube2Texture.generateMipmaps = true;
  cube2Texture.minFilter = LinearMipmapLinearFilter;

  // nodes and environment

  const adjustments = {
    mix: 0,
    procedural: 0,
    brightness: 0,
    contrast: 1,
    hue: 0,
    saturation: 1,
  };

  const mixNode = reference("mix", "float", adjustments);
  const proceduralNode = reference("procedural", "float", adjustments);
  const brightnessNode = reference("brightness", "float", adjustments);
  const contrastNode = reference("contrast", "float", adjustments);
  const hueNode = reference("hue", "float", adjustments);
  const saturationNode = reference("saturation", "float", adjustments);

  const rotateY1Matrix = new Matrix4();
  const rotateY2Matrix = new Matrix4();

  const custom1UV = mul(reflectCube, uniform(rotateY1Matrix));
  const custom2UV = mul(reflectCube, uniform(rotateY2Matrix));

  const mixCubeMaps = mix(
    cubeTexture(cube1Texture, custom1UV),
    cubeTexture(cube2Texture, custom2UV),
    saturate(add(positionWorld.y, mixNode))
  );
  const proceduralEnv = mix(mixCubeMaps, normalWorld, proceduralNode);
  const brightnessFilter = add(proceduralEnv, brightnessNode);
  const contrastFilter = mul(brightnessFilter, contrastNode);
  const hueFilter = hue(contrastFilter, hueNode);
  const saturationFilter = saturation(hueFilter, saturationNode);

  scene.environmentNode = saturationFilter;

  // scene objects

  const loader = new GLTFLoader().setPath("models/gltf/DamagedHelmet/glTF/");
  loader.load("DamagedHelmet.gltf", function (gltf) {
    scene.add(gltf.scene);

    render();
  });

  const sphereGeometry = new SphereGeometry(0.5, 64, 32);

  const sphereRightView = new Mesh(
    sphereGeometry,
    new MeshStandardMaterial({ roughness: 0, metalness: 1 })
  );
  sphereRightView.position.x += 2;

  const sphereLeftView = new Mesh(
    sphereGeometry,
    new MeshStandardMaterial({ roughness: 1, metalness: 1 })
  );
  sphereLeftView.position.x -= 2;

  scene.add(sphereLeftView);
  scene.add(sphereRightView);

  // renderer and controls

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

  // gui

  const gui = new GUI();

  gui
    .add({ offsetCube1: 0 }, "offsetCube1", 0, Math.PI * 2, 0.01)
    .onChange((value) => {
      rotateY1Matrix.makeRotationY(value);
    });
  gui
    .add({ offsetCube2: 0 }, "offsetCube2", 0, Math.PI * 2, 0.01)
    .onChange((value) => {
      rotateY2Matrix.makeRotationY(value);
    });
  gui.add(adjustments, "mix", -1, 2, 0.01);
  gui.add(adjustments, "procedural", 0, 1, 0.01);
  gui.add(adjustments, "brightness", 0, 1, 0.01);
  gui.add(adjustments, "contrast", 0, 3, 0.01);
  gui.add(adjustments, "hue", 0, Math.PI * 2, 0.01);
  gui.add(adjustments, "saturation", 0, 2, 0.01);

  return renderer.init();
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
