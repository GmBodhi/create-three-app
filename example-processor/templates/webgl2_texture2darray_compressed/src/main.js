//Shaders

import vs_ from "./shaders/vs.glsl";
import fs_ from "./shaders/fs.glsl";

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Clock,
  WebGLRenderer,
  ShaderMaterial,
  Vector2,
  GLSL3,
  PlaneGeometry,
  Mesh,
} from "three";

import Stats from "three/addons/libs/stats.module.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";

import WebGL from "three/addons/capabilities/WebGL.js";

if (WebGL.isWebGL2Available() === false) {
  document.body.appendChild(WebGL.getWebGL2ErrorMessage());
}

let camera, scene, mesh, renderer, stats, clock;

const planeWidth = 50;
const planeHeight = 25;

let depthStep = 1;

init();
animate();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.z = 70;

  scene = new Scene();

  //
  clock = new Clock();

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  //

  const ktx2Loader = new KTX2Loader();
  ktx2Loader.setTranscoderPath("jsm/libs/basis/");
  ktx2Loader.detectSupport(renderer);

  ktx2Loader.load("textures/spiritedaway.ktx2", function (texturearray) {
    const material = new ShaderMaterial({
      uniforms: {
        diffuse: { value: texturearray },
        depth: { value: 55 },
        size: { value: new Vector2(planeWidth, planeHeight) },
      },
      vertexShader: vs_,
      fragmentShader: fs_,
      glslVersion: GLSL3,
    });

    const geometry = new PlaneGeometry(planeWidth, planeHeight);

    mesh = new Mesh(geometry, material);

    scene.add(mesh);
  });

  stats = new Stats();
  container.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  if (mesh) {
    const delta = clock.getDelta() * 10;

    depthStep += delta;

    const value = depthStep % 5;

    mesh.material.uniforms["depth"].value = value;
  }

  render();
  stats.update();
}

function render() {
  renderer.render(scene, camera);
}
