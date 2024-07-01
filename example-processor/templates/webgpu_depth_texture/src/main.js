import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  MeshBasicNodeMaterial,
  TorusKnotGeometry,
  Mesh,
  WebGPURenderer,
  DepthTexture,
  FloatType,
  RenderTarget,
  QuadMesh,
} from "three";
import { texture } from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let camera, scene, controls, renderer;

let quad, renderTarget;

const dpr = window.devicePixelRatio;

init();

function init() {
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

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  const depthTexture = new DepthTexture();
  depthTexture.type = FloatType;

  renderTarget = new RenderTarget(
    window.innerWidth * dpr,
    window.innerHeight * dpr
  );
  renderTarget.depthTexture = depthTexture;

  window.addEventListener("resize", onWindowResize);

  // FX

  const materialFX = new MeshBasicNodeMaterial();
  materialFX.colorNode = texture(depthTexture);

  quad = new QuadMesh(materialFX);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderTarget.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
}

function animate() {
  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);

  renderer.setRenderTarget(null);
  quad.render(renderer);
}
