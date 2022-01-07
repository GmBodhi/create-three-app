import "./style.css"; // For webpack support

import {
  Vector2,
  PerspectiveCamera,
  Scene,
  Color,
  TextureLoader,
  BoxGeometry,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
} from "three";

import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";
import WebGPUTextureRenderer from "three/examples/jsm/renderers/webgpu/WebGPUTextureRenderer.js";

import * as Nodes from "three/examples/jsm/renderers/nodes/Nodes.js";

let camera, scene, renderer;
const mouse = new Vector2();

let cameraFX, sceneFX, textureRenderer;

let box;

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
    0.1,
    10
  );
  camera.position.z = 4;

  scene = new Scene();
  scene.background = new Color(0x222222);

  // textured mesh

  const loader = new TextureLoader();
  const texture = loader.load("three/examples/textures/uv_grid_opengl.jpg");

  const geometryBox = new BoxGeometry();
  const materialBox = new Nodes.MeshBasicNodeMaterial();
  materialBox.colorNode = new Nodes.TextureNode(texture);

  //

  box = new Mesh(geometryBox, materialBox);
  scene.add(box);

  //

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  textureRenderer = new WebGPUTextureRenderer(renderer);
  textureRenderer.setSize(window.innerWidth * dpr, window.innerHeight * dpr);

  window.addEventListener("mousemove", onWindowMouseMove);
  window.addEventListener("resize", onWindowResize);

  // FX

  cameraFX = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  sceneFX = new Scene();

  const geometryFX = new PlaneGeometry(2, 2);

  // modulate the final color based on the mouse position

  const screenFXNode = new Nodes.OperatorNode(
    "+",
    new Nodes.Vector2Node(mouse),
    new Nodes.Vector2Node(new Vector2(0.5, 0.5)).setConst(true)
  );

  const materialFX = new Nodes.MeshBasicNodeMaterial();
  materialFX.colorNode = new Nodes.OperatorNode(
    "*",
    new Nodes.TextureNode(textureRenderer.getTexture()),
    screenFXNode
  );

  const quad = new Mesh(geometryFX, materialFX);
  sceneFX.add(quad);

  //

  return renderer.init();
}

function onWindowMouseMove(e) {
  mouse.x = e.offsetX / screen.width;
  mouse.y = e.offsetY / screen.height;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  textureRenderer.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
}

function animate() {
  requestAnimationFrame(animate);

  box.rotation.x += 0.01;
  box.rotation.y += 0.02;

  textureRenderer.render(scene, camera);
  renderer.render(sceneFX, cameraFX);
}

function error(error) {
  console.error(error);
}
