import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  fog,
  rangeFogFactor,
  color,
  lights,
  texture,
  normalMap,
} from "three/tsl";

import Stats from "three/addons/libs/stats.module.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TeapotGeometry } from "three/addons/geometries/TeapotGeometry.js";

let camera, scene, renderer, light1, light2, light3, light4, stats, controls;

init();

function init() {
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );
  camera.position.z = 7;

  scene = new Scene();
  scene.fogNode = fog(color(0xff00ff), rangeFogFactor(12, 30));

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
    const material = new MeshStandardNodeMaterial();
    material.colorNode = color(hexColor);
    material.lights = false;

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

  const redLightsNode = lights([light1]);
  const blueLightsNode = lights([light2]);

  //models

  const geometryTeapot = new TeapotGeometry(0.8, 18);

  const leftObject = new Mesh(
    geometryTeapot,
    new MeshStandardNodeMaterial({ color: 0x555555 })
  );
  leftObject.material.lightsNode = redLightsNode;
  leftObject.material.roughnessNode = texture(alphaTexture);
  leftObject.material.metalness = 0;
  leftObject.position.x = -3;
  scene.add(leftObject);

  const centerObject = new Mesh(
    geometryTeapot,
    new MeshStandardNodeMaterial({ color: 0x555555 })
  );
  centerObject.material.normalNode = normalMap(texture(normalMapTexture));
  centerObject.material.metalness = 0.5;
  centerObject.material.roughness = 0.5;
  scene.add(centerObject);

  const rightObject = new Mesh(
    geometryTeapot,
    new MeshStandardNodeMaterial({ color: 0x555555 })
  );
  rightObject.material.lightsNode = blueLightsNode;
  rightObject.material.metalnessNode = texture(alphaTexture);
  rightObject.position.x = 3;
  scene.add(rightObject);

  leftObject.rotation.y =
    centerObject.rotation.y =
    rightObject.rotation.y =
      Math.PI * -0.5;
  leftObject.position.y = centerObject.position.y = rightObject.position.y = -1;

  //renderer

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

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
