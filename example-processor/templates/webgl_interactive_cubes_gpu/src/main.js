import "./style.css"; // For webpack support

import {
  Vector2,
  Vector3,
  PerspectiveCamera,
  Scene,
  Color,
  WebGLRenderTarget,
  AmbientLight,
  SpotLight,
  MeshBasicMaterial,
  MeshPhongMaterial,
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

  pickingScene = new Scene();
  pickingTexture = new WebGLRenderTarget(1, 1);

  scene.add(new AmbientLight(0x555555));

  const light = new SpotLight(0xffffff, 1.5);
  light.position.set(0, 500, 2000);
  scene.add(light);

  const pickingMaterial = new MeshBasicMaterial({ vertexColors: true });
  const defaultMaterial = new MeshPhongMaterial({
    color: 0xffffff,
    flatShading: true,
    vertexColors: true,
    shininess: 0,
  });

  function applyVertexColors(geometry, color) {
    const position = geometry.attributes.position;
    const colors = [];

    for (let i = 0; i < position.count; i++) {
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  }

  const geometriesDrawn = [];
  const geometriesPicking = [];

  const matrix = new Matrix4();
  const quaternion = new Quaternion();
  const color = new Color();

  for (let i = 0; i < 5000; i++) {
    let geometry = new BoxGeometry();

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

    // give the geometry's vertices a random color, to be displayed

    applyVertexColors(geometry, color.setHex(Math.random() * 0xffffff));

    geometriesDrawn.push(geometry);

    geometry = geometry.clone();

    // give the geometry's vertices a color corresponding to the "id"

    applyVertexColors(geometry, color.setHex(i));

    geometriesPicking.push(geometry);

    pickingData[i] = {
      position: position,
      rotation: rotation,
      scale: scale,
    };
  }

  const objects = new Mesh(
    BufferGeometryUtils.mergeGeometries(geometriesDrawn),
    defaultMaterial
  );
  scene.add(objects);

  pickingScene.add(
    new Mesh(
      BufferGeometryUtils.mergeGeometries(geometriesPicking),
      pickingMaterial
    )
  );

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
  //render the picking scene off-screen

  // set the view offset to represent just a single pixel under the mouse

  camera.setViewOffset(
    renderer.domElement.width,
    renderer.domElement.height,
    (pointer.x * window.devicePixelRatio) | 0,
    (pointer.y * window.devicePixelRatio) | 0,
    1,
    1
  );

  // render the scene

  renderer.setRenderTarget(pickingTexture);
  renderer.render(pickingScene, camera);

  // clear the view offset so rendering returns to normal

  camera.clearViewOffset();

  //create buffer for reading single pixel

  const pixelBuffer = new Uint8Array(4);

  //read the pixel

  renderer.readRenderTargetPixels(pickingTexture, 0, 0, 1, 1, pixelBuffer);

  //interpret the pixel as an ID

  const id = (pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | pixelBuffer[2];
  const data = pickingData[id];

  if (data) {
    //move our highlightBox so that it surrounds the picked object

    if (data.position && data.rotation && data.scale) {
      highlightBox.position.copy(data.position);
      highlightBox.rotation.copy(data.rotation);
      highlightBox.scale.copy(data.scale).add(offset);
      highlightBox.visible = true;
    }
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
