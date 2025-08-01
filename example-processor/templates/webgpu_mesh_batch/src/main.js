import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import Stats from "three/addons/libs/stats.module.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { radixSort } from "three/addons/utils/SortUtils.js";

import { normalView, directionToColor, diffuseColor } from "three/tsl";

let camera, scene, renderer;
let controls, stats;
let gui;
let geometries, mesh, material;
const ids = [];

const matrix = new Matrix4();

//

const position = new Vector3();
const rotation = new Euler();
const quaternion = new Quaternion();
const scale = new Vector3();

//

const MAX_GEOMETRY_COUNT = 20000;

const api = {
  webgpu: true,
  count: 512,
  dynamic: 16,

  sortObjects: true,
  perObjectFrustumCulled: true,
  opacity: 1,
  useCustomSort: true,
  randomizeGeometry: () => {
    for (let i = 0; i < api.count; i++) {
      mesh.setGeometryIdAt(i, Math.floor(Math.random() * geometries.length));
    }
  },
};

init();

//

function randomizeMatrix(matrix) {
  position.x = Math.random() * 40 - 20;
  position.y = Math.random() * 40 - 20;
  position.z = Math.random() * 40 - 20;

  rotation.x = Math.random() * 2 * Math.PI;
  rotation.y = Math.random() * 2 * Math.PI;
  rotation.z = Math.random() * 2 * Math.PI;

  quaternion.setFromEuler(rotation);

  scale.x = scale.y = scale.z = 0.5 + Math.random() * 0.5;

  return matrix.compose(position, quaternion, scale);
}

function randomizeRotationSpeed(rotation) {
  rotation.x = Math.random() * 0.01;
  rotation.y = Math.random() * 0.01;
  rotation.z = Math.random() * 0.01;
  return rotation;
}

function initGeometries() {
  geometries = [
    new ConeGeometry(1.0, 2.0),
    new BoxGeometry(2.0, 2.0, 2.0),
    new SphereGeometry(1.0, 16, 8),
  ];
}

function createMaterial() {
  if (!material) {
    material = new MeshBasicNodeMaterial();
    material.outputNode = diffuseColor.mul(
      directionToColor(normalView).y.add(0.5)
    );
  }

  return material;
}

function cleanup() {
  if (mesh) {
    mesh.parent.remove(mesh);

    if (mesh.dispose) {
      mesh.dispose();
    }
  }
}

function initMesh() {
  cleanup();
  initBatchedMesh();
}

function initBatchedMesh() {
  const geometryCount = api.count;
  const vertexCount = geometries.length * 512;
  const indexCount = geometries.length * 1024;

  const euler = new Euler();
  const matrix = new Matrix4();
  mesh = new BatchedMesh(
    geometryCount,
    vertexCount,
    indexCount,
    createMaterial()
  );
  mesh.userData.rotationSpeeds = [];

  // disable full-object frustum culling since all of the objects can be dynamic.
  mesh.frustumCulled = false;

  ids.length = 0;

  const geometryIds = [
    mesh.addGeometry(geometries[0]),
    mesh.addGeometry(geometries[1]),
    mesh.addGeometry(geometries[2]),
  ];
  for (let i = 0; i < api.count; i++) {
    const id = mesh.addInstance(geometryIds[i % geometryIds.length]);
    mesh.setMatrixAt(id, randomizeMatrix(matrix));
    mesh.setColorAt(id, new Color(Math.random() * 0xffffff));

    const rotationMatrix = new Matrix4();
    rotationMatrix.makeRotationFromEuler(randomizeRotationSpeed(euler));
    mesh.userData.rotationSpeeds.push(rotationMatrix);

    ids.push(id);
  }

  scene.add(mesh);
}

function init(forceWebGL = false) {
  if (renderer) {
    renderer.dispose();
    controls.dispose();
    document.body.removeChild(stats.dom);
    document.body.removeChild(renderer.domElement);
  }

  // camera

  const aspect = window.innerWidth / window.innerHeight;

  camera = new PerspectiveCamera(70, aspect, 1, 100);
  camera.position.z = 30;

  // renderer

  renderer = new WebGPURenderer({ antialias: true, forceWebGL });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.setAnimationLoop(animate);

  // scene

  scene = new Scene();
  scene.background = forceWebGL ? new Color(0xffc1c1) : new Color(0xc1c1ff);

  document.body.appendChild(renderer.domElement);

  initGeometries();
  initMesh();

  // controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.0;

  // stats

  stats = new Stats();
  document.body.appendChild(stats.dom);

  // gui

  gui = new GUI();
  gui.add(api, "webgpu").onChange(() => {
    init(!api.webgpu);
  });
  gui.add(api, "count", 1, MAX_GEOMETRY_COUNT).step(1).onChange(initMesh);
  gui.add(api, "dynamic", 0, MAX_GEOMETRY_COUNT).step(1);

  gui.add(api, "opacity", 0, 1).onChange((v) => {
    if (v < 1) {
      material.transparent = true;
      material.depthWrite = false;
    } else {
      material.transparent = false;
      material.depthWrite = true;
    }

    material.opacity = v;
    material.needsUpdate = true;
  });
  gui.add(api, "sortObjects");
  gui.add(api, "perObjectFrustumCulled");
  gui.add(api, "useCustomSort");
  gui.add(api, "randomizeGeometry");

  // listeners

  window.addEventListener("resize", onWindowResize);

  function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
  }

  async function animate() {
    animateMeshes();

    controls.update();

    if (mesh.isBatchedMesh) {
      mesh.sortObjects = api.sortObjects;
      mesh.perObjectFrustumCulled = api.perObjectFrustumCulled;
      mesh.setCustomSort(api.useCustomSort ? sortFunction : null);
    }

    await renderer.renderAsync(scene, camera);

    stats.update();
  }

  function animateMeshes() {
    const loopNum = Math.min(api.count, api.dynamic);

    for (let i = 0; i < loopNum; i++) {
      const rotationMatrix = mesh.userData.rotationSpeeds[i];
      const id = ids[i];

      mesh.getMatrixAt(id, matrix);
      matrix.multiply(rotationMatrix);
      mesh.setMatrixAt(id, matrix);
    }
  }
}

//

function sortFunction(list, camera) {
  // initialize options
  this._options = this._options || {
    get: (el) => el.z,
    aux: new Array(this.maxInstanceCount),
  };

  const options = this._options;
  options.reversed = this.material.transparent;

  // convert depth to unsigned 32 bit range
  const factor = (2 ** 32 - 1) / camera.far; // UINT32_MAX / max_depth
  for (let i = 0, l = list.length; i < l; i++) {
    list[i].z *= factor;
  }

  // perform a fast-sort using the hybrid radix sort function
  radixSort(list, options);
}
