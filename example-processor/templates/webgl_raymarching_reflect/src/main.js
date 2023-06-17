//Shaders

import fragment_shader_ from "./shaders/fragment_shader.glsl";
import vertex_shader_ from "./shaders/vertex_shader.glsl";

import "./style.css"; // For webpack support

import {
  WebGLRenderer,
  Scene,
  Group,
  Clock,
  PerspectiveCamera,
  PlaneGeometry,
  RawShaderMaterial,
  Vector2,
  Mesh,
} from "three";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let dolly, camera, scene, renderer;
let geometry, material, mesh;
let stats, clock;

const canvas = document.querySelector("#canvas");

const config = {
  saveImage: function () {
    renderer.render(scene, camera);
    window.open(canvas.toDataURL());
  },
  resolution: "512",
};

init();
render();

function init() {
  renderer = new WebGLRenderer({ canvas: canvas });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(config.resolution, config.resolution);
  renderer.useLegacyLights = false;

  window.addEventListener("resize", onWindowResize);

  // Scene
  scene = new Scene();

  dolly = new Group();
  scene.add(dolly);

  clock = new Clock();

  camera = new PerspectiveCamera(60, canvas.width / canvas.height, 1, 2000);
  camera.position.z = 4;
  dolly.add(camera);

  geometry = new PlaneGeometry(2.0, 2.0);
  material = new RawShaderMaterial({
    uniforms: {
      resolution: { value: new Vector2(canvas.width, canvas.height) },
      cameraWorldMatrix: { value: camera.matrixWorld },
      cameraProjectionMatrixInverse: {
        value: camera.projectionMatrixInverse.clone(),
      },
    },
    vertexShader: vertex_shader_,
    fragmentShader: fragment_shader_,
  });
  mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  // Controls
  const controls = new OrbitControls(camera, canvas);
  controls.enableZoom = false;

  // GUI
  const gui = new GUI();
  gui.add(config, "saveImage").name("Save Image");
  gui
    .add(config, "resolution", ["256", "512", "800", "full"])
    .name("Resolution")
    .onChange(onWindowResize);

  stats = new Stats();
  document.body.appendChild(stats.dom);
}

function onWindowResize() {
  if (config.resolution === "full") {
    renderer.setSize(window.innerWidth, window.innerHeight);
  } else {
    renderer.setSize(config.resolution, config.resolution);
  }

  camera.aspect = canvas.width / canvas.height;
  camera.updateProjectionMatrix();

  material.uniforms.resolution.value.set(canvas.width, canvas.height);
  material.uniforms.cameraProjectionMatrixInverse.value.copy(
    camera.projectionMatrixInverse
  );
}

function render() {
  stats.begin();

  const elapsedTime = clock.getElapsedTime();

  dolly.position.z = -elapsedTime;

  renderer.render(scene, camera);

  stats.end();
  requestAnimationFrame(render);
}
