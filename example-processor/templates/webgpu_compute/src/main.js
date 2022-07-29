import "./style.css"; // For webpack support

import {
  Vector2,
  OrthographicCamera,
  Scene,
  InstancedBufferAttribute,
  BufferGeometry,
  BufferAttribute,
  Points,
} from "three";
import * as Nodes from "three-nodes/Nodes.js";

import {
  ShaderNode,
  compute,
  uniform,
  element,
  storage,
  attribute,
  mul,
  sin,
  cos,
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
  float,
  vec2,
  vec3,
  color,
  greaterThanEqual,
  lessThanEqual,
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

  const particleNum = 300000;
  const particleSize = 2; // vec2

  const particleArray = new Float32Array(particleNum * particleSize);
  const velocityArray = new Float32Array(particleNum * particleSize);

  // create buffers

  const particleBuffer = new InstancedBufferAttribute(particleArray, 2);
  const velocityBuffer = new InstancedBufferAttribute(velocityArray, 2);

  const particleBufferNode = storage(particleBuffer, "vec2", particleNum);
  const velocityBufferNode = storage(velocityBuffer, "vec2", particleNum);

  // create function

  const computeShaderNode = new ShaderNode((inputs, builder) => {
    const particle = element(particleBufferNode, instanceIndex);
    const velocity = element(velocityBufferNode, instanceIndex);

    const pointer = uniform(pointerVector);
    const limit = uniform(scaleVector);

    const position = temp(add(particle, velocity), "tempPos"); // @TODO: this should work without 'tempPos' property name
    position.build(builder);

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

  computeNode = compute(computeShaderNode, particleNum);
  computeNode.onInit = ({ renderer }) => {
    const precomputeShaderNode = new ShaderNode((inputs, builder) => {
      const particleIndex = float(instanceIndex);

      const randomAngle = mul(mul(particleIndex, 0.005), Math.PI * 2);
      const randomSpeed = add(mul(particleIndex, 0.00000001), 0.0000001);

      const velX = mul(sin(randomAngle), randomSpeed);
      const velY = mul(cos(randomAngle), randomSpeed);

      const velocity = element(velocityBufferNode, instanceIndex);

      assign(velocity.xy, vec2(velX, velY)).build(builder);
    });

    renderer.compute(compute(precomputeShaderNode, computeNode.count));
  };

  // use a compute shader to animate the point cloud's vertex data.

  const particleNode = attribute("particle", "vec2");

  const pointsGeometry = new BufferGeometry();
  pointsGeometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(3), 3)
  ); // single vertex ( not triangle )
  pointsGeometry.setAttribute("particle", particleBuffer); // dummy the position points as instances
  pointsGeometry.drawRange.count = 1; // force render points as instances ( not triangle )

  const pointsMaterial = new Nodes.PointsNodeMaterial();
  pointsMaterial.colorNode = add(particleNode, color(0xffffff));
  pointsMaterial.positionNode = particleNode;

  const mesh = new Points(pointsGeometry, pointsMaterial);
  mesh.isInstancedMesh = true;
  mesh.count = particleNum;
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
