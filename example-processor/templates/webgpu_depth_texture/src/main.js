import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  TorusKnotGeometry,
  Mesh,
  DepthTexture,
  OrthographicCamera,
  PlaneGeometry,
} from "three";
import { texture, MeshBasicNodeMaterial } from "three/nodes";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";
import WebGPUTextureRenderer from "three/addons/renderers/webgpu/WebGPUTextureRenderer.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, scene, controls, renderer;

let cameraFX, sceneFX, textureRenderer;

const dpr = window.devicePixelRatio;

init();

function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    20
  );
  camera.position.z = 4;

  scene = new Scene();
  scene.background = new Color(0x222222);
  scene.overrideMaterial = new MeshBasicNodeMaterial();

  //

  const geometry = new TorusKnotGeometry(1, 0.3, 128, 64);

  const count = 50;
  const scale = 5;

  for (let i = 0; i < count; i++) {
    const r = Math.random() * 2.0 * Math.PI;
    const z = Math.random() * 2.0 - 1.0;
    const zScale = Math.sqrt(1.0 - z * z) * scale;

    const mesh = new Mesh(geometry);
    mesh.position.set(Math.cos(r) * zScale, Math.sin(r) * zScale, z * scale);
    mesh.rotation.set(Math.random(), Math.random(), Math.random());
    scene.add(mesh);
  }

  //

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  const depthTexture = new DepthTexture();

  textureRenderer = new WebGPUTextureRenderer(renderer);
  textureRenderer.renderTarget.depthTexture = depthTexture;
  textureRenderer.setSize(window.innerWidth * dpr, window.innerHeight * dpr);

  window.addEventListener("resize", onWindowResize);

  // FX

  cameraFX = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  sceneFX = new Scene();

  const geometryFX = new PlaneGeometry(2, 2);

  //

  const materialFX = new MeshBasicNodeMaterial();
  materialFX.colorNode = texture(depthTexture);

  const quad = new Mesh(geometryFX, materialFX);
  sceneFX.add(quad);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  textureRenderer.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
}

function animate() {
  textureRenderer.render(scene, camera);
  renderer.render(sceneFX, cameraFX);
}
