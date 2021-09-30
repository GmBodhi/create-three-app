//Shaders

undefined;

import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  sRGBEncoding,
  ACESFilmicToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  Color,
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

import Stats from "three/examples/jsm/libs/stats.module.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

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
  controls.target.set(0, 0.5, 0);
  controls.update();

  const pmremGenerator = new PMREMGenerator(renderer);

  scene = new Scene();
  scene.background = new Color(0xeeeeee);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
  scene.fog = new Fog(0xeeeeee, 10, 50);

  grid = new GridHelper(100, 40, 0x000000, 0x000000);
  grid.material.opacity = 0.1;
  grid.material.depthWrite = false;
  grid.material.transparent = true;
  scene.add(grid);

  // materials

  const bodyMaterial = new MeshPhysicalMaterial({
    color: 0xff0000,
    metalness: 0.6,
    roughness: 0.4,
    clearcoat: 0.05,
    clearcoatRoughness: 0.05,
  });

  const detailsMaterial = new MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1.0,
    roughness: 0.5,
  });

  const glassMaterial = new MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.1,
    transmission: 0.9,
    transparent: true,
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
  const time = -performance.now() / 1000;

  for (let i = 0; i < wheels.length; i++) {
    wheels[i].rotation.x = time * Math.PI;
  }

  grid.position.z = -time % 5;

  renderer.render(scene, camera);

  stats.update();
}

init();
