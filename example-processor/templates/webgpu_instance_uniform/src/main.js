import "./style.css"; // For webpack support

import {
  Color,
  PerspectiveCamera,
  Scene,
  GridHelper,
  CubeTextureLoader,
  MeshStandardMaterial,
  Mesh,
} from "three";
import * as Nodes from "three-nodes/Nodes.js";
import { add, mul } from "three-nodes/Nodes.js";

import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { TeapotGeometry } from "three/examples/jsm/geometries/TeapotGeometry.js";

import Stats from "three/examples/jsm/libs/stats.module.js";

class InstanceUniformNode extends Nodes.Node {
  constructor() {
    super("vec3");

    this.updateType = Nodes.NodeUpdateType.Object;

    this.uniformNode = new Nodes.UniformNode(new Color());
  }

  update(frame) {
    const mesh = frame.object;

    const meshColor = mesh.color;

    this.uniformNode.value.copy(meshColor);
  }

  generate(builder, output) {
    return this.uniformNode.build(builder, output);
  }
}

let stats;

let camera, scene, renderer;
let controls;

const objects = [];

init().then(animate).catch(error);

async function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    4000
  );
  camera.position.set(0, 200, 1200);

  scene = new Scene();

  // Grid

  const helper = new GridHelper(1000, 40, 0x303030, 0x303030);
  helper.material.colorNode = new Nodes.AttributeNode("color", "vec3");
  helper.position.y = -75;
  scene.add(helper);

  // CubeMap

  const path = "textures/cube/SwedishRoyalCastle/";
  const format = ".jpg";
  const urls = [
    path + "px" + format,
    path + "nx" + format,
    path + "py" + format,
    path + "ny" + format,
    path + "pz" + format,
    path + "nz" + format,
  ];

  const cubeTexture = new CubeTextureLoader().load(urls);

  // Materials

  const instanceUniform = new InstanceUniformNode();
  const cubeTextureNode = new Nodes.CubeTextureNode(cubeTexture);

  const material = new MeshStandardMaterial();
  material.colorNode = add(instanceUniform, cubeTextureNode);
  material.emissiveNode = mul(instanceUniform, cubeTextureNode);

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

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 400;
  controls.maxDistance = 2000;

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

  mesh.position.x = (objects.length % 4) * 200 - 300;
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
