import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  Scene,
  Color,
  AmbientLight,
  PerspectiveCamera,
  PointLight,
  LoadingManager,
  Box3,
  Vector3,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";

let camera, scene, renderer, object, loader, controls;

const params = {
  asset: "cube_gears",
};

const assets = ["cube_gears", "facecolors", "multipletextures", "vertexcolors"];

init();

function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  scene = new Scene();
  scene.background = new Color(0x333333);

  scene.add(new AmbientLight(0xffffff, 0.2));

  camera = new PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    1,
    500
  );

  // Z is up for objects intended to be 3D printed.

  camera.up.set(0, 0, 1);
  camera.position.set(-100, -250, 100);
  scene.add(camera);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render);
  controls.minDistance = 50;
  controls.maxDistance = 400;
  controls.enablePan = false;
  controls.update();

  const pointLight = new PointLight(0xffffff, 0.8);
  camera.add(pointLight);

  const manager = new LoadingManager();

  manager.onLoad = function () {
    const aabb = new Box3().setFromObject(object);
    const center = aabb.getCenter(new Vector3());

    object.position.x += object.position.x - center.x;
    object.position.y += object.position.y - center.y;
    object.position.z += object.position.z - center.z;

    controls.reset();

    scene.add(object);
    render();
  };

  loader = new ThreeMFLoader(manager);
  loadAsset(params.asset);

  window.addEventListener("resize", onWindowResize);

  //

  const gui = new GUI({ width: 300 });
  gui.add(params, "asset", assets).onChange(function (value) {
    loadAsset(value);
  });
}

function loadAsset(asset) {
  loader.load("models/3mf/" + asset + ".3mf", function (group) {
    if (object) {
      object.traverse(function (child) {
        if (child.material) child.material.dispose();
        if (child.material && child.material.map) child.material.map.dispose();
        if (child.geometry) child.geometry.dispose();
      });

      scene.remove(object);
    }

    //

    object = group;
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

function render() {
  renderer.render(scene, camera);
}
