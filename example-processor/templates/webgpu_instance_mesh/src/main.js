import "./style.css"; // For webpack support

import {
  Object3D,
  PerspectiveCamera,
  Scene,
  MeshBasicMaterial,
  BufferGeometryLoader,
  InstancedMesh,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

import { normalWorld } from "three-nodes/Nodes.js";

import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";

let camera, scene, renderer, stats;

let mesh;
const amount = parseInt(window.location.search.slice(1)) || 10;
const count = Math.pow(amount, 3);
const dummy = new Object3D();

init().then(animate).catch(error);

async function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild(WebGPU.getErrorMessage());

    throw new Error("No WebGPU support");
  }

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(amount * 0.9, amount * 0.9, amount * 0.9);
  camera.lookAt(0, 0, 0);

  scene = new Scene();

  const material = new MeshBasicMaterial();
  material.colorNode = normalWorld;

  const loader = new BufferGeometryLoader();
  loader.load("models/json/suzanne_buffergeometry.json", function (geometry) {
    geometry.computeVertexNormals();
    geometry.scale(0.5, 0.5, 0.5);

    mesh = new InstancedMesh(geometry, material, count);
    scene.add(mesh);

    //

    const gui = new GUI();
    gui.add(mesh, "count", 0, count);
  });

  //

  renderer = new WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //

  stats = new Stats();
  document.body.appendChild(stats.dom);

  //

  window.addEventListener("resize", onWindowResize);

  return renderer.init();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  render();

  stats.update();
}

function render() {
  if (mesh) {
    const time = Date.now() * 0.001;

    mesh.rotation.x = Math.sin(time / 4);
    mesh.rotation.y = Math.sin(time / 2);

    let i = 0;
    const offset = (amount - 1) / 2;

    for (let x = 0; x < amount; x++) {
      for (let y = 0; y < amount; y++) {
        for (let z = 0; z < amount; z++) {
          dummy.position.set(offset - x, offset - y, offset - z);
          dummy.rotation.y =
            Math.sin(x / 4 + time) +
            Math.sin(y / 4 + time) +
            Math.sin(z / 4 + time);
          dummy.rotation.z = dummy.rotation.y * 2;

          dummy.updateMatrix();

          mesh.setMatrixAt(i++, dummy.matrix);
        }
      }
    }
  }

  renderer.render(scene, camera);
}

function error(error) {
  console.error(error);
}
