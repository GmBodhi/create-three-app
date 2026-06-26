import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import {
  Fn,
  wgslFn,
  positionLocal,
  positionWorld,
  normalLocal,
  normalWorld,
  normalView,
  color,
  texture,
  uv,
  float,
  vec2,
  vec3,
  vec4,
  oscSine,
  triplanarTexture,
  screenUV,
  Loop,
  cameraProjectionMatrix,
} from "three/tsl";

import { TeapotGeometry } from "three/addons/geometries/TeapotGeometry.js";
import WebGPU from "three/addons/capabilities/WebGPU.js";

import { Inspector } from "three/addons/inspector/Inspector.js";

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
  scene.background = new Color(0x000000);

  // Grid

  const helper = new GridHelper(1000, 40, 0x303030, 0x303030);
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

  // PositionWorld
  material = new MeshBasicNodeMaterial();
  material.colorNode = positionWorld;
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

  // camera
  material = new MeshBasicNodeMaterial();
  material.colorNode = cameraProjectionMatrix.mul(positionLocal);
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

  const desaturateShaderNode = Fn((input) => {
    return vec3(0.299, 0.587, 0.114).dot(input.color.xyz);
  });

  material = new MeshBasicNodeMaterial();
  material.colorNode = desaturateShaderNode({ color: texture(uvTexture) });
  materials.push(material);

  // Custom ShaderNode(no inputs) > Approach 2

  const desaturateNoInputsShaderNode = Fn(() => {
    return vec3(0.299, 0.587, 0.114).dot(texture(uvTexture).xyz);
  });

  material = new MeshBasicNodeMaterial();
  material.colorNode = desaturateNoInputsShaderNode();
  materials.push(material);

  // Custom WGSL ( desaturate filter )

  const desaturateWGSLFn = wgslFn(`
					fn desaturate( color:vec3<f32> ) -> vec3<f32> {

						let lum = vec3<f32>( 0.299, 0.587, 0.114 );

						return vec3<f32>( dot( lum, color ) );

					}
				`);

  // include example

  const someWGSLFn = wgslFn(
    `
					fn someFn( color:vec3<f32> ) -> vec3<f32> {

						return desaturate( color );

					}
				`,
    [desaturateWGSLFn]
  );

  material = new MeshBasicNodeMaterial();
  material.colorNode = someWGSLFn({ color: texture(uvTexture) });
  materials.push(material);

  // Custom WGSL

  const getWGSLTextureSample = wgslFn(`
					fn getWGSLTextureSample( tex: texture_2d<f32>, tex_sampler: sampler, uv:vec2<f32> ) -> vec4<f32> {

						return textureSample( tex, tex_sampler, uv ) * vec4<f32>( 0.0, 1.0, 0.0, 1.0 );

					}
				`);

  const textureNode = texture(uvTexture);

  material = new MeshBasicNodeMaterial();
  material.colorNode = getWGSLTextureSample({
    tex: textureNode,
    tex_sampler: textureNode,
    uv: uv(),
  });
  materials.push(material);

  // Triplanar Texture Mapping
  material = new MeshBasicNodeMaterial();
  material.colorNode = triplanarTexture(
    texture(uvTexture),
    null,
    null,
    float(0.01)
  );
  materials.push(material);

  // Screen Projection Texture
  material = new MeshBasicNodeMaterial();
  material.colorNode = texture(uvTexture, screenUV.flipY());
  materials.push(material);

  // Loop
  material = new MeshBasicNodeMaterial();
  materials.push(material);

  const loopCount = 10;
  material.colorNode = Loop(loopCount, ({ i }) => {
    const output = vec4().toVar();
    const scale = oscSine().mul(0.09); // just a value to test

    const scaleI = scale.mul(i);
    const scaleINeg = scaleI.negate();

    const leftUV = uv().add(vec2(scaleI, 0));
    const rightUV = uv().add(vec2(scaleINeg, 0));
    const topUV = uv().add(vec2(0, scaleI));
    const bottomUV = uv().add(vec2(0, scaleINeg));

    output.assign(output.add(texture(uvTexture, leftUV)));
    output.assign(output.add(texture(uvTexture, rightUV)));
    output.assign(output.add(texture(uvTexture, topUV)));
    output.assign(output.add(texture(uvTexture, bottomUV)));

    return output.div(loopCount * 4);
  });

  //
  // Geometry
  //

  const geometry = new TeapotGeometry(50, 18);

  for (let i = 0, l = materials.length; i < l; i++) {
    addMesh(geometry, materials[i]);
  }

  //

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.inspector = new Inspector();
  container.appendChild(renderer.domElement);

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
}
