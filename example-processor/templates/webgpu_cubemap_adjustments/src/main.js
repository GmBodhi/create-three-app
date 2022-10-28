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
import * as Nodes from "three/nodes";

import {
  uniform,
  mix,
  cubeTexture,
  mul,
  reference,
  add,
  positionWorld,
  normalWorld,
  modelWorldMatrix,
  transformDirection,
  clamp,
  saturation,
  hue,
  reflectVector,
  context,
} from "three/nodes";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";

import { RGBMLoader } from "three/addons/loaders/RGBMLoader.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer;

init();

function init() {
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
    intensity: 1,
    hue: 0,
    saturation: 1,
  };

  const mixNode = reference("mix", "float", adjustments);
  const proceduralNode = reference("procedural", "float", adjustments);
  const intensityNode = reference("intensity", "float", adjustments);
  const hueNode = reference("hue", "float", adjustments);
  const saturationNode = reference("saturation", "float", adjustments);

  const rotateY1Matrix = new Matrix4();
  const rotateY2Matrix = new Matrix4();

  const getEnvironmentNode = (reflectNode) => {
    const custom1UV = mul(reflectNode.xyz, uniform(rotateY1Matrix));
    const custom2UV = mul(reflectNode.xyz, uniform(rotateY2Matrix));

    const mixCubeMaps = mix(
      cubeTexture(cube1Texture, custom1UV),
      cubeTexture(cube2Texture, custom2UV),
      clamp(add(positionWorld.y, mixNode))
    );
    const proceduralEnv = mix(mixCubeMaps, normalWorld, proceduralNode);
    const intensityFilter = mul(proceduralEnv, intensityNode);
    const hueFilter = hue(intensityFilter, hueNode);

    return saturation(hueFilter, saturationNode);
  };

  const blurNode = uniform(0);

  scene.environmentNode = getEnvironmentNode(reflectVector);

  scene.backgroundNode = context(
    getEnvironmentNode(transformDirection(positionWorld, modelWorldMatrix)),
    {
      levelNode: blurNode, // @TODO: currently it uses mipmaps value, I think it should be replaced for [0,1]
    }
  );

  // scene objects

  const loader = new GLTFLoader().setPath("models/gltf/DamagedHelmet/glTF/");
  loader.load("DamagedHelmet.gltf", function (gltf) {
    scene.add(gltf.scene);
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
  renderer.setAnimationLoop(render);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 2;
  controls.maxDistance = 10;

  window.addEventListener("resize", onWindowResize);

  // gui

  const gui = new GUI();

  gui
    .add({ blurBackground: blurNode.value }, "blurBackground", 0, 10, 0.01)
    .onChange((value) => {
      blurNode.value = value;
    });
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
  gui.add(adjustments, "intensity", 0, 5, 0.01);
  gui.add(adjustments, "hue", 0, Math.PI * 2, 0.01);
  gui.add(adjustments, "saturation", 0, 2, 0.01);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function render() {
  renderer.render(scene, camera);
}
