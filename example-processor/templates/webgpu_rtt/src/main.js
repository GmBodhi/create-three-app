import "./style.css"; // For webpack support

import {
  Vector2,
  PerspectiveCamera,
  Scene,
  Color,
  TextureLoader,
  BoxGeometry,
  Mesh,
  RenderTarget,
} from "three";
import { texture, uniform, MeshBasicNodeMaterial } from "three/nodes";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGL from "three/addons/capabilities/WebGL.js";

import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";

import QuadMesh from "three/addons/objects/QuadMesh.js";

let camera, scene, renderer;
const mouse = new Vector2();

let quadMesh, renderTarget;

let box;

const dpr = window.devicePixelRatio;

init();

function init() {
  if (WebGPU.isAvailable() === false && WebGL.isWebGL2Available() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU or WebGL2 support");
  }

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    10
  );
  camera.position.z = 3;

  scene = new Scene();
  scene.background = new Color(0x0066ff);

  // textured mesh

  const loader = new TextureLoader();
  const uvTexture = loader.load("three/examples/textures/uv_grid_opengl.jpg");

  const geometryBox = new BoxGeometry();
  const materialBox = new MeshBasicNodeMaterial();
  materialBox.colorNode = texture(uvTexture);

  //

  box = new Mesh(geometryBox, materialBox);
  scene.add(box);

  //

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  renderTarget = new RenderTarget(
    window.innerWidth * dpr,
    window.innerHeight * dpr
  );

  window.addEventListener("mousemove", onWindowMouseMove);
  window.addEventListener("resize", onWindowResize);

  // FX

  // modulate the final color based on the mouse position

  const screenFXNode = uniform(mouse);

  const materialFX = new MeshBasicNodeMaterial();
  materialFX.colorNode = texture(renderTarget.texture)
    .rgb.saturation(screenFXNode.x.oneMinus())
    .hue(screenFXNode.y);

  quadMesh = new QuadMesh(materialFX);
}

function onWindowMouseMove(e) {
  mouse.x = e.offsetX / window.innerWidth;
  mouse.y = e.offsetY / window.innerHeight;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderTarget.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
}

function animate() {
  box.rotation.x += 0.01;
  box.rotation.y += 0.02;

  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);

  renderer.setRenderTarget(null);
  quadMesh.render(renderer);
}
