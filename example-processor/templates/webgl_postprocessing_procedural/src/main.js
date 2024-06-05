//Shaders

import proceduralVert_ from "./shaders/proceduralVert.glsl";
import noiseRandom1DFrag_ from "./shaders/noiseRandom1DFrag.glsl";
import noiseRandom2DFrag_ from "./shaders/noiseRandom2DFrag.glsl";
import noiseRandom3DFrag_ from "./shaders/noiseRandom3DFrag.glsl";

import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  OrthographicCamera,
  ShaderMaterial,
  PlaneGeometry,
  Mesh,
  Scene,
} from "three";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let postCamera, postScene, renderer;
let postMaterial,
  noiseRandom1DMaterial,
  noiseRandom2DMaterial,
  noiseRandom3DMaterial,
  postQuad;
let stats;

const params = { procedure: "noiseRandom3D" };

init();

function init() {
  const container = document.getElementById("container");

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  // Setup post processing stage
  postCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  noiseRandom1DMaterial = new ShaderMaterial({
    vertexShader: proceduralVert_,
    fragmentShader: noiseRandom1DFrag_,
  });
  noiseRandom2DMaterial = new ShaderMaterial({
    vertexShader: proceduralVert_,
    fragmentShader: noiseRandom2DFrag_,
  });
  noiseRandom3DMaterial = new ShaderMaterial({
    vertexShader: proceduralVert_,
    fragmentShader: noiseRandom3DFrag_,
  });
  postMaterial = noiseRandom3DMaterial;
  const postPlane = new PlaneGeometry(2, 2);
  postQuad = new Mesh(postPlane, postMaterial);
  postScene = new Scene();
  postScene.add(postQuad);

  window.addEventListener("resize", onWindowResize);

  //

  const gui = new GUI();
  gui.add(params, "procedure", [
    "noiseRandom1D",
    "noiseRandom2D",
    "noiseRandom3D",
  ]);
}

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
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
