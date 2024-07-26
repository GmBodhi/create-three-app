import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  TextureLoader,
  LinearMipmapLinearFilter,
  LinearFilter,
  WebGLCubeRenderTarget,
  HalfFloatType,
  CubeCamera,
  MeshStandardNodeMaterial,
  Mesh,
  IcosahedronGeometry,
  BoxGeometry,
  TorusKnotGeometry,
  WebGPURenderer,
  ACESFilmicToneMapping,
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBMLoader } from "three/addons/loaders/RGBMLoader.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import Stats from "three/addons/libs/stats.module.js";

let camera, scene, renderer, stats;
let cube, sphere, torus, material;

let cubeCamera, cubeRenderTarget;

let controls;

init();

async function init() {
  stats = new Stats();
  document.body.appendChild(stats.dom);

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 75;

  scene = new Scene();

  const uvTexture = new TextureLoader().load(
    "three/examples/textures/uv_grid_opengl.jpg"
  );

  const rgbmUrls = ["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"];
  const texture = await new RGBMLoader()
    .setMaxRange(16)
    .setPath("three/examples/textures/cube/pisaRGBM16/")
    .loadCubemapAsync(rgbmUrls);

  texture.name = "pisaRGBM16";
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;

  scene.background = texture;
  scene.environment = texture;

  //

  cubeRenderTarget = new WebGLCubeRenderTarget(256);
  cubeRenderTarget.texture.type = HalfFloatType;
  cubeRenderTarget.texture.minFilter = LinearMipmapLinearFilter;
  cubeRenderTarget.texture.magFilter = LinearFilter;
  cubeRenderTarget.texture.generateMipmaps = true;

  cubeCamera = new CubeCamera(1, 1000, cubeRenderTarget);

  //

  material = new MeshStandardNodeMaterial({
    envMap: cubeRenderTarget.texture,
    roughness: 0.05,
    metalness: 1,
  });

  sphere = new Mesh(new IcosahedronGeometry(15, 8), material);
  scene.add(sphere);

  const material1 = new MeshStandardNodeMaterial({
    map: uvTexture,
    roughness: 0.1,
    metalness: 0,
  });

  const material2 = new MeshStandardNodeMaterial({
    map: uvTexture,
    roughness: 0.1,
    metalness: 0,
    envMap: texture,
  });

  cube = new Mesh(new BoxGeometry(15, 15, 15), material1);
  scene.add(cube);

  torus = new Mesh(new TorusKnotGeometry(8, 3, 128, 16), material2);
  scene.add(torus);

  //

  renderer = new WebGPURenderer({ antialias: true, forceWebGL: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animation);
  renderer.toneMapping = ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResized);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = true;

  const gui = new GUI();
  gui.add(material, "roughness", 0, 1);
  gui.add(material, "metalness", 0, 1);
  gui.add(renderer, "toneMappingExposure", 0, 2).name("exposure");
  gui.add(scene, "environmentIntensity", 0, 1);
  gui.add(material2, "envMapIntensity", 0, 1);
}

function onWindowResized() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function animation(msTime) {
  const time = msTime / 1000;

  cube.position.x = Math.cos(time) * 30;
  cube.position.y = Math.sin(time) * 30;
  cube.position.z = Math.sin(time) * 30;

  cube.rotation.x += 0.02;
  cube.rotation.y += 0.03;

  torus.position.x = Math.cos(time + 10) * 30;
  torus.position.y = Math.sin(time + 10) * 30;
  torus.position.z = Math.sin(time + 10) * 30;

  torus.rotation.x += 0.02;
  torus.rotation.y += 0.03;

  material.visible = false;

  cubeCamera.update(renderer, scene);

  material.visible = true;

  controls.update();

  renderer.render(scene, camera);

  stats.update();
}
