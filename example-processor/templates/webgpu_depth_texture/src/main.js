import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  TorusKnotGeometry,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
} from "three";
import * as Nodes from "three-nodes/Nodes.js";

import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";
import WebGPUTextureRenderer from "three/examples/jsm/renderers/webgpu/WebGPUTextureRenderer.js";

import {
  smoothstep,
  negate,
  positionView,
  invert,
} from "three-nodes/ShaderNode.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let camera, scene, controls, renderer;

let cameraFX, sceneFX, textureRenderer;

const dpr = window.devicePixelRatio;

init().then(animate).catch(error);

async function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    30
  );
  camera.position.z = 4;

  scene = new Scene();
  scene.background = new Color(0x222222);

  // depth material

  const material = new Nodes.MeshBasicNodeMaterial();
  material.colorNode = invert(
    smoothstep(camera.near, camera.far, negate(positionView.z))
  );

  //

  const geometry = new TorusKnotGeometry(1, 0.3, 128, 64);

  const count = 50;
  const scale = 5;

  for (let i = 0; i < count; i++) {
    const r = Math.random() * 2.0 * Math.PI;
    const z = Math.random() * 2.0 - 1.0;
    const zScale = Math.sqrt(1.0 - z * z) * scale;

    const mesh = new Mesh(geometry, material);
    mesh.position.set(Math.cos(r) * zScale, Math.sin(r) * zScale, z * scale);
    mesh.rotation.set(Math.random(), Math.random(), Math.random());
    scene.add(mesh);
  }

  //

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  textureRenderer = new WebGPUTextureRenderer(renderer);
  textureRenderer.setSize(window.innerWidth * dpr, window.innerHeight * dpr);

  window.addEventListener("resize", onWindowResize);

  // FX

  cameraFX = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  sceneFX = new Scene();

  const geometryFX = new PlaneGeometry(2, 2);

  //

  const materialFX = new Nodes.MeshBasicNodeMaterial();
  materialFX.colorNode = new Nodes.TextureNode(textureRenderer.getTexture());

  const quad = new Mesh(geometryFX, materialFX);
  sceneFX.add(quad);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  //

  return renderer.init();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  textureRenderer.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
}

function animate() {
  requestAnimationFrame(animate);

  textureRenderer.render(scene, camera);
  renderer.render(sceneFX, cameraFX);
}

function error(error) {
  console.error(error);
}
