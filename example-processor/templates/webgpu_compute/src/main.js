import "./style.css"; // For webpack support

import {
  Vector3,
  OrthographicCamera,
  Scene,
  Color,
  BufferAttribute,
  Vector2,
  BufferGeometry,
  Points,
} from "three";

import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";

import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";
import WebGPU from "three/examples/jsm/renderers/webgpu/WebGPU.js";

import WebGPUStorageBuffer from "three/examples/jsm/renderers/webgpu/WebGPUStorageBuffer.js";
import WebGPUUniformBuffer from "three/examples/jsm/renderers/webgpu/WebGPUUniformBuffer.js";
import * as WebGPUBufferUtils from "three/examples/jsm/renderers/webgpu/WebGPUBufferUtils.js";
import WebGPUUniformsGroup from "three/examples/jsm/renderers/webgpu/WebGPUUniformsGroup.js";
import { Vector2Uniform } from "three/examples/jsm/renderers/webgpu/WebGPUUniform.js";

import * as Nodes from "three/examples/jsm/renderers/nodes/Nodes.js";

let camera, scene, renderer;
let pointer;
let scaleUniformBuffer;
let scaleVector = new Vector3(1, 1, 1);

const computeParams = [];

init().then(animate).catch(error);

async function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw "No WebGPU support";
  }

  camera = new OrthographicCamera(-1.0, 1.0, 1.0, -1.0, 0, 1);
  camera.position.z = 1;

  scene = new Scene();
  scene.background = new Color(0x000000);

  const particleNum = 65000; // 16-bit limit
  const particleSize = 3;

  const particleArray = new Float32Array(particleNum * particleSize);
  const velocityArray = new Float32Array(particleNum * particleSize);

  for (let i = 0; i < particleArray.length; i += 3) {
    const r = Math.random() * 0.01 + 0.0005;
    const degree = Math.random() * 360;
    velocityArray[i + 0] = r * Math.sin((degree * Math.PI) / 180);
    velocityArray[i + 1] = r * Math.cos((degree * Math.PI) / 180);
  }

  const particleBuffer = new WebGPUStorageBuffer(
    "particle",
    new BufferAttribute(particleArray, 3)
  );
  const velocityBuffer = new WebGPUStorageBuffer(
    "velocity",
    new BufferAttribute(velocityArray, 3)
  );

  const scaleUniformLength = WebGPUBufferUtils.getVectorLength(2, 3); // two vector3 for array

  scaleUniformBuffer = new WebGPUUniformBuffer(
    "scaleUniform",
    new Float32Array(scaleUniformLength)
  );

  pointer = new Vector2(-10.0, -10.0); // Out of bounds first

  const pointerGroup = new WebGPUUniformsGroup("mouseUniforms").addUniform(
    new Vector2Uniform("pointer", pointer)
  );

  // Object keys need follow the binding shader sequence

  const computeBindings = [
    particleBuffer,
    velocityBuffer,
    scaleUniformBuffer,
    pointerGroup,
  ];

  const computeShader = /* glsl */ `#version 450
					#define PARTICLE_NUM ${particleNum}
					#define PARTICLE_SIZE ${particleSize}
					#define ROOM_SIZE 1.0
					#define POINTER_SIZE 0.1

					// Limitation for now: the order should be the same as bindings order

					layout(set = 0, binding = 0) buffer Particle {
						float particle[ PARTICLE_NUM * PARTICLE_SIZE ];
					} particle;

					layout(set = 0, binding = 1) buffer Velocity {
						float velocity[ PARTICLE_NUM * PARTICLE_SIZE ];
					} velocity;

					layout(set = 0, binding = 2) uniform Scale {
						vec3 value[2];
					} scaleUniform;

					layout(set = 0, binding = 3) uniform MouseUniforms {
						vec2 pointer;
					} mouseUniforms;

					void main() {
						uint index = gl_GlobalInvocationID.x;
						if ( index >= PARTICLE_NUM ) { return; }

						vec3 position = vec3(
							particle.particle[ index * 3 + 0 ] + velocity.velocity[ index * 3 + 0 ],
							particle.particle[ index * 3 + 1 ] + velocity.velocity[ index * 3 + 1 ],
							particle.particle[ index * 3 + 2 ] + velocity.velocity[ index * 3 + 2 ]
						);

						if ( abs( position.x ) >= ROOM_SIZE ) {

							velocity.velocity[ index * 3 + 0 ] = - velocity.velocity[ index * 3 + 0 ];

						}

						if ( abs( position.y ) >= ROOM_SIZE ) {

							velocity.velocity[ index * 3 + 1 ] = - velocity.velocity[ index * 3 + 1 ];

						}

						if ( abs( position.z ) >= ROOM_SIZE ) {

							velocity.velocity[ index * 3 + 2 ] = - velocity.velocity[ index * 3 + 2 ];

						}

						float dx = mouseUniforms.pointer.x - position.x;
						float dy = mouseUniforms.pointer.y - position.y;
						float distanceFromPointer = sqrt( dx * dx + dy * dy );

						if ( distanceFromPointer <= POINTER_SIZE ) {

							position.x = 0.0;
							position.y = 0.0;
							position.z = 0.0;

						}

						particle.particle[ index * 3 + 0 ] = position.x * scaleUniform.value[0].x;
						particle.particle[ index * 3 + 1 ] = position.y * scaleUniform.value[0].y;
						particle.particle[ index * 3 + 2 ] = position.z * scaleUniform.value[0].z;

					}
				`;

  computeParams.push({
    num: particleNum,
    shader: computeShader,
    bindings: computeBindings,
  });

  // Use a compute shader to animate the point cloud's vertex data.

  const pointsGeometry = new BufferGeometry().setAttribute(
    "position",
    particleBuffer.attribute
  );

  const pointsMaterial = new Nodes.PointsNodeMaterial();
  pointsMaterial.colorNode = new Nodes.OperatorNode(
    "+",
    new Nodes.PositionNode(),
    new Nodes.ColorNode(new Color(0x0000ff))
  );

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

  gui.add(scaleVector, "x", 0.9, 1.1, 0.01);
  gui.add(scaleVector, "y", 0.9, 1.1, 0.01);
  gui.add(scaleVector, "z", 0.9, 1.1, 0.01);

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

  pointer.set((x / width - 0.5) * 2.0, (-y / height + 0.5) * 2.0);
}

function animate() {
  requestAnimationFrame(animate);

  renderer.compute(computeParams);
  renderer.render(scene, camera);

  scaleVector.toArray(scaleUniformBuffer.buffer, 0);
}

function error(error) {
  console.error(error);
}
