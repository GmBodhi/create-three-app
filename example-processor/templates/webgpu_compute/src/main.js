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
  compute,
  color,
  add,
  uniform,
  element,
  storage,
  func,
  assign,
  float,
  mul,
  positionLocal,
  instanceIndex,
} from "three-nodes/Nodes.js";

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";

let camera, scene, renderer;
let computeNode;

const pointer = new Vector2(-10.0, -10.0); // Out of bounds first
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

  // create wgsl function

  const WGSLFnNode = func(`( pointer:vec2<f32>, limit:vec2<f32> ) {

						var position = particle + velocity;

						if ( abs( position.x ) >= limit.x ) {

							if ( position.x > 0.0 ) {

								position.x = limit.x;

							} else {

								position.x = -limit.x;

							}

							velocity.x = - velocity.x;

						}

						if ( abs( position.y ) >= limit.y ) {

							if ( position.y > 0.0 ) {

								position.y = limit.y;

							} else {

								position.y = -limit.y;

							}

							velocity.y = - velocity.y ;

						}

						let POINTER_SIZE = .1;

						let dx = pointer.x - position.x;
						let dy = pointer.y - position.y;
						let distanceFromPointer = sqrt( dx * dx + dy * dy );

						if ( distanceFromPointer <= POINTER_SIZE ) {

							position.x = 0.0;
							position.y = 0.0;
							position.z = 0.0;

						}

						particle = position;

					}
				`);

  // define particle and velocity keywords in wgsl function
  // it's used in case of needed change a global variable like this storageBuffer

  const particleNode = element(particleBufferNode, instanceIndex);
  const velocityNode = element(velocityBufferNode, instanceIndex);

  WGSLFnNode.keywords["particle"] = particleNode;
  WGSLFnNode.keywords["velocity"] = velocityNode;

  // compute

  computeNode = compute(particleNum);

  // Example 1: Calling a WGSL function

  computeNode.computeNode = WGSLFnNode.call({
    pointer: uniform(pointer),
    limit: uniform(scaleVector),
  });

  // Example 2: Creating single storage assign

  //computeNode.computeNode = assign( particleNode, add( particleNode, velocityNode ) );

  // Example 3: Creating multiples storage assign

  /*computeNode.computeNode = new Nodes.ShaderNode( ( {}, builder ) => {

					assign( particleNode, add( particleNode, velocityNode ) ).build( builder );
					assign( velocityNode, mul( velocityNode, float( 0.99 ) ) ).build( builder );

				} );/**/

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

  pointer.set((x / width - 0.5) * 2.0, (-y / height + 0.5) * 2.0);
}

function animate() {
  requestAnimationFrame(animate);

  renderer.compute(computeNode);
  renderer.render(scene, camera);
}

function error(error) {
  console.error(error);
}
