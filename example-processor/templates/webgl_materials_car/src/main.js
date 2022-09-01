import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  sRGBEncoding,
  ACESFilmicToneMapping,
  PerspectiveCamera,
  Scene,
  Color,
  EquirectangularReflectionMapping,
  Fog,
  GridHelper,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  TextureLoader,
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  MultiplyBlending,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

let camera, scene, renderer;
let stats;

let grid;
let controls;

const wheels = [];

function init() {
  const container = document.getElementById("container");

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(render);
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  container.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);

  stats = new Stats();
  container.appendChild(stats.dom);

  //

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(4.25, 1.4, -4.5);

  controls = new OrbitControls(camera, container);
  controls.enableDamping = true;
  controls.maxDistance = 9;
  controls.target.set(0, 0.5, 0);
  controls.update();

  scene = new Scene();
  scene.background = new Color(0x333333);
  scene.environment = new RGBELoader().load(
    "textures/equirectangular/venice_sunset_1k.hdr"
  );
  scene.environment.mapping = EquirectangularReflectionMapping;
  scene.fog = new Fog(0x333333, 10, 15);

  grid = new GridHelper(20, 40, 0xffffff, 0xffffff);
  grid.material.opacity = 0.2;
  grid.material.depthWrite = false;
  grid.material.transparent = true;
  scene.add(grid);

  // materials

  const bodyMaterial = new MeshPhysicalMaterial({
    color: 0xff0000,
    metalness: 1.0,
    roughness: 0.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    sheen: 0.5,
  });

  const detailsMaterial = new MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1.0,
    roughness: 0.5,
  });

  const glassMaterial = new MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.25,
    roughness: 0,
    transmission: 1.0,
  });

  const bodyColorInput = document.getElementById("body-color");
  bodyColorInput.addEventListener("input", function () {
    bodyMaterial.color.set(this.value);
  });

  const detailsColorInput = document.getElementById("details-color");
  detailsColorInput.addEventListener("input", function () {
    detailsMaterial.color.set(this.value);
  });

  const glassColorInput = document.getElementById("glass-color");
  glassColorInput.addEventListener("input", function () {
    glassMaterial.color.set(this.value);
  });

  // Car

  const shadow = new TextureLoader().load("models/gltf/ferrari_ao.png");

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("js/libs/draco/gltf/");

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  loader.load("models/gltf/ferrari.glb", function (gltf) {
    const carModel = gltf.scene.children[0];

    carModel.getObjectByName("body").material = bodyMaterial;

    carModel.getObjectByName("rim_fl").material = detailsMaterial;
    carModel.getObjectByName("rim_fr").material = detailsMaterial;
    carModel.getObjectByName("rim_rr").material = detailsMaterial;
    carModel.getObjectByName("rim_rl").material = detailsMaterial;
    carModel.getObjectByName("trim").material = detailsMaterial;

    carModel.getObjectByName("glass").material = glassMaterial;

    wheels.push(
      carModel.getObjectByName("wheel_fl"),
      carModel.getObjectByName("wheel_fr"),
      carModel.getObjectByName("wheel_rl"),
      carModel.getObjectByName("wheel_rr")
    );

    // shadow
    const mesh = new Mesh(
      new PlaneGeometry(0.655 * 4, 1.3 * 4),
      new MeshBasicMaterial({
        map: shadow,
        blending: MultiplyBlending,
        toneMapped: false,
        transparent: true,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 2;
    carModel.add(mesh);

    scene.add(carModel);
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  controls.update();

  const time = -performance.now() / 1000;

  for (let i = 0; i < wheels.length; i++) {
    wheels[i].rotation.x = time * Math.PI * 2;
  }

  grid.position.z = -time % 1;

  renderer.render(scene, camera);

  stats.update();
}

init();
