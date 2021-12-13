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

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

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
  const particleSize = 4; // 16-byte stride align

  const particleArray = new Float32Array(particleNum * particleSize);
  const velocityArray = new Float32Array(particleNum * particleSize);

  for (let i = 0; i < particleArray.length; i += particleSize) {
    const r = Math.random() * 0.01 + 0.0005;
    const degree = Math.random() * 360;
    velocityArray[i + 0] = r * Math.sin((degree * Math.PI) / 180);
    velocityArray[i + 1] = r * Math.cos((degree * Math.PI) / 180);
  }

  const particleBuffer = new WebGPUStorageBuffer(
    "particle",
    new BufferAttribute(particleArray, particleSize)
  );
  const velocityBuffer = new WebGPUStorageBuffer(
    "velocity",
    new BufferAttribute(velocityArray, particleSize)
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

  const computeShader = `

					//
					// Buffer
					//

					struct Particle {
						value : array< vec4<f32> >;
					};
					[[ binding( 0 ), group( 0 ) ]]
					var<storage,read_write> particle : Particle;

					struct Velocity {
						value : array< vec4<f32> >;
					};
					[[ binding( 1 ), group( 0 ) ]]
					var<storage,read_write> velocity : Velocity;

					//
					// Uniforms
					//

					struct Scale {
						value : array< vec3<f32>, 2 >;
					};
					[[ binding( 2 ), group( 0 ) ]]
					var<uniform> scaleUniform : Scale;

					struct MouseUniforms {
						pointer : vec2<f32>;
					};
					[[ binding( 3 ), group( 0 ) ]]
					var<uniform> mouseUniforms : MouseUniforms;

					[[ stage( compute ), workgroup_size( 64 ) ]]
					fn main( [[builtin(global_invocation_id)]] id : vec3<u32> ) {

						// get particle index

						let index : u32 = id.x * 3u;

						// update speed

						var position : vec4<f32> = particle.value[ index ] + velocity.value[ index ];

						// update limit

						let limit : vec2<f32> = scaleUniform.value[ 0 ].xy;

						if ( abs( position.x ) >= limit.x ) {

							if ( position.x > 0.0 ) {

								position.x = limit.x;

							} else {

								position.x = -limit.x;

							}

							velocity.value[ index ].x = - velocity.value[ index ].x;

						}

						if ( abs( position.y ) >= limit.y ) {

							if ( position.y > 0.0 ) {

								position.y = limit.y;

							} else {

								position.y = -limit.y;

							}

							velocity.value[ index ].y = - velocity.value[ index ].y;

						}

						// update mouse

						let POINTER_SIZE : f32 = .1;

						let dx : f32 = mouseUniforms.pointer.x - position.x;
						let dy : f32 = mouseUniforms.pointer.y - position.y;
						let distanceFromPointer : f32 = sqrt( dx * dx + dy * dy );

						if ( distanceFromPointer <= POINTER_SIZE ) {

							position.x = 0.0;
							position.y = 0.0;
							position.z = 0.0;

						}

						// update buffer

						particle.value[ index ] = position;

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
    new Nodes.ColorNode(new Color(0xffffff))
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
