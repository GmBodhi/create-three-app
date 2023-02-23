import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  GridHelper,
  TextureLoader,
  RepeatWrapping,
  MeshNormalMaterial,
  Mesh,
} from "three";
import {
  attribute,
  positionLocal,
  normalLocal,
  normalWorld,
  normalView,
  color,
  texture,
  ShaderNode,
  func,
  uv,
  vec3,
  triplanarTexture,
  viewportBottomLeft,
  MeshBasicNodeMaterial,
} from "three/nodes";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";

import { TeapotGeometry } from "three/addons/geometries/TeapotGeometry.js";

import Stats from "three/addons/libs/stats.module.js";

let stats;

let camera, scene, renderer;

const objects = [],
  materials = [];

init();

function init() {
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
    2000
  );
  camera.position.set(0, 200, 800);

  scene = new Scene();

  // Grid

  const helper = new GridHelper(1000, 40, 0x303030, 0x303030);
  helper.material.colorNode = attribute("color");
  helper.position.y = -75;
  scene.add(helper);

  // Materials

  const textureLoader = new TextureLoader();

  const uvTexture = textureLoader.load(
    "three/examples/textures/uv_grid_opengl.jpg"
  );
  uvTexture.wrapS = RepeatWrapping;
  uvTexture.wrapT = RepeatWrapping;

  const opacityTexture = textureLoader.load(
    "three/examples/textures/alphaMap.jpg"
  );
  opacityTexture.wrapS = RepeatWrapping;
  opacityTexture.wrapT = RepeatWrapping;

  let material;

  //
  //	BASIC
  //

  // PositionLocal
  material = new MeshBasicNodeMaterial();
  material.colorNode = positionLocal;
  materials.push(material);

  // NormalLocal
  material = new MeshBasicNodeMaterial();
  material.colorNode = normalLocal;
  materials.push(material);

  // NormalWorld
  material = new MeshBasicNodeMaterial();
  material.colorNode = normalWorld;
  materials.push(material);

  // NormalView
  material = new MeshBasicNodeMaterial();
  material.colorNode = normalView;
  materials.push(material);

  // Texture
  material = new MeshBasicNodeMaterial();
  material.colorNode = texture(uvTexture);
  materials.push(material);

  // Opacity
  material = new MeshBasicNodeMaterial();
  material.colorNode = color(0x0099ff);
  material.opacityNode = texture(uvTexture);
  material.transparent = true;
  materials.push(material);

  // AlphaTest
  material = new MeshBasicNodeMaterial();
  material.colorNode = texture(uvTexture);
  material.opacityNode = texture(opacityTexture);
  material.alphaTestNode = 0.5;
  materials.push(material);

  // Normal
  material = new MeshNormalMaterial();
  material.opacity = 0.5;
  material.transparent = true;
  materials.push(material);

  //
  //	ADVANCED
  //

  // Custom ShaderNode ( desaturate filter )

  const desaturateShaderNode = new ShaderNode((input) => {
    return vec3(0.299, 0.587, 0.114).dot(input.color.xyz);
  });

  material = new MeshBasicNodeMaterial();
  material.colorNode = desaturateShaderNode.call({ color: texture(uvTexture) });
  materials.push(material);

  // Custom ShaderNode(no inputs) > Approach 2

  const desaturateNoInputsShaderNode = new ShaderNode(() => {
    return vec3(0.299, 0.587, 0.114).dot(texture(uvTexture).xyz);
  });

  material = new MeshBasicNodeMaterial();
  material.colorNode = desaturateNoInputsShaderNode;
  materials.push(material);

  // Custom WGSL ( desaturate filter )

  const desaturateWGSLNode = func(`
					fn desaturate( color:vec3<f32> ) -> vec3<f32> {

						let lum = vec3<f32>( 0.299, 0.587, 0.114 );

						return vec3<f32>( dot( lum, color ) );

					}
				`);

  material = new MeshBasicNodeMaterial();
  material.colorNode = desaturateWGSLNode.call({ color: texture(uvTexture) });
  materials.push(material);

  // Custom WGSL ( get texture from keywords )

  const getWGSLTextureSample = func(`
					fn getWGSLTextureSample( tex: texture_2d<f32>, tex_sampler: sampler, uv:vec2<f32> ) -> vec4<f32> {

						return textureSample( tex, tex_sampler, uv ) * vec4<f32>( 0.0, 1.0, 0.0, 1.0 );

					}
				`);

  const textureNode = texture(uvTexture);
  //getWGSLTextureSample.keywords = { tex: textureNode, tex_sampler: sampler( textureNode ) };

  material = new MeshBasicNodeMaterial();
  material.colorNode = getWGSLTextureSample.call({
    tex: textureNode,
    tex_sampler: textureNode,
    uv: uv(),
  });
  materials.push(material);

  // Triplanar Texture Mapping
  material = new MeshBasicNodeMaterial();
  material.colorNode = triplanarTexture(texture(uvTexture));
  materials.push(material);

  // Screen Projection Texture
  material = new MeshBasicNodeMaterial();
  material.colorNode = texture(uvTexture, viewportBottomLeft);
  materials.push(material);

  //
  // Geometry
  //

  const geometry = new TeapotGeometry(50, 18);

  for (let i = 0, l = materials.length; i < l; i++) {
    addMesh(geometry, materials[i]);
  }

  //

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  //

  window.addEventListener("resize", onWindowResize);
}

function addMesh(geometry, material) {
  const mesh = new Mesh(geometry, material);

  mesh.position.x = (objects.length % 4) * 200 - 400;
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
  const timer = 0.0001 * Date.now();

  camera.position.x = Math.cos(timer) * 1000;
  camera.position.z = Math.sin(timer) * 1000;

  camera.lookAt(scene.position);

  for (let i = 0, l = objects.length; i < l; i++) {
    const object = objects[i];

    object.rotation.x += 0.01;
    object.rotation.y += 0.005;
  }

  renderer.render(scene, camera);

  stats.update();
}
