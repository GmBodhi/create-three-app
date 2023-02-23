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
import {
  smoothstep,
  positionView,
  texture,
  MeshBasicNodeMaterial,
} from "three/nodes";

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
    0.01,
    30
  );
  camera.position.z = 4;

  scene = new Scene();
  scene.background = new Color(0x222222);

  // depth material

  const material = new MeshBasicNodeMaterial();
  material.colorNode = smoothstep(
    camera.near,
    camera.far,
    positionView.z.negate()
  ).invert();

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
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  textureRenderer = new WebGPUTextureRenderer(renderer);
  textureRenderer.setSize(window.innerWidth * dpr, window.innerHeight * dpr);

  window.addEventListener("resize", onWindowResize);

  // FX

  cameraFX = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  sceneFX = new Scene();

  const geometryFX = new PlaneGeometry(2, 2);

  //

  const materialFX = new MeshBasicNodeMaterial();
  materialFX.colorNode = texture(textureRenderer.getTexture());

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
