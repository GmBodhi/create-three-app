import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  GridHelper,
  MeshBasicMaterial,
  Mesh,
  Color,
} from "three";

import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";
import WebGPU from "three/examples/jsm/renderers/webgpu/WebGPU.js";

import { TeapotGeometry } from "three/examples/jsm/geometries/TeapotGeometry.js";

import Node from "three/examples/jsm/renderers/nodes/core/Node.js";
import AttributeNode from "three/examples/jsm/renderers/nodes/core/AttributeNode.js";
import { NodeUpdateType } from "three/examples/jsm/renderers/nodes/core/constants.js";
import ColorNode from "three/examples/jsm/renderers/nodes/inputs/ColorNode.js";

import Stats from "three/examples/jsm/libs/stats.module.js";

class InstanceUniformNode extends Node {
  constructor() {
    super("vec3");

    this.updateType = NodeUpdateType.Object;

    this.inputNode = new ColorNode();
  }

  update(frame) {
    const mesh = frame.object;

    this.inputNode.value.copy(mesh.color);
  }

  generate(builder, output) {
    return this.inputNode.build(builder, output);
  }
}

let stats;

let camera, scene, renderer;

const objects = [];

init().then(animate).catch(error);

async function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw "No WebGPU support";
  }

  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    2000
  );
  camera.position.set(0, 200, 800);

  scene = new Scene();

  // Grid

  const helper = new GridHelper(1000, 40, 0x303030, 0x303030);
  helper.material.colorNode = new AttributeNode("color", "vec3");
  helper.position.y = -75;
  scene.add(helper);

  // Materials

  const instanceUniform = new InstanceUniformNode();

  const material = new MeshBasicMaterial();
  material.colorNode = instanceUniform;

  // Geometry

  const geometry = new TeapotGeometry(50, 18);

  for (let i = 0, l = 12; i < l; i++) {
    addMesh(geometry, material);
  }

  //

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  //

  window.addEventListener("resize", onWindowResize);

  return renderer.init();
}

function addMesh(geometry, material) {
  const mesh = new Mesh(geometry, material);

  mesh.color = new Color(Math.random() * 0xffffff);

  mesh.position.x = (objects.length % 4) * 200 - 400;
  mesh.position.z = Math.floor(objects.length / 4) * 200 - 200;

  mesh.rotation.x = Math.random() * 200 - 100;
  mesh.rotation.y = Math.random() * 200 - 100;
  mesh.rotation.z = Math.random() * 200 - 100;

  objects.push(mesh);

  scene.add(mesh);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  const timer = 0.0001 * Date.now();

  camera.position.x = Math.cos(timer) * 1000;
  camera.position.z = Math.sin(timer) * 1000;

  camera.lookAt(scene.position);

  for (let i = 0, l = objects.length; i < l; i++) {
    const object = objects[i];

    object.rotation.x += 0.01;
    object.rotation.y += 0.005;
  }

  renderer.render(scene, camera);
}

function error(error) {
  console.error(error);
}
