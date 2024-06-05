//Shaders

import vs_ from "./shaders/vs.glsl";
import fs_ from "./shaders/fs.glsl";

import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  FileLoader,
  DataArrayTexture,
  RedFormat,
  ShaderMaterial,
  Vector2,
  GLSL3,
  PlaneGeometry,
  Mesh,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";
import { unzipSync } from "three/addons/libs/fflate.module.js";

let camera, scene, mesh, renderer, stats;

const planeWidth = 50;
const planeHeight = 50;

let depthStep = 0.4;

init();

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

  // width 256, height 256, depth 109, 8-bit, zip archived raw data

  new FileLoader()
    .setResponseType("arraybuffer")
    .load("textures/3d/head256x256x109.zip", function (data) {
      const zip = unzipSync(new Uint8Array(data));
      const array = new Uint8Array(zip["head256x256x109"].buffer);

      const texture = new DataArrayTexture(array, 256, 256, 109);
      texture.format = RedFormat;
      texture.needsUpdate = true;

      const material = new ShaderMaterial({
        uniforms: {
          diffuse: { value: texture },
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

  // 2D Texture array is available on WebGL 2.0

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

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
  if (mesh) {
    let value = mesh.material.uniforms["depth"].value;

    value += depthStep;

    if (value > 109.0 || value < 0.0) {
      if (value > 1.0) value = 109.0 * 2.0 - value;
      if (value < 0.0) value = -value;

      depthStep = -depthStep;
    }

    mesh.material.uniforms["depth"].value = value;
  }

  render();
  stats.update();
}

function render() {
  renderer.render(scene, camera);
}
