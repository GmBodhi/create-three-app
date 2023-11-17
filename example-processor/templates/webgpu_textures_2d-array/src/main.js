import "./style.css"; // For webpack support

import {
  PerspectiveCamera,
  Scene,
  FileLoader,
  DataArrayTexture,
  RedFormat,
  PlaneGeometry,
  Mesh,
} from "three";
import {
  MeshBasicNodeMaterial,
  texture,
  uv,
  oscTriangle,
  timerLocal,
} from "three/nodes";

import WebGPU from "three/addons/capabilities/WebGPU.js";
import WebGL from "three/addons/capabilities/WebGL.js";

import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";

import Stats from "three/addons/libs/stats.module.js";
import { unzipSync } from "three/addons/libs/fflate.module.js";

if (WebGPU.isAvailable() === false && WebGL.isWebGL2Available() === false) {
  document.body.appendChild(WebGPU.getErrorMessage());

  throw new Error("No WebGPU or WebGL2 support");
}

let camera, scene, mesh, renderer, stats;

const planeWidth = 50;
const planeHeight = 50;

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

      const map = new DataArrayTexture(array, 256, 256, 109);
      map.format = RedFormat;
      map.needsUpdate = true;

      let coord = uv();
      coord = coord.setY(coord.y.oneMinus()); // flip y

      let oscLayers = oscTriangle(timerLocal(0.5)); // [ /\/ ] triangle osc animation
      oscLayers = oscLayers.add(1).mul(0.5); // convert osc range of [ -1, 1 ] to [ 0, 1 ]
      oscLayers = oscLayers.mul(map.image.depth); // scale osc range to texture depth

      const material = new MeshBasicNodeMaterial();
      material.colorNode = texture(map, coord)
        .depth(oscLayers)
        .r.remap(0, 1, -0.1, 1.8); // remap to make it more visible

      const geometry = new PlaneGeometry(planeWidth, planeHeight);

      mesh = new Mesh(geometry, material);

      scene.add(mesh);
    });

  renderer = new WebGPURenderer();
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
  render();
  stats.update();
}

function render() {
  renderer.render(scene, camera);
}
