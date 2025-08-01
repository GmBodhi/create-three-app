import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import {
  struct,
  storage,
  wgslFn,
  instanceIndex,
  time,
  varyingProperty,
  attribute,
} from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import WebGPU from "three/addons/capabilities/WebGPU.js";

if (WebGPU.isAvailable() === false) {
  document.body.appendChild(WebGPU.getErrorMessage());

  throw new Error("No WebGPU support");
}

const renderer = new WebGPURenderer({ antialias: true });
renderer.outputColorSpace = SRGBColorSpace;
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
renderer.setClearAlpha(0);
document.body.appendChild(renderer.domElement);

const aspect = window.innerWidth / window.innerHeight;

const camera = new PerspectiveCamera(50.0, aspect, 0.1, 10000);
const scene = new Scene();

scene.background = new Color(0x00001f);
camera.position.set(1, 1, 1);
const controls = new OrbitControls(camera, renderer.domElement);

let computeDrawBuffer, computeInitDrawBuffer;

init();

async function init() {
  await renderer.init();

  // geometry

  const vector = new Vector4();

  const instances = 100000;

  const positions = [];
  const offsets = [];
  const colors = [];
  const orientationsStart = [];
  const orientationsEnd = [];

  positions.push(0.025, -0.025, 0);
  positions.push(-0.025, 0.025, 0);
  positions.push(0, 0, 0.025);

  // instanced attributes

  for (let i = 0; i < instances; i++) {
    // offsets

    offsets.push(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);

    // colors

    colors.push(Math.random(), Math.random(), Math.random(), Math.random());

    // orientation start

    vector.set(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    );
    vector.normalize();

    orientationsStart.push(vector.x, vector.y, vector.z, vector.w);

    // orientation end

    vector.set(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    );
    vector.normalize();

    orientationsEnd.push(vector.x, vector.y, vector.z, vector.w);
  }

  const geometry = new InstancedBufferGeometry();
  geometry.instanceCount = instances;

  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute(
    "offset",
    new InstancedBufferAttribute(new Float32Array(offsets), 3)
  );
  geometry.setAttribute(
    "color",
    new InstancedBufferAttribute(new Float32Array(colors), 4)
  );
  geometry.setAttribute(
    "orientationStart",
    new InstancedBufferAttribute(new Float32Array(orientationsStart), 4)
  );
  geometry.setAttribute(
    "orientationEnd",
    new InstancedBufferAttribute(new Float32Array(orientationsEnd), 4)
  );

  const drawBuffer = new IndirectStorageBufferAttribute(new Uint32Array(5), 5);
  geometry.setIndirect(drawBuffer);

  const drawBufferStruct = struct(
    {
      vertexCount: "uint",
      instanceCount: { type: "uint", atomic: true },
      firstVertex: "uint",
      firstInstance: "uint",
      offset: "uint",
    },
    "DrawBuffer"
  );

  const writeDrawBuffer = wgslFn(`
					fn compute(
						index: u32,
						drawBuffer: ptr<storage, DrawBuffer, read_write>,
						instances: f32,
						time: f32,
					) -> void {

						let instanceCount = max( instances * pow( sin( time * 0.5 ) + 1, 4.0 ), 100 );

						atomicStore( &drawBuffer.instanceCount, u32( instanceCount ) );
					}
				`);

  computeDrawBuffer = writeDrawBuffer({
    drawBuffer: storage(drawBuffer, drawBufferStruct, drawBuffer.count),
    instances: instances,
    index: instanceIndex,
    time: time,
  }).compute(instances); // not necessary in this case but normally one wants to run through all instances

  const initDrawBuffer = wgslFn(`
					fn compute(
						drawBuffer: ptr< storage, DrawBuffer, read_write >,
					) -> void {

						drawBuffer.vertexCount = 3u;
						atomicStore(&drawBuffer.instanceCount, 0u);
						drawBuffer.firstVertex = 0u;
						drawBuffer.firstInstance = 0u;
						drawBuffer.offset = 0u;
					}
				`);

  computeInitDrawBuffer = initDrawBuffer({
    drawBuffer: storage(drawBuffer, drawBufferStruct, drawBuffer.count),
  }).compute(1);

  const vPosition = varyingProperty("vec3", "vPosition");
  const vColor = varyingProperty("vec4", "vColor");

  const positionShaderParams = {
    position: attribute("position"),
    offset: attribute("offset"),
    color: attribute("color"),
    orientationStart: attribute("orientationStart"),
    orientationEnd: attribute("orientationEnd"),
    time: time,
  };

  const positionShader = wgslFn(
    `
					fn main_vertex(
						position: vec3<f32>,
						offset: vec3<f32>,
						color: vec4<f32>,
						orientationStart: vec4<f32>,
						orientationEnd: vec4<f32>,
						time: f32
					) -> vec4<f32> {

						var vPosition = offset * max( abs( sin( time * 0.5 ) * 2.0 + 1.0 ), 0.5 ) + position;
						var orientation = normalize( mix( orientationStart, orientationEnd, sin( time * 0.5 ) ) );
						var vcV = cross( orientation.xyz, vPosition );
						vPosition = vcV * ( 2.0 * orientation.w ) + ( cross( orientation.xyz, vcV ) * 2.0 + vPosition );

						var vColor = color;

						var outPosition = vec4f(vPosition, 1);

						varyings.vPosition = vPosition;
						varyings.vColor = vColor;

						return outPosition;
					}
				`,
    [vPosition, vColor]
  );

  const fragmentShaderParams = {
    time: time,
    vPosition: vPosition,
    vColor: vColor,
  };

  const fragmentShader = wgslFn(`
					fn main_fragment(
						time: f32,
						vPosition: vec3<f32>,
						vColor: vec4<f32>
					) -> vec4<f32> {

						var color = vec4f( vColor );
						color.r += sin( vPosition.x * 10.0 + time ) * 0.5;

						return color;
					}
				`);

  const material = new MeshBasicNodeMaterial({
    side: DoubleSide,
    forceSinglePass: true,
    transparent: true,
  });

  material.positionNode = positionShader(positionShaderParams);
  material.fragmentNode = fragmentShader(fragmentShaderParams);

  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  renderer.setAnimationLoop(render);

  window.addEventListener("resize", onWindowResize, false);
}

function render() {
  controls.update();

  renderer.render(scene, camera);

  renderer.compute(computeInitDrawBuffer);
  renderer.compute(computeDrawBuffer);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
