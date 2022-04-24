import "./style.css"; // For webpack support

import {
  Vector2,
  OrthographicCamera,
  Scene,
  BufferAttribute,
  BufferGeometry,
  Points,
} from "three";
import * as Nodes from "three-nodes/Nodes.js";

import {
  ShaderNode,
  compute,
  uniform,
  element,
  storage,
  temp,
  assign,
  add,
  sub,
  cond,
  abs,
  negate,
  max,
  min,
  length,
  vec3,
  color,
  greaterThanEqual,
  lessThanEqual,
  positionLocal,
  instanceIndex,
} from "three-nodes/Nodes.js";

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";

let camera, scene, renderer;
let computeNode;

const pointerVector = new Vector2(-10.0, -10.0); // Out of bounds first
const scaleVector = new Vector2(1, 1);

init().then(animate).catch(error);

async function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  camera = new OrthographicCamera(-1.0, 1.0, 1.0, -1.0, 0, 1);
  camera.position.z = 1;

  scene = new Scene();

  // initialize particles

  const particleNum = 65000; // 16-bit limit
  const particleSize = 3; // vec3

  const particleArray = new Float32Array(particleNum * particleSize);
  const velocityArray = new Float32Array(particleNum * particleSize);

  for (let i = 0; i < particleArray.length; i += particleSize) {
    const r = Math.random() * 0.01 + 0.0005;
    const degree = Math.random() * 360;

    velocityArray[i + 0] = r * Math.sin((degree * Math.PI) / 180);
    velocityArray[i + 1] = r * Math.cos((degree * Math.PI) / 180);
  }

  // create buffers

  const particleBuffer = new BufferAttribute(particleArray, particleSize);
  const velocityBuffer = new BufferAttribute(velocityArray, particleSize);

  const particleBufferNode = storage(particleBuffer, "vec3");
  const velocityBufferNode = storage(velocityBuffer, "vec3");

  // create function

  const FnNode = new ShaderNode((inputs, builder) => {
    const particle = element(particleBufferNode, instanceIndex);
    const velocity = element(velocityBufferNode, instanceIndex);

    const pointer = uniform(pointerVector);
    const limit = uniform(scaleVector);

    const position = temp(vec3());
    assign(position, add(particle, velocity)).build(builder); // workaround

    assign(
      velocity.x,
      cond(
        greaterThanEqual(abs(position.x), limit.x),
        negate(velocity.x),
        velocity.x
      )
    ).build(builder);
    assign(
      velocity.y,
      cond(
        greaterThanEqual(abs(position.y), limit.y),
        negate(velocity.y),
        velocity.y
      )
    ).build(builder);

    assign(position, max(negate(limit), min(limit, position))).build(builder);

    const pointerSize = 0.1;
    const distanceFromPointer = length(sub(pointer, position));

    assign(
      particle,
      cond(lessThanEqual(distanceFromPointer, pointerSize), vec3(), position)
    ).build(builder);
  });

  // compute

  computeNode = compute(particleNum);

  computeNode.computeNode = FnNode;

  // use a compute shader to animate the point cloud's vertex data.

  const pointsGeometry = new BufferGeometry();
  pointsGeometry.setAttribute("position", particleBuffer);

  const pointsMaterial = new Nodes.PointsNodeMaterial();
  pointsMaterial.colorNode = add(positionLocal, color(0xffffff));

  const mesh = new Points(pointsGeometry, pointsMaterial);
  scene.add(mesh);

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("mousemove", onMouseMove);

  // gui

  const gui = new GUI();

  gui.add(scaleVector, "x", 0, 1, 0.01);
  gui.add(scaleVector, "y", 0, 1, 0.01);

  return renderer.init();
}

function onWindowResize() {
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
  const x = event.clientX;
  const y = event.clientY;

  const width = window.innerWidth;
  const height = window.innerHeight;

  pointerVector.set((x / width - 0.5) * 2.0, (-y / height + 0.5) * 2.0);
}

function animate() {
  requestAnimationFrame(animate);

  renderer.compute(computeNode);
  renderer.render(scene, camera);
}

function error(error) {
  console.error(error);
}
