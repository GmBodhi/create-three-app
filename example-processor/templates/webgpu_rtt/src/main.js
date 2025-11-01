import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { texture, uniform, saturation, hue } from "three/tsl";

import { Inspector } from "three/addons/inspector/Inspector.js";

let camera, scene, renderer;
const mouse = new Vector2();

let quadMesh, renderTarget;

let box;

const dpr = window.devicePixelRatio;

init();

function init() {
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

  renderer.inspector = new Inspector();

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

  const scenePassTexture = texture(renderTarget.texture).toInspector(
    "Scene Pass"
  );
  materialFX.colorNode = hue(
    saturation(scenePassTexture.rgb, screenFXNode.x.oneMinus()),
    screenFXNode.y
  );

  quadMesh = new QuadMesh(materialFX);
  quadMesh.name = "Post-Processing";
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
