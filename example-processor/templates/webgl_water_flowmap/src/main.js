import "./style.css"; // For webpack support

import {
  Scene,
  PerspectiveCamera,
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh,
  TextureLoader,
  RepeatWrapping,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Water } from "three/addons/objects/Water2.js";

let scene, camera, renderer, water;

init();

function init() {
  // scene

  scene = new Scene();

  // camera

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 25, 0);
  camera.lookAt(scene.position);

  // ground

  const groundGeometry = new PlaneGeometry(20, 20, 10, 10);
  const groundMaterial = new MeshBasicMaterial({ color: 0xe7e7e7 });
  const ground = new Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = Math.PI * -0.5;
  scene.add(ground);

  const textureLoader = new TextureLoader();
  textureLoader.load(
    "textures/floors/FloorsCheckerboard_S_Diffuse.jpg",
    function (map) {
      map.wrapS = RepeatWrapping;
      map.wrapT = RepeatWrapping;
      map.anisotropy = 16;
      map.repeat.set(4, 4);
      map.colorSpace = SRGBColorSpace;
      groundMaterial.map = map;
      groundMaterial.needsUpdate = true;
    }
  );

  // water

  const waterGeometry = new PlaneGeometry(20, 20);
  const flowMap = textureLoader.load("textures/water/Water_1_M_Flow.jpg");

  water = new Water(waterGeometry, {
    scale: 2,
    textureWidth: 1024,
    textureHeight: 1024,
    flowMap: flowMap,
  });

  water.position.y = 1;
  water.rotation.x = Math.PI * -0.5;
  scene.add(water);

  // flow map helper

  const helperGeometry = new PlaneGeometry(20, 20);
  const helperMaterial = new MeshBasicMaterial({ map: flowMap });
  const helper = new Mesh(helperGeometry, helperMaterial);
  helper.position.y = 1.01;
  helper.rotation.x = Math.PI * -0.5;
  helper.visible = false;
  scene.add(helper);

  // renderer

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  //

  const gui = new GUI();
  gui.add(helper, "visible").name("Show Flow Map");
  gui.open();

  //

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 5;
  controls.maxDistance = 50;

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.render(scene, camera);
}
