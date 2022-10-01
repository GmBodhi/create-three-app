import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  GridHelper,
  TextureLoader,
  RepeatWrapping,
  Color,
  Mesh,
} from "three";
import * as Nodes from "three/nodes";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";

import { TeapotGeometry } from "three/addons/geometries/TeapotGeometry.js";

import { ShaderNode, vec3, dot, triplanarTexture } from "three/nodes";

import Stats from "three/addons/libs/stats.module.js";

let stats;

let camera, scene, renderer;

const objects = [],
  materials = [];

init().then(animate).catch(error);

async function init() {
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
  helper.material.colorNode = new Nodes.AttributeNode("color");
  helper.position.y = -75;
  scene.add(helper);

  // Materials

  const textureLoader = new TextureLoader();

  const texture = textureLoader.load(
    "three/examples/textures/uv_grid_opengl.jpg"
  );
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;

  const opacityTexture = textureLoader.load(
    "three/examples/textures/alphaMap.jpg"
  );
  opacityTexture.wrapS = RepeatWrapping;
  opacityTexture.wrapT = RepeatWrapping;

  let material;

  //
  //	BASIC
  //

  // PositionNode.LOCAL
  material = new Nodes.MeshBasicNodeMaterial();
  material.colorNode = new Nodes.PositionNode(Nodes.PositionNode.LOCAL);
  materials.push(material);

  // NormalNode.LOCAL
  material = new Nodes.MeshBasicNodeMaterial();
  material.colorNode = new Nodes.NormalNode(Nodes.NormalNode.LOCAL);
  materials.push(material);

  // NormalNode.WORLD
  material = new Nodes.MeshBasicNodeMaterial();
  material.colorNode = new Nodes.NormalNode(Nodes.NormalNode.WORLD);
  materials.push(material);

  // NormalNode.VIEW
  material = new Nodes.MeshBasicNodeMaterial();
  material.colorNode = new Nodes.NormalNode(Nodes.NormalNode.VIEW);
  materials.push(material);

  // TextureNode
  material = new Nodes.MeshBasicNodeMaterial();
  material.colorNode = new Nodes.TextureNode(texture);
  materials.push(material);

  // Opacity
  material = new Nodes.MeshBasicNodeMaterial();
  material.colorNode = new Nodes.UniformNode(new Color(0x0099ff));
  material.opacityNode = new Nodes.TextureNode(texture);
  material.transparent = true;
  materials.push(material);

  // AlphaTest
  material = new Nodes.MeshBasicNodeMaterial();
  material.colorNode = new Nodes.TextureNode(texture);
  material.opacityNode = new Nodes.TextureNode(opacityTexture);
  material.alphaTestNode = new Nodes.UniformNode(0.5);
  materials.push(material);

  //
  //	ADVANCED
  //

  // Custom ShaderNode ( desaturate filter )

  const desaturateShaderNode = new ShaderNode((input) => {
    return dot(vec3(0.299, 0.587, 0.114), input.color.xyz);
  });

  material = new Nodes.MeshBasicNodeMaterial();
  material.colorNode = desaturateShaderNode.call({
    color: new Nodes.TextureNode(texture),
  });
  materials.push(material);

  // Custom WGSL ( desaturate filter )

  const desaturateWGSLNode = new Nodes.FunctionNode(`
					fn desaturate( color:vec3<f32> ) -> vec3<f32> {

						let lum = vec3<f32>( 0.299, 0.587, 0.114 );

						return vec3<f32>( dot( lum, color ) );

					}
				`);

  material = new Nodes.MeshBasicNodeMaterial();
  material.colorNode = desaturateWGSLNode.call({
    color: new Nodes.TextureNode(texture),
  });
  materials.push(material);

  // Custom WGSL ( get texture from keywords )

  const getWGSLTextureSample = new Nodes.FunctionNode(`
					fn getWGSLTextureSample( tex: texture_2d<f32>, tex_sampler: sampler, uv:vec2<f32> ) -> vec4<f32> {

						return textureSample( tex, tex_sampler, uv ) * vec4<f32>( 0.0, 1.0, 0.0, 1.0 );

					}
				`);

  const textureNode = new Nodes.TextureNode(texture);
  //getWGSLTextureSample.keywords = { tex: textureNode, tex_sampler: sampler( textureNode ) };

  material = new Nodes.MeshBasicNodeMaterial();
  material.colorNode = getWGSLTextureSample.call({
    tex: textureNode,
    tex_sampler: textureNode,
    uv: new Nodes.UVNode(),
  });
  materials.push(material);

  // Triplanar Texture Mapping
  material = new Nodes.MeshBasicNodeMaterial();
  material.colorNode = triplanarTexture(new Nodes.TextureNode(texture));
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
  container.appendChild(renderer.domElement);

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  //

  window.addEventListener("resize", onWindowResize);

  return renderer.init();
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
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
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
}

function error(error) {
  console.error(error);
}
