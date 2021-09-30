//Shaders

undefined;

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  TextureLoader,
  RepeatWrapping,
  PointLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";

import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TeapotGeometry } from "three/examples/jsm/geometries/TeapotGeometry.js";

import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";
import WebGPU from "three/examples/jsm/renderers/webgpu/WebGPU.js";

import LightsNode from "three/examples/jsm/renderers/nodes/lights/LightsNode.js";
import TextureNode from "three/examples/jsm/renderers/nodes/inputs/TextureNode.js";
import NormalMapNode from "three/examples/jsm/renderers/nodes/display/NormalMapNode.js";

let camera, scene, renderer, light1, light2, light3, light4, stats, controls;

init().then(animate).catch(error);

async function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw "No WebGPU support";
  }

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 70;

  scene = new Scene();

  const sphere = new SphereGeometry(0.5, 16, 8);

  //textures

  const textureLoader = new TextureLoader();

  const normalMapTexture = textureLoader.load(
    "three/examples/textures/water/Water_1_M_Normal.jpg"
  );
  normalMapTexture.wrapS = RepeatWrapping;
  normalMapTexture.wrapT = RepeatWrapping;

  const alphaTexture = textureLoader.load(
    "three/examples/textures/roughness_map.jpg"
  );
  alphaTexture.wrapS = RepeatWrapping;
  alphaTexture.wrapT = RepeatWrapping;

  //lights

  light1 = new PointLight(0xff0040, 2, 100);
  light1.add(new Mesh(sphere, new MeshBasicMaterial({ color: 0xff0040 })));
  scene.add(light1);

  light2 = new PointLight(0x0040ff, 2, 100);
  light2.add(new Mesh(sphere, new MeshBasicMaterial({ color: 0x0040ff })));
  scene.add(light2);

  light3 = new PointLight(0x80ff80, 2, 100);
  light3.add(new Mesh(sphere, new MeshBasicMaterial({ color: 0x80ff80 })));
  scene.add(light3);

  light4 = new PointLight(0xffaa00, 2, 100);
  light4.add(new Mesh(sphere, new MeshBasicMaterial({ color: 0xffaa00 })));
  scene.add(light4);

  //light nodes ( selective lights )

  const allLightsNode = LightsNode.fromLights([light1, light2, light3, light4]);
  const redLightNode = LightsNode.fromLights([light1]);
  const blueLightNode = LightsNode.fromLights([light2]);

  //models

  const geometryTeapot = new TeapotGeometry(8, 18);

  const leftObject = new Mesh(
    geometryTeapot,
    new MeshStandardMaterial({ color: 0x555555 })
  );
  leftObject.material.lightNode = redLightNode;
  leftObject.material.roughnessNode = new TextureNode(alphaTexture);
  leftObject.material.metalness = 0;
  leftObject.position.x = -30;
  scene.add(leftObject);

  const centerObject = new Mesh(
    geometryTeapot,
    new MeshStandardMaterial({ color: 0x555555 })
  );
  centerObject.material.lightNode = allLightsNode;
  centerObject.material.normalNode = new NormalMapNode(
    new TextureNode(normalMapTexture)
  );
  centerObject.material.roughness = 0.5;
  scene.add(centerObject);

  const rightObject = new Mesh(
    geometryTeapot,
    new MeshStandardMaterial({ color: 0x555555 })
  );
  rightObject.material.lightNode = blueLightNode;
  rightObject.material.metalnessNode = new TextureNode(alphaTexture);
  rightObject.position.x = 30;
  scene.add(rightObject);

  leftObject.rotation.y =
    centerObject.rotation.y =
    rightObject.rotation.y =
      Math.PI * -0.5;
  leftObject.position.y =
    centerObject.position.y =
    rightObject.position.y =
      -10;

  //renderer

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 30;
  controls.maxDistance = 150;

  //stats

  stats = new Stats();
  document.body.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);

  //gui

  const gui = new GUI();

  gui.add(centerObject.material, "roughness", 0, 1, 0.01);
  gui.add(centerObject.material, "metalness", 0, 1, 0.01);

  return renderer.init();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  const time = Date.now() * 0.0005;

  light1.position.x = Math.sin(time * 0.7) * 30;
  light1.position.y = Math.cos(time * 0.5) * 40;
  light1.position.z = Math.cos(time * 0.3) * 30;

  light2.position.x = Math.cos(time * 0.3) * 30;
  light2.position.y = Math.sin(time * 0.5) * 40;
  light2.position.z = Math.sin(time * 0.7) * 30;

  light3.position.x = Math.sin(time * 0.7) * 30;
  light3.position.y = Math.cos(time * 0.3) * 40;
  light3.position.z = Math.sin(time * 0.5) * 30;

  light4.position.x = Math.sin(time * 0.3) * 30;
  light4.position.y = Math.cos(time * 0.7) * 40;
  light4.position.z = Math.sin(time * 0.5) * 30;

  renderer.render(scene, camera);
}

function error(error) {
  console.error(error);
}
