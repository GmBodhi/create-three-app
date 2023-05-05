import "./style.css"; // For webpack support

import {
  Vector2,
  Vector3,
  Color,
  PerspectiveCamera,
  Scene,
  AmbientLight,
  SpotLight,
  MeshPhongMaterial,
  WebGLRenderTarget,
  IntType,
  RedIntegerFormat,
  ShaderMaterial,
  GLSL3,
  BufferAttribute,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  BoxGeometry,
  Euler,
  Mesh,
  MeshLambertMaterial,
  WebGLRenderer,
} from "three";

import Stats from "three/addons/libs/stats.module.js";

import { TrackballControls } from "three/addons/controls/TrackballControls.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

let container, stats;
let camera, controls, scene, renderer;
let pickingTexture, pickingScene;
let highlightBox;

const pickingData = [];

const pointer = new Vector2();
const offset = new Vector3(10, 10, 10);
const clearColor = new Color();

init();
animate();

function init() {
  container = document.getElementById("container");

  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 1000;

  scene = new Scene();
  scene.background = new Color(0xffffff);

  scene.add(new AmbientLight(0x555555));

  const light = new SpotLight(0xffffff, 1.5);
  light.position.set(0, 500, 2000);
  scene.add(light);

  const defaultMaterial = new MeshPhongMaterial({
    color: 0xffffff,
    flatShading: true,
    vertexColors: true,
    shininess: 0,
  });

  // set up the picking texture to use a 32 bit integer so we can write and read integer ids from it
  pickingScene = new Scene();
  pickingTexture = new WebGLRenderTarget(1, 1, {
    type: IntType,
    format: RedIntegerFormat,
    internalFormat: "R32I",
  });
  const pickingMaterial = new ShaderMaterial({
    glslVersion: GLSL3,

    vertexShader: /* glsl */ `
						attribute int id;
						flat varying int vid;
						void main() {

							vid = id;
							gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

						}
					`,

    fragmentShader: /* glsl */ `
						layout(location = 0) out int out_id;
						flat varying int vid;

						void main() {

							out_id = vid;

						}
					`,
  });

  function applyId(geometry, id) {
    const position = geometry.attributes.position;
    const array = new Int32Array(position.count);
    array.fill(id);

    const bufferAttribute = new BufferAttribute(array, 1, false);
    geometry.setAttribute("id", bufferAttribute);
  }

  function applyVertexColors(geometry, color) {
    const position = geometry.attributes.position;
    const colors = [];

    for (let i = 0; i < position.count; i++) {
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  }

  const geometries = [];
  const matrix = new Matrix4();
  const quaternion = new Quaternion();
  const color = new Color();

  for (let i = 0; i < 5000; i++) {
    const geometry = new BoxGeometry();

    const position = new Vector3();
    position.x = Math.random() * 10000 - 5000;
    position.y = Math.random() * 6000 - 3000;
    position.z = Math.random() * 8000 - 4000;

    const rotation = new Euler();
    rotation.x = Math.random() * 2 * Math.PI;
    rotation.y = Math.random() * 2 * Math.PI;
    rotation.z = Math.random() * 2 * Math.PI;

    const scale = new Vector3();
    scale.x = Math.random() * 200 + 100;
    scale.y = Math.random() * 200 + 100;
    scale.z = Math.random() * 200 + 100;

    quaternion.setFromEuler(rotation);
    matrix.compose(position, quaternion, scale);

    geometry.applyMatrix4(matrix);

    // give the geometry's vertices a random color to be displayed and an integer
    // identifier as a vertex attribute so boxes can be identified after being merged.
    applyVertexColors(geometry, color.setHex(Math.random() * 0xffffff));
    applyId(geometry, i);

    geometries.push(geometry);

    pickingData[i] = {
      position: position,
      rotation: rotation,
      scale: scale,
    };
  }

  const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
  scene.add(new Mesh(mergedGeometry, defaultMaterial));
  pickingScene.add(new Mesh(mergedGeometry, pickingMaterial));

  highlightBox = new Mesh(
    new BoxGeometry(),
    new MeshLambertMaterial({ color: 0xffff00 })
  );
  scene.add(highlightBox);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  controls = new TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 1.0;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;
  controls.noZoom = false;
  controls.noPan = false;
  controls.staticMoving = true;
  controls.dynamicDampingFactor = 0.3;

  stats = new Stats();
  container.appendChild(stats.dom);

  renderer.domElement.addEventListener("pointermove", onPointerMove);
}

//

function onPointerMove(e) {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
}

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function pick() {
  // render the picking scene off-screen
  // set the view offset to represent just a single pixel under the mouse
  const dpr = window.devicePixelRatio;
  camera.setViewOffset(
    renderer.domElement.width,
    renderer.domElement.height,
    Math.floor(pointer.x * dpr),
    Math.floor(pointer.y * dpr),
    1,
    1
  );

  // render the scene
  renderer.setRenderTarget(pickingTexture);

  // clear the background to - 1 meaning no item was hit
  clearColor.setRGB(-1, -1, -1);
  renderer.setClearColor(clearColor);
  renderer.render(pickingScene, camera);

  // clear the view offset so rendering returns to normal
  camera.clearViewOffset();

  // create buffer for reading single pixel
  const pixelBuffer = new Int32Array(1);

  // read the pixel
  renderer.readRenderTargetPixels(pickingTexture, 0, 0, 1, 1, pixelBuffer);

  const id = pixelBuffer[0];
  if (id !== -1) {
    // move our highlightBox so that it surrounds the picked object
    const data = pickingData[id];
    highlightBox.position.copy(data.position);
    highlightBox.rotation.copy(data.rotation);
    highlightBox.scale.copy(data.scale).add(offset);
    highlightBox.visible = true;
  } else {
    highlightBox.visible = false;
  }
}

function render() {
  controls.update();

  pick();

  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
}
