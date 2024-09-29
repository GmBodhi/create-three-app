import "./style.css"; // For webpack support

import {
  Vector2,
  OrthographicCamera,
  Scene,
  StorageInstancedBufferAttribute,
  BufferGeometry,
  BufferAttribute,
  PointsNodeMaterial,
  Points,
  WebGPURenderer,
} from "three";
import {
  Fn,
  uniform,
  storage,
  attribute,
  float,
  vec2,
  vec3,
  color,
  instanceIndex,
} from "three/tsl";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer;
let computeNode;

const pointerVector = new Vector2(-10.0, -10.0); // Out of bounds first
const scaleVector = new Vector2(1, 1);

init();

function init() {
  camera = new OrthographicCamera(-1.0, 1.0, 1.0, -1.0, 0, 1);
  camera.position.z = 1;

  scene = new Scene();

  // initialize particles

  const particleNum = 300000;
  const particleSize = 2; // vec2

  // create buffers

  const particleBuffer = new StorageInstancedBufferAttribute(
    particleNum,
    particleSize
  );
  const velocityBuffer = new StorageInstancedBufferAttribute(
    particleNum,
    particleSize
  );

  const particleBufferNode = storage(particleBuffer, "vec2", particleNum);
  const velocityBufferNode = storage(velocityBuffer, "vec2", particleNum);

  // create function

  const computeShaderFn = Fn(() => {
    const particle = particleBufferNode.element(instanceIndex);
    const velocity = velocityBufferNode.element(instanceIndex);

    const pointer = uniform(pointerVector);
    const limit = uniform(scaleVector);

    const position = particle.add(velocity).toVar();

    velocity.x = position.x
      .abs()
      .greaterThanEqual(limit.x)
      .select(velocity.x.negate(), velocity.x);
    velocity.y = position.y
      .abs()
      .greaterThanEqual(limit.y)
      .select(velocity.y.negate(), velocity.y);

    position.assign(position.min(limit).max(limit.negate()));

    const pointerSize = 0.1;
    const distanceFromPointer = pointer.sub(position).length();

    particle.assign(
      distanceFromPointer.lessThanEqual(pointerSize).select(vec3(), position)
    );
  });

  // compute

  computeNode = computeShaderFn().compute(particleNum);
  computeNode.onInit = ({ renderer }) => {
    const precomputeShaderNode = Fn(() => {
      const particleIndex = float(instanceIndex);

      const randomAngle = particleIndex.mul(0.005).mul(Math.PI * 2);
      const randomSpeed = particleIndex.mul(0.00000001).add(0.0000001);

      const velX = randomAngle.sin().mul(randomSpeed);
      const velY = randomAngle.cos().mul(randomSpeed);

      const velocity = velocityBufferNode.element(instanceIndex);

      velocity.xy = vec2(velX, velY);
    });

    renderer.compute(precomputeShaderNode().compute(particleNum));
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

  const pointsMaterial = new PointsNodeMaterial();
  pointsMaterial.colorNode = particleNode.add(color(0xffffff));
  pointsMaterial.positionNode = particleNode;

  const mesh = new Points(pointsGeometry, pointsMaterial);
  mesh.count = particleNum;
  scene.add(mesh);

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("mousemove", onMouseMove);

  // gui

  const gui = new GUI();

  gui.add(scaleVector, "x", 0, 1, 0.01);
  gui.add(scaleVector, "y", 0, 1, 0.01);
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
  renderer.compute(computeNode);
  renderer.render(scene, camera);
}
