import "./style.css"; // For webpack support

import * as THREE from "three/webgpu";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let renderer, scene, camera, controls;
let planeMesh, boxMesh, boxMeshWireframe, planeMeshWireframe;
let materials;

const api = {
  webgpu: true,
};

init(!api.webgpu);

function init(forceWebGL = false) {
  if (renderer) {
    renderer.dispose();
    controls.dispose();
    document.body.removeChild(renderer.domElement);
  }

  // renderer
  renderer = new WebGPURenderer({
    forceWebGL,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  // scene
  scene = new Scene();
  scene.background = new Color(0x000000);

  // camera
  camera = new PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    100
  );
  camera.position.set(0, 0, 10);

  // controls
  controls = new OrbitControls(camera, renderer.domElement);

  // materials
  materials = [
    new MeshBasicMaterial({ color: 0xff1493, side: DoubleSide }),
    new MeshBasicMaterial({ color: 0x0000ff, side: DoubleSide }),
    new MeshBasicMaterial({ color: 0x00ff00, side: DoubleSide }),
  ];

  // plane geometry
  const planeGeometry = new PlaneGeometry(1, 1, 4, 4);

  planeGeometry.clearGroups();
  const numFacesPerRow = 4; // Number of faces in a row (since each face is made of 2 triangles)

  planeGeometry.addGroup(0, 6 * numFacesPerRow, 0);
  planeGeometry.addGroup(6 * numFacesPerRow, 6 * numFacesPerRow, 1);
  planeGeometry.addGroup(12 * numFacesPerRow, 6 * numFacesPerRow, 2);

  // box geometry
  const boxGeometry = new BoxGeometry(0.75, 0.75, 0.75);

  boxGeometry.clearGroups();
  boxGeometry.addGroup(0, 6, 0); // front face
  boxGeometry.addGroup(6, 6, 0); // back face
  boxGeometry.addGroup(12, 6, 2); // top face
  boxGeometry.addGroup(18, 6, 2); // bottom face
  boxGeometry.addGroup(24, 6, 1); // left face
  boxGeometry.addGroup(30, 6, 1); // right face

  scene.background = forceWebGL ? new Color(0x000000) : new Color(0x222222);

  // meshes
  planeMesh = new Mesh(planeGeometry, materials);

  const materialsWireframe = [];

  for (let index = 0; index < materials.length; index++) {
    const material = new MeshBasicMaterial({
      color: materials[index].color,
      side: DoubleSide,
      wireframe: true,
    });
    materialsWireframe.push(material);
  }

  planeMeshWireframe = new Mesh(planeGeometry, materialsWireframe);
  boxMeshWireframe = new Mesh(boxGeometry, materialsWireframe);

  boxMesh = new Mesh(boxGeometry, materials);

  planeMesh.position.set(-1.5, -1, 0);
  boxMesh.position.set(1.5, -0.75, 0);
  boxMesh.rotation.set(-Math.PI / 8, Math.PI / 4, Math.PI / 4);

  planeMeshWireframe.position.set(-1.5, 1, 0);
  boxMeshWireframe.position.set(1.5, 1.25, 0);
  boxMeshWireframe.rotation.set(-Math.PI / 8, Math.PI / 4, Math.PI / 4);

  scene.add(planeMesh, planeMeshWireframe);
  scene.add(boxMesh, boxMeshWireframe);
}

function animate() {
  boxMesh.rotation.y += 0.005;
  boxMesh.rotation.x += 0.005;
  boxMeshWireframe.rotation.y += 0.005;
  boxMeshWireframe.rotation.x += 0.005;
  renderer.render(scene, camera);
}

// gui

const gui = new GUI();

gui.add(api, "webgpu").onChange(() => {
  init(!api.webgpu);
});

// listeners

window.addEventListener("resize", onWindowResize);

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}
