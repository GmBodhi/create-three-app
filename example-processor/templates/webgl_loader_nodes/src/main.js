import "./style.css"; // For webpack support

import * as THREE from "three";

import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { NodeMaterialLoader } from "three/examples/jsm/loaders/NodeMaterialLoader.js";
import { TeapotGeometry } from "three/examples/jsm/geometries/TeapotGeometry.js";
import { NodeFrame } from "three/examples/jsm/nodes/core/NodeFrame.js";
import { NodeMaterial } from "three/examples/jsm/nodes/materials/NodeMaterial.js";

const container = document.getElementById("container");

let renderer, scene, camera;
const clock = new Clock(),
  fov = 50;
const frame = new NodeFrame();
let teapot, mesh, cloud;
let controls;
let gui;

const param = { load: "caustic" };

window.addEventListener("load", init);

function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  scene = new Scene();

  camera = new PerspectiveCamera(
    fov,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.x = 50;
  camera.position.z = -50;
  camera.position.y = 30;

  cloud = new TextureLoader().load("textures/lava/cloud.png");
  cloud.wrapS = cloud.wrapT = RepeatWrapping;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 50;
  controls.maxDistance = 200;

  scene.add(new AmbientLight(0x464646));

  const light1 = new DirectionalLight(0xffddcc, 1);
  light1.position.set(1, 0.75, 0.5);
  scene.add(light1);

  const light2 = new DirectionalLight(0xccccff, 1);
  light2.position.set(-1, 0.75, -0.5);
  scene.add(light2);

  teapot = new TeapotGeometry(15, 18);

  mesh = new Mesh(teapot);
  scene.add(mesh);

  window.addEventListener("resize", onWindowResize);

  updateMaterial();

  onWindowResize();
  animate();
}

function clearGui() {
  if (gui) gui.destroy();

  gui = new GUI();

  gui
    .add(param, "load", {
      caustic: "caustic",
      displace: "displace",
      wave: "wave",
      xray: "xray",
    })
    .onFinishChange(function () {
      updateMaterial();
    });

  gui.open();
}

function addGui(name, value, callback, isColor, min, max) {
  let node;

  param[name] = value;

  if (isColor) {
    node = gui.addColor(param, name).onChange(function () {
      callback(param[name]);
    });
  } else if (typeof value == "object") {
    node = gui.add(param, name, value).onChange(function () {
      callback(param[name]);
    });
  } else {
    node = gui.add(param, name, min, max).onChange(function () {
      callback(param[name]);
    });
  }

  return node;
}

function updateMaterial() {
  if (mesh.material) mesh.material.dispose();

  clearGui();

  const url = "nodes/" + param.load + ".json";

  const library = {
    cloud: cloud,
  };

  const loader = new NodeMaterialLoader(undefined, library).load(
    url,
    function () {
      const time = loader.getObjectByName("time");

      if (time) {
        // enable time scale

        time.timeScale = true;

        // gui

        addGui(
          "timeScale",
          time.scale,
          function (val) {
            time.scale = val;
          },
          false,
          -2,
          2
        );
      }

      // set material
      mesh.material = loader.material;
    }
  );
}

function onWindowResize() {
  const width = window.innerWidth,
    height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function animate() {
  const delta = clock.getDelta();

  // update material animation and/or gpu calcs (pre-renderer)
  if (mesh.material instanceof NodeMaterial)
    frame.update(delta).updateNode(mesh.material);

  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}
