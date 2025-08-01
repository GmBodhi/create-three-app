import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";
import { mix, range, normalWorld, oscSine, time } from "three/tsl";

import Stats from "three/addons/libs/stats.module.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera, scene, renderer, stats;

let mesh;
const amount = parseInt(window.location.search.slice(1)) || 10;
const count = Math.pow(amount, 3);
const dummy = new Object3D();

init();

function init() {
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

  // random colors between instances from 0x000000 to 0xFFFFFF
  const randomColors = range(new Color(0x000000), new Color(0xffffff));

  material.colorNode = mix(normalWorld, randomColors, oscSine(time.mul(0.1)));

  const loader = new BufferGeometryLoader();
  loader.load("models/json/suzanne_buffergeometry.json", function (geometry) {
    geometry.computeVertexNormals();
    geometry.scale(0.5, 0.5, 0.5);

    mesh = new InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);

    scene.add(mesh);

    //

    const gui = new GUI();
    gui.add(mesh, "count", 1, count);
  });

  //

  renderer = new WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  //

  stats = new Stats();
  document.body.appendChild(stats.dom);

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  render();

  stats.update();
}

async function render() {
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

  await renderer.render(scene, camera);
}
