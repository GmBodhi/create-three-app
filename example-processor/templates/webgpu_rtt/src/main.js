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
  OrthographicCamera,
  PlaneGeometry,
} from "three";
import { texture, uniform, vec2, MeshBasicNodeMaterial } from "three/nodes";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";

let camera, scene, renderer;
const mouse = new Vector2();

let cameraFX, sceneFX, renderTarget;

let box;

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
    0.1,
    10
  );
  camera.position.z = 4;

  scene = new Scene();
  scene.background = new Color(0x222222);

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

  cameraFX = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  sceneFX = new Scene();

  const geometryFX = new PlaneGeometry(2, 2);

  // modulate the final color based on the mouse position

  const screenFXNode = uniform(mouse).add(vec2(0.5, 0.5));

  const materialFX = new MeshBasicNodeMaterial();
  materialFX.colorNode = texture(renderTarget.texture).mul(screenFXNode);

  const quad = new Mesh(geometryFX, materialFX);
  sceneFX.add(quad);
}

function onWindowMouseMove(e) {
  mouse.x = e.offsetX / screen.width;
  mouse.y = e.offsetY / screen.height;
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
  renderer.render(sceneFX, cameraFX);
}
