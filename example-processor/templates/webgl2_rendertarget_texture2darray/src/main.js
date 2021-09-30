//Shaders

import vertexPostprocess from "./shaders/vertexPostprocess.glsl";
import fragmentPostprocess from "./shaders/fragmentPostprocess.glsl";
import vs from "./shaders/vs.glsl";
import fs from "./shaders/fs.glsl";

import "./style.css"; // For webpack support

import {
  Scene,
  OrthographicCamera,
  DataTexture2DArray,
  RedFormat,
  UnsignedByteType,
  WebGLRenderTarget,
  ShaderMaterial,
  PerspectiveCamera,
  PlaneBufferGeometry,
  Mesh,
  WebGLRenderer,
  FileLoader,
  Vector2,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";
import { unzipSync } from "three/examples/jsm/libs/fflate.module.js";
import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";

import { WEBGL } from "three/examples/jsm/WebGL.js";

if (WEBGL.isWebGL2Available() === false) {
  document.body.appendChild(WEBGL.getWebGL2ErrorMessage());
}

const DIMENSIONS = {
  width: 256,
  height: 256,
  depth: 109,
};

const params = {
  intensity: 1,
};

/** Post-processing objects */

const postProcessScene = new Scene();
const postProcessCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

const renderTargetTexture = new DataTexture2DArray();
renderTargetTexture.format = RedFormat;
renderTargetTexture.type = UnsignedByteType;

const renderTarget = new WebGLRenderTarget(DIMENSIONS.width, DIMENSIONS.height);
renderTarget.depth = DIMENSIONS.depth;
renderTarget.setTexture(renderTargetTexture);

const postProcessMaterial = new ShaderMaterial({
  uniforms: {
    uTexture: { value: null },
    uDepth: { value: 55 },
    uIntensity: { value: 1.0 },
  },
  vertexShader: document
    .getElementById("vertex-postprocess")
    .textContent.trim(),
  fragmentShader: document
    .getElementById("fragment-postprocess")
    .textContent.trim(),
});

var depthStep = 0.4;

var camera, scene, mesh, renderer, stats;

var planeWidth = 50;
var planeHeight = 50;

init();

function init() {
  var container = document.createElement("div");
  document.body.appendChild(container);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.z = 70;

  scene = new Scene();

  /** Post-processing scene */

  const planeGeometry = new PlaneBufferGeometry(2, 2);
  const screenQuad = new Mesh(planeGeometry, postProcessMaterial);
  postProcessScene.add(screenQuad);

  // 2D Texture array is available on WebGL 2.0

  renderer = new WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);

  const gui = new GUI();

  gui
    .add(params, "intensity", 0, 1)
    .step(0.01)
    .onChange(
      (value) => (postProcessMaterial.uniforms.uIntensity.value = value)
    );
  gui.open();

  // width 256, height 256, depth 109, 8-bit, zip archived raw data

  new FileLoader()
    .setResponseType("arraybuffer")
    .load("textures/3d/head256x256x109.zip", function (data) {
      var zip = unzipSync(new Uint8Array(data));
      const array = new Uint8Array(zip["head256x256x109"].buffer);

      const texture = new DataTexture2DArray(
        array,
        DIMENSIONS.width,
        DIMENSIONS.height,
        DIMENSIONS.depth
      );
      texture.format = RedFormat;
      texture.type = UnsignedByteType;

      var material = new ShaderMaterial({
        uniforms: {
          diffuse: { value: renderTarget.texture },
          depth: { value: 55 },
          size: { value: new Vector2(planeWidth, planeHeight) },
        },
        vertexShader: document.getElementById("vs").textContent.trim(),
        fragmentShader: document.getElementById("fs").textContent.trim(),
      });

      var geometry = new PlaneBufferGeometry(planeWidth, planeHeight);

      mesh = new Mesh(geometry, material);

      scene.add(mesh);

      postProcessMaterial.uniforms.uTexture.value = texture;

      animate();
    });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  var value = mesh.material.uniforms["depth"].value;

  value += depthStep;

  if (value > 109.0 || value < 0.0) {
    if (value > 1.0) value = 109.0 * 2.0 - value;
    if (value < 0.0) value = -value;

    depthStep = -depthStep;
  }

  mesh.material.uniforms["depth"].value = value;

  render();
}

/**
 * Renders the 2D array into the render target `renderTarget`.
 */
function renderTo2DArray() {
  const layer = Math.floor(mesh.material.uniforms["depth"].value);
  postProcessMaterial.uniforms.uDepth.value = layer;
  renderer.setRenderTarget(renderTarget, layer);
  renderer.render(postProcessScene, postProcessCamera);
  renderer.setRenderTarget(null);
}

function render() {
  // Step 1 - Render the input DataTexture2DArray into a
  // DataTexture2DArray render target.
  renderTo2DArray();

  // Step 2 - Renders the scene containing the plane with a material
  // sampling the render target texture.
  renderer.render(scene, camera);
}
