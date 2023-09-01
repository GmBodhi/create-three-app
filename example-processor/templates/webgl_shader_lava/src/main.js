//Shaders

import fragmentShader_ from "./shaders/fragmentShader.glsl";
import vertexShader_ from "./shaders/vertexShader.glsl";

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Clock,
  TextureLoader,
  SRGBColorSpace,
  RepeatWrapping,
  Vector3,
  Vector2,
  ShaderMaterial,
  Mesh,
  TorusGeometry,
  WebGLRenderer,
} from "three";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BloomPass } from "three/addons/postprocessing/BloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

let camera, renderer, composer, clock;

let uniforms, mesh;

init();
animate();

function init() {
  const container = document.getElementById("container");

  camera = new PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    1,
    3000
  );
  camera.position.z = 4;

  const scene = new Scene();

  clock = new Clock();

  const textureLoader = new TextureLoader();

  const cloudTexture = textureLoader.load("textures/lava/cloud.png");
  const lavaTexture = textureLoader.load("textures/lava/lavatile.jpg");

  lavaTexture.colorSpace = SRGBColorSpace;

  cloudTexture.wrapS = cloudTexture.wrapT = RepeatWrapping;
  lavaTexture.wrapS = lavaTexture.wrapT = RepeatWrapping;

  uniforms = {
    fogDensity: { value: 0.45 },
    fogColor: { value: new Vector3(0, 0, 0) },
    time: { value: 1.0 },
    uvScale: { value: new Vector2(3.0, 1.0) },
    texture1: { value: cloudTexture },
    texture2: { value: lavaTexture },
  };

  const size = 0.65;

  const material = new ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader_,
    fragmentShader: fragmentShader_,
  });

  mesh = new Mesh(new TorusGeometry(size, 0.3, 30, 30), material);
  mesh.rotation.x = 0.3;
  scene.add(mesh);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.autoClear = false;
  container.appendChild(renderer.domElement);

  //

  const renderModel = new RenderPass(scene, camera);
  const effectBloom = new BloomPass(1.25);
  const outputPass = new OutputPass();

  composer = new EffectComposer(renderer);

  composer.addPass(renderModel);
  composer.addPass(effectBloom);
  composer.addPass(outputPass);

  //

  onWindowResize();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
}

function render() {
  const delta = 5 * clock.getDelta();

  uniforms["time"].value += 0.2 * delta;

  mesh.rotation.y += 0.0125 * delta;
  mesh.rotation.x += 0.05 * delta;

  renderer.clear();
  composer.render(0.01);
}
