//Shaders

import vertexShader_ from "./shaders/vertexShader.glsl";
import fragmentShader_ from "./shaders/fragmentShader.glsl";

import "./style.css"; // For webpack support

import {
  OrthographicCamera,
  Scene,
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  WebGLRenderer,
} from "three";

let camera, scene, renderer;

let uniforms;

init();
animate();

function init() {
  const container = document.getElementById("container");

  camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  scene = new Scene();

  const geometry = new PlaneGeometry(2, 2);

  uniforms = {
    time: { value: 1.0 },
  };

  const material = new ShaderMaterial({
    uniforms: uniforms,
    vertexShader: document.getElementById("vertexShader").textContent,
    fragmentShader: document.getElementById("fragmentShader").textContent,
  });

  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  onWindowResize();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  uniforms["time"].value = performance.now() / 1000;

  renderer.render(scene, camera);
}
