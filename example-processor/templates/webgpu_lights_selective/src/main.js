import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  TextureLoader,
  RepeatWrapping,
  Mesh,
  PointLight,
  sRGBEncoding,
  LinearToneMapping,
} from "three";
import * as Nodes from "three/nodes";

import Stats from "three/addons/libs/stats.module.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TeapotGeometry } from "three/addons/geometries/TeapotGeometry.js";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";

import { color, float } from "three/nodes";

let camera, scene, renderer, light1, light2, light3, light4, stats, controls;

init();

function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );
  camera.position.z = 7;

  scene = new Scene();
  scene.fogNode = new Nodes.FogRangeNode(color(0xff00ff), float(3), float(30));

  const sphereGeometry = new SphereGeometry(0.1, 16, 8);

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

  const addLight = (hexColor, power = 1700, distance = 100) => {
    const material = new Nodes.MeshStandardNodeMaterial();
    material.colorNode = color(hexColor);
    material.lightsNode = new Nodes.LightsNode(); // ignore scene lights

    const mesh = new Mesh(sphereGeometry, material);

    const light = new PointLight(hexColor, 1, distance);
    light.power = power;
    light.add(mesh);

    scene.add(light);

    return light;
  };

  light1 = addLight(0xff0040);
  light2 = addLight(0x0040ff);
  light3 = addLight(0x80ff80);
  light4 = addLight(0xffaa00);

  //light nodes ( selective lights )

  const redLightsNode = new Nodes.LightsNode().fromLights([light1]);
  const blueLightsNode = new Nodes.LightsNode().fromLights([light2]);

  //models

  const geometryTeapot = new TeapotGeometry(0.8, 18);

  const leftObject = new Mesh(
    geometryTeapot,
    new Nodes.MeshStandardNodeMaterial({ color: 0x555555 })
  );
  leftObject.material.lightsNode = redLightsNode;
  leftObject.material.roughnessNode = new Nodes.TextureNode(alphaTexture);
  leftObject.material.metalness = 0;
  leftObject.position.x = -3;
  scene.add(leftObject);

  const centerObject = new Mesh(
    geometryTeapot,
    new Nodes.MeshStandardNodeMaterial({ color: 0x555555 })
  );
  centerObject.material.normalNode = new Nodes.NormalMapNode(
    new Nodes.TextureNode(normalMapTexture)
  );
  centerObject.material.metalness = 0.5;
  centerObject.material.roughness = 0.5;
  scene.add(centerObject);

  const rightObject = new Mesh(
    geometryTeapot,
    new Nodes.MeshStandardNodeMaterial({ color: 0x555555 })
  );
  rightObject.material.lightsNode = blueLightsNode;
  rightObject.material.metalnessNode = new Nodes.TextureNode(alphaTexture);
  rightObject.position.x = 3;
  scene.add(rightObject);

  leftObject.rotation.y =
    centerObject.rotation.y =
    rightObject.rotation.y =
      Math.PI * -0.5;
  leftObject.position.y = centerObject.position.y = rightObject.position.y = -1;

  //renderer

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMappingNode = new Nodes.ToneMappingNode(LinearToneMapping, 0.2);

  //controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 3;
  controls.maxDistance = 25;

  //stats

  stats = new Stats();
  document.body.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);

  //gui

  const gui = new GUI();

  gui.add(centerObject.material, "roughness", 0, 1, 0.01);
  gui.add(centerObject.material, "metalness", 0, 1, 0.01);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const time = performance.now() / 1000;
  const lightTime = time * 0.5;

  light1.position.x = Math.sin(lightTime * 0.7) * 3;
  light1.position.y = Math.cos(lightTime * 0.5) * 4;
  light1.position.z = Math.cos(lightTime * 0.3) * 3;

  light2.position.x = Math.cos(lightTime * 0.3) * 3;
  light2.position.y = Math.sin(lightTime * 0.5) * 4;
  light2.position.z = Math.sin(lightTime * 0.7) * 3;

  light3.position.x = Math.sin(lightTime * 0.7) * 3;
  light3.position.y = Math.cos(lightTime * 0.3) * 4;
  light3.position.z = Math.sin(lightTime * 0.5) * 3;

  light4.position.x = Math.sin(lightTime * 0.3) * 3;
  light4.position.y = Math.cos(lightTime * 0.7) * 4;
  light4.position.z = Math.sin(lightTime * 0.5) * 3;
  /*
				@TODO: Used to test scene light change ( currently unavailable )

				if ( time > 2.0 && light1.parent === null ) scene.add( light1 );
				if ( time > 2.5 && light2.parent === null ) scene.add( light2 );
				if ( time > 3.0 && light3.parent === null ) scene.add( light3 );
				if ( time > 3.5 && light4.parent === null ) scene.add( light4 );
				*/
  renderer.render(scene, camera);

  stats.update();
}
