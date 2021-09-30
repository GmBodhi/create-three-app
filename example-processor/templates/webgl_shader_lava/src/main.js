//Shaders

import fragmentShader from "./shaders/fragmentShader.glsl";
import vertexShader from "./shaders/vertexShader.glsl";

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Clock,
  TextureLoader,
  Vector3,
  Vector2,
  RepeatWrapping,
  ShaderMaterial,
  Mesh,
  TorusGeometry,
  WebGLRenderer,
} from "three";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { FilmPass } from "three/examples/jsm/postprocessing/FilmPass.js";
import { BloomPass } from "three/examples/jsm/postprocessing/BloomPass.js";

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

  uniforms = {
    fogDensity: { value: 0.45 },
    fogColor: { value: new Vector3(0, 0, 0) },
    time: { value: 1.0 },
    uvScale: { value: new Vector2(3.0, 1.0) },
    texture1: { value: textureLoader.load("textures/lava/cloud.png") },
    texture2: { value: textureLoader.load("textures/lava/lavatile.jpg") },
  };

  uniforms["texture1"].value.wrapS = uniforms["texture1"].value.wrapT =
    RepeatWrapping;
  uniforms["texture2"].value.wrapS = uniforms["texture2"].value.wrapT =
    RepeatWrapping;

  const size = 0.65;

  const material = new ShaderMaterial({
    uniforms: uniforms,
    vertexShader: document.getElementById("vertexShader").textContent,
    fragmentShader: document.getElementById("fragmentShader").textContent,
  });

  mesh = new Mesh(new TorusGeometry(size, 0.3, 30, 30), material);
  mesh.rotation.x = 0.3;
  scene.add(mesh);

  //

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);
  renderer.autoClear = false;

  //

  const renderModel = new RenderPass(scene, camera);
  const effectBloom = new BloomPass(1.25);
  const effectFilm = new FilmPass(0.35, 0.95, 2048, false);

  composer = new EffectComposer(renderer);

  composer.addPass(renderModel);
  composer.addPass(effectBloom);
  composer.addPass(effectFilm);

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
