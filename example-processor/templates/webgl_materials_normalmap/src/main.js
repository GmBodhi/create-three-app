import "./style.css"; // For webpack support

import {
  ColorManagement,
  PerspectiveCamera,
  Scene,
  Color,
  AmbientLight,
  PointLight,
  DirectionalLight,
  TextureLoader,
  SRGBColorSpace,
  MeshPhongMaterial,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
  HalfFloatType,
  DepthTexture,
  Mesh,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { BleachBypassShader } from "three/addons/shaders/BleachBypassShader.js";
import { ColorCorrectionShader } from "three/addons/shaders/ColorCorrectionShader.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { GammaCorrectionShader } from "three/addons/shaders/GammaCorrectionShader.js";

ColorManagement.enabled = false; // TODO: Consider enabling color management.

let container, stats, loader;

let camera, scene, renderer;

let mesh;

let directionalLight, pointLight, ambientLight;

let mouseX = 0;
let mouseY = 0;

let targetX = 0;
let targetY = 0;

const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

let composer, effectFXAA;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    27,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 1200;

  scene = new Scene();
  scene.background = new Color(0x111111);

  // LIGHTS

  ambientLight = new AmbientLight(0x444444);
  scene.add(ambientLight);

  pointLight = new PointLight(0xffffff, 2, 1000);
  pointLight.position.set(0, 0, 600);

  scene.add(pointLight);

  directionalLight = new DirectionalLight(0xffffff);
  directionalLight.position.set(1, -0.5, -1);
  scene.add(directionalLight);

  const textureLoader = new TextureLoader();

  const diffuseMap = textureLoader.load(
    "models/gltf/LeePerrySmith/Map-COL.jpg"
  );
  diffuseMap.colorSpace = SRGBColorSpace;

  const specularMap = textureLoader.load(
    "models/gltf/LeePerrySmith/Map-SPEC.jpg"
  );
  specularMap.colorSpace = SRGBColorSpace;

  const normalMap = textureLoader.load(
    "models/gltf/LeePerrySmith/Infinite-Level_02_Tangent_SmoothUV.jpg"
  );

  const material = new MeshPhongMaterial({
    color: 0xdddddd,
    specular: 0x222222,
    shininess: 35,
    map: diffuseMap,
    specularMap: specularMap,
    normalMap: normalMap,
    normalScale: new Vector2(0.8, 0.8),
  });

  loader = new GLTFLoader();
  loader.load("models/gltf/LeePerrySmith/LeePerrySmith.glb", function (gltf) {
    createScene(gltf.scene.children[0].geometry, 100, material);
  });

  renderer = new WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  // COMPOSER

  renderer.autoClear = false;

  const renderModel = new RenderPass(scene, camera);

  const effectBleach = new ShaderPass(BleachBypassShader);
  const effectColor = new ShaderPass(ColorCorrectionShader);
  const gammaCorrection = new ShaderPass(GammaCorrectionShader);
  effectFXAA = new ShaderPass(FXAAShader);

  effectFXAA.uniforms["resolution"].value.set(
    1 / window.innerWidth,
    1 / window.innerHeight
  );

  effectBleach.uniforms["opacity"].value = 0.2;

  effectColor.uniforms["powRGB"].value.set(1.4, 1.45, 1.45);
  effectColor.uniforms["mulRGB"].value.set(1.1, 1.1, 1.1);

  const renderTarget = new WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    { type: HalfFloatType, depthTexture: new DepthTexture() }
  );

  composer = new EffectComposer(renderer, renderTarget);

  composer.addPass(renderModel);
  composer.addPass(effectBleach);
  composer.addPass(effectColor);
  composer.addPass(gammaCorrection);
  composer.addPass(effectFXAA);

  // EVENTS

  document.addEventListener("mousemove", onDocumentMouseMove);
  window.addEventListener("resize", onWindowResize);
}

function createScene(geometry, scale, material) {
  mesh = new Mesh(geometry, material);

  mesh.position.y = -50;
  mesh.scale.x = mesh.scale.y = mesh.scale.z = scale;

  scene.add(mesh);
}

//

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);

  effectFXAA.uniforms["resolution"].value.set(1 / width, 1 / height);
}

function onDocumentMouseMove(event) {
  mouseX = event.clientX - windowHalfX;
  mouseY = event.clientY - windowHalfY;
}

//

function animate() {
  requestAnimationFrame(animate);

  render();

  stats.update();
}

function render() {
  targetX = mouseX * 0.001;
  targetY = mouseY * 0.001;

  if (mesh) {
    mesh.rotation.y += 0.05 * (targetX - mesh.rotation.y);
    mesh.rotation.x += 0.05 * (targetY - mesh.rotation.x);
  }

  composer.render();
}
