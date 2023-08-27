import "./style.css"; // For webpack support

import {
  OrthographicCamera,
  Scene,
  Texture,
  LinearFilter,
  Mesh,
  PlaneGeometry,
} from "three";
import {
  ShaderNode,
  texture,
  textureStore,
  wgslFn,
  instanceIndex,
  MeshBasicNodeMaterial,
} from "three/nodes";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";

let camera, scene, renderer;

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

  const storageTexture = new Texture();
  storageTexture.image = { width, height };
  storageTexture.magFilter = LinearFilter;
  storageTexture.minFilter = LinearFilter;

  // create function

  const computeShaderNode = new ShaderNode((stack) => {
    // the first function will be the main one

    const computeWGSL = wgslFn(`
						fn computeWGSL( storageTex: texture_storage_2d<rgba8unorm, write>, index:u32 ) -> void {

							let posX = index % ${width};
							let posY = index / ${width};
							let indexUV = vec2<u32>( posX, posY );
							let uv = getUV( posX, posY );

							textureStore( storageTex, indexUV, vec4f( uv, 0, 1 ) );

						}

						fn getUV( posX:u32, posY:u32 ) -> vec2<f32> {

							let uv = vec2<f32>( f32( posX ) / ${width}.0, f32( posY ) / ${height}.0 );

							return uv;

						}
					`);

    stack.add(
      computeWGSL({
        storageTex: textureStore(storageTexture),
        index: instanceIndex,
      })
    );
  });

  // compute

  const computeNode = computeShaderNode.compute(width * height);

  const material = new MeshBasicNodeMaterial({ color: 0x00ff00 });
  material.colorNode = texture(storageTexture);

  const plane = new Mesh(new PlaneGeometry(1, 1), material);
  scene.add(plane);

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // compute texture
  renderer.compute(computeNode);

  window.addEventListener("resize", onWindowResize);
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
  renderer.render(scene, camera);
}
