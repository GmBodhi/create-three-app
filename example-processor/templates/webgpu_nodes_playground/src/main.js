import "./style.css"; // For webpack support

import ImportMaps from "three/examples/jsm/capabilities/ImportMaps.js";

if (ImportMaps.isAvailable() === false) {
  document.body.appendChild(ImportMaps.getErrorMessage());
}

import {
  PerspectiveCamera,
  Scene,
  Color,
  PointLight,
  sRGBEncoding,
} from "three";

import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";

import { NodeEditor } from "three/examples/jsm/node-editor/NodeEditor.js";
import { StandardMaterialEditor } from "three/examples/jsm/node-editor/materials/StandardMaterialEditor.js";

import * as Nodes from "three/examples/jsm/renderers/nodes/Nodes.js";

import Stats from "three/examples/jsm/libs/stats.module.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

let stats;
let camera, scene, renderer;
let model;
let nodeLights;

init()
  .then(animate)
  .catch((error) => console.error(error));

async function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    5000
  );
  camera.position.set(0.0, 300, 400 * 3);

  scene = new Scene();
  scene.background = new Color(0x333333);

  // Lights

  const topLight = new PointLight(0xf4f6f0, 1);
  topLight.position.set(0, 100000, 100000);
  scene.add(topLight);

  const backLight = new PointLight(0x0c1445, 1.4);
  backLight.position.set(-100, 20, -260);
  scene.add(backLight);

  nodeLights = Nodes.LightsNode.fromLights([topLight, backLight]);

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  renderer.outputEncoding = sRGBEncoding;

  renderer.domElement.className = "renderer";

  //

  stats = new Stats();
  document.body.appendChild(stats.dom);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 500;
  controls.maxDistance = 3000;

  window.addEventListener("resize", onWindowResize);

  onWindowResize();

  initEditor();

  return renderer.init();
}

function initEditor() {
  const nodeEditor = new NodeEditor();

  nodeEditor.addEventListener("new", () => {
    const materialEditor = new StandardMaterialEditor();
    materialEditor.setPosition(window.innerWidth / 2 - 150, 100);

    nodeEditor.add(materialEditor);

    model.material = materialEditor.material;
    model.material.lightNode = nodeLights;
  });

  nodeEditor.addEventListener("load", () => {
    const materialEditor = nodeEditor.nodes[0];
    materialEditor.update(); // need move to deserialization

    model.material = materialEditor.material;
    model.material.lightNode = nodeLights;
  });

  document.body.appendChild(nodeEditor.domElement);

  const loaderFBX = new FBXLoader();
  loaderFBX.load("models/fbx/stanford-bunny.fbx", (object) => {
    const materialEditor = new StandardMaterialEditor();
    materialEditor.setPosition(window.innerWidth / 2 - 150, 100); // canvas position

    nodeEditor.add(materialEditor);

    model = object.children[0];
    model.position.set(0, 0, 10);
    model.scale.setScalar(1);
    model.material = materialEditor.material;
    model.material.lightNode = nodeLights;
    scene.add(model);
  });
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight / 2;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

//

function animate() {
  requestAnimationFrame(animate);

  render();

  stats.update();
}

function render() {
  //if ( model ) model.rotation.y = performance.now() / 5000;

  renderer.render(scene, camera);
}
