//Shaders

import fragmentShader_ from "./shaders/fragmentShader.glsl";
import vertexShader_ from "./shaders/vertexShader.glsl";

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  Color,
  SphereGeometry,
  ShaderMaterial,
  Mesh,
  WebGLRenderer,
} from "three";

const N = 100;

let container;

let camera, scene, renderer;

let geometry;

const meshes = [];

let fragmentShader, vertexShader;

init();
setInterval(render, 1000 / 60);

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  vertexShader = document.getElementById("vertexShader").textContent;
  fragmentShader = document.getElementById("fragmentShader").textContent;

  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 2000;

  scene = new Scene();
  scene.background = new Color(0xffffff);

  geometry = new SphereGeometry(15, 64, 32);

  for (let i = 0; i < N; i++) {
    const material = new ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: generateFragmentShader(),
    });

    const mesh = new Mesh(geometry, material);

    mesh.position.x = (0.5 - Math.random()) * 1000;
    mesh.position.y = (0.5 - Math.random()) * 1000;
    mesh.position.z = (0.5 - Math.random()) * 1000;

    scene.add(mesh);

    meshes.push(mesh);
  }

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);
}

//

function generateFragmentShader() {
  return fragmentShader.replace(
    "XXX",
    Math.random() + "," + Math.random() + "," + Math.random()
  );
}

function render() {
  for (let i = 0; i < N; i++) {
    const mesh = meshes[i];
    mesh.material = new ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: generateFragmentShader(),
    });
  }

  renderer.render(scene, camera);

  console.log("before", renderer.info.programs.length);

  for (let i = 0; i < N; i++) {
    const mesh = meshes[i];
    mesh.material.dispose();
  }

  console.log("after", renderer.info.programs.length);
}
