import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  PointLight,
  WebGLRenderer,
  sRGBEncoding,
} from "three";

import { nodeFrame } from "three/examples/jsm/renderers/webgl/nodes/WebGLNodes.js";

import { NodeEditor } from "three/examples/jsm/node-editor/NodeEditor.js";
import { StandardMaterialEditor } from "three/examples/jsm/node-editor/materials/StandardMaterialEditor.js";

import Stats from "three/examples/jsm/libs/stats.module.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

let stats;
let camera, scene, renderer;
let model;

init();
animate();

function init() {
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

  renderer = new WebGLRenderer({ antialias: true });
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
}

function initEditor() {
  const nodeEditor = new NodeEditor();

  nodeEditor.addEventListener("new", () => {
    const materialEditor = new StandardMaterialEditor();
    materialEditor.setPosition(window.innerWidth / 2 - 150, 100);

    nodeEditor.add(materialEditor);

    model.material = materialEditor.material;
  });

  nodeEditor.addEventListener("load", () => {
    const materialEditor = nodeEditor.nodes[0];
    materialEditor.update(); // need move to deserialization

    model.material = materialEditor.material;
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

  nodeFrame.update();

  render();

  stats.update();
}

function render() {
  //if ( model ) model.rotation.y = performance.now() / 5000;

  renderer.render(scene, camera);
}
