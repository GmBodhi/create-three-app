import "./style.css"; // For webpack support

import {
  OrthographicCamera,
  Scene,
  MeshBasicMaterial,
  Mesh,
  PlaneGeometry,
} from "three";
import {
  texture,
  textureStore,
  wgslFn,
  code,
  instanceIndex,
} from "three/nodes";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";
import StorageTexture from "three/addons/renderers/common/StorageTexture.js";

let camera, scene, renderer;
let computeToPing, computeToPong;
let pingTexture, pongTexture;
let material;
let phase = true;

init();
render();

function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  const aspect = window.innerWidth / window.innerHeight;
  camera = new OrthographicCamera(-aspect, aspect, 1, -1, 0, 2);
  camera.position.z = 1;

  scene = new Scene();

  // texture

  const width = 512,
    height = 512;

  pingTexture = new StorageTexture(width, height);
  pongTexture = new StorageTexture(width, height);

  // compute init

  const rand2 = code(`
					fn rand2( n: vec2f ) -> f32 {

						return fract( sin( dot( n, vec2f( 12.9898, 4.1414 ) ) ) * 43758.5453 );

					}
				`);

  const computeInitWGSL = wgslFn(
    `
					fn computeInitWGSL( writeTex: texture_storage_2d<rgba8unorm, write>, index: u32 ) -> void {

						let posX = index % ${width};
						let posY = index / ${width};
						let indexUV = vec2u( posX, posY );
						let uv = getUV( posX, posY );

						textureStore( writeTex, indexUV, vec4f( vec3f( rand2( uv ) ), 1 ) );

					}

					fn getUV( posX: u32, posY: u32 ) -> vec2f {

						let uv = vec2f( f32( posX ) / ${width}.0, f32( posY ) / ${height}.0 );

						return uv;

					}
				`,
    [rand2]
  );

  const computeInitNode = computeInitWGSL({
    writeTex: textureStore(pingTexture),
    index: instanceIndex,
  }).compute(width * height);

  // compute loop

  const computePingPongWGSL = wgslFn(
    `
					fn computePingPongWGSL( readTex: texture_2d<f32>, writeTex: texture_storage_2d<rgba8unorm, write>, index: u32 ) -> void {

						let posX = index % ${width};
						let posY = index / ${width};
						let indexUV = vec2u( posX, posY );

						let color = vec3f( rand2( textureLoad( readTex, indexUV, 0 ).xy ) );

						textureStore( writeTex, indexUV, vec4f( color, 1 ) );

					}
				`,
    [rand2]
  );

  computeToPong = computePingPongWGSL({
    readTex: texture(pingTexture),
    writeTex: textureStore(pongTexture),
    index: instanceIndex,
  }).compute(width * height);
  computeToPing = computePingPongWGSL({
    readTex: texture(pongTexture),
    writeTex: textureStore(pingTexture),
    index: instanceIndex,
  }).compute(width * height);

  //

  material = new MeshBasicMaterial({ color: 0xffffff, map: pongTexture });

  const plane = new Mesh(new PlaneGeometry(1, 1), material);
  scene.add(plane);

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(render);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);

  // compute init

  renderer.compute(computeInitNode);
}

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  const aspect = window.innerWidth / window.innerHeight;

  const frustumHeight = camera.top - camera.bottom;

  camera.left = (-frustumHeight * aspect) / 2;
  camera.right = (frustumHeight * aspect) / 2;

  camera.updateProjectionMatrix();

  render();
}

function render() {
  // compute step

  renderer.compute(phase ? computeToPong : computeToPing);

  material.map = phase ? pongTexture : pingTexture;

  phase = !phase;

  // render step

  // update material texture node

  renderer.render(scene, camera);
}
