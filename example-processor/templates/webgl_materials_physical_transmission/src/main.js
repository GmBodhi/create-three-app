import "./style.css"; // For webpack support

import * as THREE from "three";

import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

const params = {
  color: 0xffffff,
  transmission: 1,
  opacity: 1,
  metalness: 0,
  roughness: 0,
  ior: 1.5,
  thickness: 0.01,
  specularIntensity: 1,
  specularTint: 0xffffff,
  envMapIntensity: 1,
  lightIntensity: 1,
  exposure: 1,
};

let camera, scene, renderer;

let mesh;

const hdrEquirect = new RGBELoader()
  .setPath("textures/equirectangular/")
  .load("royal_esplanade_1k.hdr", function () {
    hdrEquirect.mapping = EquirectangularReflectionMapping;

    init();
    render();
  });

function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = params.exposure;

  renderer.outputEncoding = sRGBEncoding;

  scene = new Scene();

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    2000
  );
  camera.position.set(0, 0, 120);

  //

  scene.background = hdrEquirect;

  //

  const geometry = new SphereGeometry(20, 64, 32);

  const texture = new CanvasTexture(generateTexture());
  texture.magFilter = NearestFilter;
  texture.wrapT = RepeatWrapping;
  texture.wrapS = RepeatWrapping;
  texture.repeat.set(1, 3.5);

  const material = new MeshPhysicalMaterial({
    color: params.color,
    metalness: params.metalness,
    roughness: params.roughness,
    ior: params.ior,
    alphaMap: texture,
    envMap: hdrEquirect,
    envMapIntensity: params.envMapIntensity,
    transmission: params.transmission, // use material.transmission for glass materials
    specularIntensity: params.specularIntensity,
    specularTint: params.specularTint,
    opacity: params.opacity,
    side: DoubleSide,
    transparent: true,
  });

  mesh = new Mesh(geometry, material);
  scene.add(mesh);

  //

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render); // use if there is no animation loop
  controls.minDistance = 10;
  controls.maxDistance = 150;

  window.addEventListener("resize", onWindowResize);

  //

  const gui = new GUI();

  gui.addColor(params, "color").onChange(function () {
    material.color.set(params.color);
    render();
  });

  gui.add(params, "transmission", 0, 1, 0.01).onChange(function () {
    material.transmission = params.transmission;
    render();
  });

  gui.add(params, "opacity", 0, 1, 0.01).onChange(function () {
    material.opacity = params.opacity;
    render();
  });

  gui.add(params, "metalness", 0, 1, 0.01).onChange(function () {
    material.metalness = params.metalness;
    render();
  });

  gui.add(params, "roughness", 0, 1, 0.01).onChange(function () {
    material.roughness = params.roughness;
    render();
  });

  gui.add(params, "ior", 1, 2, 0.01).onChange(function () {
    material.ior = params.ior;
    render();
  });

  gui.add(params, "thickness", 0, 5, 0.01).onChange(function () {
    material.thickness = params.thickness;
    render();
  });

  gui.add(params, "specularIntensity", 0, 1, 0.01).onChange(function () {
    material.specularIntensity = params.specularIntensity;
    render();
  });

  gui.addColor(params, "specularTint").onChange(function () {
    material.specularTint.set(params.specularTint);
    render();
  });

  gui
    .add(params, "envMapIntensity", 0, 1, 0.01)
    .name("envMap intensity")
    .onChange(function () {
      material.envMapIntensity = params.envMapIntensity;
      render();
    });

  gui.add(params, "exposure", 0, 1, 0.01).onChange(function () {
    renderer.toneMappingExposure = params.exposure;
    render();
  });

  gui.open();
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);

  render();
}

//

function generateTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 2;

  const context = canvas.getContext("2d");
  context.fillStyle = "white";
  context.fillRect(0, 1, 2, 1);

  return canvas;
}

function render() {
  renderer.render(scene, camera);
}
