import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  OrthographicCamera,
  ShaderMaterial,
  PlaneGeometry,
  Mesh,
  Scene,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";
import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";

let postCamera, postScene, renderer;
let postMaterial,
  noiseRandom1DMaterial,
  noiseRandom2DMaterial,
  noiseRandom3DMaterial,
  postQuad;
let stats;

const params = { procedure: "noiseRandom3D" };

init();
animate();
initGui();

// Init gui
function initGui() {
  const gui = new GUI();
  gui.add(params, "procedure", [
    "noiseRandom1D",
    "noiseRandom2D",
    "noiseRandom3D",
  ]);
}

function init() {
  const container = document.getElementById("container");

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  // Setup post processing stage
  postCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  noiseRandom1DMaterial = new ShaderMaterial({
    vertexShader: document.querySelector("#procedural-vert").textContent.trim(),
    fragmentShader: document
      .querySelector("#noiseRandom1D-frag")
      .textContent.trim(),
  });
  noiseRandom2DMaterial = new ShaderMaterial({
    vertexShader: document.querySelector("#procedural-vert").textContent.trim(),
    fragmentShader: document
      .querySelector("#noiseRandom2D-frag")
      .textContent.trim(),
  });
  noiseRandom3DMaterial = new ShaderMaterial({
    vertexShader: document.querySelector("#procedural-vert").textContent.trim(),
    fragmentShader: document
      .querySelector("#noiseRandom3D-frag")
      .textContent.trim(),
  });
  postMaterial = noiseRandom3DMaterial;
  const postPlane = new PlaneGeometry(2, 2);
  postQuad = new Mesh(postPlane, postMaterial);
  postScene = new Scene();
  postScene.add(postQuad);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  postCamera.aspect = width / height;
  postCamera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);

  switch (params.procedure) {
    case "noiseRandom1D":
      postMaterial = noiseRandom1DMaterial;
      break;
    case "noiseRandom2D":
      postMaterial = noiseRandom2DMaterial;
      break;
    case "noiseRandom3D":
      postMaterial = noiseRandom3DMaterial;
      break;
  }

  postQuad.material = postMaterial;

  // render post FX
  renderer.render(postScene, postCamera);

  stats.update();
}
