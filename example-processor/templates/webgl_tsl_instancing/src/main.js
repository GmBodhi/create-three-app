import "./style.css"; // For webpack support

import {
  Vector3,
  Quaternion,
  BufferGeometryLoader,
  Matrix4,
  InstancedMesh,
  Mesh,
  PerspectiveCamera,
  WebGLRenderer,
  Scene,
  Color,
  AmbientLight,
  DirectionalLight,
} from "three";
import { WebGLNodesHandler } from "three/addons/tsl/WebGLNodesHandler.js";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import { MeshPhongNodeMaterial } from "three/webgpu";
import { sin, time, vec3, positionWorld } from "three/tsl";

let container, stats, gui, guiStatsEl;
let camera, controls, scene, renderer, material;

// gui

const Method = {
  INSTANCED: "INSTANCED",
  MERGED: "MERGED",
  NAIVE: "NAIVE",
};

const api = {
  method: Method.INSTANCED,
  count: 1000,
};

//

init();
initMesh();

//

function clean() {
  const meshes = [];

  scene.traverse(function (object) {
    if (object.isMesh) meshes.push(object);
  });

  for (let i = 0; i < meshes.length; i++) {
    const mesh = meshes[i];
    mesh.material.dispose();
    mesh.geometry.dispose();

    scene.remove(mesh);
  }
}

const randomizeMatrix = (function () {
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();

  return function (matrix) {
    position.x = Math.random() * 40 - 20;
    position.y = Math.random() * 40 - 20;
    position.z = Math.random() * 40 - 20;

    quaternion.random();

    scale.x = scale.y = scale.z = Math.random() * 1;

    matrix.compose(position, quaternion, scale);
  };
})();

function initMesh() {
  clean();

  // make instances
  new BufferGeometryLoader()
    .setPath("models/json/")
    .load("suzanne_buffergeometry.json", function (geometry) {
      const posY = positionWorld;
      const t = time.mul(4);
      material = new MeshPhongNodeMaterial();
      material.colorNode = vec3(
        sin(posY.mul(0.1).add(t)).mul(0.5).add(0.5).x,
        sin(posY.mul(0.1).add(t.mul(0.5).add(2)))
          .mul(0.5)
          .add(0.5).y,
        sin(posY.mul(0.1).add(t.mul(1.5).add(4)))
          .mul(0.5)
          .add(0.5).z
      );

      geometry.computeVertexNormals();

      console.time(api.method + " (build)");

      switch (api.method) {
        case Method.INSTANCED:
          makeInstanced(geometry);
          break;

        case Method.MERGED:
          makeMerged(geometry);
          break;

        case Method.NAIVE:
          makeNaive(geometry);
          break;
      }

      console.timeEnd(api.method + " (build)");
    });
}

function makeInstanced(geometry) {
  const matrix = new Matrix4();
  const mesh = new InstancedMesh(geometry, material, api.count);

  for (let i = 0; i < api.count; i++) {
    randomizeMatrix(matrix);
    mesh.setMatrixAt(i, matrix);
  }

  scene.add(mesh);

  //

  const geometryByteLength = getGeometryByteLength(geometry);

  guiStatsEl.innerHTML = [
    "<i>GPU draw calls</i>: 1",
    "<i>GPU memory</i>: " + formatBytes(api.count * 16 + geometryByteLength, 2),
  ].join("<br/>");
}

function makeMerged(geometry) {
  const geometries = [];
  const matrix = new Matrix4();

  for (let i = 0; i < api.count; i++) {
    randomizeMatrix(matrix);

    const instanceGeometry = geometry.clone();
    instanceGeometry.applyMatrix4(matrix);

    geometries.push(instanceGeometry);
  }

  const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);

  scene.add(new Mesh(mergedGeometry, material));

  //

  guiStatsEl.innerHTML = [
    "<i>GPU draw calls</i>: 1",
    "<i>GPU memory</i>: " +
      formatBytes(getGeometryByteLength(mergedGeometry), 2),
  ].join("<br/>");
}

function makeNaive(geometry) {
  const matrix = new Matrix4();

  for (let i = 0; i < api.count; i++) {
    randomizeMatrix(matrix);

    const mesh = new Mesh(geometry, material);
    mesh.applyMatrix4(matrix);

    scene.add(mesh);
  }

  //

  const geometryByteLength = getGeometryByteLength(geometry);

  guiStatsEl.innerHTML = [
    "<i>GPU draw calls</i>: " + api.count,
    "<i>GPU memory</i>: " + formatBytes(api.count * 16 + geometryByteLength, 2),
  ].join("<br/>");
}

function init() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // camera

  camera = new PerspectiveCamera(70, width / height, 1, 100);
  camera.position.z = 30;

  // renderer

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setNodesHandler(new WebGLNodesHandler());

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  renderer.setAnimationLoop(animate);
  container = document.getElementById("container");
  container.appendChild(renderer.domElement);

  // scene

  scene = new Scene();
  scene.background = new Color(0xffffff);

  // controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;

  // light

  const ambientLight = new AmbientLight(0xffffff, 2);
  const directionalLight = new DirectionalLight(0xffffff, 2);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight, ambientLight);

  // stats

  stats = new Stats();
  container.appendChild(stats.dom);

  // gui

  gui = new GUI();
  gui.add(api, "method", Method).onChange(initMesh);
  gui.add(api, "count", 1, 10000).step(1).onChange(initMesh);

  const perfFolder = gui.addFolder("Performance");

  guiStatsEl = document.createElement("div");
  guiStatsEl.classList.add("gui-stats");

  perfFolder.$children.appendChild(guiStatsEl);
  perfFolder.open();

  // listeners

  window.addEventListener("resize", onWindowResize);

  Object.assign(window, { scene });
}

//

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function animate() {
  controls.update();

  renderer.render(scene, camera);

  stats.update();
}

//

function getGeometryByteLength(geometry) {
  let total = 0;

  if (geometry.index) total += geometry.index.array.byteLength;

  for (const name in geometry.attributes) {
    total += geometry.attributes[name].array.byteLength;
  }

  return total;
}

// Source: https://stackoverflow.com/a/18650828/1314762
function formatBytes(bytes, decimals) {
  if (bytes === 0) return "0 bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["bytes", "KB", "MB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
